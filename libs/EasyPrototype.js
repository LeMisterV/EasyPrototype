(function (define, setTimeout, undef) {
    "use strict";

    define('EasyPrototype', [], function() {

        var tools = {

            /** collect all slots owned by an object (none of the slots inherited)
             *
             * An object can own its own slots and inherit slots from his prototype parents.
             * This function will check all slots, and return an object containing only the slots owned
             * directly by the object.
             * The result of this function will generally be a new object containing the object's own slots.
             * If the original object doesn't inherit any slot from a parent prototype's object, the
             * original object will be returned.
             * If the original object doesn't own any slot by itself, than the function will return
             * undefined (easyer to check than an empty object)
             *
             * This function is only called from the getPurPrototypes function. In this function, we already
             * got a reference to the prototype object. To avoid loosing time searching for this object
             * again and again, we pass this reference as a parameter to getPurObject.
             *
             * @param obj (Object) The original object we want to get slots from
             * @param proto (Object|undefined) The object's prototype object
             *
             * @return (Object|undefined) The original object or a new object containing all the original
             *                            object's slots, or undefined if the original object doesn't own
             *                            any slot by itself
             */
            getPurObject : function getPurObject(obj, proto) {
                var objPur = {},
                    gotSlots = false,
                    allSlots = true,
                    slot;

                for (slot in obj) {
                    // we skip the "constructor" slot, witch is an exception.
                    // If a slot is the same on the object and on his prototype, than this slot is
                    // inherited, so we skip it
                    if (
                        slot === 'constructor' ||
                        proto &&
                        slot in proto &&
                        proto[slot] === obj[slot]
                    ) {
                        // We skip a slot, so we remember that not all slots are kept
                        allSlots = false;
                        continue;
                    }

                    objPur[slot] = obj[slot];
                    gotSlots = true;
                }

                // (For IE) Check if the "toString" method exists and is different from the native Object toString method
                if ( obj.toString && obj.toString !== ({}).toString ) {
                    if (!(proto && proto.toString === obj.toString)) {
                        objPur.toString = obj.toString;
                        gotSlots = true;
                    }
                    else {
                        allSlots = false;
                    }
                }

                return allSlots ? obj : gotSlots ? objPur : undef;
            },

            /** Get an array of all different "pur prototypes" composing the object
             *
             * This function does a kind of dissection of the object, returning an array of "pur objects",
             * each one corresponding to one of the object's prototypes
             * The first element of the resulting array correspond to the deeper prototype. The last cel of
             * the array contains the objects own slots.
             *
             * @param obj (*) The object we want to dissect
             *
             * @return (Array) each "pur object" composing the original object
             */
            getPurPrototypes : function getPurPrototypes(obj) {
                if (!obj || obj === EasyPrototype.prototype) {
                    return [];
                }

                var proto = 'constructor' in obj && obj.constructor !== ({}).constructor && obj.constructor.prototype !== obj && obj.constructor.prototype,
                    purProtos = tools.getPurPrototypes(proto),
                    purObj = tools.getPurObject(obj, proto);

                if (purObj) {
                    purProtos.push(purObj);
                }

                return purProtos;
            },

            getImplementList : function getImplementList(ImplementedClass, isProtoClass) {
                var list,
                    last;

                if (ImplementedClass.prototype.constructor !== ImplementedClass) {
                    list = [ImplementedClass.prototype];

                    if ('implementList' in ImplementedClass) {
                        list.push.apply(list, ImplementedClass.implementList);

                        last = list.splice(-1, 1)[0];

                        if (!isProtoClass || last !== EasyPrototype.prototype) {
                            list.push(last);
                        }
                    }
                    return list;
                }
            },

            completeImplementList : function completeImplementList(implementList, start, length, implementClass, isProtoClass) {
                var args = [start, length];
                args.push.apply(args, tools.getImplementList(implementClass, isProtoClass));
                implementList.splice.apply(implementList, args);
            },

            cleanImplementList : function cleanImplementList(implementList, ProtoClass) {
                var i = implementList.length,
                    interfaceName,
                    interfaces = [];

                while (i--) {
                    // If the element to implement is a class
                    if (typeof implementList[i] === 'function') {
                        // We collect the implementList from this class

                        interfaceName = implementList[i].className;
                        tools.completeImplementList(implementList, i, 1, implementList[i], implementList[i] === ProtoClass);
                    }
                    // If it's an instance of a class
                    else if ('constructor' in implementList[i]) {
                        tools.completeImplementList(implementList, i + 1, 0, implementList[i].constructor);
                    }

                    if (ProtoClass && implementList[i] === ProtoClass.prototype) {
                        continue;
                    }

                    if (interfaceName) {
                        interfaces.push(interfaceName);
                        interfaceName = undef;
                    }
                    interfaces.push.apply(interfaces, tools.getPurPrototypes(implementList[i]));
                }

                return interfaces;
            },

            implementInterfaces : function implementInterfaces(ProtoClass, implementList, className) {
                var interfaces = tools.cleanImplementList(implementList, ProtoClass),
                    i = interfaces.reverse().length,
                    interfaceName;

                // If ProtoClass not defined and not null we use EasyPrototype as the ProtoClass and
                // register it as an interface
                if (ProtoClass !== (ProtoClass || null)) {
                    ProtoClass = EasyPrototype;
                    implementList.push(EasyPrototype.prototype);
                }

                while (i--) {
                    if (typeof interfaces[i] === 'string') {
                        interfaceName = interfaces[i];
                    }
                    else {
                        ProtoClass = tools.createProtoClass(className + '>' + interfaceName, ProtoClass, interfaces[i]);
                    }
                }

                return ProtoClass;
            },

            /** Build a constructor function (make prototype and default slots)
             *
             * The params types can be :
             *  - string (the class name)
             *  - null (disable protoClass)
             *  - function (protoClass or "interfaces")
             *  - array (abstract classes)
             *  - object (interfaces or prototype)
             *
             * The params passed to this function can define :
             *  - The class name (if param is a string)
             *  - The main inherited protoClass (null or the first function passed in params)
             *  - The "interfaces" to be implemented (functions passed in params except the
             *      "protoClass" one if any, or objects except the last one)
             *  - The prototype (The last object param)
             *  - The abstract methods (if param is an array)
             *
             * About class Name :
             * For each class created with EasyPrototype, it's possible to define a class name. This name
             * will generally be usefull for debugging, and is also used in other cases (interfaces,
             *
             * About protoClass :
             * I use here the word protoClass to define a class  that will be used only to create a
             * prototype, not an instance. When instanciating a protoClass, the init method will not be
             * called, and a "proto" param will be used to define some slots on the new object created.
             * Any EasyPrototype class can be used as a protoClass. This way it's possible to extend any
             * class.
             *
             * About interfaces :
             * I use here the word interfaces but it's not the same concept as in java. In java, interfaces
             * only describe objects API. Here interfaces are more like some prototypes fragments. Each
             * interface contains methods that will be part of the final object inside its prototype. this
             * can't be called inheritance because the resulting object won't be "instanceof" thoses
             * interfaces (no multiple inheritence solution in javascript). This is why I added a "contains"
             * method to EasyPrototype : With this method it's possible to check if an object implements
             * a specific interface ("implements" is a reserved keyword, I couldn't use it).
             *
             *
             * @this (function) The constructor function
             *
             * @params (mixed) Elements defining the constructor to build
             *
             * @return (function) The final constructor function
             */
            initConstructor : function initConstructor() {
                // On recoit différents types d'arguments :
                // - string : le nom de la nouvelle classe crée
                // - null : Ca veut dire qu'on ne veut pas de ProtoClass, même pas EasyPrototype
                // - 1ere function : C'est une ProtoClass si pas de ProtoClass null, sinon c'est une "interface"
                // - functions sauf 1ere : c'est une "interface"
                // - array : C'est la liste des méthodes abstraites
                // - dernier autre : C'est le prototype
                // - autres sauf dernier : Ce sont des "interfaces" a implémenter

                var args = arguments,
                    className,
                    ProtoClass,
                    proto,
                    implementList = [],
                    type,
                    i = args.length;

                // On parcours l'objet arguments pour répartir les données entre className, protoClass, interface et proto
                while (i--) {
                    if (!(args[i] instanceof Array || args[i] === undef)) {
                        type = typeof args[i];
                        if (type === 'string') {
                            className = args[i];
                        }
                        else if (args[i] === null) {
                            ProtoClass = null;
                        }
                        else if (proto === undef && type !== 'function') {
                            proto = args[i];
                        }
                        else {
                            if (type === 'function' && ProtoClass !== null) {
                                ProtoClass = args[i];
                            }
                            implementList.push(args[i]);
                        }
                    }
                }

                className = className || 'unNamedClass';

                // Here we implement all interfaces
                ProtoClass = tools.implementInterfaces(
                    ProtoClass,
                    implementList,
                    className
                );

                if (implementList.length) {
                    // We keep track of all implemented interfaces
                    this.implementList = implementList;
                }

                // If proto contains a slot called __statics__, all slots in it will be added to the
                // constructor as static values, and the __statics__ slot will be removed
                if (proto && '__statics__' in proto) {
                    for (i in proto.__statics__) {
                        if (proto.__statics__[i] === true && i in proto) {
                            this[i] = proto[i];
                        }
                        else {
                            this[i] = proto.__statics__[i];
                        }
                    }
                    delete proto.__statics__;
                }

                // Building the final prototype object
                if (ProtoClass) {
                    ProtoClass.createPrototype = true;
                    proto = new ProtoClass(proto);
                }

                this.prototype = proto;
                this.className = className;

                this.contains = EasyPrototype.prototype.contains;
                this.getConstructor = EasyPrototype.prototype.getConstructor;
                this.toString = EasyPrototype.prototype.toString;

                return this;
            },

            /** Constructor actions for a "protoClass" instanciation
             *
             * @this (object) the new object instance created
             *
             * @param proto (object) All the slots to be added to the new object instance
             */
            initPrototype : function initPrototype(proto) {
                var slot;

                if (proto !== undef && proto !== null) {
                    // On complète notre nouvel objet vide avec le contenu du prototype
                    for (slot in proto) {
                        if ((!(slot in this)) || this[slot] !== proto[slot]) {
                            this[slot] = proto[slot];
                        }
                    }

                    // Specific for IE that doesn't go through "toString" during a "for in" sequence
                    if (proto.toString &&
                       proto.toString !== ({}).toString &&
                       proto.toString !== this.toString) {
                        this.toString = proto.toString;
                    }
                }
            },

            /** Constructor actions for a normal instanciation
             *
             * @this (object) the new object instance created
             *
             * @params (mixed) All the params for the class construction (params passed to the init method)
             *
             * @return the new instance created, or the replacement if an already existing object is to be
             *   used instead (see getInstance method)
             */
            initInstance : function initInstance() {
                var instance;

                this.instanceNum = this.constructor.instancesCount || 0;

                this.constructor.instancesCount = this.instanceNum + 1;

                // On retourne le résultat de la méthode "init". Si la valeur de retour est d'un type
                // élémentaire (bool, int, string, undefined, null), cette valeur ne sera pas
                // retournée (fonctionnement de javascript). Si la valeur de retour en revanche est un
                // objet, alors c'est cet objet qui sera retourné au lieu de la nouvelle instance tout
                // juste créée
                instance = ('getInstance' in this) && this.getInstance.apply(this, arguments);

                if ((!instance || instance === this) && 'init' in this) {
                    instance = this.init.apply(this, arguments);
                }

                // Si on construit une nouvelle instance (pas de résultat à getInstance) et qu'une méthode
                // destroy existe on met en place le processus de destruction au window.unload
                // Il faut bien refaire le test sur instance ici car le résultat de la méthode init peut jouer
/*
                if ((!instance || instance === this) && 'destroy' in this) {
                    // On window unload, call destroy method
                    if (global.addEventListener) {
                        global.addEventListener('unload', this.callback('destroy'), false);
                    }
                    else if (global.attachEvent) {
                        global.attachEvent('onunload', this.callback('destroy'));
                    }
                }
*/
                return instance;
            },

            /** Constructor actions for any instanciation
             *
             * This function will do any common construction action, and than will delegate to
             * "initPrototype" or "initInstance" depending on the kind of construction we asked (instance or prototype)
             *
             * @this (object) the new object instance created
             *
             * @param constructor (function) The constructor function used to create the object
             * @param args (arguments-array) The arguments passed to the constructor function
             *
             * @return the new instance created, or the replacement if an already existing object is to be
             *   used instead (see getInstance method)
             */
            commonConstruct : function commonConstruct(Constructor, args) {
                if (!(this instanceof Constructor)) {
                    Constructor.argsAsArray = true;
                    return new Constructor(args);
                }

                // This slot makes it possible to get the construction function of an
                // object, and than to get the prototype of this construction function
                // So this makes it possible to find the super methods
                this.constructor = Constructor;

                if(Constructor.argsAsArray) {
                    delete Constructor.argsAsArray;
                    args = args[0];
                }

                if (Constructor.createPrototype) {
                    delete Constructor.createPrototype;
                    tools.initPrototype.apply(this, args);
                }
                else {
                    return tools.initInstance.apply(this, args);
                }
            },

            // Creates a Class that will always create a prototype object (no init method called on
            // instanciation)
            createProtoClass : function createProtoClass() {
                var ProtoClassConstructor = function () {
                    ProtoClassConstructor.createPrototype = true;
                    return tools.commonConstruct.call(this, ProtoClassConstructor, arguments);
                };

                return tools.initConstructor.apply(ProtoClassConstructor, arguments);
            },

            // Creates a normal Class
            createClass : function createClass() {
                var ClassConstructor = function () {
                    return tools.commonConstruct.call(this, ClassConstructor, arguments);
                };

                tools.initConstructor.apply(ClassConstructor, arguments);

                // On défini des méthodes de classe génériques
                ClassConstructor.getSuper = EasyPrototype.prototype.getSuper;
                ClassConstructor.execSuper = EasyPrototype.prototype.execSuper;

                // Si la méthode "classSetup" existe, on l'exécute. Cette méthode est destinée à
                // initialiser la classe
                if ('classSetup' in ClassConstructor.prototype) {
                    ClassConstructor.prototype.classSetup.call(ClassConstructor);
                }

                return ClassConstructor;
            },

            callSuper : function callSuper(methodName, currentClass, superClass, args) {
                var result,
                    i,
                    cls = this.getConstructor(),
                    added;

                this._super = this._super || {};
                this._super.length = this._super.length || 0;

                added = methodName in this._super ? 0 : 1;

                this._super[methodName] = superClass;
                this._super.length+= added;

                result = superClass.prototype[methodName].apply(this, args);

                if (!added) {
                    this._super[methodName] = currentClass;
                }
                else {
                    delete this._super[methodName];
                    this._super.length--;

                    // On fait un check pour supprimer la propriété _super si elle est complètement vide
                    if(!this._super.length) {
                        delete this._super;
                    }
                }
                return result;
            },

            getCallback : function getCallback(obj, methodName, forceArgs) {
                var method = obj[methodName];

                if (typeof method !== 'function') {
                    throw new Error('The "' + methodName + '" method doesn\'t  exist');
                }

                forceArgs = forceArgs || [];

                function callback() {
                    var args = forceArgs.slice(0);
                    args.push.apply(args, arguments);

                    if (obj[methodName] === callback) {
                        return method.apply(obj, args);
                    }
                    return obj[methodName].apply(obj, args);
                }

                return callback;
            }
        };

        function EasyPrototype(proto) {
            if(!(this instanceof EasyPrototype)) {
                return tools.createClass.apply(this, arguments);
            }

            EasyPrototype.createPrototype = true;
            tools.commonConstruct.call(this, EasyPrototype, arguments);
        }

        tools.initConstructor.call(EasyPrototype, 'EasyPrototype', null, {

            // returns a callback function for the given method
            callback : function callback(methodName) {
                // the callback method is different for each set of given arguments. So it's much
                // more complicated to have a cache solution in the case arguments are given.
                // That's why there's no cache when there's arguments, and so we can return directly
                // the callback function
                if (arguments.length > 1) {
                    return tools.getCallback(this, methodName, [].slice.call(arguments, 1));
                }
                if (!('_callbacks' in this)) {
                    this._callbacks = {};
                }
                if (!(methodName in this._callbacks)) {
                    this._callbacks[methodName] = tools.getCallback(this, methodName);
                }
                return this._callbacks[methodName];
            },

            lazyCallback : function lazyCallback() {
                var obj = this,
                    args = arguments,
                    delay = 0,
                    func,
                    rest;

                if (typeof args[1] === 'number') {
                    delay = args[1];
                    rest = [].slice.call(args, 2);
                    args.length = 1;
                    rest.push.apply(args, rest);
                }

                func = this.callback.apply(this, args);

                return function lazyCallback() {
                    var args = arguments;

                    setTimeout(function () {
                        func.apply(obj, args);
                    }, delay);
                };
            },

            // returns a callback function for the super method if any
            getSuper : function getSuper(methodName, args) {
                var $this = this,
                    cls = ('constructor' in this && this.constructor !== Function) ?
                        this.constructor :
                        this,
                    originalClass = this.getConstructor(methodName),
                    currentClass = originalClass,
                    parentClass,
                    superClass;

                // Dans le cas d'une instance, currentClass est obligatoirement au moins une méthode du
                // prototype.
                // On doit donc commencer par contrôler que la currentClass n'a pas été surchargée par
                // une méthode sur l'instance, et dans ce cas il faut donc appeler la méthode du
                // currentClass.
                if (cls !== this && currentClass === cls && (!('_super' in this && methodName in this._super)) && currentClass.prototype[methodName] !== this[methodName]) {
                    superClass = currentClass;
                }

                while (!superClass) {
                    parentClass = 'constructor' in currentClass.prototype &&
                        currentClass.prototype.constructor !== currentClass &&
                        currentClass.prototype.constructor;

                    // TODO : Ci après une comparaison est faite entre deux valeurs. Cela
                    // pourra poser des problèmes si le slot en question est un getter, car
                    // alors cette méthode de comparaison déclenche l'exécution du getter
                    // ce qui peut avoir de lourdes concéquences. Il serait préférable donc
                    // à ce niveau de vérifier avant tout la présence d'un getter sur le
                    // slot
                    if (parentClass) {
                        if (!(methodName in parentClass.prototype) ||
                            parentClass.prototype[methodName].is_abstract) {
                            break;
                        }

                        if (parentClass.prototype[methodName] !== currentClass.prototype[methodName]) {
                            superClass = parentClass;
                        }

                        currentClass = parentClass;
                    }
                }

                if (superClass) {
                    return function execSuper() {
                        return tools.callSuper.call($this, methodName, originalClass, superClass, args || arguments);
                    };
                }
                return function execSuper() {};
            },

            // Calls the super method if any
            execSuper : function execSuper(methodName, args) {
                return this.getSuper(methodName).apply(this, args || []);
            },

            getConstructor : function getConstructor(slotName, subCls) {
                var cls;

                if(subCls !== undef) {
                    if (slotName in this.prototype && this.prototype[slotName] === subCls.prototype[slotName]) {
                        if ( 'constructor' in this.prototype &&
                             this.prototype.constructor !== this &&
                             'getConstructor' in this.prototype.constructor) {
                            return this.prototype.constructor.getConstructor(slotName, this);
                        }
                        return this;
                    }
                    return subCls;
                }

                if(slotName && '_super' in this && this._super[slotName]) {
                    cls = this._super[slotName];
                }
                else {
                    cls = ('constructor' in this && this.constructor !== Function) ?
                            this.constructor :
                            this;
                }

                if(slotName && 'constructor' in cls.prototype && cls.prototype.constructor !== cls && 'getConstructor' in cls.prototype.constructor) {
                    return cls.prototype.constructor.getConstructor(slotName, cls);
                }

                return cls;
            },

            contains : function contains(object) {
                var cls = this.getConstructor(),
                    i = ('implementList' in cls && cls.implementList.length) || 0;

                if(object === this || object === cls || object === cls.prototype) {
                    return true;
                }

                if(typeof object === 'function') {
                    object = object.prototype;
                }

                while (i-- && cls.implementList[i] !== object) {}

                return i !== -1;
            },

            toString : function toString() {
                return this.getConstructor().className;
            },

            constructor : EasyPrototype,

            __statics__ : {
                createProtoClass : tools.createProtoClass,

                createClass : tools.createClass,

                tools : tools
            }
        });

        return EasyPrototype;
    });
}(define, this.setTimeout));