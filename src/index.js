/**
 * @file watchreload 客户端实现
 * @author sparklewhy@gmail.com
 */

var socket = require('./socket');

// 打开socket
socket.open(window.io);
