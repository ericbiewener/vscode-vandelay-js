const {extensions} = require('vscode')
const {cacheFile, processCachedData} = require('./cacher')
const {buildImportItems, insertImport} = require('./importer')

async function activate() {
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
}
exports.activate = activate
