(function (window) {

    /**
     * get the given module id definition
     *
     * @param {string} id the absolute module id to require
     * @return {*}
     * @private
     */
    var _require = function (id) {
        var segments = id.split('/');
        var value = _global;
        for (var i = 0, len = segments.length; i < len; i++) {
            var key = segments[i];
            if (key) {
                value = value[key];
            }
        }
        return value;
    };

    // init the namespace
    var _global = {"common":{"constant":{},"event":{},"util":{},"dom":{}},"command":{},"options":{},"socket":{},"module":{},"index":{},"log":{},"hmr":{}};

    // all modules definition
    

var _exports = {};
var _module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file 事件监听模块
 * @author sparklewhy@gmail.com
 */
function EventListener() {
}
EventListener.prototype._getListener = function (type) {
    if (type === '*') {
        return this._allEvents || (this._allEvents = []);
    }
    if (!this._listener) {
        this._listener = {};
    }
    if (type) {
        var listener = this._listener[type] || [];
        this._listener[type] = listener;
        return listener;
    }
    return this._listener;
};
EventListener.prototype.on = function (type, handler) {
    var listeners = this._getListener(type);
    listeners.push(handler);
    return this;
};
EventListener.prototype.once = function (type, handler) {
    var me = this;
    var onceHandler = function () {
        me.un(type, onceHandler);
        handler.apply(this, arguments);
    };
    this.on(type, onceHandler);
    return this;
};
EventListener.prototype.un = function (type, handler) {
    var argsNum = arguments.length;
    var listeners = this._getListener(type);
    switch (argsNum) {
    case 0:
        this._listener = {};
        this._allEvents = [];
        break;
    case 1:
        listeners.length = 0;
        break;
    default:
        for (var i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i] === handler) {
                listeners.splice(i, 1);
                break;
            }
        }
    }
    return this;
};
EventListener.prototype.emit = function (type, data) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();
    var listeners = this._getListener(type);
    for (var i = listeners.length - 1; i >= 0; i--) {
        listeners[i].apply(this, args);
    }
    var allEvents = this._getListener('*');
    for (i = allEvents.length - 1; i >= 0; i--) {
        allEvents[i].apply(this, arguments);
    }
    return this;
};
EventListener.extends = function (proto) {
    var superProto = EventListener.prototype;
    for (var k in superProto) {
        if (superProto.hasOwnProperty(k)) {
            proto[k] = superProto[k];
        }
    }
};
module.exports = exports = EventListener;
})(_module, _exports, _require);
_global['common']['event'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file reload 选项定义
 * @author sparklewhy@gmail.com
 */
module.exports = exports = {
    /**
     * 打印 log 层级
     *
     * @type {string}
     */
    logLevel: 'info',
    /**
     * 是否开启 hmr
     *
     * @type {boolean}
     */
    hmr: false
};
})(_module, _exports, _require);
_global['options'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file log 模块
 * @author sparklewhy@gmail.com
 */
var options = require('options');
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
    currLevel == null && (currLevel = logLevel.info);
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
})(_module, _exports, _require);
_global['log'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file 和服务器通信接口定义
 * @author sparklewhy@gmail.com
 */
var logger = require('log');
var EventListener = require('common/event');
var socket = {
    /**
     * 初始化消息接收监听器
     */
    initMessageListener: function () {
        var socket = this._socket;
        var me = this;
        socket.on('command', function (info) {
            var type = info.type;
            me.emit(type, info.data);
            logger.debug('receive %s command: %O', type, info);
        });
        socket.on('connect', function () {
            socket.emit('register', { name: window.navigator.userAgent });
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
        this._socket = io('{{socketUrl}}');
        this.initMessageListener();
    },
    /**
     * 关闭socket通信
     */
    close: function () {
        var socket = this._socket;
        socket.disconnect();
        this._socket = this._io = null;
    }
};
EventListener.extends(socket);
module.exports = exports = socket;
})(_module, _exports, _require);
_global['socket'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file 工具方法
 * @author sparklewhy@gmail.com
 */
module.exports = exports = {
    /**
     * 去除字符串前后空白字符
     *
     * @param {string} str 要处理的字符串
     * @return {string}
     */
    trim: function (str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    },
    /**
     * 判断给定的的值是否是数组
     *
     * @param {*} value 要判断的值
     * @return {boolean}
     */
    isArray: function (value) {
        return '[object Array]' === Object.prototype.toString.call(value);
    },
    /**
     * 将给定的要作为正则表达式的字符串做下转义
     *
     * @param {string} str 要转义的字符串
     * @return {string}
     */
    escapeRegExp: function (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    },
    /**
     * 获取路径 `/` 分隔的部分，移除空的部分
     *
     * @param {string} path 要分隔的路径
     * @return {Array.<string>}
     */
    getPathSegments: function (path) {
        var segments = path.split('/');
        var validSegments = [];
        for (var i = 0, len = segments.length; i < len; i++) {
            var part = segments[i];
            if (part) {
                validSegments.push(part);
            }
        }
        return validSegments;
    },
    /**
     * 判断给定的请求路径是否是完整路径
     *
     * @param {string} path 要判断的路径
     * @return {boolean}
     */
    isAbsolutePath: function (path) {
        return /^(\w+:)?\/\//.test(path);
    },
    /**
     * 获取给定的相对路径基于base的绝对路径，若未给定base，默认根据当前浏览器访问的路径信息
     * 作为基路径信息。
     *
     * 如果给定的相对路径已经是完整路径信息，则原值返回。
     *
     * @param {?string} base 要相对的基路径
     * @param {string} relative 给定的相对路径
     * @return {string}
     */
    getAbsolutePath: function (base, relative) {
        if (exports.isAbsolutePath(relative)) {
            return relative;
        }
        if (base) {
            base = exports.parseURL(base).url;
        } else {
            base = exports.parseURL(window.location.href).url;
        }
        var relativePathInfo = exports.parseURL(relative);
        var fullPaths = exports.getPathSegments(base);
        var relativePaths = exports.getPathSegments(relativePathInfo.url);
        // 如果给定的基路径不以 `/` 结尾，则移除当前文件名
        if (!/\/$/.test(base)) {
            fullPaths.pop();
        }
        for (var i = 0, len = relativePaths.length; i < len; i++) {
            var part = relativePaths[i];
            if (part === '.') {
                continue;
            }
            if (part === '..') {
                fullPaths.pop();
            } else {
                fullPaths.push(part);
            }
        }
        // 协议后面加上斜杠
        var firstPart = fullPaths[0];
        if (/^\w+:$/.test(firstPart)) {
            fullPaths[0] = firstPart + '/';
        }
        return fullPaths.join('/') + relativePathInfo.param + relativePathInfo.hash;
    },
    /**
     * 解析给定的url
     * 返回解析后的url的路径信息、查询参数信息（包括 `?` ）和 hash信息（包括 `#` ）
     *
     * @param {string} url 要解析的url
     * @return {{ url: string, param: string, hash: string }}
     */
    parseURL: function (url) {
        var index;
        var hash = '';
        if ((index = url.indexOf('#')) >= 0) {
            hash = url.slice(index);
            url = url.slice(0, index);
        }
        var param = '';
        if ((index = url.indexOf('?')) >= 0) {
            param = url.slice(index);
            url = url.slice(0, index);
        }
        return {
            url: url,
            param: param,
            hash: hash
        };
    },
    /**
     * 为给定的url添加查询时间戳参数作为版本号。
     * 如果给定的url已经包含查询时间戳参数`browserreload`，
     * 则查询参数值自动替换为最新的。
     * 否则，自动追加该查询参数。
     *
     * @param {string} url 要添加查询参数的url
     * @param {number|string=} timeStamp 要添加的时间戳，可选，默认用当前时间
     * @return {string}
     */
    addQueryTimestamp: function (url, timeStamp) {
        var urlInfo = exports.parseURL(url);
        var param = urlInfo.param;
        var versionParam = '_wr=' + (timeStamp || new Date().getTime());
        var newParam = param.replace(/(\?|&)_wr=(\d+)/, '$1' + versionParam);
        if (newParam === param) {
            newParam = param + ((param ? '&' : '?') + versionParam);
        }
        return urlInfo.url + newParam + urlInfo.hash;
    },
    /**
     * 获取给定路径信息的匹配比例，从后往前比较，返回匹配比例的百分值。
     *
     * @param {Array.<string>} rawPaths 原路径信息
     * @param {Array.<string>} toMatchPaths 要比较的路径信息
     * @return {number}
     */
    getMatchRatio: function (rawPaths, toMatchPaths) {
        var rawLen = rawPaths.length;
        var toMatchLen = toMatchPaths.length;
        var matchNum = 0;
        for (var i = rawLen - 1, j = toMatchLen - 1; i >= 0 && j >= 0; i--, j--) {
            if (rawPaths[i] === toMatchPaths[j]) {
                matchNum++;
            } else {
                break;
            }
        }
        return parseInt(matchNum / rawLen * 100, 10);
    },
    /**
     * 从给定的文件列表里，查找文件路径跟要查找的目标文件路径最大匹配的文件，如果有多个完全
     * 匹配的文件，则返回数组，否则只返回最大匹配的那个文件，若有多个匹配程度一样，只返回其中
     * 一个。
     *
     * @param {string} path 要查找的目标文件路径
     * @param {Array.<Object>} fileInfoList 给定的文件信息列表
     *        文件信息要求包含文件链接地址信息：
     *        {
     *             href: string,
     *             fullHref: string // 若未给定，默认基于当前浏览页面路径获取
     *                              // 完整的链接地址
     *        }
     * @return {Array.<Object>}
     *         返回匹配文件对象结构：
     *         { ratio: number, isFullMatch: boolean, file: Object }
     */
    findMaxMatchFile: function (path, fileInfoList) {
        var changePaths = exports.getPathSegments(exports.parseURL(path).url);
        var maxMatch = null;
        var maxMatchFiles = [];
        for (var i = 0, len = fileInfoList.length; i < len; i++) {
            var file = fileInfoList[i];
            var fullHref = file.fullHref || exports.getAbsolutePath(null, file.href);
            var toMatchPaths = exports.getPathSegments(exports.parseURL(fullHref).url);
            var ratio = exports.getMatchRatio(changePaths, toMatchPaths);
            var isFullMatch = ratio === 100;
            if (!maxMatch || isFullMatch || maxMatch.ratio < ratio) {
                maxMatch = {
                    file: file,
                    ratio: ratio,
                    isFullMatch: isFullMatch
                };
                if (isFullMatch) {
                    maxMatchFiles.push(maxMatch);
                }
            }
        }
        if (!maxMatchFiles.length && maxMatch) {
            maxMatchFiles.push(maxMatch);
        }
        return maxMatchFiles;
    },
    /**
     * 继承
     *
     * @param {Function} child 子类
     * @param {Function} parent 父类
     * @return {Function}
     */
    inherits: function (child, parent) {
        var Empty = function () {
            this._super = parent.prototype;
        };
        Empty.prototype = parent.prototype;
        var proto = new Empty();
        var subProto = child.prototype;
        for (var k in subProto) {
            if (subProto.hasOwnProperty(k)) {
                proto[k] = subProto[k];
            }
        }
        subProto.constructor = child;
        child.prototype = subProto;
        return child;
    },
    /**
     * 查找给定的数据项在数组中的索引
     *
     * @param {*} item 要查找的数据项
     * @param {Array} arr 目标数组
     * @return {number}
     */
    findInArray: function (item, arr) {
        var found = -1;
        for (var i = 0, len = arr.length; i < len; i++) {
            if (item === arr[i]) {
                found = i;
                break;
            }
        }
        return found;
    },
    /**
     * 判断给定的数据项是否在给定的数组里
     *
     * @param {*} item 要查找的数据项
     * @param {Array} arr 目标数组
     * @return {boolean}
     */
    isInArr: function (item, arr) {
        return exports.findInArray(item, arr) !== -1;
    }
};
})(_module, _exports, _require);
_global['common']['util'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file module hot api 接口定义
 * @author sparklewhy@gmail.com
 */
var util = require('common/util');
var logger = require('log');
function addCallback(target, callback) {
    if (target.indexOf(callback) === -1 && typeof callback === 'function') {
        target.push(callback);
    }
}
function removeCallback(target, callback) {
    var index = target.indexOf(callback);
    if (index !== -1) {
        target.splice(index, 1);
    }
}
var hotCurrentModuleData = {};
module.exports = exports = {};
exports.hot = function (moduleId) {
    var hot = {
        /* eslint-disable fecs-camelcase */
        _acceptedDependencies: {},
        _declinedDependencies: {},
        _selfAccepted: false,
        _selfDeclined: false,
        _disposeHandlers: [],
        /* eslint-enable fecs-camelcase */
        data: hotCurrentModuleData[moduleId],
        active: true,
        accept: function (dep, callback) {
            if (typeof dep === 'undefined') {
                hot._selfAccepted = true;
            } else if (typeof dep === 'function') {
                hot._selfAccepted = dep;
            } else if (util.isArray(dep)) {
                for (var i = 0, len = dep.length; i < len; i++) {
                    hot._acceptedDependencies[dep[i]] = callback;
                }
            } else if (dep && typeof dep === 'string') {
                hot._acceptedDependencies[dep] = callback;
            }
        },
        decline: function (dep) {
            if (typeof dep === 'undefined') {
                hot._selfDeclined = true;
            } else if (util.isArray(dep)) {
                for (var i = 0, len = dep.length; i < len; i++) {
                    hot._declinedDependencies[dep[i]] = true;
                }
            } else if (dep && typeof dep === 'string') {
                hot._declinedDependencies[dep] = true;
            }
        },
        dispose: function (callback) {
            addCallback(hot._disposeHandlers, callback);
        },
        addDisposeHandler: function (callback) {
            addCallback(hot._disposeHandlers, callback);
        },
        removeDisposeHandler: function (callback) {
            removeCallback(hot._disposeHandlers, callback);
        }    // Management API
             // check: function () {},
             // apply: function () {},
             //
             // status: function (l) {
             //     if (!l) {
             //         return hotStatus;
             //     }
             //
             //     hotStatusHandlers.push(l);
             // },
             //
             // addStatusHandler: function (callback) {
             //     addCallback(hotStatusHandlers, callback);
             // },
             //
             // removeStatusHandler: function (callback) {
             //     removeCallback(hotStatusHandlers, callback);
             // }
    };
    return hot;
};
exports.disposeModule = function (moduleId, module) {
    var data = {};
    logger.debug('dispose module: %s', moduleId);
    // Call dispose handlers
    var disposeHandlers = module.hot._disposeHandlers;
    for (var i = 0, len = disposeHandlers.length; i < len; i++) {
        var cb = disposeHandlers[i];
        cb(data);
    }
    hotCurrentModuleData[moduleId] = data;
    // disable module (this disables requires from this module)
    module.hot.active = false;
};
exports.isSelfAccept = function (module) {
    return module.hot._selfAccepted;
};
exports.isSelfDecline = function (module) {
    return module.hot._selfDeclined;
};
exports.isDecline = function (module, depModId) {
    return module.hot._declinedDependencies[depModId];
};
exports.selfAccept = function (module, err) {
    var callback = module.hot._selfAccepted;
    if (typeof callback === 'function') {
        callback(err);
    }
};
exports.accept = function (upModInfos, upModDepInfo) {
    var callbacks = [];
    var upModIds = [];
    for (var i = 0, len = upModInfos.length; i < len; i++) {
        var mod = upModInfos[i];
        upModIds[i] = mod.id;
        var depModIds = upModDepInfo[mod.id];
        if (!depModIds) {
            continue;
        }
        for (var j = 0, jLen = depModIds.length; j < jLen; j++) {
            addCallback(callbacks, mod.define.hot._acceptedDependencies[depModIds[j]]);
        }
    }
    for (var k = 0, kLen = callbacks.length; k < kLen; k++) {
        callbacks[k](upModIds);
    }
};
})(_module, _exports, _require);
_global['hmr'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file 模块缓存管理
 * @author sparklewhy@gmail.com
 */
var util = require('common/util');
var hmr = require('hmr');
var logger = require('log');
/* eslint-disable fecs-camelcase */
/**
 * id 跟 path 转换缓存
 */
var _id2PathMap = {};
var _path2IdMap = {};
/**
 * 缓存加载过的加载中模块信息
 */
var _cacheModule = window._hmrCacheModule = {};
var _loadingModules = window._hmrLoadingModules = {};
/**
 * 当前模块更新所处的状态
 *
 * @type {string}
 */
var _status;
/**
 * 等待更新的模块列表
 *
 * @type {Array.<Object>}
 */
var _waitingUpdateModules = [];
/**
 * 当前重新加载的模块
 *
 * @type {Object}
 */
var _reloadModule;
/**
 * 模块重新加载完成要执行的回调
 *
 * @type {Function}
 */
var _reloadDoneCallback;
/**
 * 热替换状态常量定义
 *
 * @type {Object}
 */
var HMR_STATUS = {
    IDLE: 'idle',
    PREPARE: 'prepare',
    APPLY: 'apply'
};
/**
 * 解析资源 id
 *
 * @param {string} id 要解析的资源 id
 * @return {{module: string, resource: ?string}}
 */
function parseResource(id) {
    var index = id.indexOf('!');
    if (index === -1) {
        return { module: id };
    }
    return {
        module: id.substring(0, index),
        resource: id.substr(index + 1)
    };
}
/**
 * 资源 id 转成路径
 *
 * @param {string} id 资源 id
 * @param {boolean} isPluginResource 是否是插件资源
 * @return {string}
 */
function id2Path(id, isPluginResource) {
    var path = _id2PathMap[id];
    if (path) {
        return path;
    }
    var a = document.createElement('a');
    a.href = window.require.toUrl(id);
    path = a.pathname.replace(/^\//, '') + (isPluginResource ? '' : '.js');
    _id2PathMap[id] = path;
    _path2IdMap[path] = id;
    logger.debug('init id to path: %s => %s', id, path);
    return path;
}
/**
 * 移除已经存在的模块脚本元素
 *
 * @param {string} id 要移除脚本所引用的模块 id
 */
function removeExistedScriptElement(id) {
    var scripts = document.getElementsByTagName('script');
    var found;
    for (var i = 0, len = scripts.length; i < len; i++) {
        if (scripts[i].getAttribute('data-require-id') === id) {
            found = scripts[i];
            break;
        }
    }
    if (found) {
        found.parentNode.removeChild(found);
    }
}
/**
 * 初始化模块
 *
 * @param {string} id 资源 id
 * @param {Object} module 初始化的模块对象
 */
window._hmrInitModule = function (id, module) {
    _cacheModule[id] = module;
    // 增加 module hmr api
    module.hot = hmr.hot(id);
    if (_status == null) {
        _status = HMR_STATUS.IDLE;
    }
    // init id path map information
    var resInfo = parseResource(id);
    var resId = resInfo.resource;
    if (resId) {
        id2Path(resId, true);
    } else {
        id2Path(id);
    }
};
/**
 * 初始化重新加载的 url
 *
 * @param {string} id 加载资源 id
 * @param {string} url 重新加载的 url
 * @return {string}
 */
window._hmrInitReloadUrl = function (id, url) {
    if (_reloadModule && id === _reloadModule.id) {
        removeExistedScriptElement(id);
        url += url.indexOf('?') !== -1 ? '&' : '?';
        url += '_t=' + new Date().getTime();
    }
    return url;
};
/**
 * 模块重新加载完成，如果失败也会触发该回调
 *
 * @param {string} id 重新加载完成的模块 id
 */
window._hmrReloadDone = function (id) {
    if (_reloadModule && id === _reloadModule.id) {
        _reloadDoneCallback(_reloadModule);
        _reloadDoneCallback = _reloadModule = null;
    }
};
/**
 * 重新加载初始化模块
 *
 * @param {Object} module 要重新加载的模块
 * @param {Function} callback 重新加载完成执行的回调
 */
function reloadModule(module, callback) {
    if (!module.id) {
        callback();
        return;
    }
    var moduleId = module.id;
    var mod = _cacheModule[moduleId];
    var defined = module.inited;
    if (mod && defined) {
        try {
            hmr.disposeModule(moduleId, mod);
            logger.debug('redefine module: %s', mod.id);
            var localRequire = mod.require;
            if (localRequire) {
                localRequire.clearCache && localRequire.clearCache();
            }
            mod.resetPrepareState && mod.resetPrepareState();
            mod.invokeFactory && mod.invokeFactory();
            callback(module);
        } catch (ex) {
            if (hmr.isSelfAccept(mod.define)) {
                hmr.selfAccept(mod.define, ex);
            }
        }
        return;
    }
    // 每次模块变更只会触发一个模块的重新加载，其他过期的父模块只需重新定义即可
    _reloadModule = module;
    _reloadDoneCallback = callback;
    logger.debug('require id: %s', moduleId);
    window.require([moduleId], null, !defined);
}
// TODO module plugin resource change update?
// TODO entry script in html replacement and reexecute
/**
 * 移除缓存的模块
 *
 * @param {string} path 要移除的模块路径
 */
function removeCacheModule(path) {
    var id = _path2IdMap[path];
    if (id) {
        var oldMod = _cacheModule[id];
        oldMod && hmr.disposeModule(id, oldMod);
        delete _loadingModules[id];
        delete _cacheModule[id];
    }
}
/**
 * 获取模块元数据信息
 *
 * @param {Object} module 要获取的模块信息
 * @return {Object}
 */
function getModuleMetaData(module) {
    var id = module.id;
    var resInfo = parseResource(id);
    var resId = resInfo.resource;
    if (resId) {
        return {
            id: resId,
            path: id2Path(resId, true),
            plugin: resInfo.module
        };
    }
    var path = id2Path(id);
    var metaData = {};
    metaData.id = id;
    metaData.path = path;
    metaData.define = module;
    // 初始化依赖的模块
    var deps = module.depMs || [];
    var depModPaths = [];
    for (var i = 0, len = deps.length; i < len; i++) {
        depModPaths[i] = id2Path(deps[i].absId);
    }
    metaData.depModules = depModPaths;
    // 初始化依赖的资源
    var depRes = module.depRs || [];
    var depResPaths = [];
    for (i = 0, len = depRes.length; i < len; i++) {
        if (depRes[i].absId) {
            depModPaths[i] = id2Path(parseResource(depRes[i].absId).resource, true);
        } else {
            depModPaths[i] = util.getAbsolutePath(path, depRes[i].res);
        }
    }
    metaData.depResources = depResPaths;
    metaData.inited = module.state === 4;
    // 如果定义过，则认为初始化过
    return metaData;
}
/**
 * 获取给定模块的路径的所有父模块
 *
 * @param {string} path 获取给定的模块路径的所有父模块
 * @return {Array.<string>}
 */
function getParentModule(path) {
    var parents = [];
    for (var k in _cacheModule) {
        if (_cacheModule.hasOwnProperty(k) && k !== path) {
            var module = getModuleMetaData(_cacheModule[k]);
            if (module) {
                var deps = module.depModules || [];
                var index = util.findInArray(path, deps);
                if (index !== -1 && !util.isInArr(deps[index], parents)) {
                    parents.push(module.path);
                }
            }
        }
    }
    return parents;
}
/**
 * 初始化过期的模块
 *
 * @inner
 * @param {Object} upModule 当前变更的模块
 * @param {Array.<Object>} result 所有过期的模块
 * @param {boolean=} ignore 是否忽略当前过期模块
 * @param {Object} initedPathMap 已经初始化过的模块路径
 * @param {Object} depMap 模块依赖信息的缓存
 */
function initOutdatedModules(upModule, result, ignore, initedPathMap, depMap) {
    var upModPath = upModule.path;
    if (initedPathMap[upModPath]) {
        return;
    }
    initedPathMap[upModPath] = 1;
    if (upModule.define && hmr.isSelfDecline(upModule.define)) {
        throw new Error('Aborted because of self decline: ' + upModule.id);
    }
    if (!ignore && upModule.inited) {
        if (!util.isInArr(module, result)) {
            result.push(module);
        }
    }
    // 模块不存在，可能一开始是加载失败，导致依赖该模块的模块没法正常初始化，
    // 这些模块也属于过期模块
    var parents = getParentModule(upModPath);
    if (parents) {
        for (var i = 0, len = parents.length; i < len; i++) {
            var parentModule = exports.getModuleMetaData(parents[i]) || { path: parents[i] };
            // 初始化已经存在的模块依赖信息
            if (parentModule.id && upModule.id) {
                if (hmr.isDecline(parentModule.define, upModule.id)) {
                    throw new Error('Aborted because of declined dependency: ' + upModule.id + ' in ' + parentModule.id);
                }
                var depIds = depMap[parentModule.id];
                if (!depIds) {
                    depIds = depMap[parentModule.id] = [];
                }
                if (depIds.indexOf(upModule.id) === -1) {
                    depIds.push(upModule.id);
                }
            }
            initOutdatedModules(parentModule, result, false, initedPathMap, depMap);
        }
    }
}
/**
 * 应用等待更新的模块
 *
 * @inner
 */
function applyUpdate() {
    exports.setStatus(HMR_STATUS.IDLE);
    if (_waitingUpdateModules.length) {
        var updateModule = _waitingUpdateModules.shift();
        exports.updateModule(updateModule);
    }
}
/**
 * 获取缓存的模块元信息
 *
 * @param {string} path 要获取的模块路径
 * @return {?Object}
 */
exports.getModuleMetaData = function (path) {
    var id = _path2IdMap[path];
    if (id && _cacheModule[id]) {
        return getModuleMetaData(_cacheModule[id]);
    }
};
/**
 * 更新模块
 *
 * @param {Object} data 更新的模块信息
 * @param {string} data.path 更新的模块的路径
 * @param {string=} data.hash 新的模块的内容的 hash
 * @param {boolean=} data.removed 该模块是否被移除
 */
exports.updateModule = function (data) {
    if (!this.isIdle()) {
        _waitingUpdateModules.push(data);
        return;
    }
    this.setStatus(HMR_STATUS.APPLY);
    // 如果模块未发生变化则忽略此次更新
    var path = data.path;
    var updateModule = this.getModuleMetaData(path);
    if (updateModule.hash === data.hash) {
        applyUpdate();
        return;
    }
    // 如果模块还没初始化 或 明确声明自更新，则只需更新当前变更的模块
    var outdatedModules = [];
    var depMap = {};
    if (!updateModule.inited || hmr.isSelfAccept(updateModule.define)) {
    } else {
        initOutdatedModules(updateModule, outdatedModules, true, {}, depMap);
    }
    var allUpMods = [].concat(outdatedModules);
    if (updateModule.id) {
        allUpMods.push(updateModule);
    }
    var total = outdatedModules.length;
    var counter = 0;
    var done = function () {
        counter++;
        if (counter >= total) {
            // 接受代码更新
            hmr.accept(allUpMods, depMap);
            applyUpdate();
        }
    };
    // 先移除变更的模块，再重新更新所有过期的模块
    removeCacheModule(path);
    var updateOutdateModules = function () {
        for (var i = 0; i < total; i++) {
            var module = outdatedModules[i];
            reloadModule(module, done);
        }
        if (!total) {
            done();
        }
    };
    var isModuleRemoved = data.removed;
    if (isModuleRemoved) {
        updateOutdateModules();
    } else {
        // 先确保要重新加载的模块已经 ready 再更新其它过期的父模块
        reloadModule(updateModule, updateOutdateModules);
    }
};
/**
 * 移除模块
 *
 * @param {Array.<string>|string} paths 被移除的模块路径
 */
exports.removeModule = function (paths) {
    if (!util.isArray(paths)) {
        paths = [paths];
    }
    for (var i = 0, len = paths.length; i < len; i++) {
        this.updateModule({
            path: paths[i],
            removed: true
        });
    }
};
/**
 * 添加新的模块
 *
 * @param {Array.<Object>|Object} modules 添加的模块
 */
exports.addModule = function (modules) {
    if (!util.isArray(modules)) {
        modules = [modules];
    }
    for (var i = 0, len = modules.length; i < len; i++) {
        this.updateModule(modules[i]);
    }
};
/**
 * 同步模块信息
 *
 * @param {Array.<Object>} modules 要同步的模块
 */
exports.syncModule = function (modules) {
    for (var i = 0, len = modules.length; i < len; i++) {
        this.updateModule(modules[i]);
    }
};
/**
 * 获取当前所有要被同步的运行的模块
 *
 * @return {?{modules: Array.<string>, resources: Array.<string>}}
 */
exports.getSyncModules = function () {
    var modules = [];
    var resources = [];
    for (var k in _cacheModule) {
        if (_cacheModule.hasOwnProperty(k)) {
            var item = _cacheModule[k];
            var resInfo = parseResource(item.id);
            if (resInfo.resource) {
                resources.push(id2Path(resInfo.resource));
            } else {
                modules.push(id2Path(resInfo.module));
            }
        }
    }
    if (modules.length || resources.length) {
        return {
            modules: modules,
            resources: resources
        };
    }
    return null;
};
/**
 * 热替换状态常量
 *
 * @type {Object}
 */
exports.HMR_STATUS = HMR_STATUS;
/**
 * 设置当前所处状态
 *
 * @param {string} status 当前状态，可用的状态定义见 {@link HMR_STATUS}
 */
exports.setStatus = function (status) {
    _status = status;
};
/**
 * 判断当前模块更新是否处于空闲状态
 *
 * @return {boolean}
 */
exports.isIdle = function () {
    return _status === HMR_STATUS.IDLE;
};    /* eslint-enable fecs-camelcase */
})(_module, _exports, _require);
_global['module'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file 常量定义
 * @author sparklewhy@gmail.com
 */
/**
 * 用于提取样式值包括import包含的 url(xxx) 里包含的链接地址
 *
 * @type {RegExp}
 * @const
 */
exports.URL_STYLE_REGEXP = /url\s*\(\s*['"]?\s*([^\s'"]*)\s*['"]?\s*\)/g;
})(_module, _exports, _require);
_global['common']['constant'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file dom 操作相关工具方法
 * @author sparklewhy@gmail.com
 */
var util = require('common/util');
var constant = require('common/constant');
var URL_STYLE_REGEXP = constant.URL_STYLE_REGEXP;
/**
 * 轮询样式加载状态，对于不支持样式元素onload事件的fallback方式
 *
 * @param {HTMLElement} styleElem 样式元素
 * @param {Function} callback 样式加载完成要执行的回调
 */
function pollStyleLoadState(styleElem, callback) {
    var isLoaded = false;
    // 对于ie由于支持onload事件，因此这里不需要考虑ie<9版本不支持sheet属性
    // 此外对于ie>8,linkNode.sheet 和 cssRules 在 css 插入 DOM 后都立刻可访问，
    // cssRules 为 []，因此该轮询方法不适合ie
    var styleSheet = styleElem.sheet;
    var navigator = window.navigator;
    if (/webkit/i.test(navigator.userAgent)) {
        // for webkit
        // Chrome / Safari:
        // linkNode.sheet 在 css 文件下载完成并解析好后才有值，之前为 undefined
        // linkNode.sheet.cssRules 同域时返回 CSSRuleList, 跨域时返回 null
        isLoaded = !!styleSheet || styleSheet === null;
    } else if (styleSheet) {
        // for firefox
        // linkNode.sheet 在 css 插入 DOM 中后立刻有值，插入前为 undefined
        // linkNode.sheet.cssRules 在文件还未下好时，抛出非法访问错误
        // 在文件下载并解析好后，同域时返回 cssRuleList
        // 只要是跨域(不管对错)抛出异常 (opera貌似也是？)
        try {
            isLoaded = !!styleSheet.cssRules;
        } catch (ex) {
            if (/security|insecure/i.test(ex.message)) {
                isLoaded = true;
            }
        }
    }
    if (isLoaded) {
        setTimeout(function () {
            callback();
        }, 1);
    } else {
        setTimeout(function () {
            pollStyleLoadState(styleElem, callback);
        }, 1);
    }
}
module.exports = exports = {
    /**
     * 判断是否是IE浏览器
     *
     * @type {boolean}
     */
    isIE: !!document.createStyleSheet,
    /**
     * 样式元素支持的事件
     */
    styleEvent: {},
    /**
     * 查询DOM元素，对于不支持querySelectorAll，如果当前上下文支持jquery则使用
     *
     * @param {string} selector 查询DOM元素的选择器
     * @return {?NodeList}
     */
    querySelectorAll: function (selector) {
        if (document.querySelectorAll) {
            return document.querySelectorAll(selector);
        }
        if (typeof jQuery !== 'undefined') {
            return jQuery(selector);
        }
        return null;
    },
    /**
     * 获取页面中所有 `link` 的样式元素，不包括动态插入的正在加载的元素
     *
     * @return {Array.<HTMLElement>}
     */
    getLinkStyles: function () {
        var linkElems = document.getElementsByTagName('link');
        var linkStyles = [];
        for (var i = 0, len = linkElems.length; i < len; i++) {
            var link = linkElems[i];
            if (link.rel === 'stylesheet' && !link.browserReloading) {
                linkStyles.push(link);
            }
        }
        return linkStyles;
    },
    /**
     * 获取拥有给定的样式表的节点元素
     *
     * @param {Object} styleSheet 样式表
     * @return {HTMLElement}
     */
    getStyleOwnerNode: function (styleSheet) {
        var ownerNode;
        while (styleSheet) {
            // 对于ie9以前浏览器通过owningElement获取
            ownerNode = styleSheet.ownerNode || styleSheet.owningElement;
            if (ownerNode) {
                return ownerNode;
            }
            // 如果不存在，回溯到父样式表进行查找
            styleSheet = styleSheet.parentStyleSheet;
        }
    },
    /**
     * 提取导入的样式链接地址，兼容ie7以前浏览器，确保提取出来的链接值不包含url等非链接的
     * 信息。
     *
     * @param {string} href 导入的样式链接值
     * @return {string}
     */
    extractImportStyleHref: function (href) {
        href = util.trim(href);
        // 对于ie7早期版本，如果import的url包含media信息，href值变成：
        // url(test/myImportStyle.css) screen, print
        // 或者 "test/myImportStyle.css" screen, print
        var extractURLResult = URL_STYLE_REGEXP.exec(href);
        if (extractURLResult && extractURLResult.length === 2) {
            href = extractURLResult[1];
        } else if (!extractURLResult) {
            extractURLResult = /^\s*['"]\s*([^\s]*)\s*['"]/.exec(href);
        }
        if (extractURLResult && extractURLResult.length === 2) {
            href = extractURLResult[1];
        }
        return href;
    },
    /**
     * 获取导入的样式的完整路径
     *
     * @param {Object} importStyle 导入的样式信息
     * @return {string}
     */
    getImportStyleFullHref: function (importStyle) {
        var rule = importStyle.rule;
        var href = importStyle.href;
        var parentStyle = rule.parentStyleSheet;
        var getAbsolutePath = util.getAbsolutePath;
        var basePath = parentStyle.href && getAbsolutePath('', parentStyle.href);
        href = getAbsolutePath(basePath, href);
        return href;
    },
    /**
     * 收集导入的样式集合
     *
     * @param {Object} styleSheet 样式表
     * @param {Array.<Object>} result 收集的结果
     */
    collectImportStyles: function (styleSheet, result) {
        var ruleList;
        try {
            // firefox 对于跨域的样式访问会报错
            ruleList = styleSheet.cssRules;
        } catch (e) {
            return;
        }
        var isModernBrowser = !!ruleList;
        if (!ruleList) {
            // 对于ie9以前版本不存在cssRules属性，可以通过rules属性获取
            // 这里由于需要获取imports的rule，在ie里是不在rules集合里的
            // 所以这里通过ie特有的imports属性获取
            ruleList = styleSheet.imports;
        }
        var link = exports.getStyleOwnerNode(styleSheet);
        if (!ruleList || !ruleList.length) {
            return;
        }
        var extractImportStyleHref = exports.extractImportStyleHref;
        var getImportStyleFullHref = exports.getImportStyleFullHref;
        var collectImportStyles = exports.collectImportStyles;
        var CSSRule = window.CSSRule;
        for (var i = 0, len = ruleList.length; i < len; i++) {
            var rule = ruleList[i];
            if (CSSRule && rule.type === CSSRule.IMPORT_RULE || !CSSRule) {
                var href = extractImportStyleHref(rule.href);
                var importStyle = {
                    link: link,
                    rule: rule,
                    index: i,
                    href: href
                };
                importStyle.fullHref = getImportStyleFullHref(importStyle);
                result.push(importStyle);
                collectImportStyles(// 对于现在浏览器的import规则，需要通过styleSheet获取其样式表信息
                // 对于非import规则，不存在该属性。
                // 对于ie9以前浏览器直接通过规则的imports属性就可以递归获取到间接
                // import规则
                isModernBrowser ? rule.styleSheet : rule, result);
            }
        }
    },
    /**
     * 获取当前页面导入的样式集合包括直接和间接导入的样式表
     *
     * @return {Array.<Object>}
     */
    getImportStyles: function () {
        var styleSheets = document.styleSheets;
        var importStyles = [];
        var collectImportStyles = exports.collectImportStyles;
        for (var i = 0, len = styleSheets.length; i < len; i++) {
            collectImportStyles(styleSheets[i], importStyles);
        }
        return importStyles;
    },
    /**
     * 设置样式元素支持的事件
     *
     * @param {string} event 支持的事件名
     * @param {boolean} hasNativeSupport 该事件是否提供原生支持
     */
    setStyleSupportEvent: function (event, hasNativeSupport) {
        exports.styleEvent[event] = hasNativeSupport;
    },
    /**
     * 是否样式元素支持给定的原生事件
     *
     * @param {string} event 事件名称
     * @return {boolean}
     */
    isStyleSupportEvent: function (event) {
        return exports.styleEvent[event];
    },
    /**
     * 监听样式表加载完成回调处理
     *
     * @param {Object} styleElem 要监听的样式元素
     * @param {Function} callback 要执行的回调
     */
    styleOnLoad: function (styleElem, callback) {
        var onLoad = function () {
            if (onLoad.called) {
                return;
            }
            onLoad.called = true;
            callback && callback();
        };
        // 先尝试使用onload事件监听
        // 目前已知ie支持该事件，最新chrome33/ff28也支持该事件
        // 已知问题：当请求为404时候，在ie下 `onload` 事件依旧会触发，但在其它浏览器不会触发
        styleElem.onload = function () {
            exports.setStyleSupportEvent('load', true);
            onLoad();
        };
        // 目前已知的最新chrome33支持onerror事件
        styleElem.onerror = function () {
            onLoad();
        };
        // 如果不支持，降级使用轮询
        if (!exports.isStyleSupportEvent('load')) {
            setTimeout(function () {
                pollStyleLoadState(styleElem, onLoad);
            }, 0);
        }
    },
    /**
     * 重新加载链接的样式
     *
     * @param {HTMLElement} link 要重新加载的链接样式元素
     */
    reloadLinkStyle: function (link) {
        if (link.browserReloading) {
            return;
        }
        var cloneLink = link.cloneNode();
        cloneLink.href = util.addQueryTimestamp(cloneLink.href);
        link.browserReloading = true;
        var parentNode = link.parentNode;
        if (parentNode.lastChild === link) {
            parentNode.appendChild(cloneLink);
        } else {
            parentNode.insertBefore(cloneLink, link.nextSibling);
        }
        exports.styleOnLoad(cloneLink, function () {
            var parentNode = link.parentNode;
            if (parentNode) {
                parentNode.removeChild(link);
            }
        });
    },
    /**
     * 重新导入样式文件
     *
     * @param {Object} importStyle 要重新导入的样式对象
     */
    reloadImportStyle: function (importStyle) {
        var rule = importStyle.rule;
        var index = importStyle.index;
        var href = util.addQueryTimestamp(importStyle.fullHref);
        // 对于ie<9的浏览器media为字符串非数组
        var media = '';
        try {
            media = rule.media || '';
            typeof media !== 'string' && (media = [].join.call(rule.media, ', '));
        } catch (e) {
        }
        var newRule = '@import url("' + href + '") ' + media + ';';
        var parentStyle = rule.parentStyleSheet;
        // FIXME 已知问题，firefox28/ie9/ie10，插入的import规则的优先级不是按照插入的
        // 位置，而是莫名其妙变成父样式里的css规则里优先级最高的。。
        // chrome33/ie6/7/8均无此问题
        // 插入规则
        if (parentStyle.insertRule) {
            // all browsers, except IE before version 9
            parentStyle.insertRule(newRule, index);
        } else if (parentStyle.addImport) {
            // Internet Explorer  before version 9
            // parentStyle.addRule(newRule, index);
            parentStyle.addImport(href, index);
        }
        // 移除旧的规则
        var removePosition = index + 1;
        if (parentStyle.deleteRule && parentStyle.cssRules.length > removePosition) {
            parentStyle.deleteRule(removePosition);
        } else if (parentStyle.removeImport && parentStyle.imports.length > removePosition) {
            parentStyle.removeImport(removePosition);
        }
    }
};
// 对于IE的样式元素原生支持load事件
if (exports.isIE) {
    exports.setStyleSupportEvent('load', true);
}
})(_module, _exports, _require);
_global['common']['dom'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file reload 命令相关接口定义
 * @author sparklewhy@gmail.com
 */
var dom = require('common/dom');
var util = require('common/util');
var options = require('options');
var moduleManage = require('module');
var constant = require('common/constant');
var URL_STYLE_REGEXP = constant.URL_STYLE_REGEXP;
/**
 * 图片相关样式定义
 * Refer [livereload](https://github.com/livereload/livereload-js)
 *
 * @type {Array.<Object>}
 * @const
 */
var IMAGE_STYLES = [
    {
        selector: 'background',
        styleNames: ['backgroundImage']
    },
    {
        selector: 'border',
        styleNames: [
            'borderImage',
            'webkitBorderImage',
            'MozBorderImage'
        ]
    }
];
/**
 * 更新 css 图片相关的样式
 *
 * @param {Object} style 要更新的样式对象
 * @param {Array.<string>} styleNames 要更新的样式名称
 * @param {Object} updateImageInfo 要更新的图片信息
 * @param {string=} updateImageInfo.basePath 更新的图片路径的基路径，可选，默认为当
 *                                 前页面路径
 * @param {string=} updateImageInfo.path 更新的图片路径
 * @param {string} updateImageInfo.reloadVersion 要更新的图片重新加载的版本号
 * @return {boolean}
 */
function updateCSSImageStyle(style, styleNames, updateImageInfo) {
    var basePath = updateImageInfo.basePath;
    var path = updateImageInfo.path;
    var reloadVersion = updateImageInfo.reloadVersion;
    var hasUpdate = false;
    var escapeRegExp = util.escapeRegExp;
    for (var i = 0, len = styleNames.length; i < len; i++) {
        var name = styleNames[i];
        var value = style[name];
        if (!value) {
            continue;
        }
        // 类似于background-image可能会设置多个 url(xxx)
        var maxMatchImage = null;
        var result;
        var imgHref;
        while (result = URL_STYLE_REGEXP.exec(value)) {
            imgHref = result.length === 2 ? result[1] : null;
            if (!imgHref) {
                continue;
            }
            maxMatchImage = util.findMaxMatchFile(path, [{ fullHref: util.getAbsolutePath(basePath, imgHref) }])[0];
            if (maxMatchImage.isFullMatch) {
                break;
            }
        }
        if (maxMatchImage && maxMatchImage.isFullMatch) {
            // 由于同一张图片可能会重复出现，这里若用正则，不能简单：
            // new RegExp(imgHref, 'g') ，需要对imgHref做转义，比如 .
            style[name] = value.replace(new RegExp(escapeRegExp(imgHref), 'g'), util.addQueryTimestamp(imgHref, reloadVersion));
            hasUpdate = true;
        }
    }
    return hasUpdate;
}
/**
 * 更新样式表单的图片相关的样式
 *
 * @param {Object} styleSheet 要更新的样式表单
 * @param {Object} updateImageInfo 要更新的图片信息
 * @param {string=} updateImageInfo.basePath 更新的图片路径的基路径，可选，默认为当
 *                                 前页面路径
 * @param {string=} updateImageInfo.path 更新的图片路径
 * @param {string} updateImageInfo.reloadVersion 要更新的图片重新加载的版本号
 * @return {boolean}
 */
function updateStyleSheetImage(styleSheet, updateImageInfo) {
    var cssRules = [];
    try {
        // firefox 对于跨域的样式访问会报错
        cssRules = styleSheet.cssRules || styleSheet.rules;
    } catch (e) {
        return false;
    }
    var CSSRule = window.CSSRule;
    var hasReload = false;
    var result;
    for (var i = 0, len = cssRules.length; i < len; i++) {
        var rule = cssRules[i];
        if (!CSSRule || rule.type === CSSRule.STYLE_RULE) {
            // 样式规则直接更新图片样式信息
            for (var j = 0, jLen = IMAGE_STYLES.length; j < jLen; j++) {
                var styleInfo = IMAGE_STYLES[j];
                result = updateCSSImageStyle(rule.style, styleInfo.styleNames, updateImageInfo);
                hasReload || (hasReload = result);
            }
        } else if (CSSRule && rule.type === CSSRule.MEDIA_RULE) {
            // 对于媒介查询类似于一个子的样式表单，递归下
            result = updateStyleSheetImage(rule, updateImageInfo);
            hasReload || (hasReload = result);
        }
    }
    return hasReload;
}
/**
 * 重新加载样式表单里设置的图片相关的样式
 *
 * @param {string} path 要重新加载的图片路径
 * @param {string} reloadVersion 重新加载的图片要添加的版本号
 * @return {boolean}
 */
function reloadStyleSheetImage(path, reloadVersion) {
    var hasReload = false;
    var result;
    // 更新 link 样式和 style 元素定义的图片样式信息
    var styleSheets = document.styleSheets;
    var getAbsolutePath = util.getAbsolutePath;
    for (var i = 0, len = styleSheets.length; i < len; i++) {
        var sheet = styleSheets[i];
        var href = sheet.href;
        result = updateStyleSheetImage(sheet, {
            basePath: href && getAbsolutePath(null, href),
            path: path,
            reloadVersion: reloadVersion
        });
        hasReload || (hasReload = result);
    }
    // 更新导入样式图片样式信息
    var importStyles = dom.getImportStyles();
    for (i = 0, len = importStyles.length; i < len; i++) {
        var importStyle = importStyles[i];
        var rule = importStyle.rule;
        result = updateStyleSheetImage(rule.styleSheet || rule, {
            basePath: importStyle.fullHref,
            path: path,
            reloadVersion: reloadVersion
        });
        hasReload || (hasReload = result);
    }
    return hasReload;
}
/**
 * 重新加载HTML行业样式设置的图片相关的样式
 *
 * @param {string} path 要重新加载的图片路径
 * @param {string} reloadVersion 重新加载的图片要添加的版本号
 * @return {boolean}
 */
function reloadInlineStyleImage(path, reloadVersion) {
    var hasReload = false;
    var querySelectorAll = dom.querySelectorAll;
    for (var i = 0, len = IMAGE_STYLES.length; i < len; i++) {
        var styleInfo = IMAGE_STYLES[i];
        // IE7/IE8 下 style*=xx查找不到，
        // 但是查找存在属性style就可以找到 因此这里改成查找所有包含style属性的元素
        // var selector = '[style*=' + styleInfo.selector + ']';
        var foundElements = querySelectorAll('[style]') || [];
        for (var j = 0, jLen = foundElements.length; j < jLen; j++) {
            var result = updateCSSImageStyle(foundElements[j].style, styleInfo.styleNames, {
                path: path,
                reloadVersion: reloadVersion
            });
            hasReload || (hasReload = result);
        }
    }
    return hasReload;
}
/**
 * 重新加载Image元素引用的图片
 *
 * @param {string} path 要重新加载的图片路径
 * @param {string} reloadVersion 重新加载的图片要添加的版本号
 * @return {boolean}
 */
function reloadImageElement(path, reloadVersion) {
    var imageElements = document.images;
    var imageFileList = [];
    for (var i = 0, len = imageElements.length; i < len; i++) {
        var img = imageElements[i];
        imageFileList[i] = {
            href: img.src,
            img: img
        };
    }
    var hasReload = false;
    var maxMatchImages = util.findMaxMatchFile(path, imageFileList);
    for (i = 0, len = maxMatchImages.length; i < len; i++) {
        var matchImg = maxMatchImages[i];
        if (matchImg.isFullMatch) {
            matchImg.file.img.src = util.addQueryTimestamp(matchImg.file.href, reloadVersion);
            hasReload = true;
        }
    }
    return hasReload;
}
module.exports = exports = {
    /**
     * 初始化reload上下文的选项信息
     *
     * @param {Object} data 要初始化选项信息
     * @param {Object} socket 和服务器端通信 socket 实例
     */
    init: function (data, socket) {
        options.hmr = !!data.hmr;
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                options[k] = data[k];
            }
        }
        if (options.hmr) {
            var syncModules = moduleManage.getSyncModules();
            if (syncModules) {
                socket.sendMessage('syncModule', syncModules);
            }
        }
    },
    /**
     * 重新加载css样式文件
     *
     * @param {{ path: string }} data 重新加载的样式文件信息
     */
    reloadCSS: function (data) {
        var changeFilePath = data.path;
        var hasMatch = false;
        var linkStyles = dom.getLinkStyles();
        var importStyles = dom.getImportStyles();
        var findMaxMatchFile = util.findMaxMatchFile;
        var maxMatchLink = findMaxMatchFile(changeFilePath, linkStyles)[0];
        var maxMatchImport = findMaxMatchFile(changeFilePath, importStyles)[0];
        if (maxMatchLink && maxMatchLink.isFullMatch) {
            dom.reloadLinkStyle(maxMatchLink.file);
            hasMatch = true;
        }
        if (maxMatchImport && maxMatchImport.isFullMatch) {
            dom.reloadImportStyle(maxMatchImport.file);
            hasMatch = true;
        }
        if (!hasMatch) {
            exports.reloadPage();
        }
    },
    /**
     * 重新加载图片
     *
     * @param {{ path: string }} data 重新加载的图片信息
     */
    reloadImage: function (data) {
        if (!document.querySelectorAll && typeof jQuery === 'undefined') {
            exports.reloadPage();
        }
        var changeFilePath = data.path;
        var hasReload = false;
        var reloadVersion = new Date().getTime();
        hasReload = reloadImageElement(changeFilePath, reloadVersion);
        var result = reloadInlineStyleImage(changeFilePath, reloadVersion);
        hasReload || (hasReload = result);
        result = reloadStyleSheetImage(changeFilePath, reloadVersion);
        hasReload || (hasReload = result);
        if (!hasReload) {
            exports.reloadPage();
        }
    },
    /**
     * 重新刷新页面
     */
    reloadPage: function () {
        window.document.location.reload();
    },
    /**
     * 更新模块资源
     *
     * @param {Object} data 变更的模块数据信息
     * @param {string} data.path 更新的模块的路径
     * @param {string} data.hash 模块内容的 hash 值
     */
    updateModule: function (data) {
        // TODO 增加资源依赖同步接口
        // TODO 对于样式修改，先判断页面引用的样式入口是否有该样式文件或者间接依赖该文件，有重新 reload 样式
        moduleManage.updateModule(data);
    },
    /**
     * 删除模块
     *
     * @param {Array.<string>} data 删除的模块路径信息
     */
    removeModule: function (data) {
        moduleManage.removeModule(data);
    },
    /**
     * 添加模块
     *
     * @param {Array.<Object>} data 添加的模块信息：
     *        {
     *          path: string,
     *          hash: string
     *        }
     */
    addModule: function (data) {
        moduleManage.addModule(data);
    },
    /**
     * 同步模块
     *
     * @param {Array.<Object>} data 要同步的模块信息，模块信息：
     *        {
     *          path: string,
     *          removed: boolean, // 是否已经移除
     *          hash: string, // 模块的内容 hash
     *        }
     */
    syncModule: function (data) {
        moduleManage.syncModule(data);
    }
};
})(_module, _exports, _require);
_global['command'] = _module.exports;


_exports = {};
_module = {exports: _exports};

(function (module, exports, require) {
    /**
 * @file watchreload 客户端
 * @author sparklewhy@gmail.com
 */
var command = require('command');
var socket = require('socket');
socket.on('*', function (type, data) {
    var handler = command[type];
    try {
        handler && handler(data, socket);
    } catch (ex) {
        command.reloadPage();
    }
});
// 打开socket
socket.open(window.io);
})(_module, _exports, _require);
_global['index'] = _module.exports;


})(window);
