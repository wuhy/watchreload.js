/**
 * @file dom 操作相关工具方法
 * @author sparklewhy@gmail.com
 */

var util = require('./util');
var constant = require('./constant');
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
    }
    else if (styleSheet) {
        // for firefox
        // linkNode.sheet 在 css 插入 DOM 中后立刻有值，插入前为 undefined
        // linkNode.sheet.cssRules 在文件还未下好时，抛出非法访问错误
        // 在文件下载并解析好后，同域时返回 cssRuleList
        // 只要是跨域(不管对错)抛出异常 (opera貌似也是？)
        try {
            isLoaded = !!styleSheet.cssRules;
        }
        catch (ex) {
            if (/security|insecure/i.test(ex.message)) {
                isLoaded = true;
            }

        }
    }

    if (isLoaded) {
        setTimeout(function () {
            callback();
        }, 1);
    }
    else {
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
        }
        else if (!extractURLResult) {
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
        }
        catch (e) {
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

            if ((CSSRule && rule.type === CSSRule.IMPORT_RULE) || !CSSRule) {
                var href = extractImportStyleHref(rule.href);
                var importStyle = {
                    link: link,
                    rule: rule,
                    index: i,
                    href: href
                };
                importStyle.fullHref = getImportStyleFullHref(importStyle);
                result.push(importStyle);

                collectImportStyles(
                    // 对于现在浏览器的import规则，需要通过styleSheet获取其样式表信息
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
        }
        else {
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
            (typeof media !== 'string') && (media = [].join.call(rule.media, ', '));
        }
        catch (e) {
            // 不知道为啥在ie9浏览器访问media属性会抛出错误，报"未实现"错
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
        }
        else if (parentStyle.addImport) {
            // Internet Explorer  before version 9
            // parentStyle.addRule(newRule, index);
            parentStyle.addImport(href, index);
        }

        // 移除旧的规则
        var removePosition = index + 1;
        if (parentStyle.deleteRule && parentStyle.cssRules.length > removePosition) {
            parentStyle.deleteRule(removePosition);
        }
        else if (parentStyle.removeImport && parentStyle.imports.length > removePosition) {
            parentStyle.removeImport(removePosition);
        }

    }
};

// 对于IE的样式元素原生支持load事件
if (exports.isIE) {
    exports.setStyleSupportEvent('load', true);
}
