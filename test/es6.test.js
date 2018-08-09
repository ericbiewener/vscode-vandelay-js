const expect = require('expect')
const {
  getPlugin,
  openFile,
  insertItems,
  replaceFileContents,
} = require('./utils')

if (process.env.TEST_PROJECT !== 'es5') {
  it('import - preferTypeOutside = false', async function() {
    const [plugin] = await Promise.all([getPlugin(), openFile()])
    await replaceFileContents()
    plugin.preferTypeOutside = false
    const result = await insertItems(plugin)
    expect(result).toMatchSnapshot(this, 'import - preferTypeOutside = false')
  })
}
