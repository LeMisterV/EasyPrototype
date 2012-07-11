(function (global) {
    describe('FrameworkLoader', function() {

        it('"framework" should exist', function() {
            expect('framework' in global).toBe(true);
        });

        it('"framework" should have a "register" method', function() {
            expect('register' in global.framework).toBe(true);
            expect(typeof global.framework.register).toBe('function');
        });

        describe('Enregistrement d\'un framework', function() {
            var TestClass,
                testInstance;
            it('should be possible to register a new framework using "framework.register"', function() {

                function registerFramework() {
                    framework.register('GooglejQuery', {
                        scriptSrc : 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js',

                        scriptCharset : 'utf-8'
                    });
                }

                expect(registerFramework).not.toThrow();
                expect('GooglejQuery' in framework).toBe(true);
            });

            it('should be possible to register actions do exec when this framework is loaded', function() {

                function instanciate() {
                    framework.GooglejQuery.exec(function() {
                        console.warn('LOADED !!');
                    });
                }

                expect(instanciate).not.toThrow();
            });
        });
    });
}(this));
