const _ = require('lodash')
const { Range, Uri, window } = require('vscode')
const { getNewLine } = require('./importing/getNewLine')
const { parseImports } = require('./regex')

async function removeUnusedImports(plugin) {
  const re = plugin.useES5 ? /require\( *['"](.*?)['"]/g : /from +["'](.*)["']/g
  const diagnostics = plugin.utils.getDiagnosticsForCodes(['no-unused-vars'])

  for (const filepath in diagnostics) {
    const editor = await window.showTextDocument(Uri.file(filepath), {
      preserveFocus: true,
      preview: false,
    })
    const { document } = editor
    const fullText = document.getText()
    const importMatches = parseImports(plugin, fullText)
    const changes = {}

    for (const diagnostic of diagnostics[filepath]) {
      re.lastIndex = document.offsetAt(diagnostic.range.end) // start searching after the diagnostic location
      const pathMatch = re.exec(fullText)
      if (!pathMatch) return
      const importMatch = importMatches.find(m => m.path === pathMatch[1])
      if (!importMatch) return

      const existingChange = changes[importMatch.path]
      const { default: defaultImport, named, types } =
        existingChange || importMatch
      const unusedImport = document.getText(diagnostic.range)

      changes[importMatch.path] = {
        default: defaultImport !== unusedImport ? defaultImport : null,
        named: named ? named.filter(n => n !== unusedImport) : [],
        types: types ? types.filter(n => n !== unusedImport) : [],
        match: importMatch,
      }
    }

    const orderedChanges = _.sortBy(changes, c => -c.match.start)

    await editor.edit(builder => {
      for (const change of orderedChanges) {
        const { default: defaultImport, named, types, match } = change
        const newLine =
          defaultImport || named.length || types.length
            ? getNewLine(plugin, match.path, change)
            : ''

        builder.replace(
          new Range(
            document.positionAt(newLine ? match.start : match.start - 1), // Delete previous \n if newLine is empty
            document.positionAt(match.end)
          ),
          newLine
        )
      }
    })

    await document.save()
  }
}

module.exports = {
  removeUnusedImports,
}
