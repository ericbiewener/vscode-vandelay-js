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

function getLineImports(plugin, importText) {
  if (!importText) return
  
  const imports = {named: [], types: []}

  if (importText[7] !== '{') imports.default = plugin.utils.strBetween(importText, ' ').replace(',', '')
  
  const nonDefaultImportText = plugin.utils.strBetween(importText, '{', '}')
  if (!nonDefaultImportText) return imports

  nonDefaultImportText.split(',').forEach(item => {
    const trimmedItem = item.trim()
    if (!trimmedItem) return // Trailing commas on named/type imports will lead to this

    if (trimmedItem.startsWith('type ')) {
      imports.types.push(trimmedItem.slice(5))
    } else {
      imports.named.push(trimmedItem)
    }
  })

  return imports
}

module.exports = {
  basename,
  parseLineImportPath,
  isPathNodeModule,
  getLineImports,
}
