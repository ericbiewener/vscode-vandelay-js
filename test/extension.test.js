const fs = require('fs')
const path = require('path')
const { extensions } = require('vscode')
const expect = require('expect')
const { buildImportItems } = require('../src/importing/importer')
const {
  getPlugin,
  openFile,
  getExportData,
  insertTest,
  testRoot,
} = require('./utils')

xit('cacheProject', async function() {
  const plugin = await extensions.getExtension('edb.vandelay-js').activate()
  const data = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(this)
})

xit('buildImportItems', async function() {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  const data = getExportData(plugin)
  data['src2/file1.js'].cached = Date.now()
  let items = plugin._test.getImportItems(plugin, data, buildImportItems)
  expect(items).toMatchSnapshot(this)

  // reexports should differ
  await openFile(testRoot, 'src2/file1.js')
  items = plugin._test.getImportItems(plugin, data, buildImportItems)
  expect(items).toMatchSnapshot(this)
})

describe('insertImport', () => {
  xit('import order - empty', async function() {
    await insertTest(this)
  })

  xit('import order - has code', async function() {
    await insertTest(
      this,
      `const foo = 1
`
    )
  })

  xit('import order - single line comment', async function() {
    await insertTest(
      this,
      `// I'm a comment
`
    )
  })

  xit('import order - multiline comment', async function() {
    await insertTest(
      this,
      `/*
  I'm a comment
  With multiple lines
*/
`
    )
  })

  xit('import order - comment with code right after', async function() {
    await insertTest(
      this,
      `// I'm a comment
const foo = 1
`
    )
  })

  xit('import order - comment with linebreak and code', async function() {
    await insertTest(
      this,
      `// I'm a comment

const foo = 1
`
    )
  })

  xit('import order - src1/subdir/file1.js', async function() {
    await insertTest(this, '', path.join(testRoot, 'src1/subdir/file1.js'))
  })

  xit('import order - src2/file1.js', async function() {
    await insertTest(this, '', path.join(testRoot, 'src2/file1.js'))
  })
})
