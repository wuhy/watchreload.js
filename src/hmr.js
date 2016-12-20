/**
 * @file module hot api 接口定义
 * @author sparklewhy@gmail.com
 */

var util = require('./common/util');
var logger = require('./log');

function addCallback(target, callback) {
    if (target.indexOf(callback) === -1
        && typeof callback === 'function'
    ) {
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
            }
            else if (typeof dep === 'function') {
                hot._selfAccepted = dep;
            }
            else if (util.isArray(dep)) {
                for (var i = 0, len = dep.length; i < len; i++) {
                    hot._acceptedDependencies[dep[i]] = callback;
                }
            }
            else if (dep && typeof dep === 'string') {
                hot._acceptedDependencies[dep] = callback;
            }
        },

        decline: function (dep) {
            if (typeof dep === 'undefined') {
                hot._selfDeclined = true;
            }
            else if (util.isArray(dep)) {
                for (var i = 0, len = dep.length; i < len; i++) {
                    hot._declinedDependencies[dep[i]] = true;
                }
            }
            else if (dep && typeof dep === 'string') {
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
        }

        // Management API
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

exports.disposeModule = function (moduleId, mod) {
    var data = {};

    logger.debug('dispose module: %s', moduleId);

    // Call dispose handlers
    var disposeHandlers = mod.hot._disposeHandlers;
    for (var i = 0, len = disposeHandlers.length; i < len; i++) {
        var cb = disposeHandlers[i];
        cb(data);
    }
    hotCurrentModuleData[moduleId] = data;

    // disable module (this disables requires from this module)
    mod.hot.active = false;
};

exports.isSelfAccept = function (mod) {
    return mod.hot._selfAccepted;
};

exports.isSelfDecline = function (mod) {
    return mod.hot._selfDeclined;
};

exports.isDecline = function (mod, depModId) {
    return mod.hot._declinedDependencies[depModId];
};

exports.selfAccept = function (mod, err) {
    var callback = mod.hot._selfAccepted;
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
