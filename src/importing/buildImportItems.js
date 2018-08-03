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

  const sortedKeys = plugin.utils.getExportDataKeysByCachedDate(exportData)
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

    if (
      data.reexported &&
      // If activeFilepath is in a subdirectory relative to the import, import directly from the
      // import's original file location, not the reexport
      !activeFilepath.startsWith(
        path.join(
          plugin.projectRoot,
          path.dirname(data.reexported.reexportPath)
        )
      )
    ) {
      const { reexports } = data.reexported
      if (data.default && !reexports.includes('default'))
        defaultExport = data.default
      if (data.named)
        namedExports = data.named.filter(exp => !reexports.includes(exp))
      if (data.types)
        typeExports = data.types.filter(exp => !reexports.includes(exp))
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
