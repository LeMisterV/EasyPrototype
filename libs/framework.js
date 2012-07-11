(function(define) {
    define('framework', ['FrameworkLoader'], function(FrameworkLoader) {
        return {
            register : FrameworkLoader.register,
            LoaderPrototype : FrameworkLoader
        };
    });
}(define));