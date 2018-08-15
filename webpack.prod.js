const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  entry: './tortoiseDB.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tortoiseDB.min.js',
    library: 'TortoiseDB',
    libraryTarget: 'umd'
  }
};
