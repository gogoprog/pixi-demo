const path = require('path');
const webpackBaseConfig = require('./webpack.base.config.js');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = merge(webpackBaseConfig, {
    mode: 'development',
    devtool: 'eval-source-map',
    devServer: {
        // contentBase: [path.join(__dirname, '../examples/dist'), path.join(__dirname, '../static/')],
    },
    entry: {
        main: './examples/main.js',
        // graphz: './src/index.js',
        vendors: ['vue']
    },
    output: {
        path: path.resolve(__dirname, '../examples/dist'),
        filename: '[name].js',
    },
    resolve: {
        alias: {
            'graphz': path.resolve(__dirname, '../src/'),
            'vue$': 'vue/dist/vue.esm.js',
        }
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.css$/,
                use: [
                    'vue-style-loader',
                    'css-loader'
                ]
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            filename: path.join(__dirname, '../examples/dist/index.html'),
            template: path.join(__dirname, '../examples/index.html')
        }),
        new VueLoaderPlugin(),
    ]
});
