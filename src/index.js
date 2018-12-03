const { commands, extensions, window } = require('vscode')
const semver = require('semver-compare')
const { cacheFile, processCachedData } = require('./cacher')
const { insertImport } = require('./importing/importer')
const {
  buildImportItems,
  buildTypeImportItems,
} = require('./importing/buildImportItems')
const { removeUnusedImports } = require('./removeUnusedImports')
const { shouldIncludeDisgnostic } = require('./utils')

async function activate(context) {
  console.log('Vandelay JavaScript: Activating')
  const ext = extensions.getExtension('edb.vandelay')
  if (!ext) {
    window.showErrorMessage(
      'You must install the core Vandelay package to use Vandelay JS: https://github.com/ericbiewener/vscode-vandelay'
    )
    return
  }
  if (semver(ext.packageJSON.version, '1.0.1') < 0) {
    window.showErrorMessage(
      'Your core Vandelay package needs to be updated. Vandelay JS will not work until you update.'
    )
    await commands.executeCommand(
      'workbench.extensions.action.listOutdatedExtensions'
    )
    return
  }

  const vandelay = await ext.activate()

  let plugin
  const _test = {}

  console.log('Vandelay JavaScript: registerPlugin')
  vandelay.registerPlugin({
    language: 'js',
    cacheFile,
    processCachedData,
    buildImportItems,
    insertImport,
    removeUnusedImports,
    useSingleQuotes: true,
    padCurlyBraces: true,
    useSemicolons: true,
    trailingComma: true,
    multilineImportStyle: 'multi',
    shouldIncludeDisgnostic,
    context,
    newVersionAlert: {
      name: 'Vandelay JS',
      changelogUrl:
        'https://github.com/ericbiewener/vscode-vandelay-js/blob/master/CHANGELOG.md',
      extensionIdentifier: 'edb.vandelay-js',
      suppressAlert: true,
    },
    finalizePlugin(finalPlugin) {
      plugin = finalPlugin
      plugin.excludePatterns.push(/.*\/node_modules(\/.*)?/)
      console.log('Vandelay JavaScript: finalized', plugin)
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
