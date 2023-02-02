import { debug } from "../../debug";
import { ScriptingContext } from "../ScriptingContext";
import { DisplayObject } from "./DisplayObject";
import { createElement, sensibleDefaults } from "./Unpack";

interface LineContext {
    line: {
        width: number;
        color: string;
        alpha: number;
        caps: string;
        joints: string;
        miterLimit: string;
    };
    fill: {
        fill: string;
        alpha: number;
        fillRule: string;
    };
}
interface State {
    lastPath: Element;
    scheduleClear: HTMLElement[];
    scheduleTimer: number;
    drawing: number;
}
export class Shape extends DisplayObject {
    /**
     * Creates elements with attributes or set attributes on existing ones
     * @param element - string to create new element or existing element
     * @param attr - map containing the attributes and values
     * @return returns the element
     */
    protected static _svg<T extends Element>(element: T | string, attr: object = {}): T {
        const elem = typeof element === 'string'
            ? document.createElementNS('http://www.w3.org/2000/svg', element)
            : element;
        Object.entries(attr).forEach(d => {
            elem.setAttribute(d[0], d[1]);
        })
        return <T>elem;

    }
    protected static toRGB(number: number) {
        let string = parseInt(String(number)).toString(16);
        while (string.length < 6) {
            string = "0" + string;
        }
        return "#" + string;
    };
    protected static applyStroke(element: Element, ref: Shape) {
        this._svg(element, {
            "stroke": ref.line.color,
            "stroke-width": ref.line.width || 0,
            "stroke-opacity": ref.line.alpha || 0
        });
        if (ref.line.caps) {
            element.setAttribute("stroke-linecap", ref.line.caps);
        }
        if (ref.line.joints) {
            element.setAttribute("stroke-linejoin", ref.line.joints);
        }
        if (ref.line.miterLimit) {
            element.setAttribute("stroke-miterlimit", ref.line.miterLimit);
        }
    };
    protected static applyFill(element: Element, ref: Shape) {
        this._svg(element, {
            "fill": ref.fill.fill,
            "fill-opacity": ref.fill.alpha || 0,
            "fill-rule": ref.fill.fillRule
        });
    };
    DOM: SVGSVGElement;
    protected _x: number;
    protected _y: number;
    protected _alpha: string;
    protected globalDefs: Element;
    protected defaultEffects: Element;
    protected defaultGroup: Element;
    protected defaultContainer: Element;
    protected line = <LineContext['line']>{
        width: 0,
        color: "#ffffff",
        alpha: 1
    };
    protected fill = <LineContext['fill']>{
        fill: "none",
        alpha: 1,
        fillRule: "nonzero"
    };
    protected state = <State>{
        lastPath: <Element><unknown>null,
        scheduleClear: <Node[]>[]
    };
    protected offsetX = 0;
    protected offsetY = 0;
    protected _filters: any[] = [];
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        sensibleDefaults(data, {
            'x': 0,
            'y': 0,
            'alpha': 1
        });
        this.DOM = <any>createElement('svg', {
            'width': stage.offsetWidth * 2,
            'height': stage.offsetHeight * 2,
            'style': {
                'position': 'absolute',
                'top': '0px',
                'left': '0px',
                'width': (stage.offsetWidth * 2) + 'px',
                'height': (stage.offsetHeight * 2) + 'px',
                'transform': 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'
            }
        });
        this._x = data.x ?? 0;
        this._y = data.y ?? 0;
        this._alpha = data.alpha ?? 1;

        // Create the default groups
        this.globalDefs = Shape._svg('defs', {});
        this.defaultEffects = Shape._svg('defs', {});
        this.defaultGroup = Shape._svg('g', {});
        this.defaultContainer = Shape._svg('g', {
            'transform': `translate(${this._x || 0}, ${this._y || 0})`,
            'opacity': this._alpha
        });
        this.defaultContainer.appendChild(this.defaultGroup);
        this.DOM.appendChild(this.globalDefs);
        this.DOM.appendChild(this.defaultEffects);
        this.DOM.appendChild(this.defaultContainer);
        // Hook child
        stage.appendChild(this.DOM);
    }
    protected offset(x: number, y: number) {
        this.offsetX = Number(x);
        this.offsetY = Number(y);
        Shape._svg(this.defaultContainer, {
            transform: `translate(${(this._x + this.offsetX) || 0},${(this._y + this.offsetY) || 0})`
        });
    };
    protected setX(x: number) {
        if (!x)
            return;
        this._x = x;
        Shape._svg(this.defaultContainer, {
            transform: `translate(${(this._x + this.offsetX) || 0},${(this._y + this.offsetY) || 0})`
        });
    };
    protected setY(y: number) {
        if (!y)
            return;
        this._y = y;
        Shape._svg(this.defaultContainer, {
            transform: `translate(${(this._x + this.offsetX) || 0},${(this._y + this.offsetY) || 0})`
        });
    };
    protected setAlpha(alpha: string) {
        if (!alpha)
            return;
        this._alpha = alpha;
        Shape._svg(this.defaultContainer, {
            "opacity": this._alpha
        });
    };
    protected setFilters(params: any[]) {
        this._filters = params;
        this.defaultEffects.remove();
        this.defaultEffects = Shape._svg("defs");
        for (let i = 0; i < this.filters.length; i++) {
            const filter = this.filters[i];
            const dFilter = Shape._svg("filter", {
                "id": "fe" + filter.type + i,
                "x": "-50%",
                "y": "-50%",
                "width": "200%",
                "height": "200%"
            });
            switch (filter.type) {
                default: break;
                case "blur": {
                    dFilter.appendChild(Shape._svg("feGaussianBlur", {
                        "in": "SourceGraphic",
                        "stdDeviation": filter.params.blurX + " "
                            + filter.params.blurY,
                    }));
                } break;
                case "glow": {
                    const cR = Math.floor(filter.params.color / 65536),
                        cG = Math.floor((filter.params.color % 65536) / 256),
                        cB = filter.params.color % 256;
                    const cMatrix = [
                        0, 0, 0, cR / 256, 0,
                        0, 0, 0, cG / 256, 0,
                        0, 0, 0, cB / 256, 0,
                        0, 0, 0, 1, 0,
                    ];
                    dFilter.appendChild(Shape._svg("feColorMatrix", {
                        "type": "matrix",
                        "values": cMatrix.join(" ")
                    }));
                    dFilter.appendChild(Shape._svg("feGaussianBlur", {
                        "stdDeviation": filter.params.blurX + " "
                            + filter.params.blurY,
                        "result": "coloredBlur"
                    }));
                    const m = Shape._svg("feMerge");
                    m.appendChild(Shape._svg("feMergeNode", {
                        "in": "coloredBlur"
                    }));
                    m.appendChild(Shape._svg("feMergeNode", {
                        "in": "SourceGraphic"
                    }));
                    dFilter.appendChild(m);
                } break;
            }
            this.defaultEffects.appendChild(dFilter);
        };
        // Add new filters
        this.DOM.appendChild(this.defaultEffects);
        // Apply filters
        this.defaultGroup.remove();
        let tGroup = this.defaultContainer;
        for (let i = 0; i < this.filters.length; i++) {
            const layeredG = Shape._svg("g", {
                "filter": "url(#" + "fe" + this.filters[i].type + i + ")"
            });
            layeredG.appendChild(tGroup);
            tGroup = layeredG;
        }
        this.DOM.appendChild(tGroup);
        this.defaultGroup = tGroup;
    };
    protected _clear() {
        if (this.state.scheduleClear.length < 1)
            return;
        if (this.state.scheduleTimer > -1) {
            clearTimeout(this.state.scheduleTimer);
            this.state.scheduleTimer = -1;
        }
        while (this.defaultGroup.lastChild && this.state.scheduleClear.length > 0) {
            this.state.scheduleClear.pop()?.remove();
        }
        this.state.scheduleClear = [];
    };

    set filters(f) {
        this.setFilters(f);
    }
    get filters() {
        return this._filters;
    }
    set x(x) {
        this.setX(Number(x));
    }
    get x() {
        return this._x;
    }
    set y(y) {
        this.setY(Number(y));
    }
    get y() {
        return this._y;
    }
    set alpha(a) {
        this.setAlpha(a);
    }
    get alpha() {
        return this._alpha;
    }
    set transform(transformation) {
        this._transform = transformation;
        if (transformation.mode === '2d') {
            const rm = [transformation.matrix[0], transformation.matrix[3], transformation.matrix[1], transformation.matrix[4], transformation.matrix[2], transformation.matrix[5]];
            this.DOM.style.transform = "matrix(1,0,0,1,0,0)";
            Shape._svg(this.defaultGroup, {
                "transform": `matrix(${rm.join(',')})`
            });
        } else if (transformation.mode === '3d') {
            this.DOM.style.transformOrigin = (this._x + this.offsetX) + "px " + (this._y + this.offsetY) + "px";
            this.DOM.style.transform = `matrix3d(${transformation.matrix.join(',')})`;
        }
    }
    get transform() {
        return this._transform;
    }

    moveTo(params: number[]) {
        const p = Shape._svg("path", {
            "d": "M" + params.join(" ")
        });
        Shape.applyFill(p, this);
        this.state.lastPath = p;
        Shape.applyStroke(p, this);
        this.defaultGroup.appendChild(this.state.lastPath);
    };
    lineTo(params: number[]) {
        if (!this.state.lastPath) {
            this.state.lastPath = Shape._svg("path", {
                "d": "M0 0"
            });
            Shape.applyFill(this.state.lastPath, this);
            Shape.applyStroke(this.state.lastPath, this);
            this.defaultGroup.appendChild(this.state.lastPath);
        }
        Shape._svg(this.state.lastPath, {
            "d": this.state.lastPath.getAttribute("d") + " L" + params.join(" ")
        });
    };
    curveTo(params: number[]) {
        if (!this.state.lastPath) {
            this.state.lastPath = Shape._svg("path", {
                "d": "M0 0"
            });
            Shape.applyFill(this.state.lastPath, this);
            Shape.applyStroke(this.state.lastPath, this);
            this.defaultGroup.appendChild(this.state.lastPath);
        }
        Shape._svg(this.state.lastPath, {
            "d": this.state.lastPath.getAttribute("d") + " Q" + params.join(" ")
        });
    };
    lineStyle(params: any[]) {
        if (params.length < 3)
            return;
        this.line.width = params[0];
        this.line.color = Shape.toRGB(params[1]);
        this.line.alpha = params[2];
        if (params[3]) {
            this.line.caps = params[3];
        }
        if (params[4]) {
            this.line.joints = params[4];
        }
        if (params[5]) {
            this.line.miterLimit = params[5];
        }
        if (this.state.lastPath) {
            Shape.applyStroke(this.state.lastPath, this);
        }
    };
    drawPath(params: any[]) {
        const commands = params[0];
        const data = params[1];
        this.fill.fillRule = (params[2] === "nonZero" ? "nonzero" : "evenodd");
        let d = "M0 0";
        for (let i = 0; i < commands.length; i++) {
            switch (commands[i]) {
                default:
                case 0: {
                    /* NoOp x0 */
                    continue;
                } break;
                case 1: {
                    /* MoveTo x2 */
                    d += " M" + data.splice(0, 2).join(" ");
                } break;
                case 2: {
                    /* LineTo x2 */
                    d += " L" + data.splice(0, 2).join(" ");
                } break;
                case 3: {
                    /* CurveTo x4 */
                    d += " Q" + data.splice(0, 4).join(" ");
                } break;
                case 4: {
                    /* wide MoveTo x4 */
                    data.splice(0, 2);
                    d += " M" + data.splice(0, 2).join(" ");
                } break;
                case 5: {
                    /* wide LineTo x4 */
                    data.splice(0, 2);
                    d += " L" + data.splice(0, 2).join(" ");
                } break;
                case 6: {
                    /* CubicCurveTo x6 */
                    d += " C" + data.splice(0, 6).join(" ");
                } break;
            }
        };
        const path = Shape._svg("path", {
            "d": d
        });
        Shape.applyFill(path, this);
        Shape.applyStroke(path, this);
        this.defaultGroup.appendChild(path);
        this._clear();
    };
    beginFill(params: any[]) {
        if (params.length === 0)
            return;
        this.fill.fill = Shape.toRGB(params[0]);
        if (params.length > 1) {
            this.fill.alpha = params[1];
        }
    };
    beginGradientFill(params: any[]) {
        if (params.length === 0) {
            return;
        }
        const gradId = 'gradient-' + params[0] + '-' + this.globalDefs.childNodes.length;
        let grad;
        if (params[0] === 'linear') {
            grad = Shape._svg('linearGradient', { 'id': gradId, 'spreadMethod': params[5] });
        } else {
            grad = Shape._svg('radialGradient', { 'id': gradId, 'spreadMethod': params[5] });
        }
        // Figure out all the stops
        const colors = params[1];
        const alphas = params[2];
        const ratios = params[3];
        for (let i = 0; i < ratios.length; i++) {
            grad.appendChild(Shape._svg('stop', {
                'offset': (ratios[i] / 255) || 0,
                'stop-color': Shape.toRGB(colors[i]),
                'stop-opacity': alphas[i]
            }));
        }
        this.globalDefs.appendChild(grad);
        this.fill.fill = 'url(#' + gradId + ')';
    };
    endFill() {
        this.fill.fill = "none";
    };
    drawRect(params: any[]) {
        if (this.state.drawing)
            debug(this.state.drawing);
        if (params[2] < 0) {
            params[0] += params[2];
            params[2] = -params[2];
        }
        if (params[3] < 0) {
            params[1] += params[3];
            params[3] = -params[3];
        }
        const r = Shape._svg("rect", {
            "x": params[0] || 0,
            "y": params[1] || 0,
            "width": params[2] || 0,
            "height": params[3] || 0
        });
        Shape.applyFill(r, this);
        Shape.applyStroke(r, this);
        this.defaultGroup.appendChild(r);
    };
    drawRoundRect(params: any[]) {
        const r = Shape._svg("rect", {
            "x": params[0] || 0,
            "y": params[1] || 0,
            "width": params[2] || 0,
            "height": params[3] || 0,
            "rx": params[4] || 0,
            "ry": params[5] || 0
        });
        Shape.applyFill(r, this);
        Shape.applyStroke(r, this);
        this.defaultGroup.appendChild(r);
    };
    drawCircle(params: any[]) {
        const c = Shape._svg("circle", {
            "cx": params[0] || 0,
            "cy": params[1] || 0,
            "r": params[2] || 0
        });
        Shape.applyFill(c, this);
        Shape.applyStroke(c, this);
        this.defaultGroup.appendChild(c);
    };
    drawEllipse(params: any[]) {
        const e = Shape._svg("ellipse", {
            "cx": params[0] || 0,
            "cy": params[1] || 0,
            "rx": params[2] || 0,
            "ry": params[3] || 0
        });
        Shape.applyFill(e, this);
        Shape.applyStroke(e, this);
        this.defaultGroup.appendChild(e);
    };
    drawTriangles(params: any[]) {
        if (params[1].length % 3 !== 0) {
            throw new Error("Illegal drawTriangles index argument. Indices array size must be a multiple of 3.");
        }
        const commands: number[] = [], data: any[] = [];
        for (let i = 0; i < params[1].length / 3; i++) {
            const a = params[1][3 * i],
                b = params[1][3 * i + 1],
                c = params[1][3 * i + 2];
            const ax = params[0][2 * a], ay = params[0][2 * a + 1];
            const bx = params[0][2 * b], by = params[0][2 * b + 1];
            const cx = params[0][2 * c], cy = params[0][2 * c + 1];
            commands.push(1, 2, 2, 2);
            data.push(ax, ay, bx, by, cx, cy, ax, ay);
        }
        this.drawPath([commands, data, "evenOdd"]);
    };
    clear() {
        const children = this.defaultGroup.children ? this.defaultGroup.children : this.defaultGroup.childNodes;
        for (let i = 0; i < children.length; i++) {
            this.state.scheduleClear.push(<any>children[i]);
        }
        this.state.scheduleTimer = self.setTimeout(() => {
            this._clear();
            this.state.scheduleTimer = -1;
        }, 60);
    };
    getClass() {
        return 'Shape';
    }
}