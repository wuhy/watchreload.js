/**
 * @file 模块缓存管理
 * @author sparklewhy@gmail.com
 */

var util = require('./common/util');
var hmr = require('./hmr');
var logger = require('./log');

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
 * 模块重新加载失败要执行的回调
 *
 * @type {Function}
 */
var _reloadFailCallback;

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
        return {
            module: id
        };
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
 * @param {Object} mod 初始化的模块对象
 */
window._hmrInitModule = function (id, mod) {
    _cacheModule[id] = mod;

    // 增加 module hmr api
    mod.hot = hmr.hot(id);

    if (_status == null) {
        _status = HMR_STATUS.IDLE;
    }

    // init id path map information
    var resInfo = parseResource(id);
    var resId = resInfo.resource;
    if (resId) {
        id2Path(resId, true);
    }
    else {
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
    if (_reloadModule && (id === _reloadModule.id)) {
        removeExistedScriptElement(id);
        // url += (url.indexOf('?') !== -1 ? '&' : '?');
        // url += ('_t=' + (new Date()).getTime());
    }

    return url;
};

/**
 * 模块重新加载完成，如果失败也会触发该回调
 *
 * @param {?Object|string} err 加载错误信息
 * @param {string} id 重新加载完成的模块 id
 */
window._hmrReloadDone = function (err, id) {
    if (_reloadModule && id === _reloadModule.id) {
        // dispose old module
        var oldMod = _reloadModule.define;
        oldMod && hmr.disposeModule(_reloadModule.id, oldMod);

        if (err) {
            _reloadFailCallback(null, err);
        }

        _reloadModule = _reloadFailCallback = null;
    }
};

function redefineModule(oldMod) {
    var moduleId = oldMod.id;
    var mod = oldMod.define;
    var defined = oldMod.inited;
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
        }
        catch (ex) {
            if (hmr.isSelfAccept(mod)) {
                hmr.selfAccept(mod, ex);
            }
        }
    }
}

/**
 * 重新加载初始化模块
 *
 * @param {Object} oldMod 要重新加载的模块
 * @param {Function} callback 重新加载完成执行的回调
 */
function reloadModule(oldMod, callback) {
    var moduleId = oldMod.id;

    // 如果要 reload 的变更模块可能之前并不存在，那直接无视
    if (!moduleId) {
        callback();
        return;
    }

    // 每次模块变更只会触发一个模块的重新加载，其他过期的父模块只需重新定义即可
    _reloadModule = oldMod;
    _reloadFailCallback = callback;
    logger.debug('require id: %s', moduleId);
    window.require([moduleId], callback);
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
        delete _loadingModules[id];
        delete _cacheModule[id];
    }
}

/**
 * 获取模块元数据信息
 *
 * @param {Object} mod 要获取的模块信息
 * @return {Object}
 */
function getModuleMetaData(mod) {
    var id = mod.id;

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
    metaData.define = mod;

    // 初始化依赖的模块
    var deps = mod.depMs || [];
    var depModPaths = [];
    for (var i = 0, len = deps.length; i < len; i++) {
        depModPaths[i] = id2Path(deps[i].absId);
    }
    metaData.depModules = depModPaths;

    // 初始化依赖的资源
    var depRes = mod.depRs || [];
    var depResPaths = [];
    for (i = 0, len = depRes.length; i < len; i++) {
        if (depRes[i].absId) {
            depModPaths[i] = id2Path(parseResource(depRes[i].absId).resource, true);
        }
        else {
            depModPaths[i] = util.getAbsolutePath(path, depRes[i].res);
        }
    }
    metaData.depResources = depResPaths;
    metaData.inited = mod.state === 4; // 如果定义过，则认为初始化过
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
            var mod = getModuleMetaData(_cacheModule[k]);
            if (mod) {
                var deps = mod.depModules || [];
                var index = util.findInArray(path, deps);
                if (index !== -1 && !util.isInArr(deps[index], parents)) {
                    parents.push(mod.path);
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
        if (!util.isInArr(upModule, result)) {
            result.push(upModule);
        }
    }

    // 模块不存在，可能一开始是加载失败，导致依赖该模块的模块没法正常初始化，
    // 这些模块也属于过期模块
    var parents = getParentModule(upModPath);
    if (parents) {
        for (var i = 0, len = parents.length; i < len; i++) {
            var parentModule = exports.getModuleMetaData(parents[i])
                || {path: parents[i]};

            // 初始化已经存在的模块依赖信息
            if (parentModule.id && upModule.id) {
                if (hmr.isDecline(parentModule.define, upModule.id)) {
                    throw new Error('Aborted because of declined dependency: '
                        + upModule.id + ' in ' + parentModule.id);
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
    if (!updateModule.inited
        || hmr.isSelfAccept(updateModule.define)) {
    }
    else {
        initOutdatedModules(
            updateModule, outdatedModules, true, {}, depMap
        );
    }

    var allUpMods = [].concat(outdatedModules);
    if (updateModule.id) {
        allUpMods.push(updateModule);
    }

    // 先移除缓存的模块
    removeCacheModule(data.path);

    var total = outdatedModules.length;
    var updateOutdateModules = function () {
        for (var i = 0; i < total; i++) {
            var mod = outdatedModules[i];
            redefineModule(mod);
        }

        // 接受代码更新
        hmr.accept(allUpMods, depMap);

        applyUpdate();
    };

    var isModuleRemoved = data.removed;
    if (isModuleRemoved) {
        updateOutdateModules();
    }
    else {
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
        this.updateModule({path: paths[i], removed: true});
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
            }
            else {
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
};
/* eslint-enable fecs-camelcase */
