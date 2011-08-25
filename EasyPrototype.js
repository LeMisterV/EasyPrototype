(function (window, undef) {

    function getPurObject(obj) {
        var proto = arguments.length > 1 ?
                arguments[1] :
                ('constructor' in obj && obj.constructor.prototype !== obj && obj.constructor.prototype),
            objPur = {},
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
            'toString' in obj &&
            obj.toString !== ({}).toString
        ) {
            if(!(proto && 'toString' in proto && proto.toString === obj.toString)) {
                objPur.toString = obj.toString;
                gotSlots = true;
            }
            else {
                allSlots = false;
            }
        }

        return allSlots ? obj : gotSlots ? objPur : undef;
    }

    function getObjectPrototypes(obj) {
        var prototypes = [],
            objPur = {},
            proto;

        do {
            proto = 'constructor' in obj && obj.constructor.prototype !== obj && obj.constructor.prototype;
            objPur = getPurObject(obj, proto);

            if (objPur) {
                prototypes.push(objPur);
            }

            obj = proto;
        } while (obj && obj !== EasyPrototype.prototype);

        // On retourne un tableau des prototypes de l'objet commençant par le plus profond
        return prototypes.reverse();
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
    function setPrototype() {

        // On recoit différents types d'arguments :
        // - null : Ca veut dire qu'on ne veut pas de ProtoClass, même pas EasyPrototype
        // - 1ere function : C'est une ProtoClass si pas de ProtoClass null, sinon c'est une "interface"
        // - functions sauf 1ere : c'est une "interface"
        // - array : C'est la liste des méthodes abstraites
        // - dernier autre : C'est le prototype
        // - autres sauf dernier : Ce sont des "interfaces" a implémenter

        var ProtoClass,
            proto,
            abstracts,
            abstractsProto,
            interfaces = [],
            implementList = [],
            rest,
            i = arguments.length;

        // On parcours l'objet arguments pour répartir les données entre ProtoClass, proto et abstracts
        while (i--) {
            if (arguments[i] === null) {
                ProtoClass = null;
            }
            else if (typeof arguments[i] === 'function') {
                implementList.push(arguments[i]);
            }
            else if (arguments[i] instanceof Array) {
                abstracts = arguments[i];
            }
            else {
                if (proto === undef) {
                    proto = arguments[i];
                }
                else {
                    implementList.push(arguments[i]);
                }
            }
        }

        i = implementList.length;
        while (i--) {
            if(typeof implementList[i] === 'function') {
                if(ProtoClass === undef) {
                    ProtoClass = implementList[i];
                    implementList[i] = implementList[i].prototype;
                    continue;
                }
                else {
                    implementList[i] = implementList[i].prototype;
                }
            }
            interfaces.push.apply(interfaces, getObjectPrototypes(implementList[i]));

            if(
                'constructor' in implementList[i] &&
                'implementList' in implementList[i].constructor &&
                implementList[i].constructor.implementList.length
            ) {
                implementList.push.apply(implementList, implementList[i].constructor.implementList);
            }
        }

        if(ProtoClass && 'implementList' in ProtoClass) {
            implementList.push.apply(implementList, ProtoClass.implementList);
        }

        if(implementList.length) {
            this.implementList = implementList;
        }

        // Si aucune ProtoClass n'est donnée et que ProtoClass est différent de null, on utilise
        // EasyPrototype comme ProtoClass
        ProtoClass = ProtoClass || (ProtoClass !== null && EasyPrototype);

        // On implémente les différentes interfaces
        i = interfaces.reverse().length;
        while (i--) {
            ProtoClass = createProtoClass(ProtoClass, interfaces[i]);
        }

        // Mise en place du prototype contenant les méthodes abstraites
        if (abstracts && abstracts.length) {
            abstractsProto = {};
            i = abstracts.length;
            while (i--) {
                abstractsProto[abstracts[i]] = setAbstractMethod(abstracts[i]);
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

        if (proto.className) {
            // On reprend le className en propriété "name" de la fonction de construction afin d'avoir
            // un affichage plus clair dans firebug entre autre.
            // Cette pratique n'est pas reelement souhaitable en production. La propriété name est
            // utilisé par javascript et ne devrait pas être manipulée. Elle est même théoriquement
            // en read-only.
            // TODO : Il faudrait peut-être de préférence virer cette instruction pour qu'elle ne
            // soit pas exploitée dans d'autre script étant donnée qu'elle n'a pas lieu d'être. Ceci
            // dit dans le cadre de développement c'est tout de même pratique
            this.name = proto.className;
        }
        return this;
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

    // Creates a Class that will always create a prototype object (no init method called on
    // instanciation)
    function createProtoClass() {
        function ProtoClassConstructor() {
            ProtoClassConstructor.createPrototype = true;
            return commonConstruct.call(this, ProtoClassConstructor, arguments);
        }

        return setPrototype.apply(ProtoClassConstructor, arguments);
    }

    // Creates a normal Class
    function createClass() {
        function ClassConstructor() {
            return commonConstruct.call(this, ClassConstructor, arguments);
        }

        setPrototype.apply(ClassConstructor, arguments);

        // On défini des méthodes de classe génériques
        ClassConstructor.getCurrentPrototype = EasyPrototype.prototype.getCurrentPrototype;
        ClassConstructor.getSuper = EasyPrototype.prototype.getSuper;
        ClassConstructor.execSuper = EasyPrototype.prototype.execSuper;
        ClassConstructor.methodString = EasyPrototype.prototype.methodString;
        ClassConstructor.toString = EasyPrototype.prototype.toString;

        // Si la méthode "classSetup" existe, on l'exécute. Cette méthode est destinée à
        // initialiser la classe
        if ('classSetup' in ClassConstructor.prototype) {
            ClassConstructor.prototype.classSetup.call(ClassConstructor);
        }

        return ClassConstructor;
    }

    function callSuper(methodName, currentProto, superProto, args) {
        var result,
            i;

        if (!('_super' in this)) {
            this._super = {};
        }

        this._super[methodName] = superProto;

        result = superProto[methodName].apply(this, args);

        if (currentProto[methodName] !== (this[methodName] || this.prototype[methodName])) {
            this._super[methodName] = currentProto;
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

        forceArgs = forceArgs || [];

        function callback() {

            var args = [].slice.call(arguments).reverse(),
                i = forceArgs.length;

            while (i--) {
                args.push(forceArgs[i]);
            }

            args.reverse();

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

    setPrototype.call(EasyPrototype, {
        className : 'EasyPrototype',

        // returns a callback function for the given method
        callback : function callback(methodName) {
            if (!('_callbacks' in this)) {
                this._callbacks = {};
            }
            if (!(methodName in this._callbacks)) {
                if (typeof this[methodName] !== 'function') {
                    throw new Error('La méthode "' + methodName + '" n\'existe pas');
                }

                // the callback method is different for each set of given arguments. So it's much
                // more complicated to have a cache solution in the case arguments are given.
                // That's why there's no cache when there's arguments, and so we can return directly
                // the callback function
                if(arguments.length > 1) {
                    return getCallback(this, methodName, [].slice.call(arguments, 1));
                }
                this._callbacks[methodName] = getCallback(this, methodName);
            }
            return this._callbacks[methodName];
        },

        // returns a callback function for the parent method if any
        getSuper : function getSuper(methodName, args) {
            var $this = this,
                originalProto = this.getCurrentPrototype(methodName),
                currentProto = originalProto,
                parentProto,
                superProto;

            do {
                parentProto = 'constructor' in currentProto &&
                    currentProto.constructor.prototype !== currentProto &&
                    currentProto.constructor.prototype;

                // TODO : Ci après une comparaison est faite entre deux valeurs. Cela
                // pourra poser des problèmes si le slot en question est un getter, car
                // alors cette méthode de comparaison déclenche l'exécution du getter
                // ce qui peut avoir de lourdes concéquences. Il serait préférable donc
                // à ce niveau de vérifier avant tout la présence d'un getter sur le
                // slot
                if (parentProto) {
                    if (!(methodName in parentProto) ||
                        parentProto[methodName].is_abstract) {
                        break;
                    }

                    if (parentProto[methodName] !== currentProto[methodName]) {
                        superProto = parentProto;
                    }

                    currentProto = parentProto;
                }
            }
            while (!superProto);

            if (superProto) {
                return function execSuper() {
                    return callSuper.call($this, methodName, originalProto, superProto, args || arguments);
                };
            }
            return function execSuper() {};
        },

        // Calls the parent method if any
        execSuper : function execSuper(methodName, args) {
            return this.getSuper(methodName).apply(this, args || []);
        },

        // Returns the prototype that own the given slot or the object/class's prototype
        getCurrentPrototype : function getCurrentPrototype(slotName) {
            // First we check if the given slot is a currently running method, and if so we get
            // the current prototype in use if a super method has been called (stored in the
            // _super property, see getSuper)
            var parentProto,
                proto = (slotName && this._super && this._super[slotName]) ||
                    this.prototype ||
                    this;

            // If a slotName is given, we have to find the prototype that owns this slot.
            // The top protoype may not own this property but maybe it's a super prototype who
            // owns it. So we have to check the parent/super prototypes to be sure witch
            // prototype owns the slot.
            if (slotName && proto) {
                do {
                    // we get the parent prototype if any
                    parentProto = 'constructor' in proto && proto.constructor.prototype !== proto && proto.constructor.prototype;

                }
                while (
                    parentProto &&
                    slotName in parentProto &&
                    // TODO : Ici la comparaison est faite entre les deux valeurs. Cela
                    // pourra poser des problèmes si le slot en question est un getter, car
                    // alors cette méthode de comparaison déclenche l'exécution du getter
                    // ce qui peut avoir de lourdes concéquences. Il serait préférable donc
                    // à ce niveau de vérifier avant tout la présence d'un getter sur le
                    // slot
                    parentProto[slotName] === proto[slotName] &&
                    (proto = parentProto)
                )
            }

            return proto;
        },

        implements : function implements(object) {
            var cls = ('constructor' in this && this.constructor) || this,
                i = 'implementList' in cls && cls.implementList.length;

            if(object === cls || object === cls.prototype) {
                return true;
            }

            if(typeof object === 'function') {
                object = object.prototype;
            }

            while (i-- && cls.implementList[i] !== object) {}

            return i !== -1;
        },

        methodString : function methodString(methodName) {
            return this.getCurrentPrototype(methodName).className + '::' + methodName;
        },

        toString : function toString(methodName) {
            return this.getCurrentPrototype(methodName).className || 'unnamedObject';
        }
    });

    EasyPrototype.prototype.constructor = EasyPrototype;
    EasyPrototype.createProtoClass = createProtoClass;
    EasyPrototype.createClass = createClass;

    // On ne remplace pas une version déjà chargée de Easyprototype.
    // Donc si plusieurs versions sont chargées, c'est la première chargée qui est utilisée
    window.EasyPrototype = window.EasyPrototype || EasyPrototype;
}(this));