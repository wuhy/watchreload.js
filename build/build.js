var path = require('path');
var currDir = __dirname;
var cjs2iffe = require('cjs2iife');
cjs2iffe({
    dir: path.join(currDir, '..', 'src'),
    main: 'index',
    compress: false,
    output: path.join(currDir, '..', 'dist', 'watchreload.js')
});
cjs2iffe({
    dir: path.join(currDir, '..', 'src'),
    main: 'index',
    compress: true,
    output: path.join(currDir, '..', 'dist', 'watchreload.min.js')
});

