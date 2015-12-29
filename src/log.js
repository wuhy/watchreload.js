/**
 * @file log 模块
 * @author sparklewhy@gmail.com
 */

var options = require('./options');

/**
 * 打印日志信息
 *
 * @param {string} type 日志类型，有效值:log/warn/error
 * @param {string} msg 要打印的消息
 */
function log(type, msg) {
    var typeMap = {
        info: 'log',
        warn: 'warn',
        error: 'error'
    };
    var logLevel = {
        info: 1,
        warn: 2,
        error: 3
    };

    if (logLevel[type] < (logLevel[options.logLevel] || logLevel.info)) {
        return;
    }

    var console = window.console;
    if (console) {
        var logInfo = console[typeMap[type]] || console.log;
        if (typeof logInfo === 'function') {
            logInfo.call(console, '[watchreload-' + type + ']: ' + msg);
        }
    }
}

module.exports = exports = {
    info: function (message) {
        log('info', message);
    },

    warn: function (message) {
        log('warn', message);
    },

    error: function (message) {
        log('error', message);
    }
};
