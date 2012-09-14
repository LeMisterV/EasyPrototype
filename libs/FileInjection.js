(function(global, define, document, setTimeout, clearTimeout, undef) {
    "use strict";

    define('FileInjection', ['EasyPrototype', 'EventsManager'], function(EasyPrototype, EventsManager) {

        var FileInjection = EasyPrototype.createProtoClass(
            'FileInjection',
            EventsManager,
            {
            instances : {},

            injectTimeout : 2000,

            defaultLoadSupposition : false,

            staticDomain : 'http://static.francetv.fr',

            getUid : function(params) {
                return (params.type || this.type) + params.url + params.charset + (params.document || document).location.href;
            },

            getInstance : function getInstance(params) {
                if ('multiload' in params && params.multiload === true) {
                    return;
                }

                var instance = this.instances[this.getUid(params)];

                if (instance) {
                    if ('onload' in params && typeof params.onload === 'function') {
                        instance.addEventListener('load', params.onload);
                    }
                    if ('onerror' in params && typeof params.onerror === 'function') {
                        instance.addEventListener('error', params.onerror);
                    }
                    if ('loadControl' in params && typeof params.loadControl === 'function') {
                        instance.registerLoadControl(params.loadControl);
                    }
                }

                return instance;
            },

            init : function init(params) {
                this.execSuper('init');

                this.multiload = params.multiload === true;
                if (!this.multiload) {
                    this.instances[this.getUid(params)] = this;
                }

                if (params.isStatic !== false) {
                    this.url = FileInjection.getStaticUrl(params.url);
                }

                this.document = params.document || document;

                // On control que l'on peut manipuler le DOM du document en question (xDomain policy par exemple)
                try {
                    this.document.getElementsByTagName('BODY');
                }
                catch (e) {
                    this.document = document;
                }

                if ('type' in params) {
                    this.type = params.type;
                }

                if ('charset' in params) {
                    this.charset = params.charset;
                }

                if ('timeout' in params) {
                    this.injectTimeout = params.timeout;
                }

                if ('onload' in params && typeof params.onload === 'function') {
                    this.addEventListener('load', params.onload);
                }

                if ('onerror' in params && typeof params.onerror === 'function') {
                    this.addEventListener('error', params.onerror);
                }

                if ('loadControl' in params && typeof params.loadControl === 'function') {
                    this.registerLoadControl(params.loadControl);
                }

                this.createNode();

                this.loadTimer = setTimeout(this.callback('loadHandler', this.defaultLoadSupposition), this.injectTimeout);

                this.injectNode();
            },

            injectNode : function injectNode() {
                if (!this.controlLoad(false)) {
                    this.injectElement(this.node);
                }
                else {
                    throw new Error('Tentative de double chargement du fichier : ' + this.url);
                }
            },

            injectElement : function injectElement(elem) {
                (this.document.getElementsByTagName('HEAD')[0] ||
                 this.document.getElementsByTagName('BODY')[0] ||
                 this.document.documentElement)
                    .appendChild(elem);
            },

            registerLoadControl : function registerLoadControl(loadControl) {
                var unik = true,
                    i;

                if (!('loadControls' in this)) {
                    this.loadControls = [loadControl];
                }
                else {
                    i = this.loadControls.length;

                    while (unik && i--) {
                        unik = this.loadControls !== loadControl;
                    }

                    if (unik) {
                        this.loadControls.push(loadControl);
                    }
                }
            },

            controlLoad : function controlLoad(def) {
                if (!('loadControls' in this)) {
                    return def;
                }

                var loaded = true,
                    i = this.loadControls.length;

                while (loaded && i--) {
                    loaded = !!this.loadControls[i].call(this);
                }

                return loaded;
            },

            loadHandler : function loadHandler(supposed) {
                if ('loadTimer' in this) {
                    clearTimeout(this.loadTimer);
                    delete this.loadTimer;
                }

                if (!('loaded' in this) || this.loaded !== true) {
                    this.loaded = this.controlLoad(supposed);

                    this.events.trigger(this.loaded ? 'load' : 'error');
                }
            },

            __statics__ : {
                getStaticUrl : function getStaticUrl(url) {
                    if (url && url.substr(0, 1) === '/') {
                        url = FileInjection.prototype.staticDomain + url;
                    }

                    return url;
                }
            }
        }, [
            'createNode'
        ]);

        return FileInjection;
    });
    define('ScriptInjection', ['EasyPrototype', 'FileInjection'], function(EasyPrototype, FileInjection) {
        return EasyPrototype.createClass('ScriptInjection', FileInjection, {
            type : 'text/javascript',

            createNode : function createNode() {
                this.node = this.document.createElement('script');
                this.node.type = this.type;
                this.node.async = true;

                if ('charset' in this) {
                    this.node.charset = this.charset;
                }

                this.node.src = this.url;

                if (this.multiload) {
                    if (this.node.src.indexOf('?') === -1) {
                        this.node.src += '?';
                    }
                    else {
                        this.node.src += '&';
                    }
                    this.node.src += '_=' + parseInt(Math.random() * 10000000);
                }

                this.node.onload = this.node.onreadystatechange = this.callback('loadCatcher');
                this.node.onerror = this.callback('loadHandler', false);
            },

            loadCatcher : function loadCatcher() {
                if ('readyState' in this.node && this.node.readyState !== 'complete' && this.node.readyState !== 'loaded') {
                    return;
                }

                this.loadHandler(true);
            }
        });
    });
    define('StyleInjection', ['EasyPrototype', 'FileInjection'], function(EasyPrototype, FileInjection) {
        return EasyPrototype.createClass('StyleInjection', FileInjection, {
            type : 'text/css',

            injectTimeout : 1000,

            defaultLoadSupposition : true,

            createNode : function createNode() {
                this.node = this.document.createElement('link');
                this.node.type = this.type;
                this.node.rel = 'stylesheet';
                this.node.media = 'all';

                if ('charset' in this) {
                    this.node.charset = this.charset;
                }

                this.node.href = this.url;
            },

            injectNode : function injectNode() {
                this.execSuper('injectNode');
                this.checkLoadTimer = setTimeout(this.callback('checkLoad'), 100);
            },

            checkLoad : function checkLoad() {
                if ('loadControls' in this) {
                    if (this.controlLoad(false)) {
                        this.loadHandler(true);
                    }
                    else if ('loadTimer' in this) {
                        this.checkLoadTimer = setTimeout(this.callback('checkLoad'), 100);
                    }
                }
            },

            loadHandler : function loadHandler() {
                clearTimeout(this.checkLoadTimer);
                this.execSuper('loadHandler', arguments);
            }
        });
    });
}(this, define, this.document, this.setTimeout, this.clearTimeout));