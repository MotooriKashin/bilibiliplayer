import Tooltip from '../plugins/tooltip';
import STATE from './state';
import Modal from '../plugins/modal';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import ColorPicker from './color-picker';
import { Spinner } from '../ui/spinner';
import { Checkbox } from '../ui/checkbox';
import { Selectmenu } from '../ui/selectmenu';
import { Button } from '../ui/button';
import { colorToDecimal } from '@shared/utils';

interface IPanelOptions {
    panel: JQuery;
    onTest?: Function;
}

interface IPath {
    x: number;
    y: number;
}

interface ITextData {
    dmid: string;
    mode: number;
    size: number;
    date: number;
    class: number;
    stime: number;
    color: number;
    uid: string;
    text: string | any[];
    mid?: string;
    uname?: string;
}

interface IConfig {
    color: number;
    size: number;
    family: string;
    stroke: number;
    duration: number;
    sOpacity: number;
    eOpacity: number;
    zRotate: number;
    yRotate: number;
    aTime: number;
    aDelay: number;
    linearSpeedUp: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    path: any;
    text: string;
    stime: number;
    aWay: number; // 运动方式 1: 起始位置, 2:路径跟随
    isPercent: boolean; // 是否按百分比选取
    startFollow: number; // 开始坐标是否跟随拾取
    endFollow: number; // 结束坐标是否跟随拾取
    ctime: boolean;
    [key: string]: any;
}

class AdvPanel {
    private prefix: string;
    private auxiliary: Auxiliary;
    private options: any;
    private pathArr: string[];
    private path: string;
    private colorPicker!: ColorPicker;
    private config: IConfig = {
        color: 16777215,
        size: 36,
        family: 'SimHei',
        stroke: 1,
        duration: 4.5,
        sOpacity: 1,
        eOpacity: 1,
        zRotate: 0,
        yRotate: 0,

        aTime: 500,
        aDelay: 0,
        linearSpeedUp: 1,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        path: [],

        text: '',
        stime: 0,

        aWay: 1, // 运动方式 1: 起始位置, 2:路径跟随
        isPercent: false, // 是否按百分比选取
        startFollow: 0, // 开始坐标是否跟随拾取
        endFollow: 0, // 结束坐标是否跟随拾取
        ctime: false,
    };
    private spinner: any = {};
    private checkbox: any = {};
    private selectmemu: any = {};
    private inited = false;
    private stimeInput!: JQuery<HTMLElement>;
    private textInput!: JQuery<HTMLElement>;
    private status: boolean;
    private pickStatus!: boolean;
    private userStatus: any;
    private modal!: Modal;
    private isUP: boolean;
    private vertificationStatus: number;
    // private advScrollbar: any;
    private vertificationState = {
        needBuy: -1,
        init: 0,
        confirm: 1,
        verification: 2,
        reject: 3,
    };
    private template!: { [key: string]: JQuery; };
    private uiLists: { [key: string]: any } = {}; // 存储按钮，关闭弹幕时  置灰按钮
    private advContainer?: JQuery<HTMLElement>;

    constructor(auxiliary: Auxiliary, options: IPanelOptions) {
        this.auxiliary = auxiliary;
        this.options = options;
        this.prefix = auxiliary.prefix;
        this.pathArr = [];
        this.path = '';
        this.vertificationStatus = this.vertificationState.needBuy;
        this.status = false; // 是否能发高级弹幕
        this.isUP = false;
        this.options.onTest = (obj: any) => {
            // 217005
            this.auxiliary.directiveManager.sender(WD.ADM_PREVIEW_DANMAKU, obj);
        };
        this.beforeInit();
        // this.init();
        this.globalEvents();
    }
    private globalEvents() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, () => {
            this.destroy();
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, () => {
            if (this.auxiliary.auxiliaryUI.showPanelList.indexOf(STATE.PANEL.ADVDANMAKU) > -1) {
                this.update();
            }
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_CHANGE, () => {
            if (this.auxiliary.auxiliaryUI.showPanelList.indexOf(STATE.PANEL.ADVDANMAKU) > -1) {
                this.update();
            }
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RELOAD, () => {
            if (this.inited) {
                this.checkVerification();
            }
        });
        // 117001
        this.auxiliary.directiveManager.on(PD.ADM_MOUSE_POS_CHANGE.toString(), (e, received: IReceived) => {
            if (received['data']['target'] === 'adv') {
                this.updatePosition(received['data']);
            }
        });
        // 117002
        this.auxiliary.directiveManager.on(PD.ADM_CLOSE_POS_PICKUP.toString(), (e, received: IReceived) => {
            if (received['data']['target'] === 'adv') {
                this.updatePath(received['data'], (data: any) => {
                    this.auxiliary.directiveManager.responder(received, data);
                });
            }
        });
    }
    private snippet(): string {
        const prefix = this.prefix;
        return `
        <div class="${prefix}-advanced-danmaku-control-container">
	<div class="advanced-danmaku-group adv-danmaku-base-info">
		<div class="advanced-danmaku-title">基础信息设定</div>
		<div class="advanced-danmaku-content">
			<div class="advanced-danmaku-content-row">
				<span class="content-span">弹幕颜色:</span> <span class="adv-danmaku-color"><i class="${prefix}-iconfont ${prefix}-iconfont-color icon-24color "></i></span><span class="content-span content-span-margin-left">字体大小:</span><span class="adv-danmaku-spinner-span adv-danmaku-size" data-value="36" data-min="10" data-max="127" data-step="1" data-key="size" data-origin="36"></span>
			</div>
			<div class="advanced-danmaku-content-row">
				<span class="content-span">文本字体:</span><span class="adv-danmaku-select-span adv-danmaku-family"></span> <span class="adv-danmaku-checkbox-span"><input type="checkbox" class=" adv-danmaku-stroke" data-ui-type="checkbox" checked data-origin="1"/></span>
			</div>
			<div class="advanced-danmaku-content-row">
				<span class="content-span">生存时间:</span><span class="adv-danmaku-spinner-span adv-danmaku-duration" data-value="4.5" data-min="0" data-max="10" data-step="0.1" data-key="duration" data-origin="4.5"></span><span class="content-span content-span-margin-left">衰弱透明度:</span><span class="adv-danmaku-spinner-span adv-danmaku-start-opacity" data-value="1" data-min="0" data-max="1" data-step=".01" data-key="sOpacity" data-origin="1"></span>~<span class="adv-danmaku-spinner-span adv-danmaku-end-opacity" data-value="1" data-min="0" data-max="1" data-step="0.01" data-key="eOpacity" data-origin="1"></span>
			</div>
			<div class="advanced-danmaku-content-row">
				<span class="content-span">Z轴:</span><span class="adv-danmaku-spinner-span adv-danmaku-z-rotate" data-value="0" data-min="0" data-max="360" data-step="1" data-key="zRotate" data-origin="0"></span><span class="content-span content-span-margin-left">Y轴:</span><span class="adv-danmaku-spinner-span adv-danmaku-y-rotate" data-value="0" data-min="0" data-max="360" data-step="1" data-key="yRotate" data-origin="0"></span>
			</div>
		</div>
	</div>
	<div class="advanced-danmaku-group">
		<div class="advanced-danmaku-title">运动信息设定</div>
		<div class="advanced-danmaku-content">
			<div class="advanced-danmaku-content-row adv-danmaku-linear-speed-up-row clearfix">
				<span class="content-span">运动耗时:</span><span class="adv-danmaku-spinner-span adv-danmaku-animation-time" data-value="500" data-min="0" data-max="10000" data-step="100" data-key="aTime" data-origin="500"></span><span class="content-span content-span-margin-left">延迟时间(毫秒):</span><span class="adv-danmaku-spinner-span adv-danmaku-animation-delay" data-value="0" data-min="0" data-max="10000" data-step="100" data-key="aDelay" data-origin="0"></span> <span class="adv-danmaku-checkbox-span adv-danmaku-display-block"><input type="checkbox" class="adv-danmaku-linear-speed-up" data-ui-type="checkbox" checked data-origin="1"/></span>
			</div>
			<div class="advanced-danmaku-content-row">
				<span class="content-span">运动方式</span><label for="bp_adv_danmaku_animation_way_1"><input type="radio" name="adv-danmaku-animation-way" id="bp_adv_danmaku_animation_way_1" data-index="0" checked class="adv-danmaku-animation-way">起始位置</label><label for="bp_adv_danmaku_animation_way_2"><input type="radio" name="adv-danmaku-animation-way" id="bp_adv_danmaku_animation_way_2" data-index="1" class="adv-danmaku-animation-way">路径跟随</label>
			</div>
			<div class="advanced-danmaku-content-row adv-danmaku-animation-way-row adv-danmaku-pos-row">
				<span class="content-span">起始坐标</span><span class="content-span">X:</span><span class="adv-danmaku-spinner-span adv-danmaku-start-x" data-value="0" data-min="0" data-max="0" data-step="1" data-key="startX" data-origin="0"></span><span class="content-span content-span-margin-left">Y:</span><span class="adv-danmaku-spinner-span adv-danmaku-start-y" data-value="0" data-min="0" data-max="0" data-step="1" data-key="startY" data-origin="0"></span><span class="adv-danmaku-checkbox-span"><input type="checkbox" class="adv-danmaku-start-path-follow" data-ui-type="checkbox" data-type="start" data-origin="0" /></span>
			</div>
			<div class="advanced-danmaku-content-row adv-danmaku-animation-way-row adv-danmaku-pos-row">
				<span class="content-span">结束坐标</span><span class="content-span">X:</span><span class="adv-danmaku-spinner-span adv-danmaku-end-x" data-value="0" data-min="0" data-max="0" data-step="1" data-key="endX" data-origin="0"></span><span class="content-span content-span-margin-left">Y:</span><span class="adv-danmaku-spinner-span adv-danmaku-end-y" data-value="0" data-min="0" data-max="0" data-step="1" data-key="endY" data-origin="0"></span><span class="adv-danmaku-checkbox-span"><input type="checkbox" class=" adv-danmaku-end-path-follow" data-ui-type="checkbox"  data-type="end" data-origin="0" /></span>
			</div>
			<div class="advanced-danmaku-content-row advanced-danmaku-float-left clearfix">
				<textarea class="adv-danmaku-text"></textarea>
				<div class="adv-danmaku-float-right">
					<span class="adv-danmaku-btn-span adv-danmaku-pick-path-btn">拾取定位</span>
					<span class="adv-danmaku-checkbox-span"><input type="checkbox" class="adv-danmaku-percent" data-ui-type="checkbox" data-origin="0"/></span>
					<span class="adv-danmaku-btn-span adv-danmaku-test-btn">测试效果</span>
				</div>
			</div>
			<div class="advanced-danmaku-content-row">
				<span class="content-span">弹幕出现时间:</span><input type="text" class="adv-danmaku-start-time disabled" ><span class="adv-danmaku-time">单位:秒</span><span class="adv-danmaku-checkbox-span adv-danmaku-send-time "><input type="checkbox" class="adv-danmaku-current-time" data-ui-type="checkbox" data-origin="1" /></span> <span class="adv-danmaku-btn-span adv-danmaku-send-btn">发送弹幕</span>
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
            if (that.inited) {
                that.checkVerification();
            }
        });
        this.modal = new Modal({
            title: '高级弹幕',
            prefix: that.prefix,
            info: '启用本视频的特殊弹幕需要支付2硬币,并且要经过UP主的同意确认。是否要购买?',
            btns: [
                {
                    type: 'cancel',
                    text: '否',
                },
                {
                    type: 'submit',
                    text: '使用硬币',
                    click() {
                        that.buyVerification();
                    },
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
            const panel = <JQuery<HTMLElement>>this.options.panel;
            panel.append(this.advContainer = $(this.snippet()));
            this.template = {
                panel: panel,
                container: panel.find('.' + this.prefix + '-advanced-danmaku-control-container'),
                color: panel.find('.adv-danmaku-color'),
                size: panel.find('.adv-danmaku-size'),
                family: panel.find('.adv-danmaku-family'),
                stroke: panel.find('.adv-danmaku-stroke'),
                duration: panel.find('.adv-danmaku-duration'),
                startOpacity: panel.find('.adv-danmaku-start-opacity'),
                endOpacity: panel.find('.adv-danmaku-end-opacity'),
                zRotate: panel.find('.adv-danmaku-z-rotate'),
                yRotate: panel.find('.adv-danmaku-y-rotate'),

                animationTime: panel.find('.adv-danmaku-animation-time'),
                animationDelay: panel.find('.adv-danmaku-animation-delay'),
                linearSpeedUp: panel.find('.adv-danmaku-linear-speed-up'),
                animationWay: panel.find('.adv-danmaku-animation-way'),
                // animationWay1: panel.find('.adv-danmaku-animation-way-1'),
                // animationWay2: panel.find('.adv-danmaku-animation-way-2'),
                animationRows: panel.find('.adv-danmaku-pos-row'),
                // pickRows: panel.find('.adv-danmaku-pick-row'),
                startX: panel.find('.adv-danmaku-start-x'),
                startY: panel.find('.adv-danmaku-start-y'),
                endX: panel.find('.adv-danmaku-end-x'),
                endY: panel.find('.adv-danmaku-end-y'),
                startPathFollow: panel.find('.adv-danmaku-start-path-follow'),
                endPathFollow: panel.find('.adv-danmaku-end-path-follow'),
                text: panel.find('.adv-danmaku-text'),

                percent: panel.find('.adv-danmaku-percent'),
                posPicker: panel.find('.adv-danmaku-stoke'),
                stime: panel.find('.adv-danmaku-start-time'),
                ctime: panel.find('.adv-danmaku-current-time'),
                tooltip: panel.find('.adv-danmaku-time'),

                pickerBtn: panel.find('.adv-danmaku-pick-path-btn'),
                testBtn: panel.find('.adv-danmaku-test-btn'),
                sendBtn: panel.find('.adv-danmaku-send-btn'),

                advDanmakuTab: panel.find('.' + this.prefix + '-panel-tab-adv-danmaku'),
                codeDanmakuTab: panel.find('.' + this.prefix + '-panel-tab-code-danmaku'),
                basDanmakuTab: panel.find('.' + this.prefix + '-panel-tab-bas-danmaku'),
            };

            this.updateStartAndEndSpinner();
            this.initializeSpinner();
            this.bindEvents();
            this.disable();
        }
    }

    private initializeSpinner() {
        const that = this;
        let spinner;
        // this.auxiliary.userLoadedCallback((data: IUserLoginInfos) => {
        //     this.userStatus = data;
        //     if (this.userStatus['level'] >= 2) {
        //         that.colorPicker = new ColorPicker(that.template.colorPicker[0], {});
        //         that.colorPicker.on('change', (e: any) => {
        //             that.setConfig('color', Utils.colorToDecimal(e.value));
        //         });
        //     }
        // });
        this.colorPicker = new ColorPicker(this.auxiliary.player, this.template.panel[0], {
            triggerBtn: this.template.color,
            prefix: this.options.prefix,
            onChange: function (config: IConfig) {
                that.setConfig('color', colorToDecimal(config.value));
            },
            callback: function (callback: Function) {
                // auxiliary过滤了部分信息，向player索取
                that.auxiliary.player.userLoadedCallback(status => {
                    callback(status.danmaku?.color);
                });
            },
            onOpen: function () {
                that.disable();
            },
            onClose: function () {
                that.status && that.enable();
            }
        });
        that.colorPicker.enable(2);

        for (const k in this.template) {
            if (this.template[k].hasClass('adv-danmaku-spinner-span')) {
                spinner = this.template[k];
                const key = spinner.attr('data-key');
                that.spinner[key!] = new Spinner(spinner, {
                    value: parseFloat(spinner.attr('data-value')!),
                    min: parseInt(spinner.attr('data-min')!, 10),
                    max: parseInt(spinner.attr('data-max')!, 10),
                    step: parseFloat(spinner.attr('data-step')!),
                    // type: 'number',
                });
                that.spinner[key!].on('change', (e: any) => {
                    that.setConfig(key!, e.value);
                });
            }
        }

        this.checkbox['stroke'] = new Checkbox(this.template.stroke, {
            checked: !!this.config.stroke,
            label: '文字描边',
        });
        this.checkbox['stroke'].on('change', (e: any) => {
            this.setConfig('stroke', e.value ? 1 : 0);
        });

        this.checkbox['linearSpeedUp'] = new Checkbox(this.template.linearSpeedUp, {
            checked: !!this.config.linearSpeedUp,
            label: '线性加速',
        });
        this.checkbox['linearSpeedUp'].on('change', (e: any) => {
            this.setConfig('linearSpeedUp', e.value ? 1 : 0);
        });

        this.checkbox['startPathFollow'] = new Checkbox(this.template.startPathFollow, {
            label: '跟随拾取',
            change: (v) => {
                const key = this.checkbox['startPathFollow'].element.attr("data-type") === "start" ? "startFollow" : "endFollow";
                that.setConfig(key, v.value ? 1 : 0);
            },
        });
        // this.checkbox['startPathFollow'].on('click', () => {
        //     const val = that.template.startPathFollow.hasClass('active') ? 0 : 1;
        //     if (val) {
        //         that.template.startPathFollow.addClass('active');
        //         that.template.endPathFollow.removeClass('active');
        //         that.setConfig('startFollow', 1).setConfig('endFollow', 0);
        //         that.showPathPicker();
        //     } else {
        //         that.hidePathPicker();
        //     }
        // });

        this.checkbox['endPathFollow'] = new Checkbox(this.template.endPathFollow, {
            // type: 'small',
            label: '跟随拾取',
            change: (v) => {
                const key = this.checkbox['endPathFollow'].element.attr("data-type") === "start" ? "startFollow" : "endFollow";
                that.setConfig(key, v.value ? 1 : 0);
            },
        });
        // this.checkbox['endPathFollow'].on('click', () => {
        //     const val = that.template.endPathFollow.hasClass('active') ? 0 : 1;
        //     if (val) {
        //         that.template.startPathFollow.removeClass('active');
        //         that.template.endPathFollow.addClass('active');
        //         that.setConfig('startFollow', 0).setConfig('endFollow', 1);
        //         that.showPathPicker();
        //     } else {
        //         that.hidePathPicker();
        //     }
        // });

        this.checkbox['percent'] = new Checkbox(this.template.percent, {
            checked: !!this.config.isPercent,
            label: '按百分比',
        });
        this.checkbox['percent'].on('change', (e: any) => {
            this.setConfig('isPercent', e.value ? true : false).changePositionAttr(e.value);
            // 217004
            // this.auxiliary.directiveManager.sender(WD.ADM_PERCENT_MODE_CHANGE, {
            //     'activePercent': that.config.isPercent,
            // });
        });

        this.checkbox['ctime'] = new Checkbox(this.template.ctime, {
            checked: true,
            label: '当前时间',
        });
        this.checkbox['ctime'].on('change', (e: any) => {
            if (!e.value) {
                this.stimeInput.removeClass("disabled").focus();
                this.setConfig('ctime', false);
            } else {
                this.stimeInput.val("").blur().addClass("disabled");
                this.setConfig([
                    { key: 'ctime', value: true },
                    { key: 'stime', value: 0 },
                ]);
            }
        });

        this.selectmemu['family'] = new Selectmenu(this.template.family, {
            mode: "absolute",
            items: [
                {
                    name: '黑体',
                    value: 'SimHei, "Microsoft JhengHei"',
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
                    value: '"Microsoft YaHei"',
                },
            ],
        });
        this.selectmemu['family'].on('change', (e: any) => {
            that.setConfig('family', e.value);
        });

        new Button(this.template.pickerBtn, {
            type: 'small',
            click: () => {
                if (that.pickStatus) {
                    that.hidePathPicker();
                } else {
                    that.showPathPicker();
                }
            }
        })

        // new Button(this.template.animationWay1[0], {
        //     type: 'small',
        // }).on('click', () => {
        //     that.template.animationWay1.addClass('active');
        //     that.template.animationWay2.removeClass('active');
        //     that.changeAnimationWay(1);
        // });

        // new Button(this.template.animationWay2[0], {
        //     type: 'small',
        // }).on('click', () => {
        //     that.template.animationWay2.addClass('active');
        //     that.template.animationWay1.removeClass('active');
        //     that.changeAnimationWay(2);
        // });

        this.uiLists.test = new Button(this.template.testBtn, {
            type: 'small',
            click: () => {
                that.onTest();
            }
        })

        this.uiLists.send = new Button(this.template.sendBtn, {
            type: 'small',
            click: () => {
                that.onSend();
            }
        })

        if (this.userStatus.role === STATE.USER_ADVANCED || this.userStatus.role === STATE.USER_VIP) {
            this.template.advDanmakuTab.addClass("active");
            this.template.basDanmakuTab.show();
            // this.template.codeDanmakuTab.show(); // 代码弹幕由于安全原因暂时禁用

            new Button(this.template.advDanmakuTab, {
                type: "small",

                click: () => {
                    that.auxiliary.basVisualPanel.hide();
                    that.auxiliary.codePanel.hide();
                    that.auxiliary.template.basDanmakuVisualPanel.hide();
                    that.advContainer?.show();
                    that.template.advDanmakuTab.addClass("active");
                    that.template.basDanmakuTab.removeClass("active");
                    that.template.codeDanmakuTab.removeClass("active");
                }
            });
            new Button(this.template.basDanmakuTab, {
                type: "small",

                click: () => {
                    that.auxiliary.basVisualPanel.show();
                    that.auxiliary.codePanel.hide();
                    that.auxiliary.template.basDanmakuVisualPanel.show();
                    that.advContainer?.hide();
                    that.template.advDanmakuTab.removeClass("active");
                    that.template.basDanmakuTab.addClass("active");
                    that.template.codeDanmakuTab.removeClass("active");
                }
            });
            new Button(this.template.codeDanmakuTab, {
                type: "small",

                click: () => {
                    that.auxiliary.basVisualPanel.hide();
                    that.auxiliary.codePanel.show();
                    that.auxiliary.template.basDanmakuVisualPanel.hide();
                    that.advContainer?.hide();
                    that.template.advDanmakuTab.removeClass("active");
                    that.template.basDanmakuTab.removeClass("active");
                    that.template.codeDanmakuTab.addClass("active");
                }
            });
        }

        // 弹幕关闭，禁用发送按钮
        if (this.auxiliary.list?.dmClosed) {
            this.dmClose(true);
        }
    }
    private showPathPicker() {
        const that = this;
        // 217001
        this.auxiliary.directiveManager.sender(WD.ADM_START_POS_PICKUP, {
            movementMode: that.config['aWay'],
            target: 'adv',
        });
        this.pickStatus = true;
    }
    private hidePathPicker() {
        const that = this;
        // 217002
        this.auxiliary.directiveManager.sender(WD.ADM_ABORT_POS_PICKUP, null);
        that.pickStatus = false;
        that.template.startPathFollow.removeClass('active');
        that.template.endPathFollow.removeClass('active');
    }

    update() {
        const options = this.auxiliary.options;
        const template = this.auxiliary.template;
        const offset = this.auxiliary.extraParams ? this.auxiliary.extraParams.danmakuListOffset : 0;
        let h = this.auxiliary.getPlayerHeight();
        h = offset ? h - offset : h;
        this.template && this.template.container.css('height', h - this.auxiliary.filtersHeight - 1 + 'px');
    }
    dmClose(close: boolean) {
        if (this.inited) {
            if (close) {
                this.uiLists.test.disable();
                this.uiLists.send.disable();
            } else {
                this.uiLists.test.enable();
                this.uiLists.send.enable();
            }
        }
    }

    private updateStartAndEndSpinner() {
        const maxW = this.options.panel.width();
        const maxH = this.options.panel.height();
        // const maxW = 9999;
        // const maxH = 9999;
        const step = 1;
        this.template.startX.attr('data-max', maxW).attr('data-step', step);
        this.template.endX.attr('data-max', maxW).attr('data-step', step);
        this.template.startY.attr('data-max', maxH).attr('data-step', step);
        this.template.endY.attr('data-max', maxH).attr('data-step', step);
        return this;
    }

    private bindEvents() {
        const prefix = this.prefix;
        const panel = this.options.panel;

        panel.find('.' + prefix + '-panel-close').on('click', () => {
            this.hide();
        });

        panel.find('.' + prefix + '-panel-back').on('click', () => {
            this.hide();
        });

        this.template.animationWay.on('change', () => {
            this.changeAnimationWay(~~$(this).attr('data-index')!);
        });
        // this.textInput = new Input(this.template.text[0], {
        //     type: 'textarea',
        // });
        this.textInput = this.template.text;
        this.textInput.on('blur', () => {
            this.setConfig('text', this.textInput.val());
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
        this.stimeInput.on('blur', () => {
            const val = this.seconds(this.stimeInput.val());
            let dur = 0;
            // 226001
            this.auxiliary.directiveManager.sender(WD.VI_RETRIEVE_DATA, null, (received?: IReceived) => {
                dur = received!['data']['duration'];
            });
            if (val && typeof val === 'number' && 0 <= val && val <= dur && val !== this.config.stime) {
                this.setConfig('stime', val);
            }
        });
    }

    show() {
        if (!this.inited) {
            this.init();
        }
        this.options.panel.show();
        this.verify();
    }

    hide() {
        if (!this.inited) {
            this.init();
        }
        this.options.panel.hide();
        this.reset();
    }

    private seconds(str: any): number {
        str = str.replace(',', '.');
        const arr: string[] = str.split(':');
        let sec = 0;
        if (str.substr(-2) === 'ms') {
            sec = Number(str.substr(0, str.length - 2)) / 1000;
        } else if (str.substr(-1) === 's') {
            sec = Number(str.substr(0, str.length - 1));
        } else if (str.substr(-1) === 'm') {
            sec = Number(str.substr(0, str.length - 1)) * 60;
        } else if (str.substr(-1) === 'h') {
            sec = Number(str.substr(0, str.length - 1)) * 3600;
        } else if (arr.length > 1) {
            sec = Number(arr[arr.length - 1]);
            sec += Number(arr[arr.length - 2]) * 60;
            if (arr.length === 3) {
                sec += Number(arr[arr.length - 3]) * 3600;
            }
        } else {
            sec = Number(str);
        }
        return sec;
    }

    private getData(): ITextData | false {
        const c = this.config;
        const path: string[] = [];
        let stime: number;
        // 226001
        this.auxiliary.directiveManager.sender(WD.VI_RETRIEVE_DATA, null, (received?: IReceived) => {
            stime = received!['data']['sTime'];
        });
        const textData: ITextData = {
            stime: stime!,
            mode: 7,
            size: c['size'],
            color: c['color'],
            date: 0,
            class: 0,
            uid: '',
            dmid: '0',
            text: '',
        };
        const arr = [
            c['startX'],
            c['startY'],
            [c['sOpacity'], c['eOpacity']].join('-'),
            c['duration'],
            c['text'],
            c['zRotate'],
            c['yRotate'],
            c['endX'],
            c['endY'],
            c['aTime'],
            c['aDelay'],
            c['stroke'],
            c['family'],
            c['linearSpeedUp'],
        ];
        if (typeof c['path'] === 'string') {
            arr.push(c['path']);
            textData.text = arr;
            return textData;
        }
        if (c['path'].length > 0) {
            c['path'].forEach((v: IPath, i: number) => {
                path[i] = v.x + ',' + v.y;
            });
            arr.push('M' + path.join('L'));
        }
        if (c['path'].length > 0 && arr.toString().length > 298) {
            new Tooltip({
                name: 'messageTooLong',
                target: this.template.container,
                position: 'center-center',
                text: '路径拾取太长, 可能导致弹幕发送失败',
            });
            return false;
        } else {
            textData.text = arr;
            return textData;
        }
    }

    private updatePosition(data: any) {
        const changeXArr: any[] = [];
        const changeYArr: any[] = [];
        const spinner = this.spinner;
        const x = this.config['isPercent'] ? parseFloat((data['x'] / data['w']).toFixed(3)) : data['x'];
        const y = this.config['isPercent'] ? parseFloat((data['y'] / data['h']).toFixed(3)) : data['y'];
        this.config['startFollow'] && changeXArr.push(spinner['startX']) && changeYArr.push(spinner['startY']);
        this.config['endFollow'] && changeXArr.push(spinner['endX']) && changeYArr.push(spinner['endY']);

        changeXArr.forEach((v) => {
            v.value(x);
        });
        changeYArr.forEach((v) => {
            v.value(y);
        });
    }

    private updatePath(data: any, callback: Function) {
        if (data) {
            this.setConfig('path', data['path']);
        }
        this.template.startPathFollow.removeClass('active');
        this.template.endPathFollow.removeClass('active');
        this.pickStatus = false;
        typeof callback === 'function' && callback();
    }

    private setConfig(key: string | any[], value?: any): this {
        if (Array.isArray(key)) {
            key.forEach((k) => {
                this.setConfig(k);
            });
        } else {
            if (key && (value || value >= 0) && this.config.hasOwnProperty(key)) {
                this.config[key] = value;
            } else if ($.isPlainObject(key) && key[<number><unknown>'key'] && key.hasOwnProperty('value')) {
                this.config[key[<number><unknown>'key']] = key[<number><unknown>'value'];
            }
        }
        return this;
    }

    private reset() {
        const spinner = this.spinner;
        const checkbox = this.checkbox;
        this.colorPicker.changeColor('#FFFFFF');
        for (const k in spinner) {
            if (spinner.hasOwnProperty(k)) {
                spinner[k].value(spinner[k].container.attr('data-origin'));
            }
        }
        for (const k in checkbox) {
            if (checkbox.hasOwnProperty(k)) {
                checkbox[k].setValue(~~checkbox[k].element.attr('data-origin'));
            }
        }
        this.changePositionAttr();
        this.selectmemu['family'].reset && this.selectmemu['family'].reset();
        this.textInput.val("");
        this.template.animationWay.eq(0).trigger('click');
        this.config = {
            color: 16777215,
            size: 36,
            family: 'SimHei',
            stroke: 1,
            duration: 4.5,
            sOpacity: 1,
            eOpacity: 1,
            zRotate: 0,
            yRotate: 0,

            aTime: 500,
            aDelay: 0,
            linearSpeedUp: 1,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            path: [],

            text: '',
            stime: 0,

            aWay: 1, // 运动方式 1: 起始位置, 2:路径跟随
            isPercent: false, // 是否按百分比选取
            startFollow: 0, // 开始坐标是否跟随拾取
            endFollow: 0, // 结束坐标是否跟随拾取
            ctime: false,
        };
        // 217002
        this.auxiliary.directiveManager.sender(WD.ADM_ABORT_POS_PICKUP, null);
    }

    private changeAnimationWay(way: number): this {
        if (way === 1) {
            // 起始位置
            this.template.animationRows.show();
            // this.template.pickRows.hide();
            this.setConfig('aWay', 1);
            this.config.path = [];
        } else if (way === 2) {
            // 路径跟随
            this.template.animationRows.hide();
            // this.template.pickRows.show();
            this.setConfig('aWay', 2);
        }
        // 217003
        this.auxiliary.directiveManager.sender(WD.ADM_MOTION_MODE_CHANGE, {
            movementMode: this.config['aWay'],
        });
        return this;
    }

    private changePositionAttr(isPercent?: boolean): this {
        const spinner = this.spinner;
        const positionXComponent = [spinner['startX'], spinner['endX']];
        const positionYComponent = [spinner['startY'], spinner['endY']];
        let maxX: number;
        let maxY: number;
        let step: number;
        if (isPercent) {
            maxX = 0.99;
            maxY = 0.99;
            step = 0.01;
        } else {
            maxX = 9999;
            maxY = 9999;
            // maxX = this.options.wrap.width();
            // maxY = this.options.wrap.height();
            step = 1;
        }
        positionXComponent.forEach(function (v: Spinner) {
            v.value(0);
            v.options = {
                ...v.options,
                min: 0,
                max: maxX,
                step,
            };
        });
        positionYComponent.forEach(function (v: Spinner) {
            v.value(0);
            v.options = {
                ...v.options,
                min: 0,
                max: maxY,
                step,
            };
        });
        return this;
    }

    private onTest() {
        if (!this.status) {
            return false;
        }
        if (!this.config['text']) {
            this.textInput.focus();
        } else {
            setTimeout(() => {
                const textData = this.getData();
                if (textData) {
                    const data = {
                        msg: JSON.stringify(textData.text),
                        progress: textData.stime, // 单位：秒
                        color: textData.color,
                        fontsize: textData.size,
                    };
                    'function' === typeof this.options.onTest && this.options.onTest(data);
                }
            }, 0);
        }
    }

    private onSend() {
        if (!this.status) {
            return false;
        }
        if (this.config['text']) {
            const textData = this.getData();

            if (textData) {
                const message = JSON.stringify(textData.text);
                let currentTime = 0;
                // 226001
                this.auxiliary.directiveManager.sender(WD.VI_RETRIEVE_DATA, null, (received?: IReceived) => {
                    currentTime = received!['data']['currentTime'];
                });
                const time = this.serializeToSecond(this.config['stime']) || currentTime;
                const formatData = Math.floor(+new Date() / 1000);
                const data = {
                    msg: message, // 弹幕内容
                    progress: time, // 弹幕位于视频中的时间点（单位秒）
                    color: this.config['color'], // 弹幕颜色
                    fontsize: this.config['size'], // 字体大小
                };
                // 217006
                this.auxiliary.directiveManager.sender(WD.ADM_SEND_DANMAKU, data, (received?: IReceived) => {
                    const result = received!['data'];
                    if (result && result['code'] === 0 && result['data']['dmid_str']) {
                        this.textInput.val('');
                        // const this.userStatus = auxiliary.user.status();
                        const danmaku = {
                            stime: time,
                            mode: 7,
                            size: data['fontsize'],
                            color: data['color'],
                            date: formatData,
                            pool: 0,
                            dmid: result['data']['dmid_str'],
                            uhash: this.userStatus.uhash,
                            mid: this.userStatus.uid,
                            uname: this.userStatus.name ? this.userStatus.name.split(' ')[0] : '',
                            text: data['msg'],
                        };
                        this.auxiliary.list.add(danmaku);
                        new Tooltip({
                            name: 'sendSuccess',
                            target: this.template.container,
                            position: 'center-center',
                            text: '发送成功',
                        });
                    } else {
                        new Tooltip({
                            name: 'sendError',
                            target: this.template.container,
                            position: 'center-center',
                            text: result ? result['message'] || '发送失败' : '发送失败',
                        });
                    }
                });
            }
        } else {
            this.textInput.focus();
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
    private verify() {
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
                    this.modal.close();
                } else {
                    this.setVerificationState(this.vertificationState.needBuy + '');
                }
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
                    this.showModel();
                    this.modal.options({
                        info: '启用本视频的特殊弹幕需要支付2硬币，' + upperText + '是否要购买? ',
                        btns: [
                            {
                                type: 'cancel',
                                text: '否',
                            },
                            {
                                type: 'submit',
                                text: '使用硬币',
                                click() {
                                    that.buyVerification();
                                },
                            },
                        ],
                    });
                    break;
                case this.vertificationState.init:
                    this.showModel();
                    this.modal.options({
                        info: '启用本视频的特殊弹幕需要UP主同意, 是否要发送请求? ',
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
                    this.showModel();
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
                    this.showModel();
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

    private showModel() {
        this.disable();
        this.modal.open();
    }
    private verifyAjax(callback: Function) {
        // 217007
        this.auxiliary.directiveManager.sender(WD.ADM_VERIFY_PERMISSION, null, (received?: IReceived) => {
            typeof callback === 'function' && callback(received!['data']['data']);
        });
    }

    private buyVerification() {
        // 217008
        this.auxiliary.directiveManager.sender(WD.ADM_REQUEST_PERMISSION, null, (received?: IReceived) => {
            const data = received!['data'];
            if (data && data['code'] === 0) {
                new Tooltip({
                    name: 'buyVerificationError',
                    target: this.modal.template.container,
                    position: 'center-center',
                    text: data['message'] || '操作成功',
                });
                this.verifyAjax((res: any) => {
                    this.setVerificationState(res['confirm']);
                });
            } else {
                new Tooltip({
                    name: 'buyVerificationError',
                    target: this.modal.template.container,
                    position: 'center-center',
                    text: (data && data['message']) || '操作失败',
                });
            }
        });
    }

    disable() {
        this.template && this.template.container.addClass('mask');
        // this.template && this.template.container.removeClass(`${this.prefix}-bscrollbar`);
        // this.advScrollbar && this.advScrollbar.disable();
    }

    enable() {
        this.template && this.template.container.removeClass('mask');
        // this.template && this.template.container.addClass(`${this.prefix}-bscrollbar`);
        // this.advScrollbar && this.advScrollbar.enable();
    }

    disableContent() {
        this.template && this.template.container.addClass('mask-content');
    }

    enableContent() {
        this.template && this.template.container.removeClass('mask-content');
    }

    destroy() { }
}

export default AdvPanel;
