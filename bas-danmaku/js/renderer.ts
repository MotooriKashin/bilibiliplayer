import Utils from './utils';
import { IDm, ISet, IPlayer } from '.';
import { IDef, IDefAttrs } from './parser';

export interface IOptions {
    container: HTMLDivElement;
    dm: IDm;
    startTime: number;
    animationEndCallback?: (dan: Renderer) => void;
    player?: IPlayer;
}

class Renderer {
    private defs: IDef[];
    private sets: ISet[];
    private xProportion: number;
    private yProportion: number;
    private prefix = ['', '-webkit-'];
    private measureCanvas: any;
    private player: IPlayer;
    private startTime: number;
    private container: HTMLDivElement;
    private animationEndCallback: (dan: Renderer) => void;

    dm: IDm;
    endProgress: any = {};
    ele!: HTMLDivElement;

    constructor(options: IOptions) {
        this.xProportion = options.container.offsetWidth / 100;
        this.yProportion = options.container.offsetHeight / 100;
        this.container = options.container;
        this.dm = options.dm;
        this.percentObj2Num(this.dm);
        this.defs = this.dm.defs!;
        this.sets = this.dm.sets!;
        this.startTime = options.startTime;
        this.player = options.player!;
        this.animationEndCallback = options.animationEndCallback!;

        this.init();
    }

    init() {
        const itemsTemp = this.itemsTemplate();
        if (itemsTemp) {
            const perspective = (this.xProportion * 100) / 2 / Math.tan((Math.PI / 180) * (55 / 2));
            this.ele = <HTMLDivElement>(
                Utils.string2DOM(
                    `<div class="bas-danmaku-item-wrap" style="perspective:${perspective}px;-webkit-perspective:${perspective}px;">${this.animationTemplate()}${itemsTemp}</div>`,
                )
            );

            for (let i = 0; i < this.defs.length; i++) {
                const name = this.defs[i]['name'];
                this.endProgress[name] = 0;
                this.transience(name);
            }

            this.bindEvents(this.ele);
        }
    }

    animationCallback(e: AnimationEvent) {
        const name: string = e.animationName.split('-')[2];
        if (this.endProgress[name]) {
            this.endProgress[name]++;
        } else {
            this.endProgress[name] = 1;
        }

        this.transience(name);

        this.animationEndCallback(this);

        if (this.endProgress[name] === this.dm.def2set![name].length || e.animationName.split('-')[3] === 'duration') {
            (<HTMLElement>e.target).parentNode!.removeChild(<HTMLElement>e.target);
            if (this.ele.getElementsByClassName('bas-danmaku-item').length === 0) {
                this.container.removeChild(this.ele);
            }
        }
    }

    // 瞬变属性
    private transience(defName: string) {
        const index = this.endProgress[defName];
        const def2set = this.dm.def2set![defName][index];

        if (def2set && def2set['valueEnd']) {
            if (def2set['valueEnd']['content']) {
                this.ele['querySelector'](`.bas-danmaku-item--${defName} .bas-danmaku-item-inner`)!.innerHTML =
                    def2set['valueEnd']['content'];
            }
            if (def2set['valueEnd']['text']) {
                this.ele['querySelector'](`.bas-danmaku-item--${defName} .bas-danmaku-item-inner`)!.innerHTML =
                    def2set['valueEnd']['text'];
            }
            if (def2set['valueEnd']['fontSize']) {
                const fontSize = def2set['valueEnd']['fontSize'];
                if (fontSize >= 12) {
                    (<HTMLElement>(
                        this.ele['querySelector'](`.bas-danmaku-item--${defName} .bas-danmaku-item-inner`)
                    )).style.fontSize = `${fontSize}px`;
                } else {
                    (<HTMLElement>(
                        this.ele['querySelector'](`.bas-danmaku-item--${defName} .bas-danmaku-item-inner`)
                    )).style.fontSize = '12px';
                    (<HTMLElement>(
                        this.ele['querySelector'](`.bas-danmaku-item--${defName} .bas-danmaku-item-inner`)
                    )).style.transform = `scale(${fontSize / 12})`;
                }
            }
        }
    }

    private percentObj2Num(dm: IDm) {
        const setNum = (attrs: any) => {
            for (const item in attrs) {
                if (attrs.hasOwnProperty(item)) {
                    let obj;
                    if (attrs[item]['numType']) {
                        obj = attrs[item];
                    } else if (attrs[item]['value'] && attrs[item]['value']['numType']) {
                        obj = attrs[item]['value'];
                    } else {
                        continue;
                    }
                    if (obj['numType'] === 'number') {
                        switch (item) {
                            case 'x':
                                obj = obj['value'] / this.xProportion;
                                break;
                            case 'y':
                                obj = obj['value'] / this.yProportion;
                                break;
                            default:
                                obj = obj['value'];
                                break;
                        }
                    } else if (obj['numType'] === 'percent') {
                        switch (item) {
                            case 'fontSize':
                                obj = obj['value'] * this.xProportion;
                                break;
                            case 'width':
                                obj = obj['value'] * this.xProportion;
                                break;
                            case 'height':
                                obj = obj['value'] * this.yProportion;
                                break;
                            default:
                                obj = obj['value'];
                                break;
                        }
                    }
                    if (attrs[item]['numType']) {
                        attrs[item] = obj;
                    } else if (attrs[item]['value'] && attrs[item]['value']['numType']) {
                        attrs[item]['value'] = obj;
                    }
                }
            }
        };

        // defs
        for (let i = 0; i < dm.defs!.length; i++) {
            setNum(dm.defs![i]['attrs']);
        }

        // sets
        for (let i = 0; i < dm.sets!.length; i++) {
            if (dm.sets![i]['items']) {
                for (let j = 0; j < dm.sets![i]['items']!.length; j++) {
                    setNum(dm.sets![i]['items']![j]['attrs']);
                }
            } else {
                setNum((<ISet>dm.sets![i])['attrs']);
            }
        }

        // def2set
        for (const ds in dm.def2set) {
            if ({}.hasOwnProperty.call(dm.def2set, ds)) {
                for (let i = 0; i < dm.def2set[ds].length; i++) {
                    setNum(dm.def2set[ds][i]['valueEnd']);
                    setNum(dm.def2set[ds][i]['valueStart']);
                }
            }
        }
    }

    private itemsTemplate() {
        let tmp = '';

        for (let i = 0; i < this.defs.length; i++) {
            if (!this.defs[i]['attrs']!['parent']) {
                tmp += this.itemsTemplateOne(this.defs[i]);
            }
        }

        return tmp;
    }

    private itemsTemplateOne(def: IDef, xProportion = this.xProportion, yProportion = this.yProportion) {
        const split = (animations: any, type: string) => {
            let splited = '';
            for (let i = 0; i < animations.length; i++) {
                if (type === 'duration') {
                    splited += animations[i][type] + 's';
                } else if (type === 'delay') {
                    splited += animations[i][type] - this.startTime + 's';
                } else {
                    splited += animations[i][type];
                }

                if (i !== animations.length - 1) {
                    splited += ',';
                }
            }
            return splited;
        };

        const item = def['attrs'];
        const animations = this.dm.def2set![def['name']];
        let styleOut = `${this.prefixCSS('animation-name', split(animations, 'name'))}${this.prefixCSS(
            'animation-duration',
            split(animations, 'duration'),
        )}${this.prefixCSS('animation-timing-function', split(animations, 'easing'))}${this.prefixCSS(
            'animation-delay',
            split(animations, 'delay'),
        )}`;
        for (const i in item) {
            if (item.hasOwnProperty(i)) {
                styleOut += this.getStyleOut(i, (<any>item)[i]);
            }
        }
        let styleIn;

        switch (def['type']) {
            case 'DefText':
                let rotate = '';
                if (item!['rotateX'] || item!['rotateY'] || item!['rotateZ']) {
                    rotate = ` rotateX(${item!['rotateX']}deg) rotateY(${item!['rotateY']}deg) rotateZ(${item!['rotateZ']
                        }deg)`;
                }
                styleOut += `transform:translate(${<number>item!['x'] * xProportion}px, ${<number>item!['y'] * yProportion
                    }px)${rotate} scale(${item!['scale']});`;
                styleIn = this.getStyleIn(item!);

                // child
                let child = '';
                for (let i = 0; i < this.defs.length; i++) {
                    if (this.defs[i]['attrs']!['parent'] === def['name']) {
                        this.defSize(def);
                        child += this.itemsTemplateOne(
                            this.defs[i],
                            def['attrs']!['width']! / 100,
                            def['attrs']!['height']! / 100,
                        );
                    }
                }

                return `<div class="bas-danmaku-item bas-danmaku-item-text bas-danmaku-item--${def['name']
                    }" style="${styleOut}"><div class="bas-danmaku-item-inner" style="${styleIn}">${item!['content']
                    }${child}</div></div>`;

            case 'DefButton':
                styleOut += `transform:translate(${<number>item!['x'] * xProportion}px, ${<number>item!['y'] * yProportion
                    }px) scale(${item!['scale']});color:${Utils.rgbaFormat(
                        item!['textColor']!,
                        <number>item!['textAlpha'],
                    )};background-color:${Utils.rgbaFormat(item!['fillColor']!, <number>item!['fillAlpha'])};`;
                styleIn = this.getStyleIn(item!);

                return `<div class="bas-danmaku-item bas-danmaku-item-button bas-danmaku-item--${def['name']
                    }" style="${styleOut}"><div class="bas-danmaku-item-inner" style="${styleIn}">${item!['text']
                    }</div></div>`;

            case 'DefPath':
                styleOut += `transform:translate(${<number>item!['x'] * xProportion}px, ${<number>item!['y'] * yProportion
                    }px);`;
                styleIn = this.getStyleIn(item!);

                let svgAttributes;
                if (item!['viewBox']) {
                    if (item!['width'] || item!['height']) {
                        svgAttributes = `viewBox="${item!['viewBox']}" ${item!['width'] ? `width="${item!['width'] * (<number>item!['scale'] || 1)}"` : ''
                            } ${item!['height'] ? `height="${item!['height'] * (<number>item!['scale'] || 1)}"` : ''}`;
                    } else {
                        svgAttributes = `viewBox="${item!['viewBox']}" width="${parseInt(item!['viewBox'].split(' ')[2], 10) * (<number>item!['scale'] || 1)
                            }"`;
                    }
                } else if (item!['scale']) {
                    svgAttributes = `style="transform:scale(${item!['scale']
                        });transform-origin: 0 0;overflow:visible;"`;
                }

                const pathAttributes = `fill="${Utils.rgbaFormat(
                    item!['fillColor']!,
                    <number>item!['fillAlpha'],
                )}" stroke="${Utils.rgbaFormat(item!['borderColor']!, <number>item!['borderAlpha'])}" stroke-width="${item!['borderWidth']
                    }" d="${item!['d']}"`;

                return `<div class="bas-danmaku-item bas-danmaku-item-path bas-danmaku-item--${def['name']}" style="${styleOut}"><div class="bas-danmaku-item-inner" style="${styleIn}"><svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg" ${svgAttributes}><path ${pathAttributes}></svg></div></div>`;
        }
    }

    private findParent(name: string) {
        for (let i = 0; i < this.defs.length; i++) {
            if (this.defs[i]['name'] === name) {
                return this.defs[i];
            }
        }
        return null;
    }

    private defSize(def: IDef) {
        if (def && (!def['attrs']!['width'] || !def['attrs']!['height'])) {
            if (!this.measureCanvas) {
                this.measureCanvas = document.createElement('canvas').getContext('2d');
            }
            this.measureCanvas.font = `${def['attrs']!['bold'] ? 'bold ' : ''} ${def['attrs']!['fontSize']}px ${def['attrs']!['fontFamily']
                }`;
            def['attrs']!['width'] = this.measureCanvas.measureText(def['attrs']!['content'])['width'];
            def['attrs']!['height'] = <number>def['attrs']!['fontSize'];
        }
    }

    private getStyleIn(item: IDefAttrs) {
        let styleIn = '';
        let transform = '';
        if (item['strokeWidth'] && item['strokeColor']) {
            styleIn += `-webkit-text-stroke:${item['strokeWidth']}px ${Utils.colorFromInt(item['strokeColor'])};`;
        }
        if (item.hasOwnProperty('fontFamily')) {
            styleIn += `font-family:&quot;${item['fontFamily']!.split(',').join('&quot;,&quot;')}&quot;,sans-serif;`;
        }
        if (item.hasOwnProperty('textShadow')) {
            styleIn += `text-shadow:${item['textShadow']
                ? 'rgb(0, 0, 0) 1px 0px 1px, rgb(0, 0, 0) 0px 1px 1px, rgb(0, 0, 0) 0px -1px 1px, rgb(0, 0, 0) -1px 0px 1px'
                : 'none'
                };`;
        }
        if (item.hasOwnProperty('bold')) {
            styleIn += `font-weight:${item['bold'] ? 'bold' : 'normal'};`;
        }
        if (item.hasOwnProperty('fontSize')) {
            if (item['fontSize']! >= 12) {
                styleIn += `font-size:${item['fontSize']}px;`;
            } else {
                styleIn += 'font-size:12px;';
                transform += `scale(${<number>item['fontSize'] / 12}) `;
            }
        }
        if (item.hasOwnProperty('anchorX') && item.hasOwnProperty('anchorY')) {
            transform += `translate(${-item['anchorX']! * 100}%,${-item['anchorY']! * 100}%)`;
        }
        if (transform) {
            styleIn += `transform:${transform};`;
        }
        return styleIn;
    }

    private getStyleOut(name: string, value: string | number) {
        switch (name) {
            case 'alpha':
                return `opacity:${value};`;
            case 'color':
                return `color:${Utils.colorFromInt(<number>value)};`;
            case 'zIndex':
                return `z-index:${value};`;
            default:
                return '';
        }
    }

    private animationTemplate() {
        let keyframes = '';
        for (let i = 0; i < this.defs.length; i++) {
            const animations = this.dm.def2set![this.defs[i]['name']];

            for (let j = 0; j < animations.length; j++) {
                if (!this.defs[i]['attrs']!['parent']) {
                    keyframes += this.keyframesTemplate(
                        this.defs[i],
                        animations[j]['name'],
                        animations[j]['valueStart'],
                        animations[j]['valueEnd'],
                    );
                } else {
                    const parent = this.findParent(this.defs[i]['attrs']!['parent']!);
                    if (parent) {
                        this.defSize(parent);
                        keyframes += this.keyframesTemplate(
                            this.defs[i],
                            animations[j]['name'],
                            animations[j]['valueStart'],
                            animations[j]['valueEnd'],
                            parent.attrs!.width! / 100,
                            parent.attrs!.height! / 100,
                        );
                    }
                }
            }
        }
        return `<style>${keyframes}</style>`;
    }

    private keyframesTemplate(
        def: IDef,
        name: string,
        valueStart: any,
        valueEnd: any,
        xProportion = this.xProportion,
        yProportion = this.yProportion,
    ) {
        let styleStart = '';
        let styleEnd = '';

        // 对 transform 单独处理
        if (
            (valueStart &&
                (valueStart['x'] !== undefined ||
                    valueStart['y'] !== undefined ||
                    valueStart['rotateX'] !== undefined ||
                    valueStart['rotateY'] !== undefined ||
                    valueStart['rotateZ'] !== undefined ||
                    valueStart['scale'] !== undefined)) ||
            (valueEnd &&
                (valueEnd['x'] !== undefined ||
                    valueEnd['y'] !== undefined ||
                    valueEnd['rotateX'] !== undefined ||
                    valueEnd['rotateY'] !== undefined ||
                    valueEnd['rotateZ'] !== undefined ||
                    valueEnd['scale'] !== undefined))
        ) {
            const fixEndUndefined = (name: string) => {
                let target;
                if (valueEnd && valueEnd[name] !== undefined) {
                    target = valueEnd[name];
                } else if (valueStart && valueStart[name] !== undefined) {
                    target = valueStart[name];
                } else if ((<any>def['attrs'])[name]) {
                    target = (<any>def['attrs'])[name];
                } else {
                    target = 0;
                }
                return target;
            };
            const endX = fixEndUndefined('x') * xProportion;
            const endY = fixEndUndefined('y') * yProportion;
            const endRotateX = fixEndUndefined('rotateX');
            const endRotateY = fixEndUndefined('rotateY');
            const endRotateZ = fixEndUndefined('rotateZ');
            const endScale = def['type'] === 'DefPath' ? 1 : fixEndUndefined('scale');

            const fixStartUndefined = (name: string) => {
                let target;
                if (valueStart && typeof valueStart[name] !== 'undefined') {
                    target = valueStart[name];
                } else if (typeof (<any>def['attrs'])[name] !== 'undefined') {
                    target = (<any>def['attrs'])[name];
                } else {
                    target = 0;
                }
                return target;
            };
            const startX = fixStartUndefined('x') * xProportion;
            const startY = fixStartUndefined('y') * yProportion;
            const startRotateX = fixStartUndefined('rotateX');
            const startRotateY = fixStartUndefined('rotateY');
            const startRotateZ = fixStartUndefined('rotateZ');
            const startScale = def['type'] === 'DefPath' ? 1 : fixStartUndefined('scale');

            switch (def['type']) {
                case 'DefText':
                    styleStart += `transform:translate(${startX}px, ${startY}px) rotateX(${startRotateX}deg) rotateY(${startRotateY}deg) rotateZ(${startRotateZ}deg) scale(${startScale});`;
                    styleEnd += `transform:translate(${endX}px, ${endY}px) rotateX(${endRotateX}deg) rotateY(${endRotateY}deg) rotateZ(${endRotateZ}deg) scale(${endScale});`;
                    break;
                case 'DefButton':
                case 'DefPath':
                    styleStart += `transform:translate(${startX}px, ${startY}px);`;
                    styleEnd += `transform:translate(${endX}px, ${endY}px);`;
                    break;
            }
        }

        // 其他渐变属性
        for (const i in valueStart) {
            if (valueStart.hasOwnProperty(i)) {
                styleStart += this.getStyleOut(i, valueStart[i]);
            }
        }
        for (const i in valueEnd) {
            if (valueEnd.hasOwnProperty(i)) {
                styleEnd += this.getStyleOut(i, valueEnd[i]);
            }
        }
        if (!styleEnd) {
            // hack for animationend event not firing after the end of empty animation in Edge
            styleEnd = 'line-height:1;';
        }
        if (styleStart) {
            return `
@-webkit-keyframes ${name} {
    0% { ${styleStart} }
    100% { ${styleEnd} }
}
@keyframes ${name} {
    0% { ${styleStart} }
    100% { ${styleEnd} }
}`;
        } else {
            return `
@-webkit-keyframes ${name} {
    100% { ${styleEnd} }
}
@keyframes ${name} {
    100% { ${styleEnd} }
}`;
        }
    }

    private prefixCSS(key: string, value: string) {
        let result = '';
        for (let i = 0; i < this.prefix.length; i++) {
            result += `${this.prefix[i]}${key}:${value};`;
        }
        return result;
    }

    private bindEvents(ele: HTMLDivElement) {
        ele.addEventListener('animationend', (e) => this.animationCallback(<AnimationEvent>e));
        ele.addEventListener('webkitAnimationEnd', (e) => this.animationCallback(<AnimationEvent>e));

        for (let i = 0; i < this.defs.length; i++) {
            if (this.defs[i]['attrs']!['target']) {
                ele.getElementsByClassName(`bas-danmaku-item--${this.defs[i]['name']}`)[0].addEventListener(
                    'click',
                    () => {
                        if (this.defs[i]['attrs']!['target']!['objType'] === 'av') {
                            window.open(
                                `//www.bilibili.com/video/${this.defs[i]['attrs']!['target']!['bvid']
                                    ? this.defs[i]['attrs']!['target']!['bvid']
                                    : 'av' + this.defs[i]['attrs']!['target']!['av']
                                }/?p=${this.defs[i]['attrs']!['target']!['page'] || '1'}${this.defs[i]['attrs']!['target']!['time']
                                    ? `&t=${this.defs[i]['attrs']!['target']!['time']! / 1000}`
                                    : ''
                                }`,
                            );
                            this.player && this.player.pause();
                        } else if (this.defs[i]['attrs']!['target']!['objType'] === 'bangumi') {
                            window.open(
                                `//www.bilibili.com/bangumi/play/ss${this.defs[i]['attrs']!['target']!['seasonId']}${this.defs[i]['attrs']!['target']!['time']
                                    ? `?t=${this.defs[i]['attrs']!['target']!['time']! / 1000}`
                                    : ''
                                }#${this.defs[i]['attrs']!['target']!['episodeId']}`,
                            );
                            this.player && this.player.pause();
                        } else if (this.defs[i]['attrs']!['target']!['objType'] === 'seek') {
                            this.player && this.player.seek(this.defs[i]['attrs']!['target']!['time']! / 1000);
                        }
                    },
                );
            }
        }
    }

    destroy() { }
}

export default Renderer;
