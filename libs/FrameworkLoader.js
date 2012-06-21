(function(global, define, Error, undef) {
define('framework', ['EasyPrototype', 'EventsManager', 'ScriptInjection', 'jquery'], function(EasyPrototype, EventsManager, ScriptInjection, $) {

    var framework = {
            register : function() {
                var args = [].slice.call(arguments).reverse();
                args.push(FrameworkLoader);
                EasyPrototype.createClass.apply(this, args.reverse());
            }
        },

        FrameworkLoader = framework.LoaderPrototype = EasyPrototype.createProtoClass(
            'FrameworkLoader',
            {
            autoLoad : false,

            classSetup : function classSetup() {
                var name = this.className;

                if (framework[name]) {
                    global.console && global.console.error && global.console.error(new Error('Double chargement du framework ' + name));
                }
                else {
                    framework[name] = new this();

                    // Raccourci en tant que plugin jQuery (deprecated)
                    if ($ !== undef) {
                        $[name] = framework[name].callback('exec');
                    }
                }
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
                        matches = FrameworkLoader.paramsControl.exec(txt);

                    if (txt && matches) {
                        try {
                            global.eval(
                                'window.framework.LoaderPrototype.paramsReceiver = ' +
                                txt
                            );

                            if (matches[1] in FrameworkLoader.paramsReceiver) {
                                params = FrameworkLoader.paramsReceiver[matches[1]];
                            }
                        }
                        catch(e) {
                            if ('console' in global && 'error' in global.console) {
                                global.console.error(e);
                            }
                            return;
                        }

                        delete FrameworkLoader.paramsReceiver;

                        for (frameworkName in params) {
                            if (frameworkName !== 'LoaderPrototype' && frameworkName !== 'register') {
                                if (!(frameworkName in framework)) {
                                    framework[frameworkName] = {};
                                }
                                framework[frameworkName].inlineParams = FrameworkLoader.mergeRecursive(
                                    framework[frameworkName].inlineParams,
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

                    global.setTimeout(
                        FrameworkLoader.events.callback('trigger', 'windowLoaded'),
                        FrameworkLoader.loadingDelay
                    );
                },

                onFrameworkNeeded : function onFrameworkNeeded(FrameworkName) {
                    if (FrameworkName !== 'windowLoaded' && FrameworkName in framework) {
                        framework[FrameworkName].askLoad();
                    }
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

    framework.LoaderPrototype = FrameworkLoader;

    return framework;
});
}(this, this.define, this.Error));