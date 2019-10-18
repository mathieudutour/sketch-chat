const path = require('path')

module.exports = {
  mode: 'production',
  entry: path.join(__dirname, './lib/handler.ts'),
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  target: 'node',
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
  externals: [
    (context, request, callback) => {
      if (request === 'express' || request === 'ws' || request === 'randomstring' || request === 'http' || request === 'url') {
        // aws-sdk is provided by default so we don't have to bundle it
        return callback(null, `commonjs ${request}`)
      }
      return callback()
    },
  ],
}
