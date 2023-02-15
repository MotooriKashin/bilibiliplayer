import { BitmapData, Bitmap } from "./Bitmap";
import { Button } from "./Button";
import { Shape } from "./Shape";
import { Sprite, SpriteRoot } from "./Sprite";
import { TextField } from "./TextField";

export function sensibleDefaults<T extends object>(objectA: T, defaults: T): T {
    for (const prop in defaults) {
        if (!objectA.hasOwnProperty(prop)) {
            objectA[prop] = defaults[prop]
        }
    }
    return objectA;
}
export function modernize<T extends object>(styles: T): T {
    const modernizeLibrary = {
        "transform": ["webkitTransform"],
        "transformOrigin": ["webkitTransformOrigin"],
        "transformStyle": ["webkitTransformStyle"],
        "perspective": ["webkitPerspective"],
        "perspectiveOrigin": ["webkitPerspectiveOrigin"]
    };
    for (const key in modernizeLibrary) {
        if (styles.hasOwnProperty(key)) {
            for (let i = 0; i < modernizeLibrary[<'transform'>key].length; i++) {
                (<any>styles)[modernizeLibrary[<'transform'>key][i]] = (<any>styles)[key];
            }
        }
    }
    return styles;
}
export function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K | 'svg', props: Record<string, any>, children: HTMLElement[] = [], callback?: Function) {
    const elem = tagName === 'svg' ? document.createElementNS("http://www.w3.org/2000/svg", "svg") : document.createElement(tagName);
    for (const key in props) {
        if (props.hasOwnProperty(key)) {
            if (key === "style") {
                props[key] = modernize(props[key]);
                for (const style in props[key]) {
                    (<any>elem)["style"][style] = props[key][style];
                }
            } else if (key === "className") {
                elem.classList.add(...props[key].split(' '));
            } else {
                elem.setAttribute(key, props[key]);
            }
        }
    }
    elem.append(...children);
    if (typeof callback === "function") {
        callback(elem);
    }
    return <HTMLElementTagNameMap[K]>elem;
}
export function color(color: number | string = 0): string {
    if (typeof color === 'string') {
        color = parseInt(color.toString());
        if (Number.isNaN(color)) {
            color = 0;
        }
    }
    let code: string = color.toString(16);
    while (code.length < 6) {
        code = '0' + code;
    }
    return '#' + code;
}
export class Unpack {
    static TextField = TextField;
    static Shape = Shape;
    static Sprite = Sprite;
    static SpriteRoot = SpriteRoot;
    static Button = Button;
    static BitmapData = BitmapData;
    static Bitmap = Bitmap;
}