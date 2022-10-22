interface IOptionsInterface {
    time: Function;
    container: JQuery;
    duration: number;
}

class Record {
    private options: IOptionsInterface;
    private showing = true;
    private disabled = false;

    constructor(options: IOptionsInterface) {
        this.options = options;
        this.frame();
    }

    private frame() {
        window['requestAnimationFrame'](() => {
            this.frame();
        });
        this.update();
    }

    private update() {
        if (!this.disabled) {
            const time = this.options.time();
            if (time > this.options.duration && this.showing) {
                this.hide();
                this.showing = false;
            } else if (time <= this.options.duration && !this.showing) {
                this.show();
                this.showing = true;
            }
        }
    }

    private show() {
        this.options.container.show();
    }

    private hide() {
        this.options.container.hide();
    }

    disable() {
        this.disabled = true;
        this.hide();
    }

    enable() {
        this.disabled = false;
    }
}

export default Record;
