(function(global, document, undef) {

    var ENV = document.location.hostname.replace(/^((?:pp|dev|intg)(\.|$))?.*$/, '$1'),

        FileInjection = global.FileInjection = global.FileInjection || global.EasyPrototype.createProtoClass(
            'FileInjection',
            global.EventsManager,
            {
            instances : {},

            injectTimeout : 2000,

            defaultLoadSupposition : false,

            env : ENV,

            staticDomain : {
                dev : 'http://dev.static.francetelevisions.fr'
            }[ENV] || 'http://' + ENV + 'www.francetelevisions.fr',

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

                this.url = FileInjection.getStaticUrl(params.url);

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

                this.loadTimer = global.setTimeout(this.callback('loadHandler', this.defaultLoadSupposition), this.injectTimeout);

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
                    global.clearTimeout(this.loadTimer);
                    delete this.loadTimer;
                }

                if (!('loaded' in this) || this.loaded !== true) {
                    this.loaded = this.controlLoad(supposed);

                    this.events.trigger(this.loaded ? 'load' : 'error');
                }
            },

            __statics__ : {
                patternSelfPath : /^(https?:\/\/[^\/]+)?\/layoutftv\/arches\/common\/javascripts\//,
            //    patternSelfPath = /jsLibs/;

                searchStaticDomain : function searchStaticDomain(tagName, attrName) {
                    var tagList = document.getElementsByTagName(tagName),
                        matches,
                        i = tagList.length;

                    while (i--) {
                        matches = FileInjection.patternSelfPath.exec(tagList[i].getAttribute(attrName));
                        if (matches) {
                            FileInjection.prototype.staticDomain = global.staticDomain = matches[1] ||
                                document.location.protocol + '//' + document.location.hostname;
                            return true;
                        }
                    }
                    return false;
                },

                onWindowLoad : function onWindowLoad() {
                    if (global.staticDomain) {
                        return;
                    }

                    var tagsTypes = {
                            script : 'src',
                            link : 'href'
                        },
                        key;

                    for (key in tagsTypes) {
                        if (FileInjection.searchStaticDomain(key, tagsTypes[key])) {
                            break;
                        }
                    }
                },

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

    if (global.addEventListener) {
        global.addEventListener('load', FileInjection.onWindowLoad, false);
    }
    else if (global.attachEvent) {
        global.attachEvent('onload', FileInjection.onWindowLoad);
    }

    FileInjection.onWindowLoad();


    global.ScriptInjection = global.ScriptInjection || global.EasyPrototype.createClass('ScriptInjection', FileInjection, {
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

    global.StyleInjection = global.StyleInjection || global.EasyPrototype.createClass('StyleInjection', FileInjection, {
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
            this.checkLoadTimer = global.setTimeout(this.callback('checkLoad'), 100);
        },

        checkLoad : function checkLoad() {
            if ('loadControls' in this) {
                if (this.controlLoad(false)) {
                    this.loadHandler(true);
                }
                else if ('loadTimer' in this) {
                    this.checkLoadTimer = global.setTimeout(this.callback('checkLoad'), 100);
                }
            }
        },

        loadHandler : function loadHandler() {
            global.clearTimeout(this.checkLoadTimer);
            this.execSuper('loadHandler', arguments);
        }
    });

}(this, this.document));