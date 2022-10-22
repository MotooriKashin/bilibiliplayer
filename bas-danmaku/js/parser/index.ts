import Utils from './utils';
import BasParser from './bas-parser';

interface ICommon {
    x?: IPercentNum | number;
    y?: IPercentNum | number;
    zIndex?: IPercentNum | number;
    scale?: IPercentNum | number;
    duration?: number;
}

interface IText extends ICommon {
    content?: string;
    alpha?: IPercentNum | number;
    color?: number;
    anchorX?: IPercentNum | number;
    anchorY?: IPercentNum | number;
    fontSize?: IPercentNum | number;
    fontFamily?: string;
    bold?: IPercentNum | number;
    textShadow?: IPercentNum | number;
    strokeWidth?: IPercentNum | number;
    strokeColor?: number;
    rotateX?: IPercentNum | number;
    rotateY?: IPercentNum | number;
    rotateZ?: IPercentNum | number;
    parent?: string;
}

interface IButton extends ICommon {
    text?: string;
    fontSize?: IPercentNum | number;
    textColor?: number;
    textAlpha?: IPercentNum | number;
    fillColor?: number;
    fillAlpha?: IPercentNum | number;
    target?: IButtonTarget;
}

interface IButtonTarget {
    objType: string;
    time?: number;
    page?: number;
    av?: number;
    bvid?: number;
    seasonId?: number;
    episodeId?: number;
}

interface IPath extends ICommon {
    d?: string;
    viewBox?: string;
    borderColor?: number;
    borderAlpha?: IPercentNum | number;
    borderWidth?: IPercentNum | number;
    fillColor?: number;
    fillAlpha?: IPercentNum | number;
}

interface IParseResult {
    defs?: IDef[];
    sets?: [ISet | ISetItems];
    duration?: number;
    def2set?: any;
}

interface ID2S {
    name: string;
    valueStart?: any;
    valueEnd: any;
    easing?: string;
    duration?: number;
    delay?: number;
    [key: string]: any;
}

export interface IDef {
    attrs?: IDefAttrs;
    name: string;
    type?: string;
}

interface IPercentNum {
    numType: string;
    value: number;
}

export interface IDefAttrs extends IText, IButton, IPath {
    width?: number;
    height?: number;
}

interface ISet {
    attrs?: any;
    defaultEasing?: string;
    duration?: number;
    targetName?: string;
    type: string;
    items?: ISet[];
}

interface ISetItems {
    items: ISet[];
    type: string;
}

function parser(basCode: string, encode = true): IParseResult {
    const defaultCommon: ICommon = {
        x: {
            numType: 'number',
            value: 0,
        },
        y: {
            numType: 'number',
            value: 0,
        },
        zIndex: {
            numType: 'number',
            value: 0,
        },
        scale: {
            numType: 'number',
            value: 1,
        },
        duration: undefined,
    };

    const defaultText: IText = {
        content: '请输入内容',
        alpha: {
            numType: 'number',
            value: 1,
        },
        color: 16777215,
        anchorX: {
            numType: 'number',
            value: 0,
        },
        anchorY: {
            numType: 'number',
            value: 0,
        },
        fontSize: {
            numType: 'number',
            value: 25,
        },
        fontFamily: 'SimHei',
        bold: {
            numType: 'number',
            value: 1,
        },
        textShadow: {
            numType: 'number',
            value: 1,
        },
        strokeWidth: {
            numType: 'number',
            value: 0,
        },
        strokeColor: 16777215,
        rotateX: {
            numType: 'number',
            value: 0,
        },
        rotateY: {
            numType: 'number',
            value: 0,
        },
        rotateZ: {
            numType: 'number',
            value: 0,
        },
        parent: undefined,
    };

    const defaultButton: IButton = {
        text: '请输入内容',
        fontSize: {
            numType: 'number',
            value: 25,
        },
        textColor: 0,
        textAlpha: {
            numType: 'number',
            value: 1,
        },
        fillColor: 16777215,
        fillAlpha: {
            numType: 'number',
            value: 1,
        },
        target: undefined,
    };

    const defaultPath: IPath = {
        d: undefined,
        viewBox: undefined,
        borderColor: 0,
        borderAlpha: {
            numType: 'number',
            value: 1,
        },
        borderWidth: {
            numType: 'number',
            value: 0,
        },
        fillColor: 16777215,
        fillAlpha: {
            numType: 'number',
            value: 1,
        },
    };

    function parseAttrs(attrs: { [key: string]: any }) {
        for (const attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                if (
                    typeof attrs[attr].value !== 'undefined' &&
                    typeof attrs[attr].value['numType'] !== 'undefined' &&
                    typeof attrs[attr]['easing'] === 'undefined'
                ) {
                    attrs[attr] = attrs[attr].value;
                } else if (typeof attrs[attr].value !== 'undefined' && typeof attrs[attr]['type'] !== 'undefined') {
                    attrs[attr] = attrs[attr].value;
                }
                switch (attr) {
                    case 'content':
                        attrs[attr] = Utils.htmlEncode(attrs[attr], false, true);
                        break;
                    case 'fontFamily':
                        attrs[attr] = Utils.htmlEncode(attrs[attr], true, false);
                        break;
                    case 'parent':
                        attrs[attr] = Utils.htmlEncode(attrs[attr], false, false);
                        break;
                    case 'text':
                        attrs[attr] = Utils.htmlEncode(attrs[attr], false, true);
                        break;
                    case 'd':
                        attrs[attr] = Utils.htmlEncode(attrs[attr], true, false);
                        break;
                    case 'viewBox':
                        attrs[attr] = Utils.htmlEncode(attrs[attr], true, false);
                        break;
                    default:
                        if (typeof attrs[attr] === 'string') {
                            attrs[attr] = Utils.htmlEncode(attrs[attr], false, false);
                        }
                }
            }
        }
    }

    function parseSets(set: { [key: string]: any }) {
        parseAttrs(set['attrs']);
        set['duration'] = set['duration']['value'];
        set['defaultEasing'] = set['default_easing'] && set['default_easing'].value;
        set['targetName'] = set['target_name'];
    }

    try {
        // const parseResult = new BasTransform(BasParser['parse'](basCode), encode)['transform']();
        const parseResult = BasParser['parse'](basCode);
        const parsed: IParseResult = {};
        parsed.defs = <IDef[]>parseResult.defs;
        for (let i = 0; i < parsed.defs.length; i++) {
            parseAttrs(parsed.defs[i]['attrs']!);
            if (parsed.defs[i]['attrs']!['target']) {
                const parsedTarget: IButtonTarget = {
                    objType: 'seek',
                };
                for (let j = 0; j < (<any>parsed.defs[i]['attrs']!['target']).length; j++) {
                    const item = (<any>parsed.defs[i]['attrs']!['target'])[j];
                    if (item[0] === 'seasonId' || item[0] === 'episodeId') {
                        parsedTarget['objType'] = 'bangumi';
                    } else if (item[0] === 'av' || item[0] === 'page') {
                        parsedTarget['objType'] = 'av';
                    }
                    if (item[1].value && item[1].value.value) {
                        (<any>parsedTarget)[item[0]] = item[1].value.value;
                    } else if (item[1].value) {
                        (<any>parsedTarget)[item[0]] = item[1].value;
                    }
                }
                parsed.defs[i]['attrs']!['target'] = parsedTarget;
            }
            parsed.defs[i]['attrs'] = Utils.extend(defaultCommon, (<IDef>parseResult.defs[i])['attrs']);
            if (parsed.defs[i]['type'] === 'DefText') {
                parsed.defs[i]['attrs'] = Utils.extend(defaultText, (<IDef>parseResult.defs[i])['attrs']);
            } else if (parsed.defs[i]['type'] === 'DefButton') {
                parsed.defs[i]['attrs'] = Utils.extend(defaultButton, (<IDef>parseResult.defs[i])['attrs']);
            } else if (parsed.defs[i]['type'] === 'DefPath') {
                parsed.defs[i]['attrs'] = Utils.extend(defaultPath, (<IDef>parseResult.defs[i])['attrs']);
            }
        }
        parsed.sets = <[ISet | ISetItems]>parseResult.sets;
        for (let i = 0; i < parsed.sets.length; i++) {
            if (!parsed.sets[i]['items']) {
                parseSets(parsed.sets[i]);
            } else {
                for (let j = 0; j < parsed.sets[i]['items']!.length; j++) {
                    if (parsed.sets[i]['items']![j]['attrs']) {
                        parseSets(parsed.sets[i]['items']![j]);
                    }
                }
            }
        }

        return parsed;
    } catch (e: any) {
        throw new Error(e.message);
    }
}

export default parser;
