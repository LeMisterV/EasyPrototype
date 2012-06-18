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

            result = constructor.apply(global, dep);

            global[name] = define.defined[name] = result;
        }
    }

    define.defined = {};

    global.define = global.define || define;
}(this));
