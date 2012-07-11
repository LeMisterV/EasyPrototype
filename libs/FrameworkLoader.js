(function(global, define, Error, eval, setTimeout, JSON, undef) {
    /*
     Unable to use "use strict" because we need to use eval
     We must use another solution to get params values, than we can use "use strict"
    */
    define.noglobal = true;
    define('FrameworkLoader', ['EasyPrototype', 'EventsManager', 'ScriptInjection', 'jquery'], function(EasyPrototype, EventsManager, ScriptInjection, $) {
        var FrameworkLoader = EasyPrototype.createProtoClass(
                'FrameworkLoader',
                {
                autoLoad : false,

                classSetup : function classSetup() {
                    var name = this.className;
                    var Constructor = this;

                    var recever = FrameworkLoader.registered;
                    var instance;

                    if ('framework' in global) {
                        recever = global.framework;
                    }

                    instance = recever[name];

                    if (instance) {
                        if (typeof console !== 'undefined' && 'error' in console) {
                            console.error(new Error('Double chargement du framework ' + name));
                        }
                    }
                    else {
                        recever[name] = new Constructor();
                    }

                    FrameworkLoader.registered[name] = recever[name];
                },

                init : function init() {
                    if ('earlySetup' in this) {
                        FrameworkLoader.onStartLoading(this.callback('earlySetup'));
                    }

                    if (this.autoLoad) {
                        this.askLoad();
                    }
                },

                exec : function exec(action) {
                    // S'il n'y a pas d'action demandé (par exemple pour simplement forcer le chargement
                    // du framework), on défini une fonction vide comme action. Il est important
                    // d'attacher un eventListener, même vide, pour que le chargement du framework soit
                    // déclenché (fonctionnement de la librairie EventsManager et de
                    // "whenEventHasListener")
                    action = action || function() {};

                    FrameworkLoader.events.addEventListener(this.constructor.className, action);
                },

                askLoad : function askLoad() {
                    if ('_loadAsked' in this) {
                        return;
                    }
                    this._loadAsked = true;

                    // On DOIT passer par la méthode startLoading pour que l'appel à la méthode load
                    // soit fait sans aucun paramètre. Sinon le paramètre evt du EventsManager est pris
                    // comme paramètre onload dans la méthode load et ça pose problème.
                    // TODO : On pourrait peut-être trouver plus propre comme solution
                    FrameworkLoader.onStartLoading(this.callback('startLoading'));
                },

                // Méthode necessaire pour faire appel à la méthode load sans aucun paramètres (cf askLoad)
                startLoading : function startLoading() {
                    this.load();
                },

                load : function load(onload, onerror, checkloaded) {
                    var file = {
                            url : this.scriptSrc
                        };

                    if (onload === undef) {
                        onload = this.callback('onReady');
                    }

                    if (onerror === undef) {
                        onerror = 'onError' in this && this.callback('onError');
                    }

                    if (checkloaded === undef) {
                        checkloaded = 'checkloaded' in this && this.callback('checkloaded');
                    }

                    if (typeof onload === 'function') {
                        file.onload = onload;
                    }

                    if (typeof onerror === 'function') {
                        file.onerror = onerror;
                    }

                    if (typeof checkloaded === 'function') {
                        file.loadControl = checkloaded;
                    }

                    if (this.scriptCharset) {
                        file.charset = this.scriptCharset;
                    }

                    new ScriptInjection(file);
                },

                onReady : function onReady() {
                    FrameworkLoader.events.trigger(this.constructor.className);
                },

                __statics__ : {
                    registered : {},

                    loadingDelay : 100,

                    paramsControl : /^\s*\{\s*((framework)?params)\s*:\s*\{(.|\s)*\}\s*\}\s*$/i,

                    events : new EventsManager(),

                    mergeRecursive : function mergeRecursive(obj1, obj2) {
                        var p;
                        if (typeof obj1 !== 'object') {
                            obj1 = {};
                        }
                        for (p in obj2) {
                            if (p in obj2) {
                                obj1[p] = typeof obj2[p] === 'object' ?
                                    mergeRecursive(obj1[p], obj2[p]) :
                                    obj2[p];
                            }
                        }
                        return obj1;
                    },

                    collectScriptParams : function collectScriptParams() {
                        var txt = $(this).text().replace('//<![CDATA[', '').replace('//]]>', ''),
                            params,
                            frameworkName,
                            matches = FrameworkLoader.paramsControl.exec(txt),
                            recever;

                        if (txt && matches) {
                            try {
                                if (JSON !== undef && 'parse' in JSON) {
                                    var params = JSON.parse(txt)[matches[1]];
                                }
                                else if ('framework' in global) {
                                    eval(
                                        'window.framework.LoaderPrototype.paramsReceiver = ' +
                                        txt
                                    );

                                    if (matches[1] in global.framework.LoaderPrototype.paramsReceiver) {
                                        params = global.framework.LoaderPrototype.paramsReceiver[matches[1]];
                                    }

                                    delete global.framework.LoaderPrototype.paramsReceiver;
                                }
                                else {
                                    return;
                                }
                            }
                            catch(e) {
                                if (typeof console !== 'undefined' && 'error' in console) {
                                    console.error(e);
                                }
                                return;
                            }

                            recever = FrameworkLoader.registered;

                            if ('framework' in global) {
                                recever = global.framework;
                            }

                            for (frameworkName in params) {
                                if (frameworkName !== 'LoaderPrototype' && frameworkName !== 'register') {
                                    if (!(frameworkName in recever)) {
                                        recever[frameworkName] = {};
                                    }
                                    recever[frameworkName].inlineParams = FrameworkLoader.mergeRecursive(
                                        recever[frameworkName].inlineParams,
                                        params[frameworkName]
                                    );
                                }
                            }
                        }
                    },

                    onWindowLoad : function onWindowLoad() {
                        if ($) {
                            $('script[src]')
                                .each(FrameworkLoader.collectScriptParams);
                        }

                        setTimeout(
                            FrameworkLoader.events.callback('trigger', 'windowLoaded'),
                            FrameworkLoader.loadingDelay
                        );
                    },

                    onFrameworkNeeded : function onFrameworkNeeded(FrameworkName) {
                        var recever = FrameworkLoader.registered;

                        if ('framework' in global) {
                            recever = global.framework;
                        }

                        if (FrameworkName !== 'windowLoaded' && FrameworkName in recever) {
                            recever[FrameworkName].askLoad();
                        }
                    },

                    register : function register() {
                        var Constructor;
                        var args = [].slice.call(arguments).reverse();
                        var recever = FrameworkLoader.registered;

                        if ('framework' in global) {
                            recever = global.framework;
                        }

                        args.push(FrameworkLoader);
                        Constructor = EasyPrototype.createClass.apply(this, args.reverse());
                        return recever[Constructor.className];
                    }
                }
            });

        FrameworkLoader.onStartLoading = FrameworkLoader.events.callback('addEventListener', 'windowLoaded');

        FrameworkLoader.events.whenEventHasListener = FrameworkLoader.onFrameworkNeeded;

        if ('addEventListener' in global) {
            global.addEventListener('load', FrameworkLoader.onWindowLoad, false);
        }
        else if ('attachEvent' in global) {
            global.attachEvent('onload', FrameworkLoader.onWindowLoad);
        }

        return FrameworkLoader;
    });
}(this, define, this.Error, this.eval, this.setTimeout, this.JSON));