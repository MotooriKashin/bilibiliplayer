import ColorPicker from './color-picker';
import Tooltip from '../plugins/tooltip';
import Clipboard from 'clipboard';
import STATE from './state';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import { Spinner } from '../ui/spinner';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { getLocalSettings, setLocalSettings } from '@shared/utils';

interface IPanelOptions {
    prefix: string;
    panel: JQuery;
    pid: number;
}

interface IDm {
    class?: number;
    color?: number;
    date?: number;
    dmid?: string;
    mode?: number;
    size?: number;
    stime: number;
    text: string;
    uid?: number;
    easing?: string;
    duration?: number;
    [key: string]: any;
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
    on: (e: string, callback: (data: any) => void) => void;
    setOptions: any;
}

interface IConfig {
    color?: number;
    size?: number;
    duration?: number;
    text?: string;
    x?: number;
    y?: number;
    isPercent?: number;
    testKeep?: boolean;
    [key: string]: any;
}

interface ITemplate {
    [key: string]: JQuery;
}

class BasPanel {
    private options: IPanelOptions;
    private auxiliary: Auxiliary;
    private container: JQuery;
    private editorIndex = 0;
    private editorData: [string, number, number, number, string][] | [string, number, number, number][]; // [BAS代码, 弹幕出现时间, 测试弹幕常驻, 状态(1 未发送 2 已发送 3 已修改), 弹幕id（可选）]
    private config: IConfig;
    private template!: ITemplate;
    private checkbox: any = {};
    private editor!: IEditor;
    private editorSwitch = 0;
    private storage: any = {};
    private inited = false;
    private stimeInput!: JQuery<HTMLElement>;
    // private playerWidth!: number;
    // private playerHeight!: number;
    // private auxiliaryWidth: number;
    // private basScrollbar: any;
    // private playerMode!: number;
    private uiLists: { [key: string]: any } = {}; // 存储按钮，关闭弹幕时  置灰按钮

    private spinner: any = {};
    private showing = false;

    constructor(auxiliary: Auxiliary, options: IPanelOptions) {
        this.auxiliary = auxiliary;
        this.options = options;
        this.container = options.panel;

        const fistStorage = this.getLocalStorage();
        this.editorData = fistStorage.data;
        this.storage = fistStorage.storage;
        // this.auxiliaryWidth = this.auxiliary.container.width()!;

        this.config = {
            color: 16777215,
            size: 36,
            duration: 4.5,
            text: '',
            x: 0,
            y: 0,
            isPercent: 0, // 是否按百分比选取
            testKeep: false,
        };
        this.globalEvents();
    }

    private globalEvents() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RELOAD, (e: Event) => {
            if (this.inited) {
                const fistStorage = this.getLocalStorage();
                this.editorData = fistStorage.data;
                this.storage = fistStorage.storage;
                this.switchEditorTab(0);

                let tabItem = '';
                for (let i = 0; i < this.editorData.length; i++) {
                    tabItem += `<li ${i === this.editorIndex ? 'class="bas-danmaku-editor-tab-active"' : ''
                        } data-index="${i}"><span class="bas-danmaku-editor-tab-status" data-status="${this.editorData[i][3]
                        }"></span><span class="bas-danmaku-editor-tab-text">${i + 1
                        }</span><span class="bas-danmaku-editor-tab-close">－</span></li>`;
                }
                this.template.editorTab.find('.mCSB_container').html(tabItem);
            }
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, () => {
            this.resize();
        });
        this.auxiliary.directiveManager.on(PD.VI_RECT_CHANGE.toString(), (e, received: IReceived) => {
            // if (received['data']['w'] === 320) {
            //     return;
            // }
            // this.playerWidth = received['data']['w'];
            // this.playerHeight = received['data']['h'];
            // this.playerMode = received['data']['mode'];
            this.resize();
            // this.container.css('top', received['data']['y'] + 'px');
        });
        this.auxiliary.directiveManager.on(PD.BDM_MOUSE_POS_CHANGE.toString(), (e, received: IReceived) => {
            this.template.positonText.html(
                `x = ${(received['data']['x'] * 100).toFixed(1)}% y = ${(received['data']['y'] * 100).toFixed(1)}%`,
            );
        });
    }

    private snippet() {
        const prefix = this.options.prefix;
        return `
        <div class="${prefix}-panel-title advanced-danmaku-group bas-danmaku-title">
	<span class="${prefix}-panel-title-text">BAS弹幕</span>
	<i class="${prefix}-iconfont ${prefix}-panel-back icon-close"></i>
</div>
<div class="${prefix}-panel-title advanced-danmaku-group bas-danmaku-controller">
	<div class="bas-danmaku-controller-line">
		<span class="adv-danmaku-btn-span bas-danmaku-new-tab-btn">新建标签页</span>
		<span class="adv-danmaku-btn-span adv-danmaku-help-btn">帮助</span>
		<span class="adv-danmaku-btn-span adv-danmaku-clear-btn">清屏</span>
		<span class="adv-danmaku-btn-span adv-danmaku-test-btn">测试效果</span>
		<span class="adv-danmaku-checkbox-span bas-danmaku-test-keep"><input type="checkbox" data-ui-type="checkbox" data-origin="0"></span>
		<span class="adv-danmaku-btn-span adv-danmaku-send-btn">发送弹幕</span>
	</div>
</div>
<div class="advanced-danmaku-group bas-danmaku-editor-wrap">
	<ul class="bas-danmaku-editor-tab"></ul>
	<div class="bas-danmaku-setting">
		<div class="bas-danmaku-setting-item"><span class="content-span">弹幕出现时间:</span><input type="text" class="adv-danmaku-start-time disabled" ><span class="content-span">毫秒</span><span class="adv-danmaku-checkbox-span adv-danmaku-send-time "><input type="checkbox" class="adv-danmaku-current-time" data-ui-type="checkbox" data-origin="1" /></span></div>
		<div class="bas-danmaku-setting-item"><span class="adv-danmaku-btn-span bas-danmaku-color-btn">颜色拾取</span><span class="adv-danmaku-text-color content-span">color = 0xffffff</span></div>
		<div class="bas-danmaku-setting-item"><span class="adv-danmaku-btn-span adv-danmaku-pick-path-btn">坐标拾取</span><span class="adv-danmaku-text-pos content-span">x = 0 y = 0</span></div>
	</div>
	<div class="bas-danmaku-editor" id="bas-editor"></div>
</div>`;
    }

    private initialize() {
        if (!this.inited) {
            this.inited = true;

            const panel = this.container;

            panel.append(this.snippet());

            let tabItem = '';
            for (let i = 0; i < this.editorData.length; i++) {
                tabItem += `<li ${i === this.editorIndex ? 'class="bas-danmaku-editor-tab-active"' : ''
                    } data-index="${i}"><span class="bas-danmaku-editor-tab-status" data-status="${this.editorData[i][3]
                    }"></span><span class="bas-danmaku-editor-tab-text">${i + 1
                    }</span><span class="bas-danmaku-editor-tab-close">－</span></li>`;
            }
            panel.find('.bas-danmaku-editor-tab').append(tabItem);

            this.template = {
                panel: panel,
                container: panel.find('.bas-danmaku-editor-wrap'),
                colorBtn: panel.find('.bas-danmaku-color-btn'),
                colorText: panel.find('.adv-danmaku-text-color'),
                positonText: panel.find('.adv-danmaku-text-pos'),

                posPicker: panel.find('.adv-danmaku-stoke'),
                stime: panel.find('.adv-danmaku-start-time'),
                ctime: panel.find('.adv-danmaku-current-time'),
                text: panel.find('.adv-danmaku-text'),

                pickerBtn: panel.find('.adv-danmaku-pick-path-btn'),
                clearBtn: panel.find('.adv-danmaku-clear-btn'),
                testBtn: panel.find('.adv-danmaku-test-btn'),
                sendBtn: panel.find('.adv-danmaku-send-btn'),
                newTabBtn: panel.find('.bas-danmaku-new-tab-btn'),
                // editorWrap: panel.find('.bas-danmaku-editor-tab-wrap'),
                editorTab: panel.find('.bas-danmaku-editor-tab'),
                helpBtn: panel.find('.adv-danmaku-help-btn'),
                testKeepBtn: panel.find('.bas-danmaku-test-keep input'),
            };

            this.initializeSpinner();

            this.auxiliary.directiveManager.sender(WD.BDM_DISPLAY_PANEL, null, (received?: IReceived) => {
                // this.playerWidth = received!['data']['w'];
                // this.playerHeight = received!['data']['h'];
                this.resize();
            });

            import(/* webpackChunkName: "ace" */ '@jsc/ace').then((s) => {
                this.initEditor();
            });

            if (!this.editor) {
                this.disable();
            }

            this.bindEvents();
        }
    }

    initEditor() {
        if (!this.inited) {
            return;
        }
        if (!this.editor && window['ace']) {
            this.editor = window['ace']['edit']('bas-editor');
            this.editor['setOptions']({
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true,
            });
            this.editor['getSession']()['setMode']('ace/mode/bas');
            this.editor['setTheme']('ace/theme/crimson_editor');
            this.editor['$blockScrolling'] = Infinity;
            this.editorSetValue(this.editorData[this.editorIndex][0]);
            this.setStime();
            this.checkbox['testKeep'].value(this.editorData[this.editorIndex][2] ? 1 : 0);
            this.editor['clearSelection']();
            this.editor['on']('change', (data) => {
                if (!this.editorSwitch) {
                    this.editorData[this.editorIndex][0] = this.editor['getValue']();
                    if (this.editorData[this.editorIndex][3] === 0 && this.editorData[this.editorIndex][0]) {
                        this.setStatus(1);
                    } else if (this.editorData[this.editorIndex][3] === 1 && !this.editorData[this.editorIndex][0]) {
                        this.setStatus(0);
                    } else if (this.editorData[this.editorIndex][3] === 2) {
                        this.setStatus(3);
                    }
                    this.setLocalStorage();
                } else {
                    this.editorSwitch--;
                }
            });
            this.enable();
        }
    }

    private editorSetValue(value: string) {
        this.editorSwitch = 2;
        if (!value) {
            this.editorSwitch--;
        }
        if (!this.editor['getValue']()) {
            this.editorSwitch--;
        }
        this.editor['setValue'](value);
        this.setSendButtonText();
    }

    private initializeSpinner() {
        const that = this;
        this.template.editorTab.mCustomScrollbar({
            axis: "y",
            scrollInertia: 100,
            autoHideScrollbar: true,
        });

        for (const k in this.template) {
            if (this.template.hasOwnProperty(k) && this.template[k].hasClass('adv-danmaku-spinner-span')) {
                const spinner = this.template[k];
                const key = spinner.attr('data-key');
                that.spinner[key!] = new Spinner(spinner, {
                    value: parseFloat(spinner.attr('data-value')!),
                    min: parseInt(spinner.attr('data-min')!, 10),
                    max: parseInt(spinner.attr('data-max')!, 10),
                    step: parseFloat(spinner.attr('data-step')!),
                });
                that.spinner[key!].on('change', (e: any) => {
                    that.setConfig(key!, e.value);
                });
            }
        }

        this.checkbox['testKeep'] = new Checkbox(this.template.testKeepBtn, {
            // value: false,
            label: '测试弹幕常驻',
        });
        this.checkbox['testKeep'].on('change', (e: any) => {
            this.editorData[this.editorIndex][2] = e.value ? 1 : 0;
            this.setLocalStorage();
        });

        this.checkbox['ctime'] = new Checkbox(this.template.ctime, {
            checked: true,
            label: '当前时间',
        });
        this.checkbox['ctime'].on('change', (e: any) => {
            if (!e.value) {
                this.stimeInput.removeClass("disabled");
            } else {
                this.stimeInput.val("").addClass("disabled");
                this.setStime(-1, this.editorIndex, true);
            }
        });

        new Button(this.template.clearBtn, {
            type: 'small',
            click: () => {
                this.auxiliary.directiveManager.sender(WD.BDM_CLEAR_CANVAS, null, () => {
                    new Tooltip({
                        name: 'testSuccess',
                        target: this.container,
                        position: 'center-center',
                        text: '清屏成功',
                    });
                });
            }
        });

        new Button(this.template.pickerBtn, {
            type: 'small',
            click: () => {
                this.auxiliary.directiveManager.sender(WD.BDM_START_POS_PICKUP, null);
            }
        });

        this.uiLists.testBtn = new Button(this.template.testBtn, {
            type: 'small',
        });
        this.uiLists.testBtn.on('click', () => {
            console.log('testBtn clicked');
            this.onTest();
        });

        this.uiLists.sendBtn = new Button(this.template.sendBtn, {
            type: 'small',
        });
        this.uiLists.sendBtn.on('click', () => {
            console.log('send Btn clicked');
            this.onSend();
        });

        new Button(this.template.newTabBtn, {
            type: 'small',
            click: () => {
                this.addEditorTab();
            }
        });

        new Button(this.template.helpBtn, {
            type: 'small',
            click: () => {
                window.open('https://bilibili.github.io/bas/');
            }
        });

        new Button(this.template.colorBtn, {
            type: 'small',
        });

        const cp = new ColorPicker(this.auxiliary.player, this.template.panel, {
            triggerBtn: this.template.colorBtn,
            prefix: this.options.prefix,
            onChange: function (config: IConfig) {
                that.setConfig('color', config['color']);
                that.template.colorText.html(`color = 0x${config['value']}`);
            },
        });
        cp.enable(2);

        const colorClipboard = new Clipboard(this.template.colorText[0], {
            text: function (trigger) {
                return trigger.innerHTML;
            },
        });
        colorClipboard.on('success', function (e) {
            new Tooltip({
                name: 'copySuccess',
                target: that.template.container,
                position: 'center-center',
                text: '复制成功',
            });
        });

        const positonClipboard = new Clipboard(this.template.positonText[0], {
            text: function (trigger) {
                return trigger.innerHTML.replace(' y =', '\ny =');
            },
        });
        positonClipboard.on('success', function (e) {
            new Tooltip({
                name: 'copySuccess',
                target: that.template.container,
                position: 'center-center',
                text: '复制成功',
            });
        });

        // 弹幕关闭，禁用发送按钮
        if (this.auxiliary.list?.dmClosed) {
            this.dmClose(true);
        }
    }

    private setStime(time = this.editorData[this.editorIndex][1], index = this.editorIndex, dataOnly?: boolean) {
        if (index === this.editorIndex && !dataOnly) {
            if (time >= 0) {
                this.checkbox['ctime'].value(false);
                this.stimeInput.val(time);
            } else {
                this.checkbox['ctime'].value(true);
            }
        }
        this.editorData[index][1] = time;
        this.setLocalStorage();
    }

    private getStime() {
        if (this.checkbox['ctime'].value()) {
            return -1;
        } else {
            return parseFloat(<string>this.stimeInput.val());
        }
    }

    private setStatus(status: number, index = this.editorIndex) {
        this.editorData[index][3] = status;
        this.container.find('.bas-danmaku-editor-tab-status')[index].dataset.status = status + '';
        this.setSendButtonText();
        this.setLocalStorage();
    }

    private setSendButtonText() {
        if (this.editorData[this.editorIndex][3] === 3) {
            this.template.sendBtn.text('修改弹幕');
        } else {
            this.template.sendBtn.text('发送弹幕');
        }
    }

    private bindEvents() {
        const prefix = this.options.prefix;
        const panel = this.container;

        panel.find('.' + prefix + '-panel-back').on('click', () => {
            this.hide();
        });

        panel.find('.' + prefix + '-panel-close').on('click', () => {
            this.hide();
        });

        // this.stimeInput = new Input(this.template.stime[0], {
        //     disabled: true,
        //     type: 'number',
        // });
        this.stimeInput = this.template.stime;
        this.stimeInput.on('input', (e: any) => {
            let result;
            if (e.value.indexOf(':') > 0) {
                result = parseFloat(e.value.split(':')[0]) * 60 + parseFloat(e.value.split(':')[1]);
            } else {
                result = parseFloat(e.value);
            }

            if (!isNaN(result) && 'number' === typeof result) {
                this.setStime(result, this.editorIndex, true);
            }
        });

        this.template.editorTab.on('click', (e) => {
            if (e.target.tagName.toUpperCase() === 'LI') {
                if (parseInt(e.target.dataset.index!, 10) >= 0) {
                    this.switchEditorTab(parseInt(e.target.dataset.index!, 10));
                }
            } else if (e.target.classList.contains('bas-danmaku-editor-tab-close')) {
                this.removeEditorTab(e.target.parentElement!);
            }
        });
    }
    dmClose(close: boolean) {
        if (this.inited) {
            if (close) {
                this.uiLists.testBtn.disable();
                this.uiLists.sendBtn.disable();
            } else {
                this.uiLists.testBtn.enable();
                this.uiLists.sendBtn.enable();
            }
        }
    }
    show() {
        if (!this.inited) {
            this.initialize();
        }

        this.container.show();
        this.showing = true;
        if (this.auxiliary.player.iframe) {
            const height = this.template.basDanmakuPane.height()!;
            this.auxiliary.player.container.css("height", "calc(100% - " + height + "px)");
            this.auxiliary.player.$iframe?.css("height", this.auxiliary.player.$iframe.height()! + height + "px");
        }
    }

    hide() {
        if (!this.inited) {
            return;
        }

        this.container.hide();
        this.showing = false;
        // this.auxiliary.template.wraplist.removeClass('bas-mask');
        if (this.auxiliary.player.iframe) {
            this.auxiliary.player.container.css("height", "");
            this.auxiliary.player.$iframe?.css("height", "");
        }
    }

    private getData(): IDm {
        let dm: IDm;

        let currentTime;
        this.auxiliary.directiveManager.sender(WD.VI_RETRIEVE_DATA, null, (received?: IReceived) => {
            currentTime = received!['data']['currentTime'];
        });

        const time = this.getStime() >= 0 ? this.getStime() / 1000 : currentTime;

        dm = {
            stime: time!,
            mode: 9,
            size: this.config['size'],
            color: this.config['color'],
            date: 0,
            class: 0,
            uid: 0,
            dmid: '0',
            text: this.editor['getValue'](),
        };

        return dm;
    }

    private setConfig(key: any, value?: any) {
        if (key instanceof Array) {
            key.forEach((k) => {
                this.setConfig(k);
            });
        } else {
            if (key && (value || value >= 0) && this.config.hasOwnProperty(key)) {
                this.config[key] = value;
            } else if (key instanceof Object && key['key'] && key.hasOwnProperty('value')) {
                this.config[key['key']] = key['value'];
            }
        }

        return this;
    }

    private onTest() {
        if (this.editor) {
            if (!this.editor['getValue']()) {
                new Tooltip({
                    name: 'emptyText',
                    target: this.template.container,
                    position: 'center-center',
                    text: '请输入内容',
                });
            } else {
                setTimeout(() => {
                    console.log('testing...');
                    const dm = this.getData();
                    dm.stime = this.getStime() >= 0 ? this.getStime() / 1000 : -1;
                    this.auxiliary.directiveManager.sender(
                        WD.BDM_PREVIEW_DANMAKU,
                        {
                            dm: dm,
                            test: !this.checkbox['testKeep'].value(),
                        },
                        (received?: IReceived) => {
                            if (received!['data']['code'] === 0) {
                                new Tooltip({
                                    name: 'testSuccess',
                                    target: this.template.container,
                                    position: 'center-center',
                                    text: '测试弹幕发射成功',
                                });
                            } else {
                                new Tooltip({
                                    name: 'formatError',
                                    target: this.template.container,
                                    position: 'center-center',
                                    text: '弹幕格式错误: ' + received!['data']['message'],
                                });
                            }
                        },
                    );
                }, 0);
            }
        }
    }

    private onSend() {
        if (this.editor) {
            if (!this.editor['getValue']()) {
                new Tooltip({
                    name: 'emptyText',
                    target: this.template.container,
                    position: 'center-center',
                    text: '请输入内容',
                });
            } else {
                if (this.editorData[this.editorIndex][3] === 2) {
                    // 已发送，阻止发送
                    new Tooltip({
                        name: 'basError',
                        target: this.template.container,
                        position: 'center-center',
                        text: '发送错误：请勿重复发送，请编辑后重新发送或新建标签页',
                    });
                } else {
                    const dm = this.getData();
                    if (dm) {
                        const data = {
                            type: 1, // 主题类型，1：视频
                            oid: this.auxiliary.config.cid, // 主题id
                            msg: dm.text, // 弹幕内容
                            aid: this.auxiliary.config.aid, // 稿件id
                            bvid: this.auxiliary.config.bvid, // 稿件bvid
                            progress: Math.ceil(dm.stime * 1000), // 弹幕位于视频中的时间点（单位毫秒）
                            color: this.config['color'], // 弹幕颜色
                            fontsize: this.config['size'], // 字体大小
                            pool: 2, // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
                            mode: 9, // 弹幕模式：1,4,5,6,7,8,9
                            rnd: this.options.pid, // 发送时带的随机数
                            plat: 1, // 来源平台
                        };
                        const isNew = this.editorData[this.editorIndex][3] === 1;
                        this.auxiliary.directiveManager.sender(
                            WD.BDM_SEND_DANMAKU,
                            {
                                dm: dm,
                                data: data,
                                isNew: isNew,
                                dmids: this.editorData[this.editorIndex][4],
                            },
                            (received?: IReceived) => {
                                if (received!['data']['code'] === 0) {
                                    new Tooltip({
                                        name: 'testSuccess',
                                        target: this.template.container,
                                        position: 'center-center',
                                        text: isNew ? '发送成功' : '修改成功：可能会有短时间延迟',
                                    });
                                    this.editorData[this.editorIndex][4] = received!['data']['dmid'] + '';
                                } else {
                                    new Tooltip({
                                        name: 'formatError',
                                        target: this.template.container,
                                        position: 'center-center',
                                        text: received!['data']['message'],
                                    });
                                }
                                if (received!['data']['status']) {
                                    this.setStatus(received!['data']['status']);
                                }
                            },
                        );
                    }
                }
            }
        }
    }

    delSendedDanmaku(dmid: string) {
        if (!this.inited) {
            this.initialize();
        }

        const index = (<any>this.editorData).findIndex((item: any) => item[4] === String(dmid));
        if (index >= 0) {
            this.setStatus(1, index);
        }
    }

    resize() {
        if (this.inited) {
            this.container.css(
                'width',
                this.auxiliary.player.template.container.outerWidth()!,
            );
            // this.container.css('top', this.playerHeight);
            if (this.auxiliary.player.iframe && this.showing) {
                if ($(this.auxiliary.window.document).find("body").hasClass("widescreen")) {
                    this.auxiliary.player.$iframe?.css("height", "1240px")
                } else {
                    this.auxiliary.player.$iframe?.css("height", "1112px")
                }
            }
        } else {
            this.container.css("width", this.auxiliary.player.container.outerWidth()!);
        }
    }

    private setLocalStorage() {
        if (!(this.editorData.length === 1 && this.editorData[0][0] === '')) {
            this.storage[this.auxiliary.config.cid] = this.editorData;
            return setLocalSettings('basEditorData', JSON.stringify(this.storage));
        }
    }

    private getLocalStorage() {
        const local = getLocalSettings('basEditorData');
        if (local) {
            try {
                const storage = JSON.parse(local);
                let data = [];
                if (storage[this.auxiliary.config.cid]) {
                    data = storage[this.auxiliary.config.cid];
                } else if (storage['data']) {
                    data = storage['data'].map((item: string) => [item, -1, 0, 0]);
                    delete storage['data'];
                }
                if (!data.length || Object.prototype.toString.call(data) !== '[object Array]') {
                    data = [['', -1, 0, 0]];
                }
                data = data.map((item: any[]) => {
                    // fix empty
                    if (!item[0]) {
                        item[0] = '';
                    }
                    if (!item[1]) {
                        item[1] = -1;
                    }
                    if (!item[2]) {
                        item[2] = 0;
                    }
                    if (!item[3]) {
                        // 0 空白, 1 未发送, 2 已发送, 3 发送后已修改
                        item[3] = 0;
                    }
                    // fix status
                    if (item[0] === '') {
                        item[3] = 0;
                    } else if (!item[4]) {
                        item[3] = 1;
                    }
                    return item;
                });
                return {
                    storage: storage,
                    data: data,
                };
            } catch (e) {
                return {
                    storage: {},
                    data: [['', -1, 0, 0]],
                };
            }
        } else {
            return {
                storage: {},
                data: [['', -1, 0, 0]],
            };
        }
    }

    private switchEditorTab(index: number) {
        if (this.editor) {
            const items = this.template.editorTab.find('li');
            items.eq(this.editorIndex).removeClass('bas-danmaku-editor-tab-active');
            this.editorIndex = parseInt(index + '', 10);
            items.eq(this.editorIndex).addClass('bas-danmaku-editor-tab-active');
            this.editorSetValue(this.editorData[this.editorIndex][0]);
            this.setStime();
            this.checkbox['testKeep'].value(this.editorData[this.editorIndex][2] ? 1 : 0);
            this.editor['clearSelection']();
        }
    }

    private addEditorTab() {
        if (this.editor) {
            const addItem = this.template.editorTab.find('li').last();
            this.editorData[this.editorData.length] = ['', -1, 0, 0];
            addItem.after(
                `<li data-index="${this.editorData.length - 1
                }"><span class="bas-danmaku-editor-tab-status" data-status="0"></span><span class="bas-danmaku-editor-tab-text">${this.editorData.length
                }</span><span class="bas-danmaku-editor-tab-close">－</span></li>`,
            );
            this.setLocalStorage();
        }
    }

    private removeEditorTab(element: HTMLElement) {
        if (this.editor && this.editorData.length > 1) {
            const index = parseInt(element.dataset.index!, 10);
            this.editorData.splice(index, 1);

            if (this.editorIndex > index) {
                this.editorIndex--;
            } else if (this.editorIndex === index) {
                if (this.editorIndex !== 0) {
                    this.editorIndex--;
                }
                this.editorSetValue(this.editorData[this.editorIndex][0]);
                this.setStime();
                this.editor['clearSelection']();
            }

            let tabItem = '';
            for (let i = 0; i < this.editorData.length; i++) {
                tabItem += `<li ${i === this.editorIndex ? 'class="bas-danmaku-editor-tab-active"' : ''
                    } data-index="${i}"><span class="bas-danmaku-editor-tab-status" data-status="${this.editorData[i][3]
                    }"></span><span class="bas-danmaku-editor-tab-text">${i + 1
                    }</span><span class="bas-danmaku-editor-tab-close">－</span></li>`;
            }
            this.template.editorTab.html(tabItem);

            this.setLocalStorage();
        }
    }

    private disable() {
        this.template.panel.addClass('mask');
    }

    private enable() {
        this.template.panel.removeClass('mask');
    }
}

export default BasPanel;
