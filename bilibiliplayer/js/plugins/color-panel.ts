import Player from '../player';
import DropFrames from './drop-frames';
import { Slider } from '@jsc/player-auxiliary/js/ui/slider';
import { Button } from '@jsc/player-auxiliary/js/ui/button';

import '../../css/color-panel.less';

interface IColorConfig {
    saturate: number;
    brightness: number;
    contrast: number;
}
class ColorPanel {
    private player: Player;
    private container: JQuery;
    private prefix: string;
    private element: any;
    private config: IColorConfig;
    private dropFrames!: DropFrames;
    private ui: any = {};

    constructor(opt: any) {
        this.container = opt.container;
        this.prefix = opt.prefix;
        this.player = opt.player;
        this.config = {
            saturate: 100,
            brightness: 100,
            contrast: 100,
        };
        this.init();
        this.globalEvents();
    }

    init() {
        const prefix = this.prefix;
        // TODO：之后所有掉帧都在此模块里监测
        this.dropFrames = new DropFrames(this.player);
        this.container.append(this.tpl());
        this.element = {
            videoWrap: this.container.find(`.${prefix}-video`),
            panel: this.container.find(`.${prefix}-color-panel`),
            close: this.container.find(`.${prefix}-color-panel-close`),
            saturateWrap: this.container.find(`.${prefix}-color-panel-saturate`),
            brightnessWrap: this.container.find(`.${prefix}-color-panel-brightness`),
            contrastWrap: this.container.find(`.${prefix}-color-panel-contrast`),
            reset: this.container.find(`.${prefix}-color-panel-btn`),
        };
        this.element.saturate = this.element.saturateWrap.find(`.${prefix}-color-panel-value`);
        this.element.brightness = this.element.brightnessWrap.find(`.${prefix}-color-panel-value`);
        this.element.contrast = this.element.contrastWrap.find(`.${prefix}-color-panel-value`);

        this.ui.saturate = new Slider(this.element.saturateWrap.find(`.${prefix}-color-panel-slider`), {
            // dark: true,
            // value: this.config.saturate / 255,
            // trackLength: 255,
            precision: 255,
            valueSetAnalyze: (value: number) => {
                return value;
            },
            valueGetAnalyze: function (value: number) {
                return value;
            },
        });
        this.ui.saturate.value(this.config.saturate / 255);
        this.ui.saturate.on('move', (e: any) => {
            this.panelStyle(
                {
                    saturate: e.value,
                    brightness: this.ui.brightness.value(),
                    contrast: this.ui.contrast.value(),
                },
                'saturate',
            );
        });
        this.ui.saturate.on('change', (e: any) => {
            this.panelStyle(
                {
                    saturate: e.value,
                    brightness: this.ui.brightness.value(),
                    contrast: this.ui.contrast.value(),
                },
                'saturate',
            );
        });
        this.ui.brightness = new Slider(this.element.brightnessWrap.find(`.${prefix}-color-panel-slider`), {
            // dark: true,
            // value: this.config.brightness / 255,
            // trackLength: 255,
            precision: 255,
            valueSetAnalyze: (value: number) => {
                return value;
            },
            valueGetAnalyze: function (value: number) {
                return value;
            },
        });
        this.ui.brightness.value(this.config.brightness / 255);
        this.ui.brightness.on('move', (e: any) => {
            this.panelStyle(
                {
                    saturate: this.ui.saturate.value(),
                    brightness: e.value,
                    contrast: this.ui.contrast.value(),
                },
                'brightness',
            );
        });
        this.ui.brightness.on('change', (e: any) => {
            this.panelStyle(
                {
                    saturate: this.ui.saturate.value(),
                    brightness: e.value,
                    contrast: this.ui.contrast.value(),
                },
                'brightness',
            );
        });
        this.ui.contrast = new Slider(this.element.contrastWrap.find(`.${prefix}-color-panel-slider`), {
            // dark: true,
            // value: this.config.contrast / 255,
            // trackLength: 255,
            precision: 255,
            valueSetAnalyze: (value: number) => {
                return value;
            },
            valueGetAnalyze: function (value: number) {
                return value;
            },
        });
        this.ui.contrast.value(this.config.contrast / 255);
        this.ui.contrast.on('move', (e: any) => {
            this.panelStyle(
                {
                    saturate: this.ui.saturate.value(),
                    brightness: this.ui.brightness.value(),
                    contrast: e.value,
                },
                'contrast',
            );
        });
        this.ui.contrast.on('change', (e: any) => {
            this.panelStyle(
                {
                    saturate: this.ui.saturate.value(),
                    brightness: this.ui.brightness.value(),
                    contrast: e.value,
                },
                'contrast',
            );
        });
        const reset = new Button(this.element.reset, {
            // type: 'black',
            label: '重置',
        });
        reset.on('click', () => {
            this.resetValue();
        });
    }
    private panelStyle(config: IColorConfig, slider: string) {
        this.element.videoWrap.css(
            '-webkit-filter',
            `saturate(${(config.saturate / 100) * 255}) brightness(${(config.brightness / 100) * 255}) contrast(${(config.contrast / 100) * 255
            })`,
        );
        this.element[slider].text(Math.round(config[<keyof IColorConfig>slider] * 255));
        this.dropFrames.start();
        this.dropFrames.addEventListener('colorPanel', () => {
            this.player.toast.addTopHinter('丢帧严重，已自动关闭色彩调整', 2000);
            this.resetValue();
        });
    }
    private resetValue() {
        this.dropFrames.removeEventListener('colorPanel');
        this.ui.saturate.value(this.config.saturate / 255, true);
        this.ui.brightness.value(this.config.brightness / 255, true);
        this.ui.contrast.value(this.config.contrast / 255, true);
        this.element.saturate.text('100');
        this.element.contrast.text('100');
        this.element.brightness.text('100');
        this.element.videoWrap.removeAttr('style');
    }
    private globalEvents() {
        this.element.close.click(() => {
            this.hide();
        });
    }
    show() {
        this.element.panel.show();
    }
    hide() {
        this.element.panel.hide();
    }

    private tpl() {
        const prefix = this.prefix;
        return `<div class="${prefix}-color-panel">
                    <div class="${prefix}-color-panel-title">色彩调整<span class="${prefix}-color-panel-close"><i class="${prefix}-iconfont icon-close"></i></span></div>
                    <div class="${prefix}-color-panel-saturate ${prefix}-color-wrap">
                        <div class="${prefix}-color-panel-name">饱和度</div>
                        <div class="${prefix}-color-panel-slider"></div>
                        <div class="${prefix}-color-panel-value">100</div>
                    </div>
                    <div class="${prefix}-color-panel-brightness ${prefix}-color-wrap">
                        <div class="${prefix}-color-panel-name">亮度</div>
                        <div class="${prefix}-color-panel-slider"></div>
                        <div class="${prefix}-color-panel-value">100</div>
                    </div>
                    <div class="${prefix}-color-panel-contrast ${prefix}-color-wrap">
                        <div class="${prefix}-color-panel-name">对比度</div>
                        <div class="${prefix}-color-panel-slider"></div>
                        <div class="${prefix}-color-panel-value">100</div>
                    </div>
                    <div class="${prefix}-color-panel-reset">
                        <span class="${prefix}-color-panel-btn"></span>
                    </div>
                </div>`;
    }

    exportEffect() {
        return {
            saturate: Math.round(this.ui.saturate.value() * 255),
            brightness: Math.round(this.ui.brightness.value() * 255),
            contrast: Math.round(this.ui.contrast.value() * 255),
        };
    }
}

export default ColorPanel;
