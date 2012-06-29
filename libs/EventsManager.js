(function (define, Array, Error, setTimeout, clearTimeout, undef) {
    "use strict";

    define('EventsManager', ['EasyPrototype'], function(EasyPrototype) {

        function getConvertionFunction(relations) {
            return function (type) {
                var relType = relations[type];
                if (relType === undef) {
                    if (typeof relations._others === 'function') {
                        return relations._others(type);
                    }
                    relType = relations._others;
                }
                if (relType === true) {
                    relType = type;
                }
                return relType;
            };
        }

        function convertionArrayToObject(convertionArray) {
            var i = convertionArray.length,
                convertionObject = {};
            while (i--) {
                if (typeof convertionArray[i] !== 'string') {
                    continue;
                }
                convertionObject[convertionArray[i]] = true;
            }
            return convertionObject;
        }

        if (!('indexOf' in Array.prototype)) {
            Array.prototype.indexOf = function indexOf(needle) {
                var idx = this.length;
                while (idx-- && needle !== this[idx]) {}
                return idx;
            };
        }

        var EventListener = EasyPrototype.createClass('EventListener', {
            init : function init(action, iterations, rattrapage, reseter) {
                if (typeof action !== 'function') {
                    throw new Error('Event listener must be a function');
                }

                this.action = action;

                // Checks for iterations arguments
                if (rattrapage === undef && typeof iterations === 'boolean') {
                    reseter = rattrapage;
                    rattrapage = iterations;
                    iterations = undef;
                }

                if (rattrapage !== undef && typeof rattrapage !== 'boolean') {
                    throw new Error('Event listener\'s rattrapage must be undefined or a boolean');
                }
                // Si rattrapage undefined, rattrapage à true, donc par défaut = true
                this.rattrapage = rattrapage !== false;

                if (iterations !== undef) {
                    if (typeof iterations !== 'number') {
                        throw new Error('Event listener\'s iterations must be an integer');
                    }
                    this.iterations = iterations;
                }

                if (reseter !== undef) {
                    if (typeof reseter !== 'function') {
                        throw new Error('Event listener\'s reseter must be a function');
                    }
                    this.reseter = reseter;
                }
            },

            destroy : function destroy() {
                delete this.action;
                delete this.reseter;
                this.iterations = 0;
                this.rattrapage = false;
            },

            match : function match(value) {
                return value === this ||
                    value === this.action || (
                        value instanceof Array && (
                            value.indexOf(this) !== -1 ||
                            value.indexOf(this.action) !== -1
                        )
                    );
            }
        }),

        EventExecution = EasyPrototype.createClass('EventExecution', {
            init : function init(event, listeners, args) {
                var i;

                this.event = event;
                this.listeners = listeners;
                this.waiting = 0;
                this.finished = false;

                this.params = [{
                    type        : this.event.name,
                    wait        : this.callback('onListenerWait'),
                    continuer   : this.callback('onListenerContinuer')
                }];

                this.params.push.apply(this.params, args);

                this.timeout = setTimeout(this.callback('execute'), 0);
            },

            destroy : function destroy() {
                // Si l'exécution n'est pas encore commencée, on l'annule
                // Cela se produit si on détruit l'exécution juste après l'appel d'exécution.
                // Est-ce une bonne chose... cela reste à controler, mais comment ?
                if ('timeout' in this) {
                    clearTimeout(this.timeout);
                    delete this.timeout;

                    if ('listeners' in this) {
                        delete this.listeners;
                    }

                    this.finished = true;
                }

                if (this.finished) {
                    delete this.event;
                    delete this.params;
                }
            },

            execListener : function execListener(listener) {
                if (listener.iterations === 0) {
                    return;
                }
                if (listener.iterations !== undef) {
                    listener.iterations--;
                }
                try {
                    listener.action.apply(this.event.manager.subject, this.params);
                }
                catch (e) {
                    if (typeof console !== 'undefined' && 'error' in console) {
                        console.error(e);
                    }
                }
            },

            addListener : function addListener(listener) {
                if ('listeners' in this) {
                    this.listeners.push(listener);
                }
                else {
                    this.execListener(listener);
                }
            },

            execCallback :function execCallback() {
                var cbk = this._callback,
                    subject;

                if (this.finished && typeof cbk === 'function') {
                    delete this._callback;

                    if (!('event' in this && 'manager' in this.event)) {
                        throw new Error('Problème de destruction prématurée d\'un objet Event de EventsManager');
                    }

                    subject = this.event.manager.subject;

                    setTimeout(function () {
                        cbk.call(subject);
                    }, 0);
                }
            },

            whenFinished : function whenFinished(cbk) {
                // Ne peut pas être exécuté après la destruction de l'instance
                if ('event' in this) {
                    if ('_callback' in this) {
                        throw new Error('Une fonction de callback a déjà été enregistré pour cette exécution d\'événement');
                    }
                    this._callback = cbk;
                    this.execCallback();
                }
            },

            checkFinished : function checkFinished() {
                if (!this.finished && this.waiting === 0) {
                    // Ici l'exécution est complètement finie.
                    // En revenche on ne peut pas détruire encore l'objet car il peut toujours être utilisé
                    // en rattrappage ou bien via la méthode "whenFinished"
                    this.finished = true;
                    this.execCallback();
                }
            },

            onListenerWait : function onListenerWait() {
                this.waiting++;
            },

            onListenerContinuer : function onListenerContinuer() {
                if (!this.finished) {
                    this.waiting--;
                    this.checkFinished();
                }
            },

            execute : function execute() {
                var i;

                if (!this.finished) {
                    delete this.timeout;

                    for (i = 0; i < this.listeners.length; i++) {
                        this.execListener(this.listeners[i]);
                    }

                    // Ici on peut vider la liste des listeners.
                    // En revenche on ne peut pas détruire encore l'objet car il peut toujours être utilisé
                    // en rattrappage ou bien via la méthode "whenFinished"
                    delete this.listeners;

                    this.checkFinished();
                }
            }
        }),

        Event = EasyPrototype.createClass('Event', {
            init : function init(manager, name) {
                this.name = name;
                this.manager = manager;
                this.listeners = [];
            },

            destroy : function destroy() {
                this.cleanListeners();

                this.listeners.length = 0;

                delete this.name;
                delete this.manager;

                if ('lastExecution' in this) {
                    // La méthode destroy de EventExecution est inactive si l'exécution est commencée mais innachevée.
                    // On peut donc ici appeler cette méthode afin d'effectuer la destruction de l'objet si l'exécution est finie.
                    this.lastExecution.destroy();
                    delete this.lastExecution;
                }
            },

            removeListener : function removeListener(idx) {
                var listener = this.listeners.splice(idx, 1);
                if (listener.iterations === 0) {
                    listener.destroy();
                }

                if(!this.listeners.length && 'whenEventHasNoListener' in this.manager) {
                    this.manager.whenEventHasNoListener(this.name);
                }
            },

            addListener : function addListener(listener) {
                var directExec = listener.rattrapage && ('lastExecution' in this);

                if (!(directExec && listener.iterations === 1)) {
                    if (this.listeners.push(listener) === 1 && 'whenEventHasListener' in this.manager) {
                        this.manager.whenEventHasListener(this.name);
                    }
                }
                if (directExec) {
                    this.lastExecution.addListener(listener);
                }
            },

            trigger : function trigger(args) {
                if ('lastExecution' in this) {
                    // La méthode destroy de EventExecution est inactive si l'exécution est commencée mais innachevée.
                    // On peut donc ici appeler cette méthode afin d'effectuer la destruction de l'objet si l'exécution est finie.
                    this.lastExecution.destroy();
                    delete this.lastExecution;
                }

                this.lastExecution = new EventExecution(this, this.listeners.slice(), args);

                if (!('cleaningTimeout' in this)) {
                    this.cleaningTimeout = setTimeout(this.callback('cleanListeners'), 10);
                }

                return this.lastExecution;
            },

            cleanListeners : function cleanListeners() {
                var i = this.listeners.length;

                delete this.cleaningTimeout;

                while (i--) {
                    if (this.listeners[i].iterations === 0) {
                        this.removeListener(i);
                    }
                }
            },

            unbind : function unbind(listener) {
                var i;
                if (listener === undef) {
                    this.listeners = [];
                    if(this.manager.whenEventHasNoListener) {
                        this.manager.whenEventHasNoListener(this.name);
                    }
                }
                else {
                    i = this.listeners.length;
                    while (i--) {
                        if (this.listeners[i].match(listener)) {
                            this.removeListener(i);
                        }
                    }
                }
            },

            resetTriggeredState : function resetTriggeredState() {
                var i = this.listeners.length;

                if ('lastExecution' in this) {
                    this.lastExecution.destroy();
                    delete this.lastExecution;
                }

                while (i--) {
                    if ('reseter' in this.listeners[i]) {
                        try {
                            this.listeners[i].reseter(this.name);
                        }
                        catch (e) {
                            if (typeof console !== 'undefined' && 'error' in console) {
                                console.error(e);
                            }
                        }
                    }
                }
            },

            listenerIndexes : function listenerIndexes(listener) {
                var indexes = [],
                    i = this.listeners.length;

                while (i--) {
                    if (this.listeners[i].match(listener)) {
                        indexes.push(i);
                    }
                }
                return indexes.reverse();
            }
        }),

        EventsManagerInterface = EasyPrototype.createClass(
            'EventsManagerInterface',
            {
            getInstance : function getInstance() {
                if(this.constructor === EventsManagerInterface) {
                    EventsManager.argsAsArray = true;
                    return new EventsManager(arguments);
                }
                this.execSuper('getInstance', arguments);
            },

            init : function init() {
                this.events = new EventsManager(this);
                this.execSuper('init', arguments);
            },

            destroy : function destroy() {
                if ('events' in this) {
                    this.events.destroy();

                    // Faut-il supprimer ce slot ? ..... a étudier
                    delete this.events;
                }

                this.execSuper('destroy');
            },

            addEventListener : function addEventListener() {
                if (!('events' in this)) {
                    if (typeof console !== 'undefined' && 'error' in console) {
                        console.error(this, arguments, 'manipulation des événements d\'un objet détruit');
                    }
                }
                else {
                    return this.events.addEventListener.apply(this.events, arguments);
                }
            },

            addEventListeners : function addEventListeners() {
                if (!('events' in this)) {
                    if (typeof console !== 'undefined' && 'error' in console) {
                        console.error(this, arguments, 'manipulation des événements d\'un objet détruit');
                    }
                }
                else {
                    return this.events.addEventListeners.apply(this.events, arguments);
                }
            },

            unbind : function unbind() {
                if (!('events' in this)) {
                    if (typeof console !== 'undefined' && 'error' in console) {
                        console.error(this, arguments, 'manipulation des événements d\'un objet détruit');
                    }
                }
                else {
                    return this.events.unbind.apply(this.events, arguments);
                }
            }
        }),

        EventsManager = EasyPrototype.createClass('EventsManager', EventsManagerInterface, {
            /** Surcharge getInstance
             *
             * On surcharge getInstance pour que la méthode getInstance de EventsManagerInterface ne
             * soit pas atteinte car elle est inutile.
             *
             */
            getInstance : function getInstance() {},

            init : function init(subject) {
                var i;

                this.events = {};
                this.extending = [];
                this.globalListeners = [];

                this.subject = subject || this;

                // Cette approche n'est jamais utilisée.... ne devrait-on pas la supprimer pour alléger ?
                for (i = 1; i < arguments.length; i++) {
                    if(typeof arguments[i] === 'function' ||
                        arguments[i] instanceof EventListener ||
                        arguments[i] instanceof Array) {
                        this.addEventListener('*', arguments[i]);
                    }
                    else {
                        this.addEventListeners(arguments[i]);
                    }
                }
            },

            destroy : function destroy() {
                var key;

                for (key in this.events) {
                    this.events[key].destroy();
                    delete this.events[key];
                }

                this.unextendAll();

                key = this.globalListeners.length;
                while (key--) {
                    this.globalListeners[key].destroy();
                }
                this.globalListeners.length = 0;

                delete this.subject;
            },

            registerGlobalListener : function registerGlobalListener(listener) {
                this.globalListeners.push(listener);
            },

            getEvent : function getEvent(eventName, filterGlobalListener) {
                var i;
                if (!(eventName in this.events)) {
                    this.events[eventName] = new Event(this, eventName);
                    i = this.globalListeners.length;
                    while (i--) {
                        if (!this.globalListeners[i].match(filterGlobalListener)) {
                            this.events[eventName].addListener(this.globalListeners[i]);
                        }
                    }
                }
                return this.events[eventName];
            },

            addEventListeners : function addEventListeners(listeners) {
                var eventName;
                for (eventName in listeners) {
                    if (listeners[eventName]) {
                        this.addEventListener(eventName, listeners[eventName]);
                    }
                }
            },

            addEventListener : function addEventListener(eventName, listener, iterations, rattrapage, reseter) {
                var i;

                if (!(listener instanceof EventListener)) {
                    if (listener instanceof Array) {
                        if (listener.length <= 4 &&
                            typeof listener[1] === 'number') {
                            listener = new EventListener(listener[0], listener[1], listener[2], listener[3]);
                        }
                        else {
                            for (i = 0; i < listener.length; i++) {
                                if (listener[i] !== undef) {
                                    this.addEventListener(eventName, listener[i], iterations, rattrapage, reseter);
                                }
                            }
                            return;
                        }
                    }
                    else {
                        listener = new EventListener(listener, iterations, rattrapage, reseter);
                    }
                }

                if (eventName === '*') {
                    this.registerGlobalListener(listener);
                    eventName = [];
                    for (i in this.events) {
                        eventName.push(i);
                    }
                }
                else if (eventName.indexOf(' ') !== -1) {
                    eventName = eventName.split(' ');
                }

                if (eventName instanceof Array) {
                    i = eventName.length;
                    while (i--) {
                        this.addEventListener(eventName[i], listener);
                    }
                    return;
                }

                this.getEvent(eventName).addListener(listener);
            },

            trigger : function trigger(eventName) {
                return this.getEvent(eventName).trigger([].slice.call(arguments, 1));
            },

            resetTriggeredState : function resetTriggeredState(eventName) {
                if (eventName === undef) {
                    for (eventName in this.events) {
                        this.resetTriggeredState(eventName);
                    }
                }
                else if (eventName in this.events) {
                    this.events[eventName].resetTriggeredState();
                }
            },

            unbind : function unbind(eventName, listener) {
                var i;
                if ((eventName || '*') === '*') {
                    if (listener === undef) {
                        this.globalListeners.length = 0;
                    }
                    else {
                        i = this.globalListeners.length;
                        while (i--) {
                            if (this.globalListeners[i].match(listener)) {
                                this.globalListeners.splice(i, 1);
                            }
                        }
                    }
                    for (eventName in this.events) {
                        this.events[eventName].unbind(listener);
                    }
                }
                else {
                    if (eventName.indexOf(' ') !== -1) {
                        eventName = eventName.split(' ');
                    }
                    if (eventName instanceof Array) {
                        i = eventName.length;
                        while (i--) {
                            this.unbind(eventName[i], listener);
                        }
                    }
                    else if (eventName in this.events) {
                        this.events[eventName].unbind(listener);
                    }
                    else if (listener === undef) {
                        /*
                            Cette commande va générer l'évent "eventName", pour pouvoir unbinder de cet
                            eventName les éventuels listener globaux qui s'attachent lors de la création
                            de l'event.
                            Pour éviter la création inutile d'un objet Event, il serait possible de tenir
                            à jour, pour chaque listener global, une liste d'eventName auxquels ne devra
                            pas être attaché ce listener global.
                            Cette alternative me semble plus aléatoire et plus compliqué à mettre en place.
                        */
                        this.getEvent(eventName).unbind();
                    }
                    else {
                        /*
                            Si l'event n'est pas généré, mais que le listener est dans la liste des
                            listener globaux, on génère l'event avec un filtre sur le listener.
                        */
                        i = this.globalListeners.length;
                        while (i--) {
                            if (this.globalListeners[i].match(listener)) {
                                this.getEvent(eventName, listener);
                                break;
                            }
                        }
                    }
                }
            },

            extend : function extend(childEM, convertion) {
                var eventsListener,
                    resetManager,
                    eventName,
                    convertionObj,
                    key;

                if (typeof convertion !== 'function') {
                    if (typeof convertion === 'string') {
                        convertion = convertion.split(' ');
                    }
                    if (convertion instanceof Array) {
                        convertion = convertionArrayToObject(convertion);
                    }
                    if (typeof convertion === 'object') {
                        convertionObj = convertion;
                        convertion = getConvertionFunction(convertion);
                    }
                    else {
                        convertion = undef;
                    }
                }

                if (convertionObj && !convertionObj._others) {
                    eventName = [];
                    for (key in convertionObj) {
                        eventName.push(key);
                    }
                    eventName = eventName.join(' ');
                }
                else {
                    eventName = '*';
                }

                eventsListener = this.callback('onExtendedEvent', convertion);
                resetManager = this.callback('onExtendedReset', convertion);

                childEM.addEventListener(eventName, eventsListener, undef, undef, resetManager);
                this.extending.push([childEM, eventName, eventsListener, resetManager]);
            },

            onExtendedEvent : function onExtendedEvent(convertion, evt) {
                var type = convertion ? convertion.call(this.subject, evt.type) : evt.type,
                    args = [];

                if (!type) {
                    return;
                }

                if (typeof type !== 'string' || type.indexOf(' ') !== -1) {
                    throw new Error('nom d\'événement invalide');
                }

                args.push.apply(args, arguments);
                args.reverse().length--;
                args.reverse()[0] = type;

                evt.wait();
                this.trigger.apply(this, args).whenFinished(evt.continuer);
            },

            onExtendedReset : function onExtendedReset(convertion, eventName) {
                eventName = convertion ? convertion.call(this.subject, eventName) : eventName;
                if (!eventName) {
                    return;
                }
                this.resetTriggeredState(eventName);
            },

            unextend : function unextend(childEM) {
                var i = this.extending.length;

                while (i--) {
                    if (this.extending[i][0] === childEM) {
                        this.extending[i][0].unbind(this.extending[i][1], this.extending[i][2]);
                        this.extending.splice(i, 1);
                    }
                }
            },

            unextendAll : function unextendAll() {
                var i = this.extending.length;

                while (i--) {
                    this.extending[i][0].unbind(this.extending[i][1], this.extending[i][2]);
                }
                this.extending.length = 0;
            }
        });

        return EventsManagerInterface;
    });
}(define, this.Array, this.Error, this.setTimeout, this.clearTimeout));