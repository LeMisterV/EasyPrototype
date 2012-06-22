(function(global, undef) {
    function define(moduleName, deps, constructor) {
        var depName;
        var len = deps.length;
        var commonStock = define.defined.none;
        var context = define.context || 'none';

        if (!(context in define.defined)) {
            define.defined[context] = {};
        }

        context = define.defined[context];

        if (!(moduleName in context)) {
            try {
                while (len--) {
                    depName = deps[len];
                    if (depName === 'jquery') {
                        deps[len] = global.jQuery;
                    }
                    else {
                        deps[len] = context[depName] || commonStock[depName] || global[depName];
                        if (deps[len] === undef) {
                            throw new Error(moduleName + ' : Unavailable dependency "' + depName + '"');
                        }
                    }
                }

                context[moduleName] = constructor.apply(global, deps);

                if (!(moduleName in commonStock)) {
                    commonStock[moduleName] = context[moduleName];
                }

                if (!define.noglobal && !(moduleName in global)) {
                    global[moduleName] = context[moduleName];
                }
            }
            catch(e) {
                global.console && global.console.error && global.console.error(e);
            }
        }

        delete define.noglobal;
        return context[moduleName];
    }

    define.defined = {none : {}};

    global.define = global.define || define;
}(this));