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
        }
        else {
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
            }
            else {
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
        var versionParam = '_wr=' + (timeStamp || (new Date()).getTime());
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
            }
            else {
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
            var fullHref = file.fullHref || (exports.getAbsolutePath(null, file.href));
            var toMatchPaths = exports.getPathSegments(exports.parseURL(fullHref).url);
            var ratio = exports.getMatchRatio(changePaths, toMatchPaths);
            var isFullMatch = ratio === 100;

            if (!maxMatch || isFullMatch || (maxMatch.ratio < ratio)) {
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
