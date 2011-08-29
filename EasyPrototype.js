(function (window, undef) {

    function getPurObject(obj, proto) {
        var objPur = {},
            gotSlots = false,
            allSlots = true,
            slot;

        for (slot in obj) {
            if (
                slot === 'constructor' ||
                proto &&
                slot in proto &&
                proto[slot] === obj[slot]
            ) {
                allSlots = false;
                continue;
            }
            objPur[slot] = obj[slot];
            gotSlots = true;
        }

        // S'il y a un slot toString qui n'est pas le slot toString natif (pour IE)
        if (
            obj.toString &&
            obj.toString !== ({}).toString
        ) {
            if(!(proto && proto.toString === obj.toString)) {
                objPur.toString = obj.toString;
                gotSlots = true;
            }
            else {
                allSlots = false;
            }
        }

        return allSlots ? obj : gotSlots ? objPur : undef;
    }

    function getPurPrototypes(obj) {
        if(!obj || obj === EasyPrototype.prototype) {
            return [];
        }

        var proto = 'constructor' in obj && obj.constructor.prototype !== obj && obj.constructor.prototype,
            purProtos = getPurPrototypes(proto),
            purObj = getPurObject(obj, proto);

        if(purObj) {
            purProtos.push(purObj);
        }

        return purProtos;
    }

    // Fonction de génération de méthodes abstraites
    function setAbstractMethod(methodName) {
        function abstractMethod() {
            throw new Error('Méthode abstraite non surchargée : ' + this.toString() + ':' + methodName);
        }
        abstractMethod.is_abstract = true;
        return abstractMethod;
    }

    // Fonction de construction du prototype d'une classe
    function initConstructor() {

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
            abstracts,
            abstractsProto,
            interfaces = [],
            implementList = [],
            interfaceName,
            type,
            rest,
            i = args.length;

        // On parcours l'objet arguments pour répartir les données entre className, protoClass, interface, proto et abstracts
        while (i--) {
            type = typeof args[i];
            if(type === 'string') {
                className = args[i];
            }
            else if (args[i] === null) {
                ProtoClass = null;
            }
            else if (args[i] instanceof Array) {
                abstracts = args[i];
            }
            else if(proto === undef && type !== 'function') {
                proto = args[i];
            }
            else {
                if(type === 'function' && ProtoClass !== null) {
                    ProtoClass = args[i];
                }
                implementList.push(args[i]);
            }
        }

        i = implementList.length;
        while (i--) {
            if(typeof implementList[i] === 'function') {
                if('implementList' in implementList[i]) {
                    implementList.push.apply(implementList, implementList[i].implementList);
                }
                interfaceName = implementList[i].className;
                implementList[i] = implementList[i].prototype;
            }
            else if('constructor' in implementList[i]) {
                if('prototype' in implementList[i].constructor && className in implementList[i].constructor) {
                    implementList.push(implementList[i].constructor.prototype);
                }
                if('implementList' in implementList[i].constructor) {
                    implementList.push.apply(implementList, implementList[i].constructor.implementList);
                }
            }
            if(ProtoClass && implementList[i] === ProtoClass.prototype) {
                continue;
            }
            if(interfaceName) {
                interfaces.push(interfaceName);
                interfaceName = undef;
            }
            interfaces.push.apply(interfaces, getPurPrototypes(implementList[i]));
        }
        // If ProtoClass not defined and not null we use EasyPrototype as the ProtoClass and
        // register it as an interface
        if(ProtoClass !== (ProtoClass || null)) {
            ProtoClass = EasyPrototype;
            implementList.push(EasyPrototype.prototype);
        }

        if(implementList.length) {
            this.implementList = implementList;
        }

        // On implémente les différentes interfaces
        i = interfaces.reverse().length;
        while (i--) {
            if(typeof interfaces[i] === 'string') {
                interfaceName = ' ' + interfaces[i];
            }
            else {
                ProtoClass = createProtoClass('Interface' + interfaceName, ProtoClass, interfaces[i]);
            }
        }

        // Mise en place du prototype contenant les méthodes abstraites
        if (abstracts && abstracts.length) {
            abstractsProto = {};
            i = abstracts.length;
            while (i--) {
                if(ProtoClass && !(abstracts[i] in ProtoClass.prototype)) {
                    abstractsProto[abstracts[i]] = setAbstractMethod(abstracts[i]);
                }
            }
            ProtoClass = createProtoClass(ProtoClass, abstractsProto);
        }

        // Génération du prototype final
        if (ProtoClass) {
            ProtoClass.createPrototype = true;
            proto = new ProtoClass(proto);
        }

        // On attache le prototype nouvellement créé à la fonction de construction
        this.prototype = proto;

        this.implements = EasyPrototype.prototype.implements;
        this.getConstructor = EasyPrototype.prototype.getConstructor;
        this.toString = EasyPrototype.prototype.toString;
        this.slotDefinition = EasyPrototype.prototype.slotDefinition;

        this.className = className || proto.className || 'unNamedClass';

        this.instancesCount = 0;

        return this;
    }

    function initPrototype(proto) {
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
    }

    function initInstance() {
        this.instanceNum = this.constructor.instancesCount++;

        // On retourne le résultat de la méthode "init". Si la valeur de retour est d'un type
        // élémentaire (bool, int, string, undefined, null), cette valeur ne sera pas
        // retournée (fonctionnement de javascript). Si la valeur de retour en revanche est un
        // objet, alors c'est cet objet qui sera retourné au lieu de la nouvelle instance tout
        // juste créée

        var instance = (('getInstance' in this) && this.getInstance.apply(this, arguments)) ||
            ('init' in this) && this.init.apply(this, arguments);

        // Si on construit une nouvelle instance (pas de résultat à getInstance) et qu'une méthode
        // destroy existe on met en place le processus de destruction au window.unload
        if (instance === undef && 'destroy' in this) {
            // On window unload, call destroy method
            if (window.addEventListener) {
                window.addEventListener('unload', this.callback('destroy'), false);
            }
            else if (window.attachEvent) {
                window.attachEvent('onunload', this.callback('destroy'));
            }
        }

        return instance;
    }

    function commonConstruct(constructor, args) {
        if (!(this instanceof constructor)) {
            constructor.argsAsArray = true;
            return new constructor(args);
        }

        // This slot makes it possible to get the construction function of an
        // object, and than to get the prototype of this construction function
        // So this makes it possible to find the execSuper method
        this.constructor = constructor;

        if(constructor.argsAsArray) {
            delete constructor.argsAsArray;
            args = args[0];
        }

        if (constructor.createPrototype) {
            delete constructor.createPrototype;
            initPrototype.apply(this, args);
        }
        else {
            return initInstance.apply(this, args);
        }
    }

    // Creates a Class that will always create a prototype object (no init method called on
    // instanciation)
    function createProtoClass() {
        function ProtoClassConstructor() {
            ProtoClassConstructor.createPrototype = true;
            return commonConstruct.call(this, ProtoClassConstructor, arguments);
        }

        return initConstructor.apply(ProtoClassConstructor, arguments);
    }

    // Creates a normal Class
    function createClass() {
        function ClassConstructor() {
            return commonConstruct.call(this, ClassConstructor, arguments);
        }

        initConstructor.apply(ClassConstructor, arguments);

        // On défini des méthodes de classe génériques
        ClassConstructor.getSuper = EasyPrototype.prototype.getSuper;
        ClassConstructor.execSuper = EasyPrototype.prototype.execSuper;
        ClassConstructor.methodString = EasyPrototype.prototype.methodString;

        // Si la méthode "classSetup" existe, on l'exécute. Cette méthode est destinée à
        // initialiser la classe
        if ('classSetup' in ClassConstructor.prototype) {
            ClassConstructor.prototype.classSetup.call(ClassConstructor);
        }

        return ClassConstructor;
    }

    function callSuper(methodName, currentClass, superClass, args) {
        var result,
            i,
            cls = ('constructor' in this && this.constructor !== Function) ?
                this.constructor :
                this;

        if (!('_super' in this)) {
            this._super = {};
        }

        this._super[methodName] = superClass;

        result = superClass.prototype[methodName].apply(this, args);

        if (currentClass !== cls) {
            this._super[methodName] = currentClass;
        }
        else {
            delete this._super[methodName];

            // On fait un check pour supprimer la propriété _super si elle est complètement vide
            for (i in this._super) {
                i = true;
                break;
            }

            if (i !== true) {
                delete this._super;
            }
        }
        return result;
    }

    function getCallback(obj, methodName, forceArgs) {
        var method = obj[methodName];

        if (typeof method !== 'function') {
            throw new Error('La méthode "' + methodName + '" n\'existe pas');
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

    function EasyPrototype(proto) {
        if(!(this instanceof EasyPrototype)) {
            return EasyPrototype.createClass.apply(this, arguments);
        }

        EasyPrototype.createPrototype = true;
        commonConstruct.call(this, EasyPrototype, arguments);
    }

    initConstructor.call(EasyPrototype, 'EasyPrototype', null, {
        // returns a callback function for the given method
        callback : function callback(methodName) {
            // the callback method is different for each set of given arguments. So it's much
            // more complicated to have a cache solution in the case arguments are given.
            // That's why there's no cache when there's arguments, and so we can return directly
            // the callback function
            if(arguments.length > 1) {
                return getCallback(this, methodName, [].slice.call(arguments, 1));
            }
            if (!('_callbacks' in this)) {
                this._callbacks = {};
            }
            if (!(methodName in this._callbacks)) {
                this._callbacks[methodName] = getCallback(this, methodName);
            }
            return this._callbacks[methodName];
        },

        // returns a callback function for the parent method if any
        getSuper : function getSuper(methodName, args) {
            var $this = this,
                cls = ('constructor' in this && this.constructor !== Function) ?
                    this.constructor :
                    this,
                originalClass = this.getConstructor(methodName),
                currentClass = originalClass,
                parentClass,
                superClass;

            if(currentClass === cls && currentClass.prototype[methodName] !== this[methodName]) {
                superClass = currentClass;
            }

            while(!superClass) {
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
                    return callSuper.call($this, methodName, originalClass, superClass, args || arguments);
                };
            }
            return function execSuper() {};
        },

        // Calls the parent method if any
        execSuper : function execSuper(methodName, args) {
            return this.getSuper(methodName).apply(this, args || []);
        },

        getConstructor : function getConstructor(slotName, subCls) {
            var cls;

            if(subCls !== undef) {
                if(slotName in this.prototype && this.prototype[slotName] === subCls.prototype[slotName]) {
                    if('constructor' in this.prototype && this.prototype.constructor !== this && 'getConstructor' in this.prototype.constructor) {
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

        implements : function implements(object) {
            var cls = ('constructor' in this && this.constructor !== Function && this.constructor) || this,
                i = 'implementList' in cls && cls.implementList.length;

            if(object === this || object === cls || object === cls.prototype) {
                return true;
            }

            if(typeof object === 'function') {
                object = object.prototype;
            }

            while (i-- && cls.implementList[i] !== object) {}

            return i !== -1;
        },

        slotDefinition : function slotDefinition(slotName) {
            var className = ('prototype' in this && this.className) || this.constructor.className,
                protoName = this.getConstructor(slotName).className;

            protoName = (protoName !== className) && '(' + protoName + ')';
            return className + '[' + this.instanceNum + ']::' + slotName + (protoName || '');
        },

        methodString : function methodString(methodName) {
            return this.slotDefinition(methodName);
        },

        toString : function toString() {
            return this.getConstructor().className;
        }
    });

    EasyPrototype.prototype.constructor = EasyPrototype;
    EasyPrototype.createProtoClass = createProtoClass;
    EasyPrototype.createClass = createClass;

    // On ne remplace pas une version déjà chargée de EasyPrototype.
    // Donc si plusieurs versions sont chargées, c'est la première chargée qui est utilisée
    window.EasyPrototype = window.EasyPrototype || EasyPrototype;
}(this));