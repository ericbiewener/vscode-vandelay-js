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
    plugin.useES5 ? '= require(' : 'from '
  }${quoteChar}${importPath}${quoteChar}${plugin.useES5 ? ')' : ''}`
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

    // By adding `newLineEnd.length` if it's last, we prevent the `} from...` part from being on a
    // line without any imports. In other words, even if the last import could fit on the previous
    // line, we force it onto the last one with the `from...` part.
    const newLength =
      line.length + newText.length + (isLast ? newLineEnd.length : 0)

    if (newLength <= maxImportLineLength) {
      line += newText
    } else {
      fullText += line + '\n'
      line = tabChar + newText.trim()
    }
  })

  return fullText + line + newLineEnd
}

module.exports = {
  getNewLine,
}
