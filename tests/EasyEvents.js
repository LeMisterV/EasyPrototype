(function (global) {
    describe('EasyEvents', function() {

        it('should exist', function() {
            expect('EasyEvents' in global).toBe(true);
        });

        it('should be a function', function() {
            expect(typeof global.EasyEvents).toBe('function');
        });

        describe('Instanciation', function() {
            var test;

            it('should be possible to create an EasyEvents instance', function() {

                function createInstance() {
                    test = new global.EasyEvents();
                }

                expect(createInstance).not.toThrow();
                expect(test).toBeDefined();
                expect(test instanceof global.EasyEvents).toBe(true);
            });

            it('instances should have methods "on", "off" and "destroy"', function() {
                expect('on' in test).toBe(true);
                expect('off' in test).toBe(true);
                expect('destroy' in test).toBe(true);
            });

            it('should be possible to inherit "EasyEvents" in new Classes', function() {
                var MyClass = global.EasyPrototype.createClass('MyClass', global.EasyEvents, {
                        init : function init() {
                            
                        }
                    }),
                    myInstance = new MyClass();

                expect(myInstance instanceof global.EasyEvents).toBe(true);
            });
        });

        describe('Utilisation', function() {

            it('should be possible to follow an event type', function() {
                var test = new EasyEvents();
                var spie = jasmine.createSpy();
                test.on('action', spie);
                test.events.trigger('action');
                expect(spie).toHaveBeenCalled();
            });

        });

    });
}(this));
