const { extensions, commands } = require('vscode')
const { cacheFile, processCachedData } = require('./cacher')
const { insertImport } = require('./importing/importer')
const {
  buildImportItems,
  buildTypeImportItems,
} = require('./importing/buildImportItems')

async function activate(context) {
  const vandelay = await extensions.getExtension('edb.vandelay').activate()

  let api; // just used for testing

  vandelay.registerPlugin({
    language: 'js',
    cacheFile,
    processCachedData,
    buildImportItems,
    insertImport,
    padCurlyBraces: true,
    useSemicolons: true,
    commaDangle: false,
    multilineImportStyle: 'multi',
    quoteType: 'single',
    finalizePlugin(plugin) {
      plugin.excludePatterns.push(/.*\/node_modules(\/.*)?/)
      api = plugin
    },
  })

  const { selectImport, selectImportForActiveWord } = vandelay.commands

  context.subscriptions.push(
    commands.registerCommand('vandelayJs.selectTypeImport', () =>
      selectImport(null, buildTypeImportItems)
    ),
    commands.registerCommand('vandelayJs.selectTypeImportForActiveWord', () =>
      selectImportForActiveWord(buildTypeImportItems)
    )
  )

  return api;
}
exports.activate = activate
