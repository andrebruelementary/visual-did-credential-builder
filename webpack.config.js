const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    popup: './src/popup.ts',
    background: './src/background.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "path": require.resolve("path-browserify"),
      "fs": false,
      "os": require.resolve("os-browserify/browser"),
      "url": require.resolve("url/"),
      "rxdb": false,
      "rxdb/plugins/json-dump": false,
      "rxdb/plugins/query-builder": false,
      "rxdb/plugins/update": false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
        { from: 'icons', to: 'icons', noErrorOnMissing: true },
        { from: 'src/styles', to: 'styles', noErrorOnMissing: true },
        { 
          from: 'src/components/credentialBuilder/credentialBuilder.html', 
          to: 'components/credentialBuilder/credentialBuilder.html' 
        },
        { 
          from: 'src/components/credentialBuilder/credentialBuilder.css', 
          to: 'components/credentialBuilder/credentialBuilder.css' 
        },
        { 
          from: 'src/components/templateSelector/templateSelector.html', 
          to: 'components/templateSelector/templateSelector.html' 
        },
        { 
          from: 'src/components/templateSelector/templateSelector.css', 
          to: 'components/templateSelector/templateSelector.css' 
        }
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};