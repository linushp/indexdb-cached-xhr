const path = require('path');

module.exports = {
  devtool: 'source-map',
  entry: {
    index: './src/index.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2'
    },
    clean: true
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '.')
    },
    host: '127.0.0.1',
    port: 8080,
    open: false,
    hot: false
  }
};
