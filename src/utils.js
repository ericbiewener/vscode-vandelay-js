const path = require('path')

function basename(filepath) {
  return path.basename(filepath, path.extname(filepath))
}

function isPathNodeModule(plugin, importPath) {
  if (importPath.startsWith('.')) return false
  if (!plugin.nonModulePaths) return true
  return !plugin.nonModulePaths.some(
    p => p === importPath || importPath.startsWith(p + '/')
  )
}

module.exports = {
  basename,
  isPathNodeModule,
}
