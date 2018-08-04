const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const { commands, extensions, window, Uri, workspace } = require('vscode')
const expect = require('expect')
const { buildImportItems, insertImport } = require('../src/importing/importer')
const allImportItems = require('./importItems')

const esVersion = process.env.TEST_PROJECT === 'es5' ? 'es5' : 'es6'
console.log(`****** TEST PROJECT: ${esVersion.toUpperCase()} ******`)
const importItems = allImportItems[esVersion]

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

xit('cacheProject', async function() {
  const plugin = await extensions.getExtension('edb.vandelay-js').activate()
  await commands.executeCommand('vandelay.cacheProject')
  const data = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(this)
})

it('buildImportItems', async function() {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  const data = getExportData(plugin)
  data['src2/file1.js'].cached = Date.now()
  const items = plugin._test.getImportItems(plugin, data, buildImportItems)
  expect(items).toMatchSnapshot(this)
})

describe.skip('insertImort', () => {
  const insertTest = async (context, filepath) => {
    context.timeout(1000 * 60)
    const open = () => openFile(filepath)
    const reopen = async () => {
      await commands.executeCommand('workbench.action.closeActiveEditor')
      await open(filepath)
    }

    const [plugin] = await Promise.all([getPlugin(), open()])

    const insert = async importItems => {
      for (const item of importItems) {
        await insertImport(plugin, item)
      }
      return window.activeTextEditor.document.getText()
    }

    const originalResult = await insert(importItems)
    expect(originalResult).toMatchSnapshot(context, 'original order')

    // eslint-disable-next-line no-unused-vars
    // for (const i of _.range(10)) {
    //   await reopen()
    //   const newArray = _.shuffle(importItems)
    //   const newResult = await insert(newArray)
    //   if (newResult !== originalResult)
    //     console.log(`\n\n${JSON.stringify(newArray)}\n\n`)
    //   expect(newResult).toBe(originalResult)
    // }
  }

  it.skip('insertImport - import order - comment-with-code-right-after.js', async function() {
    await insertTest(
      this,
      path.join(root, 'src1/insert-import/comment-with-code-right-after.js')
    )
  })

  it.skip('insertImport - import order - comment-with-linebreak-and-code.js', async function() {
    await insertTest(
      this,
      path.join(root, 'src1/insert-import/comment-with-linebreak-and-code.js')
    )
  })

  it.skip('insertImport - import order - empty.js', async function() {
    await insertTest(this, path.join(root, 'src1/insert-import/empty.js'))
  })

  it.skip('insertImport - import order - has-code.js', async function() {
    await insertTest(this, path.join(root, 'src1/insert-import/has-code.js'))
  })

  it.skip('insertImport - import order - multiline-comment.js', async function() {
    await insertTest(
      this,
      path.join(root, 'src1/insert-import/multiline-comment.js')
    )
  })

  it.skip('insertImport - import order - single-line-comment.js', async function() {
    await insertTest(
      this,
      path.join(root, 'src1/insert-import/single-line-comment.js')
    )
  })
})
