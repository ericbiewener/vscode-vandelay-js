const path = require('path')

function basename(filepath) {
  return path.basename(filepath, path.extname(filepath))
}

function isPathNodeModule(plugin, importPath) {
  if (importPath.startsWith('.')) return false
  return (
    !plugin.nonModulePaths ||
    !plugin.nonModulePaths.some(
      p => p === importPath || importPath.startsWith(p + '/')
    )
  )
}

function shouldIncludeDisgnostic({ code, source, message }) {
  return (
    ['no-undef', 'react/jsx-no-undef'].includes(code) ||
    (source === 'flow' && message.startsWith('Cannot resolve name'))
  )
}

module.exports = {
  basename,
  isPathNodeModule,
  shouldIncludeDisgnostic,
}
