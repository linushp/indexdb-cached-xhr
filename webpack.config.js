const path = require('path');

var buildObj = {
    devtool: 'source-map',
    mode: 'development',
    entry: {
        'index':'./src/index.js'
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2',
    },

    module: {
        rules: [
            {
                test: /\.js/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        babelrc: false,
                        plugins: [
                            '@babel/plugin-syntax-dynamic-import',
                            '@babel/plugin-proposal-object-rest-spread',
                            '@babel/plugin-proposal-class-properties',
                            'babel-plugin-transform-async-to-promises'
                        ],
                        presets: [
                            ['@babel/preset-env', {targets: {browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}}],
                        ]
                    }
                }
            },
        ]
    },
    devServer: {
        contentBase: './',
        open: false,
        host: '127.0.0.1',
        https: false,
        hotOnly: false,
        disableHostCheck: true,
        proxy: {},
        before: function () {

        }
    }
};

module.exports = buildObj;