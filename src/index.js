const { extensions, commands } = require('vscode')
const { cacheFile, processCachedData } = require('./cacher')
const { insertImport } = require('./importing/importer')
const {
  buildImportItems,
  buildTypeImportItems,
} = require('./importing/buildImportItems')

async function activate(context) {
  const vandelay = await extensions.getExtension('edb.vandelay').activate()

  const _test = {}

  vandelay.registerPlugin({
    language: 'js',
    cacheFile,
    processCachedData,
    buildImportItems,
    insertImport,
    useSingleQuotes: true,
    padCurlyBraces: true,
    useSemicolons: true,
    commaDangle: true,
    multilineImportStyle: 'multi',
    finalizePlugin(plugin) {
      plugin.excludePatterns.push(/.*\/node_modules(\/.*)?/)
      Object.assign(_test, plugin, {
        _test: vandelay._test,
      })
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

  return _test
}
exports.activate = activate
