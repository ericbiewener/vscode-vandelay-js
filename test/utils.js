const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const expect = require('expect')
const { buildImportItems, insertImport } = require('../src/importing/importer')
const {
  commands,
  workspace,
  extensions,
  window,
  Uri,
  Range,
} = require('vscode')

let needsCache = true
const cacheProject = () => {
  if (!needsCache) return
  needsCache = false
  return commands.executeCommand('vandelay.cacheProject')
}

beforeEach(cacheProject)

afterEach(async function() {
  await commands.executeCommand('workbench.action.closeAllEditors')
  // Prevents test failures caused by text editors not being in expected open or closed state
  return new Promise(resolve => setTimeout(resolve, 100))
})

const testRoot = workspace.workspaceFolders[0].uri.path

const getPlugin = () => extensions.getExtension('edb.vandelay-js').activate()

const getExportData = plugin =>
  JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))

const openFile = (...fileParts) =>
  window.showTextDocument(
    Uri.file(
      fileParts.length
        ? path.join(...fileParts)
        : path.join(testRoot, 'src1/file1.js')
    )
  )

const replaceFileContents = (newText = '') => {
  const editor = window.activeTextEditor
  return editor.edit(builder => {
    builder.replace(
      editor.document.validateRange(new Range(0, 0, 9999999999, 0)),
      newText
    )
  })
}

const getImportItems = plugin =>
  plugin._test.getImportItems(plugin, getExportData(plugin), buildImportItems)

const insertItems = async (plugin, importItems) => {
  for (const item of importItems || getImportItems(plugin)) {
    await insertImport(plugin, item)
  }
  return window.activeTextEditor.document.getText()
}

const insertTest = async (context, startingText, filepath) => {
  context.timeout(1000 * 60)
  const open = () => (filepath ? openFile(filepath) : openFile())

  const [plugin] = await Promise.all([getPlugin(), open()])
  await replaceFileContents(startingText)
  const originalItems = getImportItems(plugin)

  const originalResult = await insertItems(originalItems)
  expect(originalResult).toMatchSnapshot(context, 'original order')

  for (let i = 0; i < 10; i++) {
    await replaceFileContents(startingText)
    const newArray = _.shuffle(originalItems)
    const newResult = await insertItems(newArray)
    if (newResult !== originalResult) {
      console.log(`\n\n${JSON.stringify(newArray)}\n\n`)
    }
    expect(newResult).toBe(originalResult)
  }
}

module.exports = {
  cacheProject,
  testRoot,
  getPlugin,
  getExportData,
  openFile,
  replaceFileContents,
  insertTest,
  getImportItems,
  insertItems,
}
