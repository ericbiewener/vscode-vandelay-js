<p align="center">
    <img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay-js/master/artwork/logo.png" width="128" height="112" />
</p>

<p align="center">
  Official JavaScript plugin for the <a href="https://github.com/ericbiewener/vscode-vandelay">Vandelay VS Code extension</a>.
  <br />
  An official <a href="https://github.com/ericbiewener/vscode-vandelay-py">Python</a> plugin also exists.
</p>

## Configuration
Most (All?) options are optional. Be sure to see config options in CORE. There are required ones
there.

#### useES5?: boolean
Defaults to `false`. If your project uses ES5 module syntax (i.e. `require`) you should set this to
true. Only `module.exports = { foo, bar }` and `module.exports = defaultExport` syntax is supported.
  
##### `padCurlyBraces: boolean`
Defaults to `true`. Whether import statements should include spaces between curly braces and import names.

##### `useSingleQuotes: boolean`
Defaults to `true`. Whether import statements should be writting with single or double quotes.

##### `useSemicolons: boolean`
Defaults to `true`. Whether import statements should be writting with semicolons.

##### `multilineImportStyle: multiple | single`
Defaults to `multiple`. Whether to allow multiple imports on a line when the import needs to span
multiple lines because it has gone over the allowed line length (LINK TO CORE README LINE LENGTH)

**multiple**
```js
import { var1, var2,
  var3 } from '...'
```

**single**
```js
import {
  var1,
  var2,
  var3
} from '...'
```

##### `commaDangle: boolean`
Defaults to `true`. Whether multiline statements should include trailing commas. Only relevant when
`multilineImportStyle` is `single`.

##### `excludePatterns?: Array<string | RegExp>`
Glob patterns or regular expressions that match filepaths which should be excluded from caching.
This plugin automatically excludes `node_modules`.

##### `processDefaultName?: filepath => ?string`
Default exports will be cached using the file name (i.e. a default export in `myFile.js` will be
named `myFile`). Implement this setting to modify this behavior on a file-by-file basis. By
returning a falsey value, the default filename-based naming will still be used.

* `filepath`: is the absolute path to the file on your computer.

```js
processDefaultName: filepath => filepath === "/Users/eric/my-project/src/foo/bar.js" ? "greatName" : null
```

##### `processImportPath?: (importPath: string, absImportPath: string, activeFilepath: string, projectRoot: string) => ?string`
When inserting a new import, this setting allows you to modify the import path that gets written to
the file. Useful if you have your build tool configured to allow absolute imports. Returning a
falsey value will all the standard relative path to be used.

* `importPath`: relative import path that will be written if you don't return a value
* `absImportPath`: absolute path of the import file
* `activeFilepath`: absolute path to the active file open in your editor
* `projectRoot`: absolute path to the root of your project

```js
processImportPath: (importPath, absImportPath, activeFilepath, projectRoot) => (
  return absImportPath.startsWith("/Users/eric/my-project/absoluteImportDirectory")
    ? absImportPath.slice(projectRoot.length + 1)
),
```

##### `absolutePaths?: string[]`
if you have configured your build tool to allow absolute path imports, specify the roots of those
absolute paths here. *This is done only to prevent them from being considered node_module imports
when caching or determining import order*. You must use `processImportPath` to have the absolute
path actually get written to the file instead of the relative path.

##### `shouldIncludeImport?: (absImportPath: string, activeFilepath: string) => boolean`
May be used to exclude certain imports from the list of options.

* `absImportPath`: absolute path of the import file
* `activeFilepath`: absolute path to the active file open in your editor

```js
    shouldIncludeImport: (absImportPath, activeFilepath) => (
      absImportPath.includes('__mocks__') && !activeFilepath.endsWith('.test.js')
    )
```

##### `preferTypeOutside?: boolean`
Defaults to `false`. If using flow, settings this to `true` will cause import statements for types
to put the type on the outside of the braces (`import type { type1, type2 } ...`) *so long as only
types are being imported from the given import path*. This can help mitigate circular dependency
issues under some circumstances. Regardless of this setting, if a value import exists for a given
path then the syntax `import { myVal, type1, type2 } ...` will be used.
