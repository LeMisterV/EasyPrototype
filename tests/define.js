(function (global) {
    describe('define', function() {

        it('"define" should exist', function() {
            expect('define' in global).toEqual(true);
        });

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
}(this));
