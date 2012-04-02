(function (global, undef) {

    global.EasyPrototype.debugFilter = {};

    /** Creates a function that can be identified as an "abstract method"
     *
     * When defining that a method is abstract, this means it should be implemented by the
     * inheriting object. If it's not, there should be an error thrown if the method is called.
     * "setAbstractMethod" creates a function that will be inserted in an object's prototypes
     *
     * Everything about abstract methods is not necessary for programs to work. The only goal of all
     * this is to be able to have more precise errors, and better programming habits.
     *
     * @param methodName (string) The name of the method that should be implemented
     *
     * @return (function) the function to be inserted inside objects prototypes when inheriting an
     *                    abstract method
     */
    function setAbstractMethod(methodName) {
        function abstractMethod() {
            throw new Error('Abstract method not implemented : ' + this.slotDefinition(methodName)[0]);
        }
        abstractMethod.is_abstract = true;
        return abstractMethod;
    }

    function passDebugFilter(obj, methodName) {
        if ('debugFilter' in global.EasyPrototype) {
            obj = ('prototype' in obj && obj) || obj.constructor;

            if (typeof global.EasyPrototype.debugFilter === 'string') {
                if (global.EasyPrototype.debugFilter === '*') {
                    return true;
                }

                if (global.EasyPrototype.debugFilter.indexOf('*:') === 0 &&
                    global.EasyPrototype.debugFilter.indexOf(':' + methodName) === 1) {
                    return true;
                }
            }
            else if (obj.className in global.EasyPrototype.debugFilter) {
                if (global.EasyPrototype.debugFilter[obj.className] === '*') {
                    return true;
                }

                if (global.EasyPrototype.debugFilter[obj.className].indexOf(methodName) !== -1) {
                    return true;
                }
            }
        }

        return false;
    }

    /** Add to a method a call to 'logSlotDefinition'. This way we can log every method execution */
    function getLogLayer(methodName, method) {
        function logLayer() {
            if (passDebugFilter(this, methodName)) {
                this.logSlotDefinition(methodName);
            }
            return method.apply(this, arguments);
        }

        logLayer.original = method;

        return logLayer;
    }

    global.classesIndex = {
        length : 0
    };

    function initConstructorDebug() {
        var args = arguments,
            abstracts = [],
            i = args.length,
            result;

        while (i--) {
            if (args[i] instanceof Array) {
                abstracts.push.apply(abstracts, args[i]);
            }
        }

        function implementInterfacesDebug(ProtoClass, implementList, className) {
            var result,
                abstractsProto,
                i;

            global.EasyPrototype.tools.implementInterfaces = implementInterfacesDebug.original;
            result = implementInterfacesDebug.original.apply(this, arguments);

            // Insertion of the "abstract methods prototype"
            if (abstracts && abstracts.length) {
                abstractsProto = {};
                i = abstracts.length;
                while (i--) {
                    if(!ProtoClass || !(abstracts[i] in ProtoClass.prototype)) {
                        abstractsProto[abstracts[i]] = setAbstractMethod(abstracts[i]);
                    }
                }
                ProtoClass = global.EasyPrototype.createProtoClass(className + '_abstracts', ProtoClass, abstractsProto);
            }

            return result;
        }

        implementInterfacesDebug.original = global.EasyPrototype.tools.implementInterfaces;
        global.EasyPrototype.tools.implementInterfaces = implementInterfacesDebug;

        result = initConstructorDebug.original.apply(this, arguments);

        if (this.className in global.classesIndex) {
            console.error('Deux classes avec le classeName "' + this.className + '" : ', this, global.classesIndex[this.className], this === global.classesIndex[this.className]);
        }
        else {
            global.classesIndex[this.className] = this;
            global.classesIndex.length++;
        }

        this.slotDefinition = global.EasyPrototype.prototype.slotDefinition;
        this.logSlotDefinition = global.EasyPrototype.prototype.logSlotDefinition;

        return result;
    }

    initConstructorDebug.original = global.EasyPrototype.tools.initConstructor;
    global.EasyPrototype.tools.initConstructor = initConstructorDebug;



    function initPrototypeDebug(proto) {
        var result,
            slot;

        if (proto && 'hasOwnProperty' in proto) {
            for (slot in proto) {
                if (proto.hasOwnProperty(slot) &&
                    typeof proto[slot] === 'function' &&
                    !('original' in proto[slot])) {
                    proto[slot] = getLogLayer(slot, proto[slot]);
                }
            }
        }

        return initPrototypeDebug.original.apply(this, arguments);
    }

    initPrototypeDebug.original = global.EasyPrototype.tools.initPrototype;
    global.EasyPrototype.tools.initPrototype = initPrototypeDebug;


    global.EasyPrototype.prototype.slotDefinition = function slotDefinition(slotName) {
        var className = ('prototype' in this && this.className) || this.constructor.className,
            constructor = this.getConstructor(slotName),
            constructorName = constructor.className,
            protoArgs = slotName in constructor.prototype && constructor.prototype[slotName].arguments,
            args = [],
            instanceNum = this.instanceNum !== undef ? '[' + this.instanceNum + ']' : '';

        constructorName = (constructorName !== className) ? '>' + constructorName : '';

        args.push(className + instanceNum + constructorName + '::' + slotName);
        if (protoArgs) {
            args.push.apply(args, protoArgs);
        }
        if (arguments.length > 1) {
            args.push.apply(args, [].slice.call(arguments, 1));
        }

        return args;
    };

    global.EasyPrototype.prototype.logSlotDefinition = function logSlotDefinition(slotName) {
        if(!('console' in global) ||
           !('debug' in console)) {
            return;
        }

        var method = 'info' in console ? 'info' : 'log',
            slotDef = this.slotDefinition.apply(this, arguments),
            i;

        if(!('apply' in console[method])) {
            Function.prototype.apply.apply(console[method], [console, slotDef]);
        }
        else if ('groupCollapsed' in console && 'trace' in console) {
            console.groupCollapsed(slotDef[0]);

            slotDef = slotDef.slice(1);
            i = slotDef.length;
            while (i-- > 1) {
                slotDef.splice(i, 0, ', ');
            }
            slotDef.push(')');
            slotDef.unshift('(');

            console.log.apply(console, slotDef);
            console.log(this);
            console.trace();
            console.groupEnd();
        }
        else {
            console[method].apply(console, slotDef);
        }
    };

    global.EasyPrototype.restrictSlots = function restrictSlots(name) {
        global.restrictSlotsLogged = global.restrictSlotsLogged || {};

        if (name === 'all') {
            global.restrictSlotsLogged = 'all';
        }
        else if (typeof name === 'string') {
            global.restrictSlotsLogged[name] = true;
        }
        else if (name instanceof Array) {
            var len = name.length;
            while (len--) {
                global.restrictSlotsLogged[name[len]] = true;
            }
        }
        else if(name) {
            for (key in name) {
                global.restrictSlotsLogged[key] = true;
            }
        }
    };

}(this));