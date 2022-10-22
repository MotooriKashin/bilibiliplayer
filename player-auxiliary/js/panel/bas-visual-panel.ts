import Tooltip from '../plugins/tooltip';
import STATE from './state';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import svg from './svg';
import { IDanmakuData } from './danmaku-list';
import { Button } from '../ui/button';
import { Selectmenu } from '../ui/selectmenu';
import { Checkbox } from '../ui/checkbox';
import ColorPicker from './color-picker';
import { colorFromInt } from '@shared/utils';
import { Input } from '../ui/input';
import { Collapse } from '../ui/collapse';

import '../../css/bas-visualpanel.less';

interface IPanelOptions {
    prefix: string;
    container: JQuery;
    pid: number;
}

interface IInputs {
    content?: Input;
    fontSize?: Input;
    fontFamily?: Selectmenu;
    bold?: Checkbox;
    textShadow?: Checkbox;
    strokeWidth?: Input;
    strokeColor?: ColorPicker;
    time?: Input;
    zIndex?: Input;
    anchorX?: Input;
    anchorY?: Input;
    duration?: Input;
    x?: Input;
    y?: Input;
    color?: ColorPicker;
    scale?: Input;
    alpha?: Input;
    rotateX?: Input;
    rotateY?: Input;
    rotateZ?: Input;
}

interface IData {
    content: string;
    fontSize: string;
    fontFamily: string;
    bold: boolean;
    textShadow: boolean;
    strokeWidth: string;
    strokeColor: string;
    time: string;
    zIndex: string;
    anchorX: string;
    anchorY: string;
    frames: IFrameData[];
}

interface IFrameData {
    duration: string;
    x?: string;
    y?: string;
    color?: string;
    scale?: string;
    alpha?: string;
    rotateX?: string;
    rotateY?: string;
    rotateZ?: string;
}

class BasVisualPanel {
    private options: IPanelOptions;
    private auxiliary: Auxiliary;
    private container: JQuery;
    private inited = false;
    private prefix: string;
    private template!: {
        [key: string]: JQuery;
    };
    private inputs: IInputs = {};
    private data: IData = {
        content: '',
        fontSize: '5',
        fontFamily: 'SimHei, Microsoft JhengHei',
        bold: false,
        textShadow: true,
        strokeWidth: '0',
        strokeColor: '#FFFFFF',
        time: '-1',
        zIndex: '0',
        anchorX: '0.5',
        anchorY: '0.5',
        frames: [
            {
                duration: '1',
                x: '50',
                y: '50',
                color: '#FFFFFF',
                scale: '1',
                alpha: '1',
                rotateX: '0',
                rotateY: '0',
                rotateZ: '0',
            },
        ],
    };
    private framesIndex = 0;
    private checkCurrenttime!: Checkbox;
    private editBtn!: Button;
    private editId!: string;
    private uiLists: { [key: string]: any } = {}; // 存储按钮，关闭弹幕时  置灰按钮

    constructor(auxiliary: Auxiliary, options: IPanelOptions) {
        this.auxiliary = auxiliary;
        this.options = options;
        this.container = options.container;
        this.prefix = this.options.prefix + '-bas-visualpanel';
    }

    private init() {
        if (!this.inited) {
            this.inited = true;

            this.container.append(this.tpl());

            this.template = {
                switchBtn: this.container.find(`.${this.prefix}-switch-btn`),
                changeableCollapse: this.container.find(`.${this.prefix}-changeable-collapse`),
                changeableHeader: this.container.find(`.${this.prefix}-changeable-header`),
                changeableBody: this.container.find(`.${this.prefix}-changeable-body`),
                checkCurrenttime: this.container.find(`.${this.prefix}-check-currenttime`),
                positionPickBtn: this.container.find(`.${this.prefix}-position-picker`),
                alphaValue: this.container.find(`.${this.prefix}-span-alpha-value`),
                frames: this.container.find(`.${this.prefix}-frames`),
                removeFrameBtn: this.container.find(`.${this.prefix}-frame-remove`),
                previewBtn: this.container.find(`.${this.prefix}-preview`),
                editBtn: this.container.find(`.${this.prefix}-edit`),
                sendBtn: this.container.find(`.${this.prefix}-send`),
                frameWrap: this.container.find(`.${this.prefix}-frame-wrap`),
            };

            this.container.mCustomScrollbar({
                axis: "y",
                scrollInertia: 100,
                autoHideScrollbar: true,

                mouseWheel: {
                    scrollAmount: 48,
                    preventDefault: false,
                },
            });

            const switchBtn = new Button(this.template.switchBtn, {
                type: 'small',
            });
            switchBtn.on('click', () => {
                this.auxiliary.basPanel.show();
            });

            const constProps = [
                'content',
                'fontSize',
                'fontFamily',
                'bold',
                'textShadow',
                'strokeWidth',
                'strokeColor',
                'time',
                'zIndex',
                'anchorX',
                'anchorY',
            ];
            const letProps = ['duration', 'x', 'y', 'color', 'scale', 'alpha', 'rotateX', 'rotateY', 'rotateZ'];
            constProps.forEach((prop) => {
                this.template[prop] = this.container.find(`.${this.prefix}-input-${prop}`);
            });
            letProps.forEach((prop) => {
                this.template[prop] = this.container.find(`.${this.prefix}-input-${prop}`);
            });

            this.inputs.content = new Input(this.template.content, {
                placeholder: '请输入弹幕内容',
                value: this.data.content,
            });
            this.inputs.content.on('change', (e: any) => {
                this.data.content = e.value;
            });

            this.inputs.fontSize = new Input(this.template.fontSize, {
                type: 'number',
                max: 100,
                min: 0,
                value: this.data.fontSize,
            });
            this.inputs.fontSize.on('change', (e: any) => {
                this.data.fontSize = e.value;
            });

            this.inputs.fontFamily = new Selectmenu(this.template.fontFamily, {
                mode: "absolute",
                items: [
                    {
                        name: '黑体',
                        value: 'SimHei, Microsoft JhengHei',
                    },
                    {
                        name: '宋体',
                        value: 'SimSun',
                    },
                    {
                        name: '新宋体',
                        value: 'NSimSun',
                    },
                    {
                        name: '仿宋',
                        value: 'FangSong',
                    },
                    {
                        name: '微软雅黑',
                        value: 'Microsoft YaHei',
                    },
                ],
            });
            this.inputs.fontFamily.value(this.data.fontFamily);
            this.inputs.fontFamily.on('change', (e: any) => {
                this.data.fontFamily = e.value;
            });

            this.inputs.bold = new Checkbox(this.template.bold, {
                label: '粗体',
            });
            this.inputs.bold.value(this.data.bold);
            this.inputs.bold.on('change', (e: any) => {
                this.data.bold = e.value;
            });

            this.inputs.textShadow = new Checkbox(this.template.textShadow, {
                label: '阴影',
            });
            this.inputs.textShadow.value(this.data.textShadow);
            this.inputs.textShadow.on('change', (e: any) => {
                this.data.textShadow = e.value;
            });

            this.inputs.strokeWidth = new Input(this.template.strokeWidth, {
                type: 'number',
                min: 0,
                value: this.data.strokeWidth,
            });
            this.inputs.strokeWidth.on('change', (e: any) => {
                this.data.strokeWidth = e.value;
            });
            this.inputs.strokeColor = new ColorPicker(this.auxiliary.player, this.container, {
                value: this.data.strokeColor,
                triggerBtn: this.template.strokeColor,
                prefix: this.options.prefix,
                onChange: (e: any) => {
                    this.data.strokeColor = e.value;
                },
                callback: (callback: Function) => {
                    // auxiliary过滤了部分信息，向player索取
                    this.auxiliary.player.userLoadedCallback(status => {
                        callback(status.danmaku?.color);
                    });
                },
            });

            this.inputs.time = new Input(this.template.time, {
                type: 'number',
                min: 0,
                disabled: true,
            });
            this.inputs.time.on('change', (e: any) => {
                this.data.time = this.checkCurrenttime.value() ? '-1' : e.value;
            });
            this.checkCurrenttime = new Checkbox(this.template.checkCurrenttime, {
                label: '当前时间',
            });
            this.checkCurrenttime.value(true);
            this.checkCurrenttime.on('change', (e) => {
                if (e.value) {
                    this.inputs.time!.disable();
                } else {
                    this.inputs.time!.enable();
                }
                this.data.time = e.value ? '-1' : this.inputs.time!.value();
            });

            this.inputs.zIndex = new Input(this.template.zIndex, {
                type: 'number',
                min: 0,
                value: this.data.zIndex,
            });
            this.inputs.zIndex.on('change', (e: any) => {
                this.data.zIndex = e.value;
            });

            this.inputs.anchorX = new Input(this.template.anchorX, {
                type: 'number',
                max: 1,
                min: 0,
                step: 0.5,
                value: this.data.anchorX,
            });
            this.inputs.anchorX.on('change', (e: any) => {
                this.data.anchorX = e.value;
            });
            this.inputs.anchorY = new Input(this.template.anchorY, {
                type: 'number',
                max: 1,
                min: 0,
                step: 0.5,
                value: this.data.anchorY,
            });
            this.inputs.anchorY.on('change', (e: any) => {
                this.data.anchorY = e.value;
            });

            // frames
            new Collapse(this.template.changeableCollapse, {
                header: this.template.changeableHeader[0],
                body: this.template.changeableBody[0],
                value: true,
                canCollapse: 1,
            });

            this.template.frames.click((e) => {
                const target = $(e.target);
                if (target.hasClass(`${this.prefix}-frame-add`)) {
                    this.template.removeFrameBtn.before(
                        `<span class="${this.prefix}-frame">${$(`.${this.prefix}-frame`).length + 1}</span>`,
                    );
                    const last = this.data.frames[this.data.frames.length - 1];
                    this.data.frames.push({
                        duration: '1',
                        x: last.x,
                        y: last.y,
                        color: last.color,
                        scale: last.scale,
                        alpha: last.alpha,
                        rotateX: last.rotateX,
                        rotateY: last.rotateY,
                        rotateZ: last.rotateZ,
                    });
                } else if (target.hasClass(`${this.prefix}-frame-remove`)) {
                    if ($(`.${this.prefix}-frame`).length > 1) {
                        $(`.${this.prefix}-frame`).last().remove();
                        this.data.frames.pop();
                    }
                } else if (target.hasClass(`${this.prefix}-frame`)) {
                    $(`.${this.prefix}-frame-active`).removeClass(`${this.prefix}-frame-active`);
                    target.addClass(`${this.prefix}-frame-active`);

                    this.switchFrame(+target.text() - 1);
                }
            });

            this.inputs.duration = new Input(this.template.duration, {
                type: 'number',
                min: 0,
                value: this.data.frames[0].duration,
            });
            this.inputs.duration.on('change', (e: any) => {
                this.data.frames[this.framesIndex].duration = e.value === '' ? undefined : e.value;
            });

            this.inputs.x = new Input(this.template.x, {
                type: 'number',
                max: 100,
                min: 0,
                step: 1,
                value: this.data.frames[0].x,
            });
            this.inputs.x.on('change', (e: any) => {
                this.data.frames[this.framesIndex].x = e.value === '' ? undefined : e.value;
            });
            this.inputs.y = new Input(this.template.y, {
                type: 'number',
                max: 100,
                min: 0,
                step: 1,
                value: this.data.frames[0].y,
            });
            this.inputs.y.on('change', (e: any) => {
                this.data.frames[this.framesIndex].y = e.value === '' ? undefined : e.value;
            });
            const positionPickBtn = new Button(this.template.positionPickBtn, {
                type: 'small',
            });
            positionPickBtn.on('click', () => {
                const active = this.template.positionPickBtn.hasClass('active');
                if (!active) {
                    this.template.positionPickBtn.addClass('active');
                    this.auxiliary.directiveManager.sender(WD.ADM_START_POS_PICKUP, {
                        movementMode: 1,
                        target: 'bas',
                    });
                } else {
                    this.auxiliary.directiveManager.sender(WD.ADM_ABORT_POS_PICKUP, null);
                }
            });
            this.auxiliary.directiveManager.on(PD.ADM_MOUSE_POS_CHANGE.toString(), (e, received: IReceived) => {
                if (received.data.target === 'bas') {
                    this.inputs.x!.value(((received.data.x / received.data.w) * 100).toFixed(2));
                    this.inputs.y!.value(((received.data.y / received.data.h) * 100).toFixed(2));
                }
            });
            this.auxiliary.directiveManager.on(PD.ADM_CLOSE_POS_PICKUP.toString(), (e, received: IReceived) => {
                if (received['data']['target'] === 'bas') {
                    this.template.positionPickBtn.removeClass('active');
                }
            });

            this.inputs.color = new ColorPicker(this.auxiliary.player, this.container, {
                // options: [],
                value: this.data.frames[0].color,
                triggerBtn: this.template.color,
                prefix: this.options.prefix,
                onchange: (e: any) => {
                    this.data.frames[this.framesIndex].color = e.value === '' ? undefined : e.value;
                },
            });

            this.inputs.scale = new Input(this.template.scale, {
                type: 'number',
                max: 1,
                min: 0,
                step: 0.1,
                value: this.data.frames[0].scale,
            });
            this.inputs.scale.on('change', (e: any) => {
                this.data.frames[this.framesIndex].scale = e.value === '' ? undefined : e.value;
            });

            this.inputs.alpha = new Input(this.template.alpha, {
                type: 'number',
                max: 1,
                min: 0,
                step: 0.1,
                value: this.data.frames[0].alpha,
            });
            this.inputs.alpha.on('change', (e: any) => {
                this.data.frames[this.framesIndex].alpha = e.value === '' ? undefined : e.value;
            });

            this.inputs.rotateX = new Input(this.template.rotateX, {
                type: 'number',
                step: 10,
                value: this.data.frames[0].rotateX,
            });
            this.inputs.rotateX.on('change', (e: any) => {
                this.data.frames[this.framesIndex].rotateX = e.value === '' ? undefined : e.value;
            });
            this.inputs.rotateY = new Input(this.template.rotateY, {
                type: 'number',
                step: 10,
                value: this.data.frames[0].rotateY,
            });
            this.inputs.rotateY.on('change', (e: any) => {
                this.data.frames[this.framesIndex].rotateY = e.value === '' ? undefined : e.value;
            });
            this.inputs.rotateZ = new Input(this.template.rotateZ, {
                type: 'number',
                step: 10,
                value: this.data.frames[0].rotateZ,
            });
            this.inputs.rotateZ.on('change', (e: any) => {
                this.data.frames[this.framesIndex].rotateZ = e.value === '' ? undefined : e.value;
            });

            this.uiLists.previewBtn = new Button(this.template.previewBtn, {
                type: 'small',
            });
            this.uiLists.previewBtn.on('click', () => {
                this.onTest();
            });
            this.editBtn = new Button(this.template.editBtn, {
                type: 'small',
                disabled: true,
            });
            this.editBtn.on('click', () => {
                this.onSend(this.editId);
            });
            this.uiLists.sendBtn = new Button(this.template.sendBtn, {
                type: 'small',
            });
            this.uiLists.sendBtn.on('click', () => {
                this.onSend();
            });

            this.auxiliary.directiveManager.on(PD.VI_RECT_CHANGE.toString(), (e, received: IReceived) => {
                if (this.auxiliary.auxiliaryUI.currentMenu === STATE.PANEL.BASDANMAKU) {
                    if (received['data']['mode'] === STATE.UI_WIDE) {
                        this.container.hide();
                    } else {
                        this.container.show();
                    }
                }
            });
            // 弹幕关闭，禁用发送按钮
            if (this.auxiliary.list?.dmClosed) {
                this.dmClose(true);
            }

            this.bindEvents();
        }
    }

    private bindEvents() {
        const that = this;
        const prefix = this.prefix;
        const panel = this.container;

        panel.find('.' + prefix + '-panel-close').on('click', function () {
            that.hide();
        });

        panel.find('.' + prefix + '-panel-back').on('click', function () {
            that.hide();
        });
    }
    dmClose(close: boolean) {
        if (this.inited) {
            if (close) {
                this.uiLists.previewBtn.disable();
                this.uiLists.sendBtn.disable();
            } else {
                this.uiLists.previewBtn.enable();
                this.uiLists.sendBtn.enable();
            }
        }
    }

    private switchFrame(index: number) {
        this.framesIndex = index;
        this.setFrameInputs();
    }

    private setFrameInputs(frameData: IFrameData = this.data.frames[this.framesIndex]) {
        for (const param in frameData) {
            if (frameData.hasOwnProperty(param)) {
                (<any>this).inputs[param].value(frameData[<keyof IFrameData>param] === undefined ? '' : frameData[<keyof IFrameData>param]);
            }
        }
    }

    setData(danmaku: IDanmakuData) {
        this.auxiliary.directiveManager.sender(
            WD.BDM_PARSE_DANMAKU,
            {
                dm: danmaku,
            },
            (received?: IReceived) => {
                if (received!['data']['code'] === 0 && received!['data']['data']) {
                    const parsed = received!['data']['data'];
                    this.editId = parsed['dmid'];
                    this.editBtn.enable();
                    let frameTpl = '';
                    for (let i = 0; i < (parsed.sets[0].items ? parsed.sets[0].items.length + 1 : 1); i++) {
                        frameTpl += `<span class="${this.prefix}-frame">${i + 1}</span>`;
                    }
                    this.switchFrame(0);
                    this.template.frameWrap.html(
                        `${frameTpl}<span class="${this.prefix}-frame-remove">－</span><span class="${this.prefix}-frame-add">＋</span>`,
                    );

                    this.inputs.time!.value(parsed['stime']);
                    this.checkCurrenttime.value(false);
                    this.inputs.content!.value(parsed.defs[0].attrs.content);
                    this.inputs.fontSize!.value(parsed.defs[0].attrs.fontSize.value);
                    this.inputs.fontFamily!.value(parsed.defs[0].attrs.fontFamily);
                    this.inputs.bold!.value(parsed.defs[0].attrs.bold.value);
                    this.inputs.textShadow!.value(parsed.defs[0].attrs.textShadow.value);
                    this.inputs.strokeWidth!.value(parsed.defs[0].attrs.strokeWidth.value);
                    this.inputs.strokeColor!.changeColor(colorFromInt(parsed.defs[0].attrs.strokeColor));
                    this.inputs.zIndex!.value(parsed.defs[0].attrs.zIndex.value);
                    this.inputs.anchorX!.value(parsed.defs[0].attrs.anchorX.value);
                    this.inputs.anchorY!.value(parsed.defs[0].attrs.anchorY.value);

                    this.inputs.duration!.value(
                        parsed.sets[0].items ? parsed.sets[0].items[0].duration / 1000 : parsed.sets[0].duration / 1000,
                    );
                    this.inputs.x!.value(parsed.defs[0].attrs.x.value);
                    this.inputs.y!.value(parsed.defs[0].attrs.y.value);
                    this.inputs.color!.changeColor(colorFromInt(parsed.defs[0].attrs.color));
                    this.inputs.scale!.value(parsed.defs[0].attrs.scale.value);
                    this.inputs.alpha!.value(parsed.defs[0].attrs.alpha.value);
                    this.inputs.rotateX!.value(parsed.defs[0].attrs.rotateX.value);
                    this.inputs.rotateY!.value(parsed.defs[0].attrs.rotateY.value);
                    this.inputs.rotateZ!.value(parsed.defs[0].attrs.rotateZ.value);

                    if (parsed.sets[0].items) {
                        let allDuration = 0;
                        for (let i = 0; i < parsed.sets[0].items.length; i++) {
                            allDuration += parsed.sets[0].items[i].duration;
                            this.data.frames[i + 1] = {
                                duration:
                                    (parsed.sets[0].items[i + 1]
                                        ? parsed.sets[0].items[i + 1].duration
                                        : parsed.sets[1].duration - allDuration) /
                                    1000 +
                                    '',
                                x: parsed.sets[0].items[i].attrs.x.value + '',
                                y: parsed.sets[0].items[i].attrs.y.value + '',
                                color: colorFromInt(parsed.sets[0].items[i].attrs.color),
                                scale: parsed.sets[0].items[i].attrs.scale.value + '',
                                alpha: parsed.sets[0].items[i].attrs.alpha.value + '',
                                rotateX: parsed.sets[0].items[i].attrs.rotateX.value + '',
                                rotateY: parsed.sets[0].items[i].attrs.rotateY.value + '',
                                rotateZ: parsed.sets[0].items[i].attrs.rotateZ.value + '',
                            };
                        }
                    }
                } else {
                    new Tooltip({
                        name: 'formatError',
                        target: this.template.editBtn,
                        position: 'top-center',
                        text: '弹幕格式错误: ' + received!['data']['message'],
                    });
                }
            },
        );
    }

    private getData() {
        let set = '';
        if (this.data.frames.length > 1) {
            this.data.frames.slice(1).forEach((frame, index) => {
                set += `
${index === 0 ? '' : 'then '}set v {
    ${frame.x !== undefined ? `x = ${frame.x}%` : ''}
    ${frame.y !== undefined ? `y = ${frame.y}%` : ''}
    ${frame.color !== undefined ? `color = 0x${frame.color.slice(1)}` : ''}
    ${frame.scale !== undefined ? `scale = ${frame.scale}` : ''}
    ${frame.alpha !== undefined ? `alpha = ${frame.alpha}` : ''}
    ${frame.rotateX !== undefined ? `rotateX = ${frame.rotateX}` : ''}
    ${frame.rotateY !== undefined ? `rotateY = ${frame.rotateY}` : ''}
    ${frame.rotateZ !== undefined ? `rotateZ = ${frame.rotateZ}` : ''}
} ${frame.duration}s`;
            });
        }

        let allDuration = 0;
        this.data.frames.forEach((frame) => {
            allDuration += +frame.duration;
        });
        set += `
set v {
} ${allDuration}s`;
        const text = `def text v {
    content = "${this.data.content}"
    fontSize = ${this.data.fontSize}%
    fontFamily = "${this.data.fontFamily}"
    bold = ${this.data.bold ? '1' : '0'}
    textShadow = ${this.data.textShadow ? '1' : '0'}
    strokeWidth = ${this.data.strokeWidth}
    strokeColor = 0x${this.data.strokeColor.slice(1)}
    zIndex = ${this.data.zIndex}
    anchorX = ${this.data.anchorX}
    anchorY = ${this.data.anchorY}
    x = ${this.data.frames[0].x}%
    y = ${this.data.frames[0].y}%
    color = 0x${this.data.frames[0].color!.slice(1)}
    scale = ${this.data.frames[0].scale}
    alpha = ${this.data.frames[0].alpha}
    rotateX = ${this.data.frames[0].rotateX}
    rotateY = ${this.data.frames[0].rotateY}
    rotateZ = ${this.data.frames[0].rotateZ}
}
${set}
// Generated by bas visual panel`;
        let currentTime;
        this.auxiliary.directiveManager.sender(WD.VI_RETRIEVE_DATA, null, (received?: IReceived) => {
            currentTime = received!['data']['currentTime'];
        });
        return {
            stime: +this.data.time >= 0 ? +this.data.time / 1000 : currentTime,
            mode: 9,
            size: 0,
            color: 0,
            date: 0,
            class: 0,
            uid: 0,
            dmid: '0',
            text: text,
        };
    }

    private onTest() {
        if (!this.data.content) {
            new Tooltip({
                name: 'emptyText',
                target: this.template.previewBtn,
                position: 'top-center',
                text: '请输入弹幕内容',
            });
            return;
        }
        const dm = this.getData();
        dm.stime = +this.data.time >= 0 ? +this.data.time / 1000 : -1;
        this.auxiliary.directiveManager.sender(
            WD.BDM_PREVIEW_DANMAKU,
            {
                dm: dm,
                test: 1,
            },
            (received?: IReceived) => {
                if (received!['data']['code'] === 0) {
                    new Tooltip({
                        name: 'testSuccess',
                        target: this.template.previewBtn,
                        position: 'top-center',
                        text: '测试弹幕发送成功',
                    });
                } else {
                    new Tooltip({
                        name: 'formatError',
                        target: this.template.previewBtn,
                        position: 'top-center',
                        text: '弹幕格式错误: ' + received!['data']['message'],
                    });
                }
            },
        );
    }

    private onSend(dmid?: string) {
        if (!this.data.content) {
            new Tooltip({
                name: 'emptyText',
                target: this.template.previewBtn,
                position: 'top-center',
                text: '请输入弹幕内容',
            });
            return;
        }
        const dm = this.getData();
        if (dm) {
            const data = {
                type: 1, // 主题类型，1：视频
                oid: this.auxiliary.config.cid, // 主题id
                msg: dm.text, // 弹幕内容
                aid: this.auxiliary.config.aid, // 稿件id
                bvid: this.auxiliary.config.bvid, // 稿件bvid
                progress: Math.ceil(dm.stime! * 1000), // 弹幕位于视频中的时间点（单位毫秒）
                color: 1, // 弹幕颜色
                fontsize: 1, // 字体大小
                pool: 2, // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
                mode: 9, // 弹幕模式：1,4,5,6,7,8,9
                rnd: this.options.pid, // 发送时带的随机数
                plat: 1, // 来源平台
            };
            this.auxiliary.directiveManager.sender(
                WD.BDM_SEND_DANMAKU,
                {
                    dm: dm,
                    data: data,
                    isNew: dmid ? 0 : 1,
                    dmids: dmid,
                },
                (received?: IReceived) => {
                    if (received!['data']['code'] === 0) {
                        new Tooltip({
                            name: 'testSuccess',
                            target: this.template.editBtn,
                            position: 'center-center',
                            text: '发送成功',
                        });
                        setTimeout(() => {
                            this.auxiliary.list.setBasMode(true);
                        }, 0);
                    } else {
                        new Tooltip({
                            name: 'formatError',
                            target: this.template.editBtn,
                            position: 'center-center',
                            text: received!['data']['message'],
                        });
                    }
                },
            );
        }
    }

    private tpl() {
        return `
        <div class="${this.prefix}-switch-btn">代码模式</div>
        <div class="${this.prefix}-box">
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label ${this.prefix}-label-letter">${svg.basletter}</span>
                <span class="${this.prefix}-input ${this.prefix}-input-content"></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">文本大小</span>
                <span class="${this.prefix}-input ${this.prefix}-input-fontSize"></span>
                <span class="${this.prefix}-span">%</span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">文本字体</span>
                <span class="${this.prefix}-input ${this.prefix}-input-fontFamily" style="width: 80px;"></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">文本样式</span>
                <span class="${this.prefix}-input ${this.prefix}-input-span"><input type="checkbox" class="${this.prefix}-input-bold" data-ui-type="checkbox"/></span>
                <span class="${this.prefix}-input ${this.prefix}-input-span"><input type="checkbox" class="${this.prefix}-input-textShadow" data-ui-type="checkbox"/></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">描边宽度</span>
                <span class="${this.prefix}-input ${this.prefix}-input-strokeWidth"></span>
                <span class="${this.prefix}-span">px</span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">描边颜色</span>
                <span class="${this.prefix}-input ${this.prefix}-input-strokeColor"><i class="${this.options.prefix}-iconfont ${this.options.prefix}-iconfont-color icon-24color"></i></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">出现时间</span>
                <span class="${this.prefix}-input ${this.prefix}-input-time"></span>
                <span class="${this.prefix}-span">毫秒</span>
                <span class="${this.prefix}-check-span"><input type="checkbox" class="${this.prefix}-check-currenttime" data-ui-type="checkbox"/></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">层级</span>
                <span class="${this.prefix}-input ${this.prefix}-input-zIndex"></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">锚点</span>
                <span class="${this.prefix}-span">X</span>
                <span class="${this.prefix}-input ${this.prefix}-input-anchorX"></span>
                <span class="${this.prefix}-span">Y</span>
                <span class="${this.prefix}-input ${this.prefix}-input-anchorY"></span>
            </div>
        </div>
        <div class="${this.prefix}-changeable-collapse"></div>
        <div class="${this.prefix}-changeable-header">${svg.basarrow}<span>动画属性</span></div>
        <div class="${this.prefix}-changeable-body">
            <div class="${this.prefix}-line ${this.prefix}-frames">
                <span class="${this.prefix}-label">动画帧</span>
                <span class="${this.prefix}-frame-wrap">
                    <span class="${this.prefix}-frame ${this.prefix}-frame-active">1</span><span class="${this.prefix}-frame-remove">－</span><span class="${this.prefix}-frame-add">＋</span>
                </span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">持续时间</span>
                <span class="${this.prefix}-input ${this.prefix}-input-duration"></span>
                <span class="${this.prefix}-span">秒</span>
            </div>
            <div class="${this.prefix}-br"></div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">位置</span>
                <span class="${this.prefix}-span">X</span>
                <span class="${this.prefix}-input ${this.prefix}-input-x"></span>
                <span class="${this.prefix}-span">%</span>
                <span class="${this.prefix}-span">Y</span>
                <span class="${this.prefix}-input ${this.prefix}-input-y"></span>
                <span class="${this.prefix}-span">%</span>
                <span class="${this.prefix}-position-picker">位置拾取</span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">文本颜色</span>
                <span class="${this.prefix}-input ${this.prefix}-input-color"><i class="${this.options.prefix}-iconfont ${this.options.prefix}-iconfont-color icon-24color"></i></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">缩放</span>
                <span class="${this.prefix}-input ${this.prefix}-input-scale"></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">透明度</span>
                <span class="${this.prefix}-input ${this.prefix}-input-alpha"></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-label">旋转</span>
                <span class="${this.prefix}-span">X</span>
                <span class="${this.prefix}-input ${this.prefix}-input-rotateX"></span>
                <span class="${this.prefix}-span">Y</span>
                <span class="${this.prefix}-input ${this.prefix}-input-rotateY"></span>
                <span class="${this.prefix}-span">Z</span>
                <span class="${this.prefix}-input ${this.prefix}-input-rotateZ"></span>
            </div>
            <div class="${this.prefix}-line">
                <span class="${this.prefix}-preview">预览弹幕</span><span class="${this.prefix}-edit">修改弹幕</span><span class="${this.prefix}-send">发送弹幕</span>
            </div>
        </div>
        `;
    }

    show() {
        if (!this.inited) {
            this.init();
        }

        this.container.show();
        this.auxiliary.list.setBasMode(true);
    }

    hide() {
        this.container.hide();
        this.auxiliary.list.setBasMode(false);
    }
}

export default BasVisualPanel;
