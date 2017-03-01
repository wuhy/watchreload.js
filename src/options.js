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
    hmr: false,

    /**
     *  是否强制重新 reload 页面，当要 reload 样式文件没有匹配到时候
     *
     *  @type {boolean}
     */
    forceReloadWhenCssNotMatch: false
};

