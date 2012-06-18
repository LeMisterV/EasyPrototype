(function (define, Error, undef) {
define('DerivedBinaryState', ['EasyPrototype', 'BinaryState'], function(EasyPrototype, BinaryState) {

    var operators = {
            AND : function (a, b) {
                    return a && b;
                },
            OR  : function (a, b) {
                    return a || b;
                },
            XOR : function (a, b) {
                    return (a || b) && !(a && b);
                }
        };

    return EasyPrototype.createClass('DerivedBinaryState', BinaryState.prototype.constructor, {
        init : function init() {
            var i, args;

            // définition de l'operateur
            switch (typeof arguments[0]) {
                case 'string' :
                    if (operators[arguments[0]] === undef) {
                        throw new Error('operateur inconnu');
                    }
                    arguments[0] = operators[arguments[0]];
                case 'function' :
                    this.operator = arguments[0];
                    args = [].slice.call(arguments, 1);
                    break;
                default :
                    this.operator = operators.AND;
                    args = arguments;
                    break;
            }

            this.childStates = [];
            this.defaultAffirmation = true;
            this.affirmations = [];

            // Définition des états enfants et leurs affirmations
            for (i = 0; i < args.length; i++) {
                if (typeof args[i] === 'boolean') {
                    if (this.childStates.length === 0) {
                        this.defaultAffirmation = args[i];
                    }
                    else {
                        this.affirmations[this.childStates.length - 1] = args[i];
                    }
                }
                else {
                    this.affirmations[this.childStates.length] = this.defaultAffirmation;
                    args[i].addEventListener('changed', this.callback('refreshValue'), false);
                    this.childStates.push(args[i]);
                }
            }

            // Calcul de la valeur d'origine
            this.execSuper('init', [this.getValue()]);
        },

        operate : function operate(value1, value2) {
            return (value1 === undef) ? value2 : this.operator(value1, value2);
        },

        getValue : function getValue() {
            var i = this.childStates.length,
                value;
            while (i--) {
                if (this.childStates[i].value === undef) {
                    continue;
                }
                value = this.operate(value, this.childStates[i].value == this.affirmations[i]);
            }
            return value;
        },

        refreshValue : function refreshValue() {
            this.setValue(this.getValue());
        },

        add : function add(binaryState, affirmation) {
            if (affirmation === undef) {
                affirmation = this.defaultAffirmation;
            }
            else {
                affirmation = !!affirmation;
            }
            if (this.childStates.length === 0) {
                this.defaultAffirmation = affirmation;
            }

            this.affirmations[this.childStates.length] = affirmation;
            binaryState.addEventListener('changed', this.callback('refreshValue'));
            this.childStates.push(binaryState);
            this.refreshValue();
        },

        remove : function remove(binaryState) {
            var i,
            newChildStates = [],
            newAffirmations = [],
            value;
            for (i = 0; i < this.childStates.length; i++) {
                if (this.childStates[i] === binaryState) {
                    continue;
                }
                newChildStates.push(this.childStates[i]);
                newAffirmations.push(this.affirmations[i]);
                if (this.childStates[i].value !== undef) {
                    value = this.operate(value, this.childStates[i].value === this.affirmations[i]);
                }
            }
            this.childStates = newChildStates;
            this.affirmations = newAffirmations;
            this.setValue(value);
        }
    });
});
}(this.define, this.Error));