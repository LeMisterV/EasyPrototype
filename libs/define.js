(function(global) {
    function define(name, dep, constructor) {
        var result,
            len = dep.length;

        if (!(name in define.defined)) {
            while (len--) {
                if (dep[len] === 'jquery') {
                    dep[len] = global.jQuery;
                }
                else {
                    dep[len] = define.defined[dep[len]];
                }
            }

            define.defined[name] = constructor.apply(global, dep);

            if (!define.noglobal) {
                global[name] = define.defined[name];
            }
        }

        delete define.noglobal;
        return define.defined[name];
    }

    define.defined = {};

    global.define = global.define || define;
}(this));