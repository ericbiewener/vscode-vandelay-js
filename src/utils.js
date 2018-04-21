// TODO: These should be provided to plugin extensions via the extension api
// ...those that are only getting used by JS though should just stay here...
const path = require('path')

// TODO: rename. and does it make sense to have removeDirs be a part of this? that's a very different thing
// than just removing a file extension.
function trimPath(filepath, removeDirs) {
  const ext = path.extname(filepath)
  return removeDirs
    ? path.basename(filepath, ext)
    : ext ? filepath.slice(0, -ext.length) : filepath
}

function strBetween(str, startChar, endChar) {
  const start = str.search(startChar)
  if (start < 0) return
  const substr = str.slice(start + 1)
  const end = substr.search(endChar || startChar)
  if (end < 0) return
  return substr.slice(0, end)
}

function parseLineImportPath(line) {
  return strBetween(line, /['"]/)
}

function strUntil(str, endChar) {
  const index = str.search(endChar)
  return index < 0 ? str : str.slice(0, index)
}

function isPathNodeModule(plugin, importPath) {
  if (importPath.startsWith('.')) return false
  return !plugin.absolutePaths.some(p => p === importPath || importPath.startsWith(p + '/'))
}

function getLineImports(lines, lineIndex) {
  let importText
  const line = lines[lineIndex]
  
  if (line.includes(' from ')) {
    importText = line
  }
  else {
    for (let i = lineIndex; i < lines.length; i++) {
      if (lines[i].includes(' from ')) {
        importText = lines.slice(lineIndex, i + 1).join(' ')
        break
      }
    }
  }

  if (!importText) return
  
  const imports = {named: [], types: []}

  if (importText[7] !== '{') imports.default = strBetween(importText, ' ').replace(',', '')
  
  const nonDefaultImportText = strBetween(importText, '{', '}')
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
  trimPath,
  strBetween,
  parseLineImportPath,
  strUntil,
  isPathNodeModule,
  getLineImports,
}
