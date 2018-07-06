// TODO: to support importing when `require` is used rather than `import from`, look for the last line that has a
// `require` statement but no indentation. That ensures you aren't dealing with a local require
const {window} = require('vscode')
const path = require('path')
const _ = require('lodash')
const {parseLineImportPath, isPathNodeModule, getLineImports} = require('./utils')

function insertImport(plugin, importSelection) {
  const {label: exportName, description: importPath, absImportPath, exportType, isExtraImport} = importSelection
  const editor = window.activeTextEditor

  const finalImportPath = getFinalImportPath(plugin, importPath, absImportPath, isExtraImport)
  const lines = editor.document.getText().split('\n')
  
  const linePosition = getLinePosition(plugin, finalImportPath, isExtraImport, lines)
  const lineImports = getNewLineImports(plugin, lines, exportName, exportType, linePosition)
  if (!lineImports) return
  const newLine = getNewLine(plugin, finalImportPath, lineImports)

  plugin.utils.insertLine(newLine, linePosition, lines)
}

function getFinalImportPath(plugin, importPath, absImportPath, isExtraImport) {
  if (isExtraImport) return importPath

  const activeFilepath = window.activeTextEditor.document.fileName
  importPath = getRelativeImportPath(activeFilepath, absImportPath)

  if (plugin.processImportPath) {
    const processedPath = plugin.processImportPath(importPath, absImportPath, activeFilepath, plugin.projectRoot)
    return plugin.utils.removeExt(processedPath || importPath)
  }

  return path.basename(importPath) === 'index.js'
    ? path.dirname(importPath)
    : plugin.utils.removeExt(importPath)
}

/**
 * Determine which line number should get the import. This could be merged into that line if they have the same path
 * (resulting in lineIndexModifier = 0), or inserted as an entirely new import line before or after
 * (lineIndexModifier = -1 or 1)
 **/
function getLinePosition(plugin, importPath, isExtraImport, lines) {
  let start
  const importLineData = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const isImportStart = line.startsWith('import')

    if (!isImportStart && start == null) {
      if (!line.startsWith('/')) break // no longer in import section
      continue
    }

    if (isImportStart) start = i
    if (!line.includes(' from ')) continue

    const linePath = parseLineImportPath(plugin, line)
    const lineData = {start, end: i}
    if (linePath === importPath) return lineData // Return start/end data immediately if matching path found
    importLineData[linePath] = lineData
    start = null
  }

  const paths = Reflect.ownKeys(importLineData)

  // If this is the first import, find the first non-comment line.
  if (!paths.length) {
    // If there is no line that doesn't start with a comment, we need lineIndexModifier to be 1.
    // It will get set to -1 if a line without a comment is encountered (see end of for-loop)
    let lineIndexModifier = 1
    let isMultilineComment
    let lineIndex
    
    for (let i = 0; i < lines.length; i++) {
      // Don't use lineIndex as incrementor in for-loop declaration because it will get incremented one time too many
      lineIndex = i
      const line = lines[i].trim()
      if (isMultilineComment) {
        if (line.endsWith('*/')) isMultilineComment = false
        continue
      }
      if (line.startsWith('/')) {
        if (line[1] === '*') isMultilineComment = true
        continue
      }
      lineIndexModifier = -1
      break
    }

    return { start: lineIndex, lineIndexModifier, isFirstImportLine: true }
  }

  const importPos = plugin.importOrderMap[importPath]
  const importIsAbsolute = !importPath.startsWith('.')
  
  for (let i = 0; i < paths.length; i++) {
    const linePath = paths[i]
    
    // plugin.importOrder check
    const lineImportPos = plugin.importOrderMap[linePath]
    if (importPos != null && (!lineImportPos || importPos < lineImportPos )) {
      return { start: importLineData[linePath].start, lineIndexModifier: -1 }
    } else if (lineImportPos != null) {
      continue
    }

    // Node module check
    const lineIsNodeModule = isPathNodeModule(plugin, linePath)

    if (isExtraImport && (!lineIsNodeModule || importPath < linePath)) {
      return {start: importLineData[linePath].start, lineIndexModifier: -1}
    } else if (lineIsNodeModule) {
      continue
    }

    // Absolute path check
    const lineIsAbsolute = !linePath.startsWith('.')
    if (importIsAbsolute && (!lineIsAbsolute || importPath < linePath)) {
      return {start: importLineData[linePath].start, lineIndexModifier: -1}
    } else if (lineIsAbsolute) {
      continue
    }

    // Alphabetical
    if (importPath < linePath) return {start: importLineData[linePath].start, lineIndexModifier: -1}
  }

  // Since we didn't find a line to sort the new import before, it will go after the last import
  const lastLineData = importLineData[_.last(paths)]
  return {
    start: lastLineData.end || lastLineData.start,
    lineIndexModifier: 1
  }
}

function getNewLineImports(plugin, lines, exportName, exportType, linePosition) {
  const {start, end, lineIndexModifier, isFirstImportLine} = linePosition

  const lineImports = lineIndexModifier || isFirstImportLine
    ? {named: [], types: []}
    : getLineImports(plugin, lines.slice(start, end + 1).join(' '))
  
  if (exportType === ExportType.default) {
    if (lineImports.default) return
    lineImports.default = exportName
  } else {
    const arr = lineImports[exportType === ExportType.named ? 'named' : 'types']
    if (arr.includes(exportName)) return
    arr.push(exportName)
  }

  return lineImports
}

function getNewLine(plugin, importPath, imports) {
  const {padCurlyBraces, quoteType, useSemicolons, maxImportLineLength, multilineImportStyle, commaDangle} = plugin

  imports.named.sort()
  imports.types.sort()
  const nonDefaultImports = imports.named.concat(imports.types.map(t => 'type ' + t))

  let newLineStart = 'import'
  if (imports.default) newLineStart += ' ' + imports.default

  let newLineMiddle = ''
  let newLineEnd = ''
  if (nonDefaultImports.length) {
    if (imports.default) newLineStart += ','
    newLineStart += ' {'
    if (padCurlyBraces) newLineStart += ' '
    newLineMiddle = nonDefaultImports.join(', ')
    if (padCurlyBraces) newLineEnd += ' '
    newLineEnd += '}'
  }

  const quoteChar = quoteType === 'single' ? '\'' : '"'
  newLineEnd += ' from ' + quoteChar + importPath + quoteChar
  if (useSemicolons) newLineEnd += ';'

  // Split up line if necessary

  const tabChar = plugin.utils.getTabChar()
  const newLineLength = newLineStart.length + newLineMiddle.length + newLineEnd.length

  // If line is short enough OR there are no named/type imports, no need to split into multiline
  if (newLineLength <= maxImportLineLength || !nonDefaultImports.length) {
    return newLineStart + newLineMiddle + newLineEnd
  }

  if (multilineImportStyle === 'single') {
    // trim start & end to remove possible curly brace padding
    const final = newLineStart.trim()
      + '\n'
      + tabChar
      + nonDefaultImports.join(',\n' + tabChar)
      + (commaDangle ? ',' : '')
      + '\n'
      + newLineEnd.trim()

    return final
  }

  let line = newLineStart
  let fullText = ''

  nonDefaultImports.forEach((name, i) => {
    const isLast = i === nonDefaultImports.length - 1

    let newText = (i > 0 ? ' ' : '') + name
    if (!isLast) newText += ','

    const newLength = line.length + newText.length
    // If it's the last import, we need to make sure that the line end "from ..." text will also fit on the line before
    // appending the new import text.
    if (
      (!isLast && newLength <= maxImportLineLength)
      || (isLast && newLength + newLineEnd <= maxImportLineLength)
    ) {
      line += newText
    } else {
      const newLine = tabChar + newText
      fullText += line + '\n' + newLine
      line = newLine
    }
  })

  return fullText + newLineEnd
}

function getRelativeImportPath(file, absImportPath) {
  const relativePath = path.relative(path.dirname(file), absImportPath)
  return relativePath[0] === '.' ? relativePath : '.' + path.sep + relativePath
}

module.exports = {
  insertImport,
}
