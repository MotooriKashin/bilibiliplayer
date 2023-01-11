import Player from "../../player";
import Controller from "../controller";
import DanmakuMask from "../danmaku-mask";
import * as PD from '../../const/player-directive';
import { Slider } from "@jsc/player-auxiliary/js/ui/slider";
import { Checkbox } from "@jsc/player-auxiliary/js/ui/checkbox";
import { IEvent } from "@jsc/player-auxiliary/js/ui/base";
import { BILIBILI_PLAYER_SETTINGS } from "../settings";
import { browser } from "@shared/utils";

interface IReceived {
    _id: number;
    _origin: string;
    _directive: number;
    data?: any;
}
export class DanmakuSettingLite {
    prefix: string;
    player: Player;
    type = [
        ["Top", "顶端弹幕", "48danmutop"],
        ["Bottom", "底端弹幕", "48danmubottom"],
        ["Scroll", "滚动弹幕", "48danmuscroll"]
    ];
    private blockType = {
        top: 1,
        bottom: 2,
        scroll: 3,
        special: 5,
        color: 7,
    }
    container!: JQuery<any>;
    opacityBar!: Slider;
    preventshade!: Checkbox;
    maskDanmaku?: Checkbox;
    danmakuMask?: DanmakuMask;
    dropFrames: any;
    dropFramesTime?: number;
    dropFramesTimer?: number;
    constructor(public controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.init();
    }
    init() {
        this.container = $(this.TPL()).appendTo(this.controller.container);
        const panel = this.container.find(`.${this.prefix}-danmaku-setting-lite-panel`);
        const player = this.player;
        const that = this;

        this.change(this.player.state.danmaku);

        this.opacityBar = new Slider(this.container.find(`.${this.prefix}-danmaku-setting-lite-opacitybar`), {
            name: "ctlbar_danmuku_opacity",
            precision: 18,
            hint: true,
            width: 120,
            height: 13,

            valueSetAnalyze: val => val * 20 / 18 - 2 / 18,
            valueGetAnalyze: val => val * 18 / 20 + 0.1,
            formatTooltip: val => `${Math.round((val * 18 / 20 + 0.1) * 100)}%`,
            change: (e: IEvent) => {
                this.player.set('setting_config', 'opacity', e.value.toFixed(2));
            }
        });
        this.opacityBar.value(this.controller.config['setting_config']['opacity'])

        this.preventshade = new Checkbox(this.container.find(`.${this.prefix}-setting-preventshade`), {
            label: "防挡字幕",
            checked: this.controller.config['setting_config']['preventshade'],
            textLeft: true,

            change: (e: IEvent) => {
                this.player.set('setting_config', 'preventshade', e.value);
            }
        });
        this.player.userLoadedCallback(userStatus => {
            if (
                userStatus.mask_new &&
                browser.version.browser === 'chrome' &&
                !browser.version.edge &&
                this.player.config.hasDanmaku
            ) {
                this.container.find(`.${this.prefix}-setting-dmask-wrap`).show();
                this.maskDanmaku = new Checkbox(this.container.find(`.${this.prefix}-setting-dmask`), {
                    label: '智能防挡弹幕',
                    checked: this.controller.config['setting_config']['dmask'],
                    textLeft: true,

                    change: (e: IEvent) => {
                        this.danmakuMask?.setting('dmask', e.value);
                        this.player.set('setting_config', 'dmask', e.value);
                    }
                });
                this.setMask(userStatus.mask_new);
            } else {
                this.container.find(`.${this.prefix}-setting-dmask-wrap`).hide();
            }
        });

        /** 暂存以相应来自别处的屏蔽消息 */
        const blockElem: Record<string, any> = {};
        this.type.forEach((d, i) => {
            const domName = <keyof BILIBILI_PLAYER_SETTINGS['block']>`type_${d[0].toLowerCase()}`;
            const blocked = this.controller.config.block[domName];

            blockElem[d[0].toLowerCase()] = $(`<div class="${this.prefix}-block-filter-type ${blocked ? "" : "disabled"}" name="${blocked ? `ctlbar_danmuku_${d[0].toLowerCase()}_on` : `ctlbar_danmuku_${d[0].toLowerCase()}_close`}" ftype="${d[0].toLocaleLowerCase()}">
            <i class="${this.prefix}-block-filter-image ${this.prefix}-iconfont icon-${d[2].toLowerCase()}">
                <i class="${this.prefix}-block-filter-disabled ${this.prefix}-iconfont icon-24danmuforbid"></i>
            </i>
            <div class="${this.prefix}-block-filter-label">${d[1].toLowerCase()}</div>
        </div>`).appendTo($(`.${this.prefix}-danmaku-setting-lite-type-list`))
                .on("click", function () {
                    const value = $(this).hasClass('disabled');
                    player.set("block", domName, value);
                    $(this).attr(
                        "name",
                        value ? `ctlbar_danmuku_${d[0].toLowerCase()}_on` : `ctlbar_danmuku_${d[0].toLowerCase()}_close`
                    );
                    $(this).toggleClass("disabled");
                    // 124002
                    player.directiveManager.sender(PD.DB_PUT_BLOCK_TYPE, {
                        type: (<any>that).blockType[d[0].toLowerCase()],
                        enabled: !value,
                    });
                });
            blockElem[d[0].toLowerCase()].value = function (value: any) {
                if (typeof value === "undefined") {
                    return that.controller.config.block[domName];
                }

                player.set("block", domName, value);
                value ? blockElem[d[0].toLowerCase()].removeClass("disabled") : blockElem[d[0].toLowerCase()].addClass("disabled");
            };
        });
        player.directiveManager.on(PD.DB_PUT_BLOCK_TYPE.toString(), (e, received: IReceived) => {
            const data = received['data'];
            // 更新屏蔽列表状态，此处屏蔽状态取值与设置中取值是相反的！
            Object.entries(this.blockType).forEach(d => {
                if (data['type'] === d[1]) {
                    blockElem[d[0]]?.value(!data['enabled'])
                }
            });
        });

        this.container.on("click", e => {
            if (($(e.target).attr("name") === "ctlbar_danmuku_close") || ($(e.target).attr("name") === "ctlbar_danmuku_on")) {
                this.player.state.danmaku = !this.player.state.danmaku;
                this.change(this.player.state.danmaku);
            }
        });
        this.container.on("mouseover", (e: any) => {
            panel.show();
            this.opacityBar.resize();
        });
        this.container.on("mouseout", e => {
            panel.hide();
        })
    }
    private setMask(data?: string) {
        const value = this.controller.config['setting_config']['dmask'];
        if (value) {
            this.getMask(value, data);
        }
    }
    getMask(value: boolean, data?: string) {
        if (this.danmakuMask) {
            this.danmakuMask.setting('dmask', value);
        } else {
            try {
                this.danmakuMask = new DanmakuMask(this.player, {
                    danmaku: `.${this.player.prefix}-video-danmaku`,
                    visible: this.player.state.danmaku,
                    dmask: this.player.videoSettings['setting_config']['dmask'],
                    inlinemode: this.checkPresentationMode(),
                    data: data && JSON.parse(data),
                    cid: this.player.config.cid,
                });
                this.player.danmaku && !this.player.danmaku.danmaku.paused && this.danmakuMask.play();
            } catch (error) {
                console.warn(error);
            }
        }

        if (value) {
            this.maskStart();
        } else {
            this.maskStop();
        }
    }
    // 获取视频当前的模式(picture-in-picture/inline);
    private checkPresentationMode() {
        if (
            document['pictureInPictureElement'] === this.player.video ||
            (<any>this).player.video['webkitPresentationMode'] === 'picture-in-picture'
        ) {
            return false;
        }
        return true;
    }
    maskStart() {
        if (this.danmakuMask) {
            this.danmakuMask.play();
            this.dropFrames = this.droppedFrameCount(); // 重置丢帧数
            this.dropFramesTime = 2000; // 2s后开始
            clearTimeout(this.dropFramesTimer);
            this.autoVisible();
        }
    }
    maskStop() {
        if (this.danmakuMask) {
            this.danmakuMask.pause();
            this.dropFramesTimer && clearTimeout(this.dropFramesTimer);
        }
    }
    private autoVisible() {
        if (!this.danmakuMask!.maskIsShow()) {
            return;
        }
        this.dropFramesTimer = window.setTimeout(() => {
            this.dropFramesTime = 600;
            const currentDrop = this.droppedFrameCount();
            if (currentDrop - this.dropFrames > 14) {
                this.player.toast.addTopHinter('丢帧严重，已自动关闭防挡弹幕', 2000);
                this.maskDanmaku!.value(false);
                this.danmakuMask!.setting('dmask', false);
                return;
            }
            this.dropFrames = currentDrop;
            this.autoVisible();
        }, this.dropFramesTime);
    }
    private droppedFrameCount() {
        const num = this.player.video && (<any>this.player.video).webkitDroppedFrameCount;
        return num || 0;
    }
    setMaskFps(num: number) {
        this.danmakuMask && this.danmakuMask.setFPS(num);
    }
    // 弹幕关闭引起蒙版不显示
    danmakuVisible(value: boolean) {
        if (this.danmakuMask) {
            this.danmakuMask.setting('visible', value);
            if (value) {
                this.maskStart();
            } else {
                this.maskStop();
            }
        }
    }
    // 画中画开启引起蒙版不显示
    dMaskInInlineMode(value: boolean) {
        if (this.danmakuMask) {
            this.danmakuMask.setting('inlinemode', value);
        }
        if (value) {
            this.maskStart();
        } else {
            this.maskStop();
        }
    }
    change(on: boolean) {
        if (on) {
            this.container.removeClass("video-state-danmaku-off").attr("name", "ctlbar_danmuku_on").attr("data-text", "关闭弹幕");
        } else {
            this.container.addClass("video-state-danmaku-off").attr("name", "ctlbar_danmuku_close").attr("data-text", "打开弹幕");
        }
        this.player.danmaku && this.player.danmaku.visible(on);
    }
    TPL() {
        return `<div class="${this.prefix}-video-btn ${this.prefix}-video-btn-danmaku" name="ctlbar_danmuku_close">
                    <i class="${this.prefix}-iconfont ${this.prefix}-iconfont-danmaku icon-24danmuon" name="ctlbar_danmuku_close" data-tooltip="1" data-text="关闭弹幕" data-position="top-center" data-change-mode="0"></i>
                    <i class="${this.prefix}-iconfont ${this.prefix}-iconfont-danmaku-off icon-24danmuoff" name="ctlbar_danmuku_on" data-tooltip="1" data-text="打开弹幕" data-position="top-center" data-change-mode="0"></i>
                    <div class="${this.prefix}-danmaku-setting-lite-panel">
	                    <div class="${this.prefix}-danmaku-setting-lite">
		                    <div class="${this.prefix}-danmaku-setting-lite-row">
	                    		<div class="${this.prefix}-danmaku-setting-lite-title">不透明度</div>
	                    		<div class="${this.prefix}-danmaku-setting-lite-opacitybar"></div>
	                    	</div>
	                    	<div class="${this.prefix}-danmaku-setting-lite-discipline"></div>
	                    	<div class="${this.prefix}-danmaku-setting-lite-row">
	                    		<span>
	                    			<input type="checkbox" class="${this.prefix}-setting-preventshade" name="ctlbar_danmuku_prevent" />
		                    	</span>
		                    	<span class="${this.prefix}-setting-dmask-wrap">
	                    			<input type="checkbox" class="${this.prefix}-setting-dmask" name="ctlbar_danmuku_prevent" />
	                    		</span>
	                        </div>
	                        <div class="${this.prefix}-danmaku-setting-lite-type-list"></div>
	                    </div>
                    </div>
                </div>`;
    }
}