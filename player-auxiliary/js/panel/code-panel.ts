import '../../css/code-panel.less'
import Tooltip from '../plugins/tooltip';
import STATE from './state';
import Modal from '../plugins/modal';
import Clipboard from 'clipboard';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';

interface IPanelOptions {
    panel: JQuery;
    onTest?: Function;
    pid?: number;
}

interface ITextData {
    type?: number;
    oid?: number;
    msg: string;
    aid?: number;
    color?: number;
    fontsize?: number;
    progress: number;
    pool?: number;
    mode?: number;
    rnd?: number;
    plat?: number;
}

interface IEditor {
    color: number;
    fontsize: number[];
    $blockScrolling: number;
    setTheme: (k: string) => void;
    setValue: (k: string) => void;
    getSession: () => { [key: string]: any };
    getValue: () => string;
    clearSelection: () => void;
    focus: () => void;
    on: (e: string, callback: (data: any) => void) => void;
    setOptions: any;
}

class CodePanel {
    private prefix: string;
    private auxiliary: Auxiliary;
    private options: any;
    private checkbox: any = {};
    private inited = false;
    private stimeInput!: JQuery<HTMLElement>;
    private testBtn!: Button;
    private sendBtn!: Button;
    private status: boolean;
    private userStatus: any;
    private modal!: Modal;
    private isUP: boolean;
    private vertificationStatus: number;
    private vertificationState = {
        needBuy: -1,
        init: 0,
        confirm: 1,
        verification: 2,
        reject: 3,
    };
    private editor!: IEditor;
    private logContent!: string;
    // private codeScrollbar: any;
    private infoList: string[] = [];
    template!: { [key: string]: JQuery; };
    private showing?: boolean;
    private container: JQuery;

    constructor(auxiliary: Auxiliary, options: IPanelOptions) {
        this.auxiliary = auxiliary;
        this.options = options;
        this.prefix = auxiliary.prefix;
        this.vertificationStatus = this.vertificationState.needBuy;
        this.container = options.panel;
        this.status = false; // 是否能发高级弹幕
        this.isUP = false;
        this.options.onTest = (obj: any) => {
            // 218001
            this.auxiliary.directiveManager.sender(WD.CDM_PREVIEW_DANMAKU, obj);
        };
        this.beforeInit();
        this.globalEvents();
    }

    private initEditor() {
        if (!this.editor && window['ace']) {
            this.editor = window['ace']['edit']('editor');
            this.editor['setOptions']({
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true,
            });
            this.editor['getSession']()['setMode']('ace/mode/bas');
            this.editor['setTheme']('ace/theme/crimson_editor');
            this.editor['clearSelection']();
            this.enable();
        }
    }
    private globalEvents() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, () => {
            this.destroy();
        });

        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, () => {
            this.update();
        });
        this.auxiliary.directiveManager.on(PD.VI_RECT_CHANGE.toString(), (e, received: IReceived) => {
            // if (received['data']['w'] === 320) {
            //     return;
            // }
            // this.playerWidth = received['data']['w'];
            // this.playerHeight = received['data']['h'];
            // this.playerMode = received['data']['mode'];
            this.update();
            // this.container.css('top', received['data']['y'] + 'px');
        });

        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RELOAD, () => {
            if (this.inited) {
                this.vertificationStatus = -1;
                // this.disable();
                this.verify();
            }
        });
        // 118001
        this.auxiliary.directiveManager.on(PD.CDM_PUT_LOG.toString(), (e, received: IReceived) => {
            const msg = received['data']['message'] + '';
            if (this.inited) {
                this.addInfo(msg);
            } else {
                this.infoList.push(msg);
            }
        });
    }
    addInfo(msg: string) {
        if (msg.length > 0 && this.template.logDiv) {
            this.logContent += msg + '\n';
            this.template.logDiv.append('<a>' + msg + '</a><br>');
        }
    }
    private snippet() {
        const prefix = this.prefix;
        return `<div class="${prefix}-panel-title advanced-danmaku-group code-danmaku-title">
        <span class="${prefix}-panel-title-text">代码弹幕</span>
        <i class="${prefix}-iconfont ${prefix}-panel-back icon-close"></i>
    </div>
        <div class="${prefix}-code-danmaku-control-container">
                <div class="${prefix}-code-danmaku-wrap">
                <div class="${prefix}-code-danmaku-log">
                    <div class="${prefix}-code-danmaku-log-controlbar">
                        <span class="${prefix}-code-danmaku-log-control ${prefix}-code-danmaku-log-copy">复制</span>
                        <span class="${prefix}-code-danmaku-log-control ${prefix}-code-danmaku-log-clear">清除</span>
                    </div>
                    <div class="${prefix}-code-danmaku-logdiv"></div>
                </div>
                <div class="${prefix}-code-danmaku-input">
                    <div class="${prefix}-code-danmaku-input-controlbar">
                        <span class="${prefix}-code-danmaku-input-control ${prefix}-code-danmaku-input-copy">复制</span>
                        <span class="${prefix}-code-danmaku-input-control ${prefix}-code-danmaku-input-clear">清除</span>
                        <span class="${prefix}-code-danmaku-input-control ${prefix}-code-danmaku-input-refer">语言参考</span>
                    </div>
                    <div class="${prefix}-code-danmaku-inputdiv" id="editor"></div>
                </div>
                <div class="${prefix}-code-danmaku-sendgroup">
                        <span class="${prefix}-code-danmaku-sendgroup-title">弹幕出现时间</span>
                        <input type="text" class="${prefix}-code-danmaku-sendgroup-time disabled" /><span class="${prefix}-code-danmaku-sendgroup-tooltip">单位秒</span><span><input type="checkbox" class="${prefix}-code-danmaku-sendgroup-checkbox ${prefix}-code-danmaku-sendgroup-current" data-ui-type="checkbox" data-origin="1" /></span>
                        <div class="${prefix}-code-danmaku-sendgroup-btn">
                            <span class="${prefix}-code-danmaku-btn-span ${prefix}-code-danmaku-sendgroup-test">测试效果</span>
                            <span class="${prefix}-code-danmaku-btn-span ${prefix}-code-danmaku-sendgroup-send">发送弹幕</span>
                        </div>
                </div>
                </div>
            </div>`;
    }

    private beforeInit() {
        const that = this;
        this.auxiliary.player.userLoadedCallback(data => {
            that.userStatus = data;
            that.verifyUp(that.userStatus);
        });
        this.modal = new Modal({
            title: '代码弹幕',
            prefix: that.prefix,
            info: '抱歉，代码弹幕因为安全原因暂时被禁用。',
            btns: [
                {
                    type: 'cancel',
                    text: '确定',
                    click: () => {
                        this.modal.close();
                        this.enable();
                        this.status = true;
                    }
                },
            ],
            appendTo: that.options.panel,
            width: '90%',
            onOpen() { },
        });
    }

    private init() {
        if (!this.inited) {
            this.inited = true;
            const panel = this.options.panel;
            panel.append(this.snippet());
            this.template = {
                panel: panel,
                container: panel.find('.' + this.prefix + '-code-danmaku-control-container'),
                logDiv: panel.find('.' + this.prefix + '-code-danmaku-logdiv'),

                testBtn: panel.find('.' + this.prefix + '-code-danmaku-sendgroup-test'),
                sendBtn: panel.find('.' + this.prefix + '-code-danmaku-sendgroup-send'),
                codeInput: panel.find('.' + this.prefix + '-code-danmaku-inputdiv'),
                logCopyBtn: panel.find('.' + this.prefix + '-code-danmaku-log-copy'),
                logClearBtn: panel.find('.' + this.prefix + '-code-danmaku-log-clear'),
                inputCopyBtn: panel.find('.' + this.prefix + '-code-danmaku-input-copy'),
                inputClearBtn: panel.find('.' + this.prefix + '-code-danmaku-input-clear'),
                inputReferBtn: panel.find('.' + this.prefix + '-code-danmaku-input-refer'),

                stime: panel.find('.' + this.prefix + '-code-danmaku-sendgroup-time'),
                ctime: panel.find('.' + this.prefix + '-code-danmaku-sendgroup-current'),
                tooltip: panel.find('.' + this.prefix + '-code-danmaku-sendgroup-tooltip'),
            };

            this.initializeSpinner();
            this.bindEvents();
            // this.disable();
            this.logContent = '';
            this.infoList.forEach((item) => {
                this.addInfo(item);
            });
        }
    }

    private initializeSpinner() {
        this.auxiliary.player.userLoadedCallback(data => {
            this.userStatus = data;
            if (this.userStatus['level'] >= 2) {
            }
        });

        // this.template.container.mCustomScrollbar({
        //     axis: "y",
        //     scrollInertia: 100,
        //     autoHideScrollbar: true,
        // });

        this.testBtn = new Button(this.template.testBtn, {
            type: 'small',
            click: () => {
                console.log('testBtn clicked');
                this.onTest();
            }
        })

        this.sendBtn = new Button(this.template.sendBtn, {
            type: 'small',
            click: () => {
                console.log('send Btn clicked');
                this.onSend();
            }
        })

        new Button(this.template.logCopyBtn, {
            type: 'small',
        })

        new Button(this.template.logClearBtn, {
            type: 'small',
            click: () => {
                console.log('LogClear');
                if (this.logContent.length > 0 && this.template.logDiv.children('a').length > 0) {
                    this.template.logDiv.children().remove();
                    this.logContent = '';
                }
            }
        });

        new Button(this.template.inputCopyBtn, {
            type: 'small',
            click: () => {
                console.log('InputCopy');
            }
        });

        new Button(this.template.inputClearBtn, {
            type: 'small',
            click: () => {
                console.log('InputClear');
                if (this.editor) {
                    this.editor['setValue']('');
                }
            }
        });

        new Button(this.template.inputReferBtn, {
            type: 'small',
            click: () => {
                console.log('InputRefer');
                window.open('https://docs.bilibili.com/wiki/%E5%88%86%E7%B1%BB:Script', '_blank')
            }
        });
    }

    update() {
        // const options = this.auxiliary.options;
        // const template = this.auxiliary.template;
        // const offset = this.auxiliary.extraParams ? this.auxiliary.extraParams.danmakuListOffset : 0;
        // let h = this.auxiliary.getPlayerHeight();
        // h = offset ? h - offset : h;
        // this.template && this.template.container.css('height', h - this.auxiliary.filtersHeight + 'px');

        if (this.auxiliary.player.iframe && this.showing) {
            if ($(this.auxiliary.window.document).find("body").hasClass("widescreen")) {
                this.auxiliary.player.$iframe?.css("height", "1240px")
            } else {
                this.auxiliary.player.$iframe?.css("height", "1112px")
            }
        }
    }

    private bindEvents() {
        const that = this;
        const prefix = this.prefix;
        const panel = this.options.panel;

        panel.find('.' + prefix + '-panel-close').on('click', function () {
            that.hide();
        });

        panel.find('.' + prefix + '-panel-back').on('click', function () {
            that.hide();
        });

        this.template.stime.hover(
            () => {
                this.template.tooltip.show();
            },
            () => {
                this.template.tooltip.hide();
            },
        );

        // this.stimeInput = new Input(this.template.stime[0], {
        //     disabled: true,
        // });
        this.stimeInput = this.template.stime;

        this.checkbox['ctime'] = new Checkbox(this.template.ctime, {
            checked: true,
            label: '当前时间',
        });

        this.checkbox['ctime'].on('change', (e: any) => {
            if (!e.value) {
                this.stimeInput.removeClass("disabled");
            } else {
                this.stimeInput.val("").addClass("disabled");
            }
        });

        // @ts-ignore
        const logClipboard = new Clipboard(that.template.logCopyBtn[0], {
            text: function () {
                if (that.logContent.length > 0) {
                    return that.logContent;
                }
                return '';
            },
        });

        logClipboard.on('success', function () {
            new Tooltip({
                name: 'copySuccess',
                target: that.template.container,
                position: 'center-center',
                text: '复制成功',
            });
        });

        // @ts-ignore
        const codeClipboard = new Clipboard(this.template.inputCopyBtn[0], {
            text: function () {
                if (that.editor) {
                    return that.editor['getValue']();
                }
                return '';
            },
        });
        codeClipboard.on('success', function () {
            new Tooltip({
                name: 'copySuccess',
                target: that.template.container,
                position: 'center-center',
                text: '复制成功',
            });
        });
    }

    show() {
        if (!this.inited) {
            this.init();
            import(
                /* webpackChunkName: "ace" */
                '@jsc/ace'
            ).then((s) => {
                this.initEditor();
            });
            if (!this.editor) {
                this.disable();
            }
        }
        this.options.panel.show();
        this.verify();
        this.showing = true;
        if (this.auxiliary.player.iframe) {
            const height = this.template.basDanmakuPane.height()!;
            this.auxiliary.player.container.css("height", "calc(100% - " + height + "px)");
            this.auxiliary.player.$iframe?.css("height", this.auxiliary.player.$iframe.height()! + height + "px");
        }
    }

    hide() {
        if (!this.inited) {
            this.init();
        }
        this.options.panel.hide();
        this.reset();
        this.showing = false;
        if (this.auxiliary.player.iframe) {
            this.auxiliary.player.container.css("height", "");
            this.auxiliary.player.$iframe?.css("height", "");
        }
    }

    reset() {
        if (this.editor && this.template.logDiv) {
            this.editor['setValue']('');
            this.logContent = '';
            this.template.logDiv.children().remove();
        }
    }

    private getData(): ITextData {
        let textData: ITextData;
        // 226001
        this.auxiliary.directiveManager.sender(WD.VI_RETRIEVE_DATA, null, (received?: IReceived) => {
            textData = {
                type: 1, // 主题类型，1：视频
                oid: this.auxiliary.config.cid, // 主题id
                msg: this.editor['getValue'](), // 弹幕内容
                aid: this.auxiliary.config.aid, // 稿件id
                // bvid: this.auxiliary.config.bvid, // 稿件bvid
                progress: received!['data']['currentTime'], // 单位：秒
                color: 0,
                fontsize: 0,
                pool: 2, // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
                mode: 8, // 弹幕模式：1,4,5,6,7,8,9
                rnd: this.options.pid, // 发送时带的随机数
                plat: 1, // 来源平台
            };
        });

        // @ts-ignore
        return textData;
    }

    private onTest() {
        const that = this;
        if (!this.status) {
            return false;
        }
        if (this.editor['getValue']().length === 0) {
            this.editor.focus();
        } else {
            setTimeout(function () {
                console.log('testing...');
                const data = that.getData();
                if (data) {
                    'function' === typeof that.options.onTest && that.options.onTest(data);
                }
            }, 0);
        }
    }

    private onSend() {
        if (!this.status) {
            return false;
        }
        if (this.editor['getValue']().length > 0) {
            const that = this;
            const data = this.getData();

            if (data) {
                const currentTime = data.progress;
                let time = 0;

                time = Number(this.stimeInput.val());
                data.progress = Math.ceil((this.serializeToSecond(time) || currentTime) * 1000);

                // 217006
                this.auxiliary.directiveManager.sender(WD.CDM_SEND_DANMAKU, data, (received?: IReceived) => {
                    const result = received!['data'];
                    if (result && result['code'] === 0 && result['dmid']) {
                        that.editor['setValue']('');
                        new Tooltip({
                            name: 'sendSuccess',
                            target: that.template.container,
                            position: 'center-center',
                            text: '发送成功',
                        });
                    } else {
                        new Tooltip({
                            name: 'sendError',
                            target: that.template.container,
                            position: 'center-center',
                            text: result ? result['message'] || '发送失败' : '发送失败',
                        });
                    }
                });
            }
        } else {
            this.editor.focus();
        }
    }

    private serializeToSecond(time: number | string) {
        if (typeof time === 'number') {
            return time || 0;
        }
        if (typeof time !== 'string') {
            return 0;
        }
        return time
            .split(':')
            .slice(-3)
            .reverse()
            .reduce((accumulator, currentValue, currentIndex) => {
                switch (currentIndex) {
                    case 2:
                        return (Number(currentValue) || 0) * 3600 + accumulator;
                    case 1:
                        return (Number(currentValue) || 0) * 60 + accumulator;
                    case 0:
                        return (Number(currentValue) || 0) + accumulator;
                    default:
                        return accumulator;
                }
            }, 0);
    }
    verify() {
        if (this.vertificationStatus !== this.vertificationState.confirm) {
            this.modal.open();
            this.checkVerification();
        }
    }

    private verifyUp(data: any) {
        if ('function' === typeof this.auxiliary.window['getAuthorInfo']) {
            const info = this.auxiliary.window['getAuthorInfo']();
            if (info['mid'] === parseInt(data['id'], 10)) {
                this.isUP = true;
            }
        }
    }

    private checkVerification() {
        this.verifyAjax((res: any) => {
            if (!res['hasBuy']) {
                if (!res['confirm'] && !res['accept']) {
                    this.modal.destroy();
                } else {
                    this.setVerificationState(this.vertificationState.needBuy + '');
                }
            } else if (res['hasBuy'] && Number(res['confirm']) < 0) {
                this.setVerificationState(this.vertificationState.needBuy + '');
            } else if (Number(res['confirm']) >= 0) {
                this.setVerificationState(res['confirm'], res);
            }
        });
    }

    private setVerificationState(state: string, data?: any) {
        const that = this;
        let upperText = '并要经UP主同意确认。';
        const reState = parseInt(state, 10);
        if (this.isUP) {
            upperText = '';
        }
        if (!isNaN(reState)) {
            this.vertificationStatus = reState;
            switch (reState) {
                case this.vertificationState.needBuy:
                    this.modal.options({
                        info: '抱歉，代码弹幕因为安全原因暂时被禁用。',
                        btns: [
                            {
                                type: 'cancel',
                                text: '确定',
                            },
                        ],
                    });
                    break;
                case this.vertificationState.init:
                    this.modal.options({
                        info: '启用本视频的代码弹幕需要UP主同意, 是否要发送请求? ',
                        btns: [
                            {
                                type: 'cancel',
                                text: '否',
                            },
                            {
                                type: 'submit',
                                text: '发送请求',
                                click() {
                                    that.checkVerification();
                                },
                            },
                        ],
                    });
                    break;
                case this.vertificationState.confirm:
                    this.modal.close();
                    this.enable();
                    this.status = true;
                    break;
                case this.vertificationState.verification:
                    this.modal.options({
                        info: '正在等待UP主同意开启使用',
                        btns: [
                            {
                                type: 'cancel',
                                text: '确定',
                            },
                        ],
                    });
                    break;
                case this.vertificationState.reject:
                    this.modal.options({
                        info: 'UP主拒绝您的请求',
                        btns: [
                            {
                                type: 'cancel',
                                text: '确定',
                            },
                        ],
                    });
                    break;
                default:
                    break;
            }
        }
    }

    private verifyAjax(callback: Function) {
        // 218004
        this.auxiliary.directiveManager.sender(WD.CDM_VERIFY_PERMISSION, null, (received?: IReceived) => {
            typeof callback === 'function' && callback(received!['data']['data']);
        });
    }

    disable() {
        this.template && this.template.container.addClass('mask');
        this.template && this.template.container.removeClass(`${this.prefix}-bscrollbar`);
        this.testBtn && this.testBtn.disable();
        this.sendBtn && this.sendBtn.disable();
        // this.codeScrollbar && this.codeScrollbar.disable();
    }

    enable() {
        this.template && this.template.container.removeClass('mask');
        this.template && this.template.container.addClass(`${this.prefix}-bscrollbar`);
        this.testBtn && this.testBtn.enable();
        this.sendBtn && this.sendBtn.enable();
        // this.codeScrollbar && this.codeScrollbar.enable();
    }

    disableContent() {
        this.template && this.template.container.addClass('mask-content');
    }

    enableContent() {
        this.template && this.template.container.removeClass('mask-content');
    }

    destroy() { }
}

export default CodePanel;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        ace: {
            edit: (value: string) => IEditor
        }
    }
}