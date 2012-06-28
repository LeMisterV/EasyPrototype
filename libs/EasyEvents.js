(function(define, undef) {
define('EasyEvents', ['EasyPrototype'], function(EasyPrototype) {

    var EventCallback = EasyPrototype.createClass('EventCallback', {
        init : function init(eventType, action, iterations) {
            this.eventType = eventType;
            this.action = action;
            this.iterations = iterations || true;
        },

        destroy : function destroy() {
            this.eventType.removeCallback(this);
        },

        exec : function exec(args) {
            try {
                this.action.apply(this.eventType.manager.cible, args);
            }
            catch (e) {}

            if (this.iterations !== true) {
                this.iterations = (this.iterations - 1) || false;
            }

            if (!this.iterations) {
                this.eventType.removeCallback(this);
            }
        }
    });

    var Event = EasyPrototype.createClass('Event', {
        init : function init(eventType, args, callbacks) {
            this.type = eventType;
            this.args = args;
            this.callbacks = callbacks;

            this.exec();
        },

        exec : function exec() {
            for (var i = 0; i < this.callbacks.length; i++) {
                this.callbacks[i].exec();
            }
        }
    });

    var EventType = EasyPrototype.createClass('EventType', {
        init : function init(manager, evtName) {
            this.callbacks = [];

            this.manager = manager;
            this.name = evtName;
        },

        destroy : function destroy() {
            this.callbacks = [];
            delete this.lastTrigger;
        },

        registerCallback : function registerCallback(callback, iterations, rattrapage) {
            callback = new EventCallback(this, callback, iterations);

            if (rattrapage && this.lastTrigger) {
                callback.exec(this.lastTrigger);
            }

            if (callback.iterations) {
                this.callbacks.push(callback);
            }
        },

        removeCallback : function removeCallback(callback) {
            var len, removed;

            if (typeof callback === 'number') {
                removed = this.callbacks.splice(callback, 1);
                if (removed.length) {
                    removed[0].destroy();
                }
            }
            else {
                len = this.callbacks.length;
                if (callback instanceof EventCallback) {
                    while (len--) {
                        if (this.callbacks[len] === callback) {
                            this.removeCallback(len);
                            break;
                        }
                    }
                }
                else {
                    while (len--) {
                        if (this.callbacks[len].action === callback) {
                            this.removeCallback(len);
                            break;
                        }
                    }
                }
            }
        },

        trigger : function trigger(args) {
            this.lastTrigger = new Event(this, args, this.callbacks.slice());
        },

        toString : function toString() {
            return this.name;
        }
    });

    var EventsManager = EasyPrototype.createClass('EasyPrototype', {
        init : function init(cible) {
            this.eventTypes = {};
        },

        destroy : function destroy() {
            delete this.eventTypes;
        },

        getEventType : function getEventType(evtName, create) {
            if (!(evtName in this.eventTypes) && create === true) {
                this.eventTypes[evtName] = new EventType(this, evtName);
            }

            return this.eventTypes[evtName];
        },

        registerCallback : function registerCallback(evtName, callback, iterations, rattrapage) {
            this.getEventType(evtName, true).registerCallback(callback, iterations, rattrapage);
        },

        removeCallback : function removeCallback(evtName, callback) {
            var eventType = this.getEventType(evtName);

            if (eventType) {
                eventType.removeCallback(callback);
            }
        },

        trigger : function trigger(evtName, args) {
            var eventType = this.getEventType(evtName);

            if (eventType) {
                eventType.trigger(args);
            }
        }
    });

    var EasyEvents = EasyPrototype.createClass('EasyEvents', {
        init : function init() {
            this.events = new EventsManager(this);

            this.on = this.events.callback('registerCallback');
            this.off = this.events.callback('removeCallback');
        },

        destroy : function destroy() {
            delete this.on;
            delete this.off;

            this.events.destroy();

            delete this.events;
            this.execSuper('destroy', arguments);
        }
    });

    EasyEvents.EventsManager = EventsManager;
    EasyEvents.EventType = EventType;
    EasyEvents.Event = Event;
    EasyEvents.EventCallback = EventCallback;

    return EasyEvents;
});
}(define));