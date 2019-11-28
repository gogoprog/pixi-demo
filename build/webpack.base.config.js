const path = require('path');
const webpack = require('webpack');
const WorkerPlugin = require('worker-plugin');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: "graphz",
        libraryTarget: 'umd',
    },
    module: {
        rules: [
            {
                test: /\.(vert|frag|geom|glsl)$/,
                use: 'raw-loader',
            },
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: Infinity,
                        },
                    },
                ],
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    'style-loader',
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                ],
            },
            // {
            //     // Emscripten modules don't work with Webpack's Wasm loader.
            //     test: /\.wasm$/,
            //     // This is needed to make webpack NOT process wasm files.
            //     // See https://github.com/webpack/webpack/issues/6725
            //     type: 'javascript/auto',
            //     loader: 'file-loader',
            //     // options: {
            //     //     name: '[name].[hash:5].[ext]',
            //     // },
            // },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            _: 'lodash',
            moment: 'moment',
        }),
        new WorkerPlugin(),
    ],
    node: {
        fs: 'empty'
    }
};
