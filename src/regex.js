const _ = require('lodash')

/**
 * Regex must end with `.*` after last capturing group to ensure that we capture the full line.
 * This is necessary so that the `end` property in the results is the correct character.
 *
 * Matching groups:
 *    1. default import
 *    2. named/type imports
 *    3. path
 */
const importRegex = /^import +?(?:(\w+)[, ])? *(?:{([^]*?)} +)?from +["|'](.*)["|'].*/gm

function parseImports(text) {
  const imports = []
  let match
  while ((match = importRegex.exec(text))) {
    const results = {
      path: match[3],
      start: match.index,
      end: match.index + match[0].length,
      default: match[1],
    }
    if (match[2]) {
      const namedAndTypes = _.compact(
        match[2]
          .replace(/{}]/g, '')
          .split(',')
          .map(i => i.trim())
      )

      const groups = _.partition(namedAndTypes, i => i.startsWith('type '))
      if (groups[0].length)
        results.types = groups[0].map(i => i.slice(5).trim())
      if (groups[1].length) results.named = groups[1]
    }
    imports.push(results)
  }

  importRegex.lastIndex = 0
  return imports
}

const commentRegex = /^(?:[ \t]*\/\/.*|[ \t]*\/\*[^]*?\*\/)/gm

const exportRegex = {
  standard: /^export +(\w+)(?: +(\w+))?/gm,
  fullRexport: /^export +\*.+?['|"](.+)['|"]/gm,
  selectiveRexport: /^export +{([^]+?)}.+?['|"](.+)['|"]/gm,
}

module.exports = {
  parseImports,
  exportRegex,
  commentRegex,
}
