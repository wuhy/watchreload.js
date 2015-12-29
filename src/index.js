/**
 * @file watchreload 客户端实现
 * @author sparklewhy@gmail.com
 */

(function (window, document, io) {

    var socket = require('./socket');

    // 打开socket
    socket.open(io);
})(window, document, window.io);
