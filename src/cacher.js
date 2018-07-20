const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const { basename, isPathNodeModule } = require('./utils')
const { parseImports, exportRegex } = require('./regex')

function cacheFile(plugin, filepath, data = { _extraImports: {} }) {
  const fileExports = {}
  const fileText = fs.readFileSync(filepath, 'utf8')
  const imports = parseImports(plugin, fileText)

  for (const importData of imports) {
    if (!isPathNodeModule(plugin, importData.path)) continue
    const existing = data._extraImports[importData.path] || {}
    data._extraImports[importData.path] = existing
    if (importData.default) existing.default = importData.default
    if (importData.named)
      existing.named = _.union(existing.named, importData.named)
    if (importData.types)
      existing.types = _.union(existing.types, importData.types)
  }

  let match

  const mainRegex = plugin.useRequire
    ? exportRegex.moduleExports
    : exportRegex.standard

  while ((match = mainRegex.exec(fileText))) {
    if (match[1] === 'default' || (plugin.useRequire && match[1])) {
      if (filepath.endsWith('index.js')) {
        fileExports.default = basename(path.dirname(filepath))
      } else {
        if (plugin.processDefaultName) {
          const name = plugin.processDefaultName(filepath)
          if (name) fileExports.default = name
        }
        if (!fileExports.default) fileExports.default = basename(filepath)
      }
    } else if (!plugin.useRequire && !match[2]) {
      // export myVar;
      fileExports.named = fileExports.named || []
      fileExports.named.push(match[2])
    } else if (plugin.useRequire && match[2]) {
      fileExports.named = fileExports.named || []
      fileExports.named.push(
        ..._.compact(match[2].replace(/\s/g, '').split(',')).map(
          exp => exp.split(':')[0]
        )
      )
    } else if (match[2]) {
      const key = match[1] === 'type' ? 'types' : 'named'
      fileExports[key] = fileExports[key] || []
      fileExports[key].push(match[2])
    }
  }

  if (!plugin.useRequire) {
    while ((match = exportRegex.fullRexport.exec(fileText))) {
      fileExports.all = fileExports.all || []
      fileExports.all.push(match[1])
    }

    // match[1] = export names
    // match[2] = path
    while ((match = exportRegex.selectiveRexport.exec(fileText))) {
      if (!fileExports.reexports) fileExports.reexports = {}
      const subPath = match[2]
      if (!fileExports.reexports[subPath]) fileExports.reexports[subPath] = []
      const reexports = fileExports.reexports[subPath]

      match[1].split(',').forEach(exp => {
        const words = exp.trim().split(/ +/)
        const isType = words[0] === 'type'
        const key = isType ? 'types' : 'named'
        reexports.push(words[isType ? 1 : 0])
        fileExports[key] = fileExports[key] || []
        fileExports[key].push(_.last(words))
      })
    }
  }

  if (!_.isEmpty(fileExports)) {
    const filePathKey = plugin.utils.getFilepathKey(filepath)
    data[filePathKey] = fileExports
  }

  exportRegex.standard.lastIndex = 0
  exportRegex.fullRexport.lastIndex = 0
  exportRegex.selectiveRexport.lastIndex = 0

  return data
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
