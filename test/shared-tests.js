const fs = require('fs')
const { commands, extensions } = require('vscode')
const expect = require('expect')

test('cacheProject', async function() {
  const plugin = await extensions.getExtension('edb.vandelay-js').activate()
  await commands.executeCommand('vandelay.cacheProject')
  const data = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(this)
})
