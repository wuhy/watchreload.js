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
