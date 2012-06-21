(function (define, undef) {
define('BinaryState', ['EasyPrototype', 'EventsManager'], function(EasyPrototype, EventsManager) {

    var eventsNames = {
        onChange    : 'changed',
        onTrue      : 'toTrue',
        onFalse     : 'toFalse'
    };

    var BinaryStatePrototype = EasyPrototype.createProtoClass('BinaryStatePrototype', EventsManager, {
        init : function init(initialState) {
            this.changing = false;

            this.value = (arguments.length === 1 && initialState === undef) ? undef : initialState === true;

            this.execSuper('init');
        },

        onChangeDone : function onChangeDone(callback) {
            this.events.trigger(eventsNames.onChange, this.value).whenFinished(callback);
            this.changing = false;
        },

        setValue : function setValue(value, callback) {
            value = value == true;
            if (this.value !== value) {
                this.events.resetTriggeredState(eventsNames.onChange);
                if (this.changing) {
                    this.events.addEventListener(
                        eventsNames.onChange,
                        this.callback('setValue', value, callback),
                        1
                    );
                }
                else {
                    this.changing = true;
                    this.value = value;
                    this.events.resetTriggeredState(eventsNames[value ? 'onFalse' : 'onTrue']);
                    this.events.trigger(eventsNames[value ? 'onTrue' : 'onFalse'])
                        .whenFinished(this.callback('onChangeDone', callback));
                }
            }
        },

        toString : function toString() {
            if (!('value' in this)) {
                return '[object Object]';
            }
            return (this.value === undef) ? 'undefined' : (this.value === true) ? 'true' : 'false';
        },

        valueOf : function valueOf() {
            return (this.value === undef) ? NaN : (this.value === true) ? 1 : 0;
        }
    });

    return EasyPrototype.createClass('BinaryState', BinaryStatePrototype, {
        init : function init() {
            this.execSuper('init', arguments);

            this.setTrue = this.callback('setValue', true);
            this.setFalse = this.callback('setValue', false);
        },

        toggle : function toggle(callback) {
            this.setValue(!this.value, callback);
        }
    });
});
}(this.define));