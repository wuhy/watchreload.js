/**
 * @file 和服务器通信接口定义
 * @author sparklewhy@gmail.com
 */

var logger = require('./log');
var command = require('./command');

module.exports = exports = {

    /**
     * 初始化消息接收监听器
     */
    initMessageListener: function () {
        var socket = this._socket;
        var io = this._io;
        socket.on('command', function (data) {
            logger.info('receive command: ' + io.JSON.stringify(data));
            var handler = command[data.type];
            delete data.type;
            handler && handler(data);
        });

        socket.on('connect', function () {
            socket.emit('register', {
                name: window.navigator.userAgent
            });
            logger.info('connection is successful.');
        });
        socket.on('disconnect', function () {
            logger.info('connection is disconnected.');
        });
        socket.on('reconnecting', function () {
            logger.info('reconnection...');
        });
    },

    /**
     * 向服务端发送消息
     *
     * @param {string} msgType 发送的消息类型
     * @param {Object} data 要发送消息数据
     */
    sendMessage: function (msgType, data) {
        var socket = this._socket;
        if (socket) {
            socket.emit(msgType, data || {});
        }

    },

    /**
     * 打开socket通信，同时开始监听进入的消息
     *
     * @param {Object} io io 实例
     */
    open: function (io) {
        // NOTICE: 这里端口使用变量方式，便于保持跟服务器端启用的端口一致
        this._io = io;
        this._socket = io.connect('http://{{ip}}:{{port}}');
        this.initMessageListener();
    },

    /**
     * 关闭socket通信
     */
    close: function () {
        var socket = this._socket;
        socket.removeAllListeners();
        socket.disconnect();
        this._socket = this._io = null;
    }
};
