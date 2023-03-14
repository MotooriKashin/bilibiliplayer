export function extend<T extends object, U extends object>(target: T, source: U) {
    for (const key in source) {
        if (!(key in target)) {
            Reflect.set(target, key, (<any>source)[key]);
        }
    }
    return target;
}
export function numberColor(color: number | string = 0): string {
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