const path = require('path');
const webpackBaseConfig = require('./webpack.base.config.js');
const merge = require('webpack-merge');

module.exports = merge(webpackBaseConfig, {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: '[name].js',
        library: "graphz",
        libraryTarget: 'umd',
    }
});
