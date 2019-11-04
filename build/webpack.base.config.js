const path = require('path');
const webpack = require('webpack');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'graphz.js',
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
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            _: 'lodash',
            moment: 'moment',
        }),
    ]
};
