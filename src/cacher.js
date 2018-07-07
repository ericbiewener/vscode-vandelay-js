const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const {basename, parseLineImportPath, isPathNodeModule} = require('./utils')
const {parseImports} = require('./regex')


function cacheFile(plugin, filepath, data = {_extraImports: {}}) {
  const fileExports = {}
  const fileText = fs.readFileSync(filepath, 'utf8')
  const imports = parseImports(fileText)

  for (const importData of imports) {
    if (!isPathNodeModule(plugin, importData.path)) continue
    const existing = data._extraImports[importData.path] || {}
    data._extraImports[importData.path] = existing
    if (importData.default) existing.default = importData.default
    if (importData.named) existing.named = _.union(existing.named, importData.named)
    if (importData.types) existing.types = _.union(existing.types, importData.types)
  }

  const lines = fileText.split('\n')

  // TODO: replace with regex
  for (const line of lines) {
    if (!line.startsWith('export ')) continue

    const words = line.trim().split(/ +/)
    switch (words[1]) {
      case 'default':
        if (filepath.endsWith('index.js')) {
          fileExports.default = basename(path.dirname(filepath))
        } else {
          if (plugin.processDefaultName) {
            const name = plugin.processDefaultName(filepath)
            if (name) fileExports.default = name
          }
          if (!fileExports.default) fileExports.default = basename(filepath)
        }
        continue

      case 'type':
        fileExports.types = fileExports.types || []
        fileExports.types.push(plugin.utils.strUntil(words[2], '<')) // strip off generics
        continue

      case 'const':
      case 'let':
      case 'var':
      case 'function':
      case 'class':
        fileExports.named = fileExports.named || []
        fileExports.named.push(plugin.utils.strUntil(words[2], /\W/))
        continue

      case '*':
        fileExports.all = fileExports.all || []
        fileExports.all.push(parseLineImportPath(plugin, words[3]))
        continue

      case '{':
        processReexportNode(plugin, fileExports, fileExports.named, line)
        continue

      default:
        fileExports.named = fileExports.named || []
        fileExports.named.push(plugin.utils.strUntil(words[1], /\W/))
    }
  }

  if (!_.isEmpty(fileExports)) {
    const filePathKey = plugin.utils.getFilepathKey(filepath)
    data[filePathKey] = fileExports
  }

  return data
}

function processReexportNode(plugin, fileExports, exportArray = [], line) {
  // TODO: replace with regex. this breaks if reexporting is multiline, eg
  // export { blah, blah, blah,
  //   blah, blah } from './mypath'
  const end = line.indexOf('}')
  if (end < 0) return
  
  if (!fileExports.reexports) fileExports.reexports = {}
  const subfilepath = parseLineImportPath(plugin, line)
  if (!fileExports.reexports[subfilepath]) fileExports.reexports[subfilepath] = []
  const reexports = fileExports.reexports[subfilepath]

  const exportText = line.slice(line.indexOf('{') + 1, end)
  exportText.split(',').forEach(exp => {
    const words = exp.trim().split(/ +/)
    reexports.push(words[0])
    exportArray.push(_.last(words))
  })
}

/**
 * Processes reexports to add the actual export names to the file keys in which they're reexported.
 * Also flags the reexports in their original file keys as having been reexported so that they can
 * be suppressed in the QuickPick.
 */
function processCachedData(data) {
  _.each(data, (fileData, mainFilepath) => {
    if (fileData.all) {
      fileData.all.forEach(subfilePath => {
        const subfileExports = getSubfileData(mainFilepath, subfilePath, data)
        if (!subfileExports || !subfileExports.named) return
        if (fileData.named) {
          fileData.named.push(...subfileExports.named)
        } else {
          fileData.named = subfileExports.named
        }
        subfileExports.reexported = subfileExports.named
      })

      delete fileData.all
    }

    if (fileData.reexports) {
      _.each(fileData.reexports, (exportNames, subfilePath) => {
        const subfileExports = getSubfileData(mainFilepath, subfilePath, data)
        if (subfileExports) {
          if (!subfileExports.reexported) subfileExports.reexported = []
          subfileExports.reexported.push(...exportNames)
        }
      })

      delete fileData.reexports
    }
  })

  return data
}

function getSubfileData(mainFilepath, filename, data) {
  const filepathWithoutExt = path.join(path.dirname(mainFilepath), filename)
  for (const ext of ['.js', '.jsx']) {
    const subfileExports = data[filepathWithoutExt + ext]
    if (subfileExports) return subfileExports
  }
}

module.exports = {
  cacheFile,
  processCachedData,
}
