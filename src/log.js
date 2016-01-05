/**
 * @file log 模块
 * @author sparklewhy@gmail.com
 */

var options = require('./options');

/**
 * 打印日志信息
 *
 * @param {string} type 日志类型，有效值:log/warn/error
 * @param {...*} msg 要打印的消息
 */
function log(type) {
    var typeMap = {
        debug: 'log',
        info: 'log',
        warn: 'warn',
        error: 'error'
    };
    var logLevel = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    var currLevel = logLevel[options.logLevel];
    (currLevel == null) && (currLevel = logLevel.info);
    if (logLevel[type] < currLevel) {
        return;
    }

    var console = window.console;
    if (console) {
        var logInfo = console[typeMap[type]] || console.log;
        if (typeof logInfo === 'function') {
            var info = '[watchreload-' + type + ']: ' + arguments[1];
            var args = Array.prototype.slice.call(arguments, 2);
            args.unshift(info);
            logInfo.apply(console, args);
        }
    }
}

module.exports = exports = {
    debug: function () {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift('debug');
        log.apply(this, args);
    },

    info: function () {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift('info');
        log.apply(this, args);
    },

    warn: function () {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift('warn');
        log.apply(this, args);
    },

    error: function () {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift('error');
        log.apply(this, args);
    }
};
