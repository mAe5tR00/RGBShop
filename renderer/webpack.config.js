const path = require('path');

module.exports = {
  mode: 'development',
  entry: './renderer/src/index.jsx',
  output: {
    path: path.resolve(__dirname, '../public'),
    filename: 'bundle.js',
  },
  devServer: {
    static: path.resolve(__dirname, '../public'),
    port: 3000,
    hot: true,
    open: false,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
};
