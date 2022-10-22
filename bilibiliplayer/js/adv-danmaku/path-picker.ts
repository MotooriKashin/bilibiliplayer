
export interface IPathPickerOptionsInterface {
    isPercent?: boolean;
    isPath?: boolean;
    onChange?: Function;
    onHide?: Function;
    width?: number;
    height?: number;
}

export interface IPathArrInterface {
    x: number;
    y: number;
    w?: number;
    h?: number;
    i?: number;
    xDistance?: number;
    yDistance?: number;
    pathDistance?: number;
    lastDistance?: number;
}

class PathPicker {
    private options: IPathPickerOptionsInterface;
    private container: HTMLElement;
    private value: IPathArrInterface;
    private canvasWidth: number;
    private canvasHeight: number;
    private moveChangeStatus: boolean;
    private pickingPathStatus: boolean;
    private pathArr: IPathArrInterface[];
    private maxPathValue: number;
    private canvasId: string;
    private canvasTableId: string;
    private allowPickStatus: boolean;
    private allowPathPickStatus: boolean;
    private canvas!: HTMLCanvasElement;
    private defaultOptions = {
        isPercent: false,
        isPath: false,
        onChange(value: boolean) { },
        onHide() { },
    };
    status: boolean;

    constructor(container: HTMLElement, options: IPathPickerOptionsInterface) {
        this.container = container;
        this.options = Object.assign(this.defaultOptions, options);
        this.value = { x: 0, y: 0, w: 0, h: 0 };
        this.canvasWidth = 1;
        this.canvasHeight = 1;
        this.status = false; // OPEN / HIDE
        this.moveChangeStatus = false; // move trigger on change handler
        this.pickingPathStatus = false;
        this.pathArr = [];
        this.maxPathValue = 200;
        this.canvasId = 'adv_danmaku_canvas_' + Date.now();
        this.canvasTableId = 'adv_danmaku_canvas_table_' + Date.now();
        this.allowPickStatus = false; // 是否允许选择
        this.allowPathPickStatus = false; // 是否允许路径选择
    }

    init() {
        this.moveChangeStatus = !this.options['isPath'];
        this.pathArr = this.options['isPath'] ? this.pathArr : [];
        this.create().createCanvasTable().drawPath().show().bindEvents();
    }

    private bindEvents(): this {
        const that = this;
        this.canvas.addEventListener('click', function (e) {
            if (!that.options['isPath']) {
                // 单点选择
                that.value = that.getPos(e);
                that.hide().onChange();
                that.onHide();
            } else if (that.options['isPath'] && !that.pickingPathStatus) {
                // 路径开始
                that.pickingPathStatus = true;
                that.addPath(that.getPos(e), true);
                that.drawPath();
            } else if (that.options['isPath'] && that.pickingPathStatus) {
                // 路径结束
                that.addPath(that.getPos(e));
                that.hide().onChange();
                that.onHide();
            }
            return false;
        });

        this.canvas.addEventListener('mousemove', function (e) {
            if (that.pickingPathStatus) {
                that.addPath(that.getPos(e));
                that.drawPath();
            }
            if (that.moveChangeStatus) {
                that.value = that.getPos(e);
                that.onChange();
            }
        });
        return this;
    }

    private addPath(o: IPathArrInterface, reset?: boolean) {
        const max = this.maxPathValue;
        if (reset) {
            this.pathArr = [];
        } else if (this.pathArr.length >= max) {
            this.pathArr.shift();
        }
        this.pathArr.push(o);
    }

    private getPos(e: MouseEvent): IPathArrInterface {
        const that = this;
        const rect = that.canvas.getBoundingClientRect();
        return {
            w: Math.floor(rect.width),
            h: Math.floor(rect.height),
            x: Math.floor(e.pageX - rect.left),
            y: Math.floor(e.pageY - rect.top - (document.body.scrollTop || document.documentElement.scrollTop)),
        };
    }

    private show(): this {
        this.status = true;
        return this;
    }

    hide(): this {
        this.status = false;
        this.moveChangeStatus = false;
        this.pickingPathStatus = false;
        this.destroyCanvasTable().remove();
        return this;
    }

    private create(): this {
        const canvas = document.createElement('canvas');
        canvas.width = this.options.width || this.container.offsetWidth;
        canvas.height = this.options.height || this.container.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.background = 'rgba(0, 0, 0, .1)';
        canvas.style.zIndex = '999';
        this.canvas = canvas;
        this.container.appendChild(canvas);
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        return this;
    }

    private remove(): this {
        this.canvas && this.container.removeChild(this.canvas);
        delete (<any>this)['canvas'];
        return this;
    }

    private getValue(): IPathArrInterface | IPathArrInterface[] | void {
        const options = this.options;
        if (!options['isPercent'] && !options['isPath']) {
            // 返回单点
            return this.value;
        } else if (options['isPercent'] && !options['isPath']) {
            // 返回百分比单点
            return {
                x: parseFloat((this.value.x / this.canvasWidth).toFixed(3)),
                y: parseFloat((this.value.y / this.canvasHeight).toFixed(3)),
            };
        } else if (!options['isPercent'] && options['isPath']) {
            // 返回单点路径
            return this.pathArr;
        } else if (options['isPercent'] && options['isPath']) {
            // 返回单点路径百分比 => 单点数值路径
            return this.pathArr;
        }
    }

    private createCanvasTable(): this {
        const canvas = document.createElement('canvas');
        const ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        canvas.id = this.canvasTableId;
        canvas.style.position = 'absolute';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.background = 'transparent';
        canvas.style.zIndex = '998';
        this.container.appendChild(canvas);
        const w = canvas.width;
        const h = canvas.height;
        ctx.beginPath();
        const gap = w / 20;
        for (let i = gap, max = w; i < max; i += gap) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, h);
        }
        for (let i = gap, max = h; i < max; i += gap) {
            ctx.moveTo(0, i);
            ctx.lineTo(w, i);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.stroke();
        return this;
    }

    private destroyCanvasTable(): this {
        const canvas = document.getElementById(this.canvasTableId);
        canvas && this.container.removeChild(canvas);
        return this;
    }

    private drawPath(): this {
        const ctx = <CanvasRenderingContext2D>this.canvas.getContext('2d');
        const a = this.pathArr;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (a.length) {
            ctx.beginPath();
            ctx.moveTo(a[0].x, a[0].y);
            for (let i = 1, len = a.length; i < len; i++) {
                ctx.lineTo(a[i].x, a[i].y);
            }
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.stroke();
        }
        return this;
    }

    private onChange() {
        typeof this.options['onChange'] === 'function' && this.options['onChange'](this.getValue());
    }

    private onHide() {
        typeof this.options['onHide'] === 'function' && this.options['onHide']();
    }

    private disablePick() {
        this.allowPickStatus = false;
        this.allowPathPickStatus = false;
    }

    private enablePick() {
        this.allowPickStatus = true;
    }

    private disablePathPick() {
        this.allowPathPickStatus = false;
    }

    private enablePathPick() {
        this.allowPickStatus = true;
        this.allowPathPickStatus = false;
    }

    // 重置path picker
    reset() {
        this.status &&
            setTimeout(() => {
                this.hide().init();
            }, 0);
    }

    update(options: IPathPickerOptionsInterface | null, isOpen?: boolean) {
        this.options = Object.assign(this.options, options);
        if (isOpen) {
            this.status = true;
        }
        this.reset();
    }

    destroy(): this {
        for (const k in this) {
            if (this.hasOwnProperty(k)) {
                delete this[k];
            }
        }
        return this;
    }
}

export default PathPicker;
