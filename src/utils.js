const path = require('path')

function basename(filepath) {
  return path.basename(filepath, path.extname(filepath))
}

function parseLineImportPath(plugin, line) {
  return plugin.utils.strBetween(line, /['"]/)
}

function isPathNodeModule(plugin, importPath) {
  if (importPath.startsWith('.')) return false
  if (!plugin.absolutePaths) return true
  return !plugin.absolutePaths.some(p => p === importPath || importPath.startsWith(p + '/'))
}

module.exports = {
  basename,
  parseLineImportPath,
  isPathNodeModule,
}
