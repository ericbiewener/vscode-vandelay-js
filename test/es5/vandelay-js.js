const path = require('path')

const src1 = path.join(__dirname, 'src1')
const src2 = path.join(__dirname, 'src2')

module.exports = {
  useES5: true,
  useSemicolons: false,
  includePaths: [
    src1,
    src2,
  ]
}
