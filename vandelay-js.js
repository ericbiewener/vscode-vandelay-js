const path = require('path')

const src = path.join(__dirname, 'src')
const test = path.join(__dirname, 'test')

module.exports = {
  useES5: true,
  useSemicolons: false,
  includePaths: [src, test],
}
