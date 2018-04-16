const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const {trimPath, parseLineImportPath, strUntil, isPathNodeModule} = require('./utils')


function cacheFile(plugin, filepath, data = {_extraImports: {}}) {
  const {getFilepathKey} = require('./cacher')

  const fileExports = {}
  const lines = fs.readFileSync(filepath, 'utf8').split('\n')

  lines.forEach(line => {
    // Check for node_modules to cache in _extraImports
    if (line.startsWith('import ')) {
      const linePath = parseLineImportPath(line)
      if (!isPathNodeModule(plugin, linePath)) return
      
      return
    }

    if (!line.startsWith('export ')) return

    const words = line.trim().split(/ +/)
    switch (words[1]) {
      case 'default':
        if (filepath.endsWith('index.js')) {
          fileExports.default = trimPath(path.dirname(filepath), true)
        } else {
          if (plugin.processDefaultName) {
            const name = plugin.processDefaultName(filepath)
            if (name) fileExports.default = name
          }
          if (!fileExports.default) fileExports.default = trimPath(filepath, true)
        }
        return

      case 'type':
        fileExports.types = fileExports.types || []
        fileExports.types.push(words[2])
        return

      case 'const':
      case 'let':
      case 'var':
      case 'function':
      case 'class':
        fileExports.named = fileExports.named || []
        fileExports.named.push(strUntil(words[2], /\W/))
        return

      case '*':
        fileExports.all = fileExports.all || []
        fileExports.all.push(parseLineImportPath(words[3]))
        return

      case '{':
        processReexportNode(fileExports, fileExports.named, line)
        return

      default:
        fileExports.named = fileExports.named || []
        fileExports.named.push(strUntil(words[1], /\W/))
        return
    }
  })

  if (!_.isEmpty(fileExports)) data[getFilepathKey('js', filepath)] = fileExports

  return data
}

function processReexportNode(fileExports, exportArray = [], line) {
  const end = line.indexOf('}')
  if (end < 0) return
  
  if (!fileExports.reexports) fileExports.reexports = {}
  const subfilepath = parseLineImportPath(line)
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
  _test: {
    processReexportNode,
    getSubfileData,
  }
}
