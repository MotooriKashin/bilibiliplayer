import EVENTLIST from './event';
import Base, { IOption, IEvent } from './base';

class Mouse extends Base {
    options: any = {
        cancel: 'input,textarea,button,select,option',
        distance: 1,
        delay: 0,
    };
    private mouseDelayMet!: boolean;
    private mouseHandled!: boolean;
    private started!: boolean;
    private mouseMoveDelegate!: (e: IEvent) => boolean;
    private mouseMoved!: boolean;
    private mouseStarted!: boolean;
    private mouseDownEvent!: IEvent;
    private mouseDelayTimer!: number;
    private mouseUpDelegate!: (e: IEvent) => boolean;
    private ie!: boolean;

    constructor(container: JQuery, options: IOption) {
        super();
        this.options = options;
        this.createComponent(container, this.options);
    }

    protected mouseInit() {
        const that = this;
        this.mouseHandled = false;
        $(document).mouseup(function () {
            that.mouseHandled = false;
        });
        try {
            if (window.parent) {
                $(window.parent.document).mouseup(function () {
                    that.mouseHandled = false;
                });
            }
        } catch (e) {
            console.debug(e);
        }
        this.element.bind(EVENTLIST['mousedown'] + '.' + this.componentName, function (event) {
            return that.mouseDown(event);
        });

        this.started = false;
    }

    // TODO: make sure destroying one instance of mouse doesn't mess with
    // other instances of mouse
    protected mouseDestroy() {
        this.element.unbind('.' + this.componentName);
        if (this.mouseMoveDelegate) {
            this.document
                .unbind(EVENTLIST['mousemove'] + '.' + this.componentName, this.mouseMoveDelegate)
                .unbind(EVENTLIST['mouseup'] + '.' + this.componentName, this.mouseUpDelegate);
        }
    }

    private mouseDown(event: IEvent) {
        // don't let more than one widget handle mouseStart
        if (this.mouseHandled) {
            return;
        }

        this.mouseMoved = false;

        // we may have missed mouseup (out of window)
        this.mouseStarted && this.mouseUp(event);

        this.mouseDownEvent = event;

        const that = this;
        const btnIsLeft = event.which === 1;
        // event.target.nodeName works around a bug in IE 8 with
        // disabled inputs (#7620)
        const elIsCancel =
            typeof this.options.cancel === 'string' && event.target!.nodeName
                ? $(event.target!).closest(this.options.cancel).length
                : false;
        if (!btnIsLeft || elIsCancel || !this.mouseCapture(event)) {
            return true;
        }

        this.mouseDelayMet = !this.options.delay;
        if (!this.mouseDelayMet) {
            this.mouseDelayTimer = window.setTimeout(function () {
                that.mouseDelayMet = true;
            }, this.options.delay);
        }

        if (this.mouseDistanceMet(event) && this.mouseDelayMet) {
            this.mouseStarted = !!this.mouseStart(event);
            if (!this.mouseStarted) {
                event.preventDefault();
                return true;
            }
        }

        // Click event may never have fired (Gecko & Opera)
        if (true === $.data(event.target!, this.componentName + '.preventClickEvent')) {
            $.removeData(event.target!, this.componentName + '.preventClickEvent');
        }

        // these delegates are required to keep context
        this.mouseMoveDelegate = function (event: IEvent) {
            return that.mouseMove(event);
        };
        this.mouseUpDelegate = function (event: IEvent) {
            return that.mouseUp(event);
        };

        this.document
            .bind(EVENTLIST['mousemove'] + '.' + this.componentName, this.mouseMoveDelegate)
            .bind(EVENTLIST['mouseup'] + '.' + this.componentName, this.mouseUpDelegate);

        event.preventDefault();

        this.mouseHandled = true;
        return true;
    }

    private mouseMove(event: IEvent) {
        // Only check for mouseups outside the document if you've moved inside the document
        // at least once. This prevents the firing of mouseup in the case of IE<9, which will
        // fire a mousemove event if content is placed under the cursor. See #7778
        // Support: IE <9
        if (this.mouseMoved) {
            // IE mouseup check - mouseup happened when mouse was out of window
            if (this.ie && (!document.documentMode || document.documentMode < 9) && !event.button) {
                return this.mouseUp(event);

                // Iframe mouseup check - mouseup occurred in another document
            } else if (!event.which) {
                return this.mouseUp(event);
            }
        }

        if (event.which || event.button) {
            this.mouseMoved = true;
        }

        if (this.mouseStarted) {
            this.mouseDrag(event);
            return event.preventDefault();
        }

        if (this.mouseDistanceMet(event) && this.mouseDelayMet) {
            this.mouseStarted = !!this.mouseStart(this.mouseDownEvent, event);
            this.mouseStarted ? this.mouseDrag(event) : this.mouseUp(event);
        }

        return !this.mouseStarted;
    }

    private mouseUp(event: IEvent) {
        this.document
            .unbind(EVENTLIST['mousemove'] + '.' + this.componentName, this.mouseMoveDelegate)
            .unbind(EVENTLIST['mouseup'] + '.' + this.componentName, this.mouseUpDelegate);

        if (this.mouseStarted) {
            this.mouseStarted = false;

            if (event.target === this.mouseDownEvent.target) {
                $.data(event.target!, this.componentName + '.preventClickEvent', true);
            }

            this.mouseStop(event);
        }

        this.mouseHandled = false;
        return false;
    }

    private mouseDistanceMet(event: IEvent) {
        return (
            Math.max(
                Math.abs(this.mouseDownEvent.pageX! - event.pageX!),
                Math.abs(this.mouseDownEvent.pageY! - event.pageY!),
            ) >= this.options.distance
        );
    }

    // These are placeholder methods, to be overriden by extending plugin
    protected mouseStart(a?: IEvent, event?: IEvent) {
        return false;
    }

    protected mouseDrag(event?: IEvent) { }

    protected mouseStop(event?: IEvent) { }

    private mouseCapture(event?: IEvent) {
        return true;
    }
}

export default Mouse;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Document {
        documentMode: 5 | 7 | 8 | 9;
    }
}