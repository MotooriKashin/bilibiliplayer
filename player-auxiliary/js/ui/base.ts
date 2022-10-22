export interface IOption {
    disabled?: boolean;
    uuid?: number;
    id?: string;
    prefix?: string;
    [key: string]: any;
}

type EventsCallbackInterface = (data?: any) => void;

export interface IEvent {
    pageX?: number;
    pageY?: number;
    clientX?: number;
    clientY?: number;
    target?: HTMLElement;
    currentTarget?: HTMLElement;
    stopPropagation?: () => void;
    [key: string]: any;
}

interface IButton {
    theme?: string;
    label?: string;
    click?: Function;
    disabled?: boolean;
}

interface IEvents {
    [key: string]: EventsCallbackInterface[];
}

class Base {
    private static uuid = 0;
    static prefix = 'bpui-';

    protected prefix = Base.prefix;
    protected debugMode = true;
    protected element!: JQuery;
    protected componentName!: string;
    protected bindings!: JQuery;
    protected hoverable!: JQuery;
    protected focusable!: JQuery;
    protected componentFullName!: string;
    protected uuid!: number | string;
    protected eventNamespace!: string;
    protected document: any;
    protected window: any;
    protected container!: JQuery;
    protected options!: IOption;
    protected defaultElement!: JQuery | string;

    protected events: IEvents = {};

    uniqueId(el: JQuery) {
        const prefix = this.prefix;
        return el.each(function () {
            if (!this.id) {
                this.id = prefix + 'id-' + ++Base.uuid;
            }
        });
    }

    removeUniqueId(el: JQuery) {
        return el.each(function () {
            if (new RegExp('^' + this.prefix + 'id-d+$').test(this.id)) {
                $(this).removeAttr('id');
            }
        });
    }

    get destroy() {
        return () => {
            const prefix = this.prefix;
            this.destroyCus();
            this.element.off(this.namespace()).removeData(this.componentName);
            this.widget()
                .off(this.namespace())
                .removeAttr('data-disabled')
                .removeClass(this.componentName + '-disabled ' + prefix + 'state-disabled');

            // clean up events and states
            this.bindings.off(this.namespace());
            this.hoverable.removeClass(prefix + 'state-hover');
            this.focusable.removeClass(prefix + 'state-focus');

            this.events = {};
        };
    }

    protected destroyCus() { }

    enable() {
        return this.setOptions({
            disabled: false,
        });
    }

    disable() {
        return this.setOptions({
            disabled: true,
        });
    }

    widget() {
        return this.element;
    }

    protected trigger(...argvs: any[]) {
        const args = Array.prototype.slice.call(arguments, 0);
        const handler = args.shift();
        if (this.events[handler] && this.events[handler].length) {
            this.events[handler].forEach((item) => {
                item.apply(this, <any>args);
            });
        }
        if (this.options[handler]) {
            return this.options[handler].apply(this, args);
        }
    }

    protected bind(...aargs: any[]) {
        const that: any = this;
        const args = Array.prototype.slice.call(arguments, 0);
        let suppressDisabledCheck = false;
        if (typeof args[0] === 'boolean') {
            suppressDisabledCheck = args.shift();
        }
        const prefix = this.prefix;

        function getHandlerProxy(handler: any) {
            const handlerProxy = <any>function (this: HTMLElement) {
                if (
                    !suppressDisabledCheck &&
                    (that.options.disabled === true || $(this).hasClass(prefix + 'state-disabled'))
                ) {
                    return;
                }
                return (typeof handler === 'string' ? that[handler] : handler).apply(that, arguments);
            };
            if (typeof handler !== 'string') {
                // @ts-ignore
                handlerProxy.guid = handler.guid = handler.guid || handlerProxy.guid || $.guid++;
            }
            return handlerProxy;
        }
        let elem;
        if (!(args[0] instanceof jQuery)) {
            elem = this.element;
        } else {
            elem = $(args.shift());
            this.bindings = this.bindings.add(elem);
        }
        if (typeof args[0] === 'object') {
            const evts: any = {};
            for (const evt in args[0]) {
                if (args[0].hasOwnProperty(evt)) {
                    evts[this.namespace(evt)] = getHandlerProxy(args[0][evt]);
                    delete args[0][evt];
                }
            }
            args[0] = evts;
        } else {
            args[0] = this.namespace(args[0]);
            args[args.length - 1] = getHandlerProxy(args[args.length - 1]);
        }
        // this.debug(args);
        return elem.on.apply(elem, <any>args);
    }

    protected unbind(elem: string | JQuery, eventName: string) {
        if (!(elem instanceof jQuery)) {
            eventName = <string>elem;
            elem = this.element;
        }
        eventName = (eventName || '').split(' ').join(this.namespace() + ' ') + this.namespace();

        this.bindings = $(this.bindings.not(elem).get());
        this.focusable = $(this.focusable.not(elem).get());
        this.hoverable = $(this.hoverable.not(elem).get());
        return (<JQuery>elem).off.call(elem, <any>eventName);
    }

    protected delay(handler: string | (() => void), delay = 0) {
        const that: any = this;
        function handlerProxy() {
            return (typeof handler === 'string' ? that[handler] : handler).apply(that, arguments);
        }
        return window.setTimeout(handlerProxy, delay);
    }

    get option() {
        const that = this;
        return function (key: string | IButton | IOption, value: any) {
            let options: IOption;
            let parts: string[];
            let curOption;
            let i;

            if (arguments.length === 0) {
                // don't return a reference to the internal hash
                return $.extend(true, {}, that.options);
            }

            if (typeof key === 'string') {
                // handle nested keys, e.g., 'foo.bar' => { foo: { bar: ___ } }
                options = {};
                parts = key.split('.');
                key = parts.shift()!;
                if (parts.length) {
                    curOption = options[key] = $.extend(true, {}, that.options[key]);
                    for (i = 0; i < parts.length - 1; i++) {
                        curOption[parts[i]] = curOption[parts[i]] || {};
                        curOption = curOption[parts[i]];
                    }
                    key = parts.pop()!;
                    if (value === undefined) {
                        return curOption[key] === undefined ? null : curOption[key];
                    }
                    curOption[key] = value;
                } else {
                    if (value === undefined) {
                        return that.options[key] === undefined ? null : that.options[key];
                    }
                    options[key] = value;
                }
            } else {
                options = key;
            }

            that.setOptions(options);

            return that;
        };
    }

    protected setOptions(options: IOption) {
        for (const key in options) {
            if (options.hasOwnProperty(key)) {
                this.setOption(key, options[key]);
            }
        }

        return this;
    }

    protected setOption(key: string, value: any) {
        const prefix = this.prefix;
        if ($.isPlainObject(value)) {
            $.extend(true, this.options[key], value);
        } else {
            this.options[key] = value;
        }
        if (key === 'disabled') {
            this.widget().toggleClass(this.componentFullName + '-disabled', !!value);

            // If the widget is becoming disabled, then nothing is interactive
            if (value) {
                this.hoverable.removeClass(prefix + 'state-hover');
                this.focusable.removeClass(prefix + 'state-focus');
            }
        }
        return this;
    }

    protected setAttributes(elem: JQuery, attributes: any) {
        if (attributes !== undefined) {
            for (const k in attributes) {
                if (attributes.hasOwnProperty(k)) {
                    if (k === 'class') {
                        elem.addClass(attributes[k]);
                    } else {
                        elem.attr(k, attributes[k]);
                    }
                }
            }
        }
    }

    protected createComponent(container: JQuery, options: IOption) {
        const wrap: any = container || this.defaultElement || this;
        this.container = $(wrap);
        this.prefix = options.prefix || this.prefix;
        const prefix = this.prefix;
        if (!this.container || !this.container.length) {
            this.container = $('<div>').attr('data-component', (<any>this.constructor).id);
        }
        this.element = this.container;
        this.uuid = options.uuid || (prefix + 'id-' + ++Base.uuid);
        this.componentName = options.id!;
        this.componentFullName = prefix + this.componentName;

        const selector = prefix + options.id;
        // @ts-ignore
        $.expr[':'][selector.toLowerCase()] = function (elem: Element) {
            return !!$.data(elem, selector);
        };

        this.options = $.extend(
            true,
            {},
            {
                disabled: false,
                create: null,
            },
            this.options,
            options,
        );

        this.container.addClass(prefix + 'component').addClass(prefix + this.options.id);
        this.eventNamespace = '.' + this.componentName + this.uuid;

        this.bindings = $();
        this.hoverable = $();
        this.focusable = $();

        const element = this.element[0];
        this.document = $(element.style ? element.ownerDocument : (<any>element).document || element);
        try {
            if (!$(window.parent.document).is(this.document)) {
                this.document = this.document.add(window.parent.document);
            }
        } catch (e) {
            console.debug(e);
        }
        this.window = $(this.document[0].defaultView || this.document[0].parentWindow);
        this.create();
        this.trigger('create');
        this.init();
        this.initEvent();
        return this;
    }

    protected create() { }

    protected init() { }

    protected initEvent() { }

    protected cssPrefix(cssName: string) {
        return this.prefix + this.componentName + '-' + cssName;
    }

    protected namespace(eventName = '') {
        return eventName + this.eventNamespace;
    }

    getEventsPage(e: IEvent) {
        e = e.pageX !== undefined ? e : e.originalEvent;
        const events = <any>[];
        events.y =
            typeof e.pageY !== 'undefined' && (e.pageY || e.pageX) ? e.pageY : e.touches ? e.touches[0].pageY : null;
        events.x =
            typeof e.pageX !== 'undefined' && (e.pageY || e.pageX) ? e.pageX : e.touches ? e.touches[0].pageX : null;
        events.cy = typeof e.clientY !== 'undefined' && (e.clientY || e.clientX) ? e.clientY : e.touches[0].clientY;
        events.cx = typeof e.clientX !== 'undefined' && (e.clientY || e.clientX) ? e.clientX : e.touches[0].clientX;
        return events;
    }

    protected initHover(element: JQuery) {
        const prefix = this.prefix;
        this.hoverable = this.hoverable.add(element);
        this.bind(element, {
            mouseenter: function (event: IEvent) {
                $(event.currentTarget!).addClass(prefix + 'state-hover');
            },
            mouseleave: function (event: IEvent) {
                $(event.currentTarget!).removeClass(prefix + 'state-hover');
            },
        });
    }

    protected initFocus(element: JQuery) {
        const prefix = this.prefix;
        this.focusable = this.focusable.add(element);
        this.bind(element, {
            focusin: function (event: IEvent) {
                $(event.currentTarget!).addClass(prefix + 'state-focus');
            },
            focusout: function (event: IEvent) {
                $(event.currentTarget!).removeClass(prefix + 'state-focus');
            },
        });
    }

    protected debug(text: string) {
        if (this.debugMode) {
            if (typeof console !== 'undefined' && console.log) {
                console.log(text);
            }
        }
    }

    on(name: string, handler: EventsCallbackInterface) {
        if (typeof name === 'string' && typeof handler === 'function') {
            if (!this.events[name]) {
                this.events[name] = [] as EventsCallbackInterface[];
            }
            this.events[name].push(handler);
        }
        return this;
    }

    off(name: string, handler?: EventsCallbackInterface) {
        if (!handler) {
            this.events[name] = [];
        } else {
            const index = this.events[name].indexOf(handler);
            if (index > -1) {
                this.events[name].splice(index, 1);
            }
        }
        return this;
    }
}

$.each(
    {
        show: 'fadeIn',
        hide: 'fadeOut',
    },
    function (method, defaultEffect) {
        (<any>Base)[method] = function (element: any, options: any, callback: () => any) {
            if (typeof options === 'string') {
                options = {
                    effect: options,
                };
            }
            let hasOptions;
            const effectName = !options
                ? method
                : options === true || typeof options === 'number'
                    ? defaultEffect
                    : options.effect || defaultEffect;
            options = options || {};
            if (typeof options === 'number') {
                options = {
                    duration: options,
                };
            }
            hasOptions = !$.isEmptyObject(options);
            options.complete = callback;
            if (options.delay) {
                element.delay(options.delay);
            }
            if (hasOptions && typeof $.prototype.effect === 'function') {
                // jquery-ui has been removed
                // @ts-ignore
                $(element).effect(method, options);
            } else if (effectName !== method && element[effectName]) {
                element[effectName](options.duration, options.easing, callback);
            } else {
                element.queue(function (this: HTMLElement, next: () => any) {
                    $(this)[method]();
                    if (callback) {
                        callback.call(element[0]);
                    }
                    next();
                });
            }
        };
    },
);

export default Base;
