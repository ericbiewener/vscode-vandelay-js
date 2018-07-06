// Imports
const importRegex = {
  singleLine: /^from +?(.+) +?import +?([^(\n\\]+\n)/gm,
  multiline: /^from +?(.+) +?import +\(([\S\s]*?)\)/gm,
}
// TODO: can i get python one into a single regex?
^import +?(?:(\w+)[, ])? *(?:({[^]*?}) +)?from +["|'](.*)["|']

function parseImportsWithRegex(text, regex, replacer, imports = []) {
  let match
  while ((match = regex.exec(text))) {
    const results = {
      path: match[1],
      start: match.index,
      end: match.index + match[0].length,
    }
    // entirePackage regex does not provide a second matching group
    if (match[2]) results.imports = match[2].replace(replacer, '').split(',')
    imports.push(results)
  }
  return imports
}

function parseImports(text) {
  // Mutate imports
  const imports = parseImportsWithRegex(text, importRegex.entirePackage)
  parseImportsWithRegex(text, importRegex.singleLine, /\s/g, imports)
  return parseImportsWithRegex(text, importRegex.multiline, /[\s()]/g, imports)
}

// Comments
const comments = /^(?:[ \t]*\/\/|[ \t]*\/\*[^]*?\*\/)/gm

// #TODO: make part of vandelay-core, that accets args of `text, singleLineRegex, multilineRegex`
function getLastInitialComment(text) {
  // Iterates over comment line matches. If one doesn't begin where the previous one left off, this means
  // a non comment line came between them.
  let expectedNextIndex = 0
  let match
  let prevMatch
  while ((match = comments.exec(text))) {
    if (match.index !== expectedNextIndex) break
    expectedNextIndex = comments.lastIndex + 1
    prevMatch = match
  }

  return prevMatch
}

module.exports = {
  parseImports,
  getLastInitialComment
}
