const { commands, extensions, window } = require('vscode')
const { cacheFile, processCachedData } = require('./cacher')
const { insertImport } = require('./importing/importer')
const {
  buildImportItems,
  buildTypeImportItems,
} = require('./importing/buildImportItems')

async function activate(context) {
  const ext = extensions.getExtension('edb.vandelay')
  if (!ext) {
    window.showErrorMessage(
      'You must install the core Vandelay package to use Vandelay JS: https://github.com/ericbiewener/vscode-vandelay'
    )
    return
  }
  const vandelay = await ext.activate()

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
    trailingComma: true,
    multilineImportStyle: 'multi',
    finalizePlugin(plugin) {
      plugin.excludePatterns.push(/.*\/node_modules(\/.*)?/)
      plugin._test = vandelay._test
      _test.plugin = plugin
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
