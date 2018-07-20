const { window } = require('vscode')
const path = require('path')

const ExportType = {
  default: 0,
  named: 1,
  type: 2,
}

function buildImportItems(plugin, exportData) {
  const { projectRoot, shouldIncludeImport } = plugin
  const activeFilepath = window.activeTextEditor.document.fileName
  const items = []

  const sortedKeys = Object.keys(exportData).sort((a, b) => {
    const createdA = exportData[a].cached
    const createdB = exportData[b].cached
    if (!createdA && !createdB) return a < b ? -1 : 1 // alphabetical
    if (createdA && !createdB) return -1
    if (createdB && !createdA) return 1
    return createdA < createdB ? -1 : 1
  })

  for (const importPath of sortedKeys) {
    let absImportPath = path.join(projectRoot, importPath)
    if (absImportPath === activeFilepath) continue
    if (
      shouldIncludeImport &&
      !shouldIncludeImport(absImportPath, activeFilepath)
    ) {
      continue
    }

    const data = exportData[importPath]
    let defaultExport
    let namedExports
    let typeExports

    if (data.reexported) {
      if (data.default && !data.reexported.includes('default'))
        defaultExport = data.default
      if (data.named)
        namedExports = data.named.filter(exp => !data.reexported.includes(exp))
      if (data.types)
        typeExports = data.types.filter(exp => !data.reexported.includes(exp))
    } else {
      defaultExport = data.default
      namedExports = data.named
      typeExports = data.types
    }

    const ext = path.extname(importPath)
    const importPathNoExt = ext ? importPath.slice(0, -ext.length) : importPath

    if (
      absImportPath.endsWith('index.js') ||
      absImportPath.endsWith('index.jsx')
    ) {
      absImportPath = path.dirname(absImportPath)
    }

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
  return buildImportItems(plugin, exportData).filter(
    e => e.exportType === ExportType.type
  )
}

module.exports = {
  buildImportItems,
  buildTypeImportItems,
  ExportType,
}
