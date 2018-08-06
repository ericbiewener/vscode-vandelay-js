const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const {
  commands,
  extensions,
  window,
  Uri,
  workspace,
  Range,
} = require('vscode')
const expect = require('expect')
const { buildImportItems, insertImport } = require('../src/importing/importer')

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
  return new Promise(resolve => setTimeout(resolve, 10))
})

const root = workspace.workspaceFolders[0].uri.path

const getPlugin = () => extensions.getExtension('edb.vandelay-js').activate()

const getExportData = plugin =>
  JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))

const openFile = (...fileParts) =>
  window.showTextDocument(
    Uri.file(
      fileParts.length
        ? path.join(...fileParts)
        : path.join(root, 'src1/file1.js')
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

it('cacheProject', async function() {
  const plugin = await extensions.getExtension('edb.vandelay-js').activate()
  const data = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(this)
})

it.only('buildImportItems', async function() {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  const data = getExportData(plugin)
  data['src2/file1.js'].cached = Date.now()
  let items = plugin._test.getImportItems(plugin, data, buildImportItems)
  expect(items).toMatchSnapshot(this)

  // reexports should differ
  await openFile(root, 'src2/file1.js')
  items = plugin._test.getImportItems(plugin, data, buildImportItems)
  expect(items).toMatchSnapshot(this)
})

describe('insertImort', () => {
  const insertTest = async (context, startingText, filepath) => {
    context.timeout(1000 * 60 * 1000)
    const open = () => (filepath ? openFile(filepath) : openFile())

    const [plugin] = await Promise.all([getPlugin(), open()])
    await replaceFileContents(startingText)

    const data = getExportData(plugin)
    const originalItems = plugin._test.getImportItems(
      plugin,
      data,
      buildImportItems
    )

    const insert = async importItems => {
      for (const item of importItems) {
        await insertImport(plugin, item)
      }
      return window.activeTextEditor.document.getText()
    }

    const originalResult = await insert(originalItems)
    expect(originalResult).toMatchSnapshot(context, 'original order')

    for (let i = 0; i < 10; i++) {
      await replaceFileContents(startingText)
      const newArray = _.shuffle(originalItems)
      const newResult = await insert(newArray)
      if (newResult !== originalResult) {
        console.log(`\n\n${JSON.stringify(newArray)}\n\n`)
      }
      expect(newResult).toBe(originalResult)
    }
  }

  it('import order - empty', async function() {
    await insertTest(this)
  })

  it('import order - has code', async function() {
    await insertTest(
      this,
      `const foo = 1
`
    )
  })

  it('import order - single line comment', async function() {
    await insertTest(
      this,
      `// I'm a comment
`
    )
  })

  it('import order - multiline comment', async function() {
    await insertTest(
      this,
      `/*
  I'm a comment
  With multiple lines
*/
`
    )
  })

  it('import order - comment with code right after', async function() {
    await insertTest(
      this,
      `// I'm a comment
const foo = 1
`
    )
  })

  it('import order - comment with linebreak and code', async function() {
    await insertTest(
      this,
      `// I'm a comment

const foo = 1
`
    )
  })

  it.only('import order - src1/subdir/file1.js', async function() {
    await insertTest(this, '', path.join(root, 'src1/subdir/file1.js'))
  })

  it.only('import order - src2/file1.js', async function() {
    await insertTest(this, '', path.join(root, 'src2/file1.js'))
  })

  // FIXME: handle full import importing when partial already exists and vice versa?
})
