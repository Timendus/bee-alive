const path = require('path')

module.exports = {
  mode: 'development',

  entry: {
    index: './client/index.js'
  },

  output: {
    path: path.join(__dirname, 'public'),
    filename: '[name].js'
  },

  watch: false,
  watchOptions: {
    ignored: [
      './node_modules/',
      './server/'
    ]
  }
}
