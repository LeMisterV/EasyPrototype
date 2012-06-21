(function (global) {
    describe('define', function() {

        it('"define" should exist', function() {
            expect('define' in global).toEqual(true);
        });

        describe('Basic use, create a module', function() {
            var testObject = {test:true};

            define('test1', [], function() {
                return {};
            });

            define('test2', [], function() {
                return {};
            });

            define('test', ['test1', 'test2'], function(test1, test2) {
                it('dependencies should be receved', function() {
                    expect(test1).toEqual(global.test1);
                    expect(test2).toEqual(global.test2);

                    delete global.test1;
                    delete global.test2;
                });

                return testObject;
            });

            it('module "test" should be defined', function() {
                expect('test' in global).toEqual(true);
                expect(global.test).toEqual(testObject);
                expect(global.test.test).toEqual(true);

                delete global.test;
            });
        });


        describe('Simple context use', function() {
            var testObject1;
            var testObject2;

            it('testObject should be declared on global', function() {
                define.context = 'context1';
                testObject1 = define('testObject', [], function() {
                    return {name:'testObject1'};
                });

                expect(testObject1.name).toBe('testObject1');
                expect('testObject' in global).toBe(true);
                expect(global.testObject).toBe(testObject1);
            });

            it('global testObject should stay on version 1', function() {
                define.context = 'context2';
                testObject2 = define('testObject', [], function() {
                    return {name:'testObject2'};
                });

                expect(testObject2.name).toBe('testObject2');
                expect(global.testObject).toBe(testObject1);
            });

            it('when context is context1, testObject should be version 1', function() {
                define.context = 'context1';
                define('test1', ['testObject'], function(testObject) {

                    expect(testObject).toBe(testObject1);
                    return {};
                });
            });

            it('when context is context2, testObject should be version 2', function() {
                define.context = 'context2';
                define('test2', ['testObject'], function(testObject) {

                    expect(testObject).toBe(testObject2);
                    return {};
                });
            });

            it('when context is context3, testObject should be version 1 (first declared)', function() {
                define.context = 'context3';
                define('test3', ['testObject'], function(testObject) {

                    expect(testObject).toBe(testObject1);
                    return {};
                });
            });

            it('when defining a module already defined for the context specified, first version should stay', function() {
                define.context = 'context1';
                var testObject3 = define('testObject', [], function() {
                    return {name:'testObject3'};
                });

                expect(testObject3.name).toBe('testObject1');

                define('test4', ['testObject'], function(testObject) {

                    expect(testObject).toBe(testObject1);
                    return {};
                });
            });
        });
    });
}(this));