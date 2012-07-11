(function(define) {
    define('framework', ['FrameworkLoader'], function(FrameworkLoader) {
        return {
            register : FrameworkLoader.register
        };
    });
}(define));