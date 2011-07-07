(function (window, undef) {

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
        // - function : C'est une ProtoClass
        // - array : C'est la liste des méthodes abstraites
        // - autre : C'est le prototype

        var ProtoClass,
            proto,
            abstracts,
            i = arguments.length;

        // On parcours l'objet arguments pour répartir les données entre ProtoClass, proto et abstracts
        while(i--) {
            if(arguments[i] === null) {
                ProtoClass = null;
            }
            else if(typeof arguments[i] === 'function') {
                ProtoClass = arguments[i];
            }
            else if(arguments[i] instanceof Array) {
                abstracts = arguments[i];
            }
            else {
                proto = arguments[i];
            }
        }

        // Si aucune ProtoClass n'est donnée et que ProtoClass est différent de null, on utilise
        // EasyPrototype comme ProtoClass
        ProtoClass = ProtoClass || (ProtoClass !== null && EasyPrototype);

        // Si la class fournie en ProtoClass n'est pas une ProtoClass, on en crée une ProtoClass
        if(ProtoClass && !ProtoClass.is_protoClass) {
            ProtoClass = EasyPrototype.createProtoClass(ProtoClass.prototype.constructor, ProtoClass.prototype);
        }

        if (!proto) {
            proto = {};
        }

        if (abstracts) {
            i = abstracts.length;
            while (i--) {
                proto[abstracts[i]] = setAbstractMethod(abstracts[i]);
            }
        }

        if (ProtoClass) {
            proto = new ProtoClass(proto);
        }

        // On attache le prototype nouvellement créé à la fonction de construction
        this.prototype = proto;

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

    function createProtoClass() {
        function ProtoClassConstructor(proto) {
            if (!(this instanceof ProtoClassConstructor)) {
                throw new Error('You must use "new" keyword to create a prototype class instance');
            }

            if (proto !== undef && proto !== null) {
                // On complète notre nouvel objet vide avec le contenu du prototype
                var slot;
                for (slot in proto) {
                    if ((!(slot in this)) || this[slot] !== proto[slot]) {
                        this[slot] = proto[slot];
                    }
                }

                // Specific for IE that doesn't go through "toString" during a "for in" sequence
                if (proto.toString &&
                   proto.toString !== Object.prototype.toString &&
                   proto.toString !== this.toString) {
                    this.toString = proto.toString;
                }
            }

            // This slot makes it possible to get the construction function of an
            // object, and than to get the prototype of this construction function
            // So this makes it possible to find the execSuper method
            this.constructor = ProtoClassConstructor;
        }

        ProtoClassConstructor.is_protoClass = true;

        return setPrototype.apply(ProtoClassConstructor, arguments);
    }

    function createClass() {
        function ClassConstructor() {
            if (!(this instanceof ClassConstructor)) {
                throw new Error('You must use "new" keyword to create a class instance');
            }

            // This slot make it possible to get the construction function of an
            // object, and than to get the prototype of this construction
            // function. So this make it possible to have the execSuper method
            this.constructor = ClassConstructor;

            // On retourne le résultat de la méthode "init". Si la valeur de retour est d'un type
            // élémentaire (bool, int, string, undefined, null), cette valeur ne sera pas
            // retournée (fonctionnement de javascript). Si la valeur de retour en revanche est un
            // objet, alors c'est cet objet qui sera retourné au lieu de la nouvelle instance tout
            // juste créée

            // TODO : vérifier l'utilité de ce return. Je trouve ça un peu moche de faire un return
            // dans une fonction constructeur, mais il faut voir si certains cas l'exigent ou pas.
            // Il faut également vérifier que cette fonctionnalité n'est utilisé nullepart avant de
            // la virer
            // Cette fonctionnalité est utilisée entre autre dans le script SyncDate ou MediaInfos
            // et cet usage est tout à fait justifié. Pour éviter cet usage, il faudrait utiliser
            // une solution de singleton ou de factory.
            // Pour faire les choses plus proprement, on pourrait mettre en place une méthode static
            // "getInstance" prenant les même paramettre que init et retournant l'instance voulue si
            // elle existe déjà.
            // exemple de code :
            /*
            if(typeof this.getInstance === 'function') {
                var instance = this.getInstance.apply(this, arguments);
                if(instance) {
                    return instance;
                }
            }
            if (typeof this.init === 'function') {
                this.init.apply(this, arguments);
            }
            */

            // version plus short et avec moins de contrôles (plus de contrôle est-il necessaire ?) :
            // Cette version a l'avantage d'être rétro-compatible avec le version actuelle.

            var instance = (('getInstance' in this) && this.getInstance.apply(this, arguments)) ||
                (('init' in this) && this.init.apply(this, arguments));

            // Ancienne méthode
            /*
            if (typeof this.init === 'function') {
                return this.init.apply(this, arguments);
            }
            */

            if(instance === undef && 'destroy' in this) {
                // On window unload, call destroy method
                if(window.addEventListener) {
                    window.addEventListener('unload', this.callback('destroy'), false);
                }
                else if(window.attachEvent) {
                    window.attachEvent('onunload', this.callback('destroy'));
                }
            }
            return instance;
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

    function callSuper(methodName, superProto, args) {
    //    console.debug('EasyPrototype::callSsuper', methodName, this._super, this._super[methodName] || this.prototype || this);
        var currentProto = this.getCurrentPrototype(methodName),
            result,
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

        function callback() {

            var args = [].slice.call(arguments).reverse(),
                i = forceArgs.length;

            while(i--) {
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

    var EasyPrototype = createProtoClass({
        className : 'EasyPrototype',

        // returns a callback function for the given method
        callback : function callback(methodName) {
        //    console.debug('EasyPrototype::callback', methodName);
            if (!('_callbacks' in this)) {
                this._callbacks = {};
            }
            if (!(methodName in this._callbacks)) {
                if (typeof this[methodName] !== 'function') {
                    throw new Error('La méthode "' + methodName + '" n\'existe pas');
                }

                this._callbacks[methodName] = getCallback(this, methodName, [].slice.call(arguments, 1));
            }
            return this._callbacks[methodName];
        },

        // returns a callback function for the parent method if any
        getSuper : function getSuper(methodName) {
        //    console.debug('EasyPrototype::getSuper', methodName);
            var $this = this,
                currentProto = this.getCurrentPrototype(methodName),
                parentProto = currentProto,
                superProto;

            do {
                if (!(('constructor' in parentProto) &&
                    ('prototype' in parentProto.constructor) &&
                    (parentProto.constructor.prototype !== parentProto) &&
                    (methodName in parentProto.constructor.prototype) &&
                    !parentProto.constructor.prototype[methodName].is_abstract)) {
                    break;
                }
                parentProto = parentProto.constructor.prototype;
                if (parentProto[methodName] !== currentProto[methodName]) {
                    superProto = parentProto;
                }
            }
            while (!superProto);

            if (superProto) {
                return function execSuper() {
                    return callSuper.call($this, methodName, superProto, arguments);
                };
            }
            return function execSuper() {};
        },

        // Calls the parent method if any
        execSuper : function execSuper(methodName, args) {
        //    console.debug('EasyPrototype::execSuper', methodName);
            return this.getSuper.call(this, methodName).apply(this, args || []);
        },

        // Returns the prototype corresponding to the current method or the objects prototype
        getCurrentPrototype : function getCurrentPrototype(methodName) {
//            console.debug('EasyPrototype::getCurrentPrototype', methodName);

            /** Approche plus précise mais plus couteuse, surtout si y a des getters. Sera même
                surement source de bugs s'il y a des getters
            */
            var proto = methodName && this._super && this._super[methodName],
                parentProto;

            if(!proto) {
                proto = this.prototype || this;

                if(methodName) {
                    parentProto = proto;

                    while(parentProto === proto) {
                        if('constructor' in proto) {
                            if(proto.constructor !== proto.constructor.prototype) {
                                parentProto = proto.constructor.prototype;
                            }
                        }

                        if(methodName in parentProto && parentProto[methodName] === proto[methodName]) {
                            proto = parentProto;
                        }
                    }
                }
            }

            return proto;

            /** Approche moins précise mais plus légère :
            return (methodName && this._super && this._super[methodName]) || this.prototype || this;
            */
        },

        methodString : function methodString(methodName) {
        //    console.debug('EasyPrototype::methodString', methodName);
            return this.getCurrentPrototype(methodName).className + '::' + methodName;
        },

        toString : function toString(methodName) {
        //    console.debug('EasyPrototype::toString', methodName);
            return this.getCurrentPrototype(methodName).className || 'unnamedObject';
        }
    });

    EasyPrototype.createProtoClass = createProtoClass;
    EasyPrototype.createClass = createClass;

    // On ne remplace pas une version déjà chargée de Easyprototype.
    // Donc si plusieurs versions sont chargées, c'est la première chargée qui est utilisée
    window.EasyPrototype = window.EasyPrototype || EasyPrototype;
}(this));