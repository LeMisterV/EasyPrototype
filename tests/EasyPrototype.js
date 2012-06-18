(function (global) {
    describe('EasyPrototype', function() {

        it('"EasyPrototype" should exist', function() {
            expect('EasyPrototype' in global).toBe(true);
        });

        it('"EasyPrototype" should be a function', function() {
            expect(typeof global.EasyPrototype).toBe('function');
        });

        describe('Creation de Class', function() {
            var TestClass,
                testInstance;
            it('should be possible to create a new Class using "EasyPrototype.createClass"', function() {

                function createClass() {
                    TestClass = global.EasyPrototype.createClass('MyClass', {});
                }

                expect(typeof global.EasyPrototype.createClass).toBe('function');
                expect(createClass).not.toThrow();
            });

            it('should be possible to instanciate that class', function() {

                function instanciate() {
                    testInstance = new TestClass();
                }

                expect(instanciate).not.toThrow();
                expect(testInstance instanceof TestClass).toBe(true);
            });

            it('instances should be instance of TestClass and EasyPrototype', function() {

                expect(testInstance instanceof TestClass).toBe(true);
                expect(testInstance instanceof global.EasyPrototype).toBe(true);
            });
        });
    });
}(this));
