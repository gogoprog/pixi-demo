const path = require('path');
const webpack = require('webpack');

module.exports = {
    module: {
        rules: [
            {
                test: /\.(vert|frag|geom|glsl)$/,
                use: 'raw-loader',
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
    ],
    node: {
        fs: 'empty'
    }
};
