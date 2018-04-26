const {extensions, commands} = require('vscode')
const {cacheFile, processCachedData} = require('./cacher')
const {buildImportItems, insertImport, buildTypeImportItems} = require('./importer')

async function activate(context) {
  const vandelay = await extensions.getExtension('edb.vandelay').activate()

  vandelay.registerPlugin({
    language: 'js',
    finalizePlugin(plugin) {
      plugin.excludePatterns.push(/.*\/node_modules(\/.*)?/)
    },
    cacheFile,
    processCachedData,
    buildImportItems,
    insertImport,
  })

  const {selectImport, selectImportForActiveWord} = vandelay.commands

  context.subscriptions.push(
    commands.registerCommand(
      'vandelayJs.selectTypeImport',
      () => selectImport(null, buildTypeImportItems)
    ),
    commands.registerCommand(
      'vandelayJs.selectTypeImportForActiveWord',
      () => selectImportForActiveWord(buildTypeImportItems)
    ),
  )
}
exports.activate = activate
