function getNewLine(plugin, importPath, imports) {
  const {
    padCurlyBraces,
    useSingleQuotes,
    useSemicolons,
    maxImportLineLength,
    multilineImportStyle,
    commaDangle,
  } = plugin

  const sensitivity = { sensitivity: 'base' }
  imports.named.sort((a, b) => a.localeCompare(b, undefined, sensitivity))
  imports.types.sort((a, b) => a.localeCompare(b, undefined, sensitivity))

  const putTypeOutside =
    plugin.preferTypeOutside && !imports.default && !imports.named.length
  const nonDefaultImports = putTypeOutside
    ? imports.types
    : imports.named.concat(imports.types.map(t => 'type ' + t))

  let newLineStart = plugin.useES5 ? 'const' : 'import'
  if (imports.default) newLineStart += ' ' + imports.default

  let newLineMiddle = ''
  let newLineEnd = ''
  if (nonDefaultImports.length) {
    if (imports.default) newLineStart += ','
    if (putTypeOutside) newLineStart += ' type'
    newLineStart += ' {'
    if (padCurlyBraces) newLineStart += ' '
    newLineMiddle = nonDefaultImports.join(', ')
    if (padCurlyBraces) newLineEnd += ' '
    newLineEnd += '}'
  }

  const quoteChar = useSingleQuotes ? "'" : '"'
  newLineEnd += ` ${
    plugin.useES5 ? '= require(' : 'from'
  } ${quoteChar}${importPath}${quoteChar}${plugin.useES5 ? ')' : ''}`
  if (useSemicolons) newLineEnd += ';'

  // Split up line if necessary

  const tabChar = plugin.utils.getTabChar()
  const newLineLength =
    newLineStart.length + newLineMiddle.length + newLineEnd.length

  // If line is short enough OR there are no named/type imports, no need to split into multiline
  if (newLineLength <= maxImportLineLength || !nonDefaultImports.length) {
    return newLineStart + newLineMiddle + newLineEnd
  }

  if (multilineImportStyle === 'single') {
    // trim start & end to remove possible curly brace padding
    const final =
      newLineStart.trim() +
      '\n' +
      tabChar +
      nonDefaultImports.join(',\n' + tabChar) +
      (commaDangle ? ',' : '') +
      '\n' +
      newLineEnd.trim()

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
    if (!isLast && newLength <= maxImportLineLength) {
      line += newText
    } else if (isLast && newLength + newLineEnd.length <= maxImportLineLength) {
      fullText += newText
    } else {
      const newLine = tabChar + newText.trim()
      fullText += line + '\n' + newLine
      line = newLine
    }
  })

  return fullText + newLineEnd
}

module.exports = {
  getNewLine,
}
