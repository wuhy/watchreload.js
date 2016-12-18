/**
 * @file watchreload 客户端
 * @author sparklewhy@gmail.com
 */

var command = require('./command');
var socket = require('./socket');

socket.on('*', function (type, data) {
    var handler = command[type];
    try {
        handler && handler(data, socket);
    }
    catch (ex) {
        command.reloadPage();
    }
});

// 打开socket
socket.open(window.io);

