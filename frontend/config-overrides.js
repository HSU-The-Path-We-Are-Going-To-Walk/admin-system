const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
    // Node.js 폴리필 추가
    config.plugins = [
        ...config.plugins,
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            Buffer: ['buffer', 'Buffer'],
        }),
    ];

    // Node.js 모듈 폴백(fallback) 설정
    config.resolve = {
        ...config.resolve,
        fallback: {
            // 필수 폴리필
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer'),
            util: require.resolve('util'),
            url: require.resolve('url'),
            querystring: require.resolve('querystring-es3'),
            os: require.resolve('os-browserify/browser'),
            https: require.resolve('https-browserify'),
            http: require.resolve('stream-http'),
            assert: require.resolve('assert'),
            zlib: require.resolve('browserify-zlib'),
            path: require.resolve('path-browserify'),
            tty: require.resolve('tty-browserify'),
            vm: require.resolve('vm-browserify'),

            // 필요하지 않은 모듈
            fs: false,
            net: false,
            constants: false,
            module: false,
        },
        alias: {
            ...config.resolve.alias,
            'process/browser': require.resolve('process/browser.js'),
        },
    };

    // 기존 webpack 5 폴리필 처리 방식
    config.ignoreWarnings = [/Failed to parse source map/];

    // process/browser.js 때문에 생기는 경고 무시
    config.module.rules.push({
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        enforce: 'pre',
        loader: require.resolve('source-map-loader'),
        resolve: {
            fullySpecified: false,
        },
    });

    return config;
};
