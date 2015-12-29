/**
 * @file reload 命令相关接口定义
 * @author sparklewhy@gmail.com
 */

var dom = require('./common/dom');
var util = require('./common/util');
var command = require('./command');
var options = require('./options');
var constant = require('./constant');
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
        styleNames: [
            'backgroundImage'
        ]
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
        while ((result = URL_STYLE_REGEXP.exec(value))) {
            imgHref = (result.length === 2) ? result[1] : null;

            if (!imgHref) {
                continue;
            }

            maxMatchImage = util.findMaxMatchFile(path, [
                {
                    fullHref: util.getAbsolutePath(basePath, imgHref)
                }
            ])[0];

            if (maxMatchImage.isFullMatch) {
                break;
            }

        }

        if (maxMatchImage && maxMatchImage.isFullMatch) {
            // 由于同一张图片可能会重复出现，这里若用正则，不能简单：
            // new RegExp(imgHref, 'g') ，需要对imgHref做转义，比如 .
            style[name] = value.replace(
                new RegExp(escapeRegExp(imgHref), 'g'),
                util.addQueryTimestamp(imgHref, reloadVersion)
            );
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
    }
    catch (e) {
        return false;
    }

    var CSSRule = window.CSSRule;
    var hasReload = false;
    var result;
    for (var i = 0, len = cssRules.length; i < len; i++) {
        var rule = cssRules[i];

        if (!CSSRule || (rule.type === CSSRule.STYLE_RULE)) {
            // 样式规则直接更新图片样式信息
            for (var j = 0, jLen = IMAGE_STYLES.length; j < jLen; j++) {
                var styleInfo = IMAGE_STYLES[j];

                result = updateCSSImageStyle(
                    rule.style, styleInfo.styleNames, updateImageInfo
                );
                hasReload || (hasReload = result);
            }
        }
        else if (CSSRule && (rule.type === CSSRule.MEDIA_RULE)) {
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
 * 获取要reload的文件路径，根据livereload选项配置，若未找到，默认reload变化的文件路径
 *
 * @param {string} changePath 变化的文件路径
 * @return {string}
 */
function getReloadFile(changePath) {
    var livereloadPathMap = options.livereload || {};
    for (var path in livereloadPathMap) {
        if (livereloadPathMap.hasOwnProperty(path)) {
            var regex = new RegExp(path);
            if (regex.test(changePath)) {
                return livereloadPathMap[path];
            }
        }

    }

    return changePath;
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
            var result = updateCSSImageStyle(
                foundElements[j].style, styleInfo.styleNames,
                {
                    path: path,
                    reloadVersion: reloadVersion
                }
            );
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
            matchImg.file.img.src
                = util.addQueryTimestamp(matchImg.file.href, reloadVersion);
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
     */
    init: function (data) {
        options.livereload = data.livereload || {};
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                options[k] = data[k];
            }

        }
    },

    /**
     * 重新加载css样式文件
     *
     * @param {{ path: string }} data 重新加载的样式文件信息
     */
    reloadCSS: function (data) {
        var changeFilePath = getReloadFile(data.path);
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
            command.reloadPage();
        }

    },

    /**
     * 重新加载图片
     *
     * @param {{ path: string }} data 重新加载的图片信息
     */
    reloadImage: function (data) {
        if (!document.querySelectorAll && (typeof jQuery === 'undefined')) {
            command.reloadPage();
        }

        var changeFilePath = getReloadFile(data.path);
        var hasReload = false;

        var reloadVersion = (new Date()).getTime();
        hasReload = reloadImageElement(changeFilePath, reloadVersion);

        var result = reloadInlineStyleImage(changeFilePath, reloadVersion);
        hasReload || (hasReload = result);

        result = reloadStyleSheetImage(changeFilePath, reloadVersion);
        hasReload || (hasReload = result);

        if (!hasReload) {
            command.reloadPage();
        }

    },

    /**
     * 重新刷新页面
     */
    reloadPage: function () {
        window.document.location.reload();
    }
};
