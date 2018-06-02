// TODO: to support importing when `require` is used rather than `import from`, look for the last line that has a
// `require` statement but no indentation. That ensures you aren't dealing with a local require
const {window, Range, Position} = require('vscode')
const path = require('path')
const _ = require('lodash')
const {trimPath, parseLineImportPath, isPathNodeModule, getLineImports} = require('./utils')

const ExportType = {
  default: 0,
  named: 1,
  type: 2,
}

function buildImportItems(plugin, exportData) {
  console.log(exportData)
  const {projectRoot, shouldIncludeImport} = plugin
  const activeFilepath = window.activeTextEditor.document.fileName
  const items = []

  for (const importPath of Object.keys(exportData).sort()) {
    const absImportPath = path.join(projectRoot, importPath)
    if (absImportPath === activeFilepath) continue
    if (shouldIncludeImport && !shouldIncludeImport(absImportPath, activeFilepath)) {
      continue
    }
    
    const data = exportData[importPath]
    let defaultExport
    let namedExports
    let typeExports

    if (data.reexported) {
      if (data.default && !data.reexported.includes('default')) defaultExport = data.default
      if (data.named) namedExports = data.named.filter(exp => !data.reexported.includes(exp))
      if (data.types) typeExports = data.types.filter(exp => !data.reexported.includes(exp))
    } else {
      defaultExport = data.default
      namedExports = data.named
      typeExports = data.types
    }

    const ext = path.extname(importPath)
    const importPathNoExt = ext ? importPath.slice(0, -ext.length) : importPath

    if (defaultExport) {
      items.push({
        label: defaultExport,
        description: importPathNoExt,
        exportType: ExportType.default,
        isExtraImport: data.isExtraImport,
        absImportPath,
      })
    }

    if (namedExports) {
      namedExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPathNoExt,
          exportType: ExportType.named,
          isExtraImport: data.isExtraImport,
          absImportPath,
        })
      })
    }

    if (typeExports) {
      typeExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPathNoExt,
          exportType: ExportType.type,
          isExtraImport: data.isExtraImport,
          absImportPath,
        })
      })
    }
  }

  return items
}

function buildTypeImportItems(plugin, exportData) {
  return buildImportItems(plugin, exportData).filter(e => e.exportType === ExportType.type)
}

async function insertImport(plugin, importSelection) {
  const {label: exportName, description: importPath, absImportPath, exportType, isExtraImport} = importSelection
  const editor = window.activeTextEditor

  const finalImportPath = getFinalImportPath(plugin, importPath, absImportPath, isExtraImport)
  const lines = editor.document.getText().split('\n')
  
  const linePosition = getLinePosition(plugin, finalImportPath, isExtraImport, lines)
  const lineImports = getNewLineImports(lines, exportName, exportType, linePosition)
  if (!lineImports) return
  const newLine = getNewLine(plugin, finalImportPath, lineImports)
  
  const {lineIndex, lineIndexModifier, multiLineStart, isFirstImportLine} = linePosition
  
  await editor.edit(builder => {
    if (!lineIndexModifier) {
      builder.replace(new Range(multiLineStart || lineIndex, 0, lineIndex, lines[lineIndex].length), newLine)
    } else if (lineIndexModifier === 1) {
      builder.insert(new Position(lineIndex, lines[lineIndex].length), '\n' + newLine)
    } else { // -1
      // If it's the first import line, then add an extra new line between it and the subsequent non-import code.
      // We only need to worry about this here, because if `isFirstImportLine` = true, the only alternative
      // `lineIndexModifier` is 1, which occurs when the file only has comments
      const extraNewLine = isFirstImportLine ? '\n' : ''
      builder.insert(new Position(lineIndex, 0), newLine + '\n' + extraNewLine)
    }
  })
}

function getFinalImportPath(plugin, importPath, absImportPath, isExtraImport) {
  if (isExtraImport) return importPath

  const activeFilepath = window.activeTextEditor.document.fileName
  importPath = getRelativeImportPath(activeFilepath, absImportPath)

  if (plugin.processImportPath) {
    const processedPath = plugin.processImportPath(importPath, absImportPath, activeFilepath, plugin.projectRoot)
    return trimPath(processedPath || importPath)
  }

  return path.basename(importPath) === 'index.js'
    ? path.dirname(importPath)
    : trimPath(importPath)
}

/**
 * Determine which line number should get the import. This could be merged into that line if they have the same path
 * (resulting in lineIndexModifier = 0), or inserted as an entirely new import line before or after
 * (lineIndexModifier = -1 or 1)
 **/
function getLinePosition(plugin, importPath, isExtraImport, lines) {
  const settingsPos = plugin.importOrderMap[importPath]
  
  let lineIndex
  let lineIndexModifier = 1

  let start

  const importLines = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isImportStart = line.startsWith('import')
    const isImportEnd = line.includes(' from ')

    if (!isImportStart && start == null) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('/')) break // no longer in import section
      continue
    }

    if (isImportStart) start = i
    if (!isImportEnd) continue

    importLines[parseLineImportPath(line)] = {start, end: i}
  }

  console.log(importLines)
  return

  //   const linePath = parseLineImportPath(line)
  //   if (linePath === importPath) {
  //     lineIndex = i
  //     lineIndexModifier = 0
  //     break
  //   }

  //   // If lineIndexModifier === -1, then we have already found a path that the import should sort before.
  //   // At this point, we're just looping in case there is an exact path that should override this.
  //   if (lineIndexModifier === -1) continue

  //   // multiLineStart only matters if the paths match. If we've arrived here, the import that multiLineStart
  //   // currently refers to does not have a matching path.
  //   multiLineStart = null

  //   const lineSettingsPos = plugin.importOrderMap[linePath]

  //   // If import exists in plugin.importOrder
  //   if (settingsPos != null) {
  //     if (lineSettingsPos == null || lineSettingsPos > settingsPos) {
  //       lineIndex = i
  //       lineIndexModifier = -1
  //       continue
  //     }
  //     else {
  //       lineIndex = i
  //       lineIndexModifier = 1
  //       continue
  //     }
  //   }
    
  //   // If import does not exist in plugin.importOrder but line does
  //   if (lineSettingsPos != null) {
  //     lineIndex = i
  //     lineIndexModifier = 1
  //     continue
  //   }

  //   const lineIsNodeModule = isPathNodeModule(plugin, linePath)

  //   // If import is a node module
  //   if (
  //     isExtraImport
  //     && (!lineIsNodeModule || importPath < linePath)
  //   ) {
  //     lineIndex = i
  //     lineIndexModifier = -1
  //     continue
  //   }
  //   // If line is a node module but we didn't break above, then import must come after it
  //   if (lineIsNodeModule) {
  //     lineIndex = i
  //     lineIndexModifier = 1
  //     continue
  //   }

  //   const lineIsAbsolute = !linePath.startsWith('.')

  //   // If import is absolute path
  //   if (!importPath.startsWith('.')) {
  //     if (!lineIsAbsolute) {
  //       lineIndex = i
  //       lineIndexModifier = -1
  //       continue
  //     }
  //   }
  //   else if (lineIsAbsolute) {
  //     lineIndex = i
  //     lineIndexModifier = 1
  //     continue
  //   }
    
  //   // No special sorting
  //   lineIndex = i
  //   lineIndexModifier = linePath > importPath ? -1 : 1
  // }

  const isFirstImportLine = lineIndex == null

  // If isFirstImportLine, find the first non-comment line.
  if (isFirstImportLine) {
    // If there is no line that doesn't start with a comment, we need lineIndexModifier to be 1.
    // It will get set to -1 if a line without a comment is encountered (see end of for loop)
    lineIndexModifier = 1
    let isMultilineComment
    
    for (let i = 0; i < lines.length; i++) {
      // Don't use lineIndex as incrementor in for-loop declaration because it will get incremented one time too many
      lineIndex = i
      const line = lines[i]
      if (isMultilineComment) {
        if (line.includes('*/')) isMultilineComment = false
        continue
      }
      if (line.startsWith('/')) {
        if (line[1] === '*') isMultilineComment = true
        continue
      }
      lineIndexModifier = -1
      break
    }
  }

  return {lineIndex, lineIndexModifier, isFirstImportLine, multiLineStart}
}

function getNewLineImports(lines, exportName, exportType, linePosition) {
  const {lineIndex, multiLineStart, lineIndexModifier, isFirstImportLine} = linePosition

  const lineImports = lineIndexModifier || isFirstImportLine
    ? {named: [], types: []}
    : getLineImports(lines, multiLineStart == null ? lineIndex : multiLineStart)
  
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

  const {options} = window.activeTextEditor
  const tabChar = options.insertSpaces ? _.repeat(' ', options.tabSize) : '\t'
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
  buildImportItems,
  buildTypeImportItems,
  insertImport,
}
