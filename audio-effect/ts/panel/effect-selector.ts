import Utils from '../common/utils';
import closeSvg from '../../static/img/close.svg';
import AudioEffect, { IConfig, ILocalData } from '../../audioEffect';
import { presetInfo, tag2name, frequency, eqBand } from '../common/config';
import { Selectmenu } from '@jsc/player-auxiliary/js/ui/selectmenu';
import { Slider } from '@jsc/player-auxiliary/js/ui/slider';

export default class EffectSelector {
    private config: Required<IConfig>;
    private container: HTMLElement;
    private audioEffect: AudioEffect;
    private prefix: string;
    private settingList: Slider[] = [];
    private eqSet!: Selectmenu;
    private gain!: Slider;
    private freSet!: Selectmenu;
    private baseValue = 0.5;
    private baseRange = 24;
    private customLen = 10;
    private defaultType = '10';
    private defaultValue = 'default';
    private element!: { [key: string]: HTMLElement; };
    private elementFreList!: HTMLElement[];
    private effect: ILocalData;

    constructor(audioEffect: AudioEffect) {
        this.audioEffect = audioEffect;
        this.config = audioEffect.config;
        this.effect = {
            left: this.defaultValue,
            right: this.defaultValue,
            rightType: this.defaultType,
            gain: 0,
            ...audioEffect.config.data,
        };
        if (!this.config.data.rightValue) {
            this.effect.rightValue = eqBand[<keyof typeof eqBand>this.defaultType].default.slice(0);
        }
        this.container = this.config.container;
        this.prefix = this.config.prefix;
        this.init();
        this.globalEvents();
    }

    private init() {
        const prefix = this.prefix;
        this.container.insertAdjacentHTML('beforeend', this.tpl());
        this.element = {
            panel: Utils.query(`.${prefix}-panel`),
            move: Utils.query(`.${prefix}-panel-move`),
            panelLeft: Utils.query(`.${prefix}-panel-left`),
            panelRight: Utils.query(`.${prefix}-panel-right`),
            close: Utils.query(`.${prefix}-panel-close`),
            preset: Utils.query(`.${prefix}-panel-left-preset`),
            reset: Utils.query(`.${prefix}-panel-left-btn`),
        };
        if (this.effect.right === 'custom') {
            eqBand[<keyof typeof eqBand>this.effect.rightType].custom = this.effect.rightValue;
        }
        this.tplUI();
        if (this.effect.custom) {
            this.panelMove(1);
        } else {
            this.panelMove(0);
        }
    }
    private resetEffectValue(effect = this.defaultValue) {
        this.effect.right = effect;
        if ((<any>eqBand)[this.effect.rightType][effect]) {
            this.effect.rightValue = (<any>eqBand)[this.effect.rightType][effect].slice(0);
        }
    }
    private globalEvents() {
        this.element.close.addEventListener('click', () => {
            this.hide();
        });
        this.element.panel.addEventListener('click', (e) => {
            const val = (<HTMLElement>e.target)?.dataset.val;
            switch (val) {
                case 'right':
                    this.panelMove(1);
                    break;
                case 'left':
                    this.panelMove(0);
                    break;
                case 'rightReset':
                    this.rightReset();
                    break;
                case 'default':
                    this.gain.value(this.eq2ui(0));
                    this.setEffectPreset(val, false, <HTMLElement>e.target);
                    break;
                default:
                    if (val) {
                        this.setEffectPreset(val, false, <HTMLElement>e.target);
                    }
                    break;
            }
            if (val) {
                this.config.track(val);
            }
        });
    }
    reload(cfg: IConfig) {
        this.config = {
            ...this.config,
            ...cfg,
        };
        this.container = this.config.container;
        this.prefix = this.config.prefix;
        this.init();
        this.globalEvents();
    }
    show() {
        this.element.panel.style.display = 'block';
    }
    hide() {
        this.element.panel.style.display = 'none';
        this.effect.custom = this.element.move.classList.contains(`${this.prefix}-right`);
        this.setLocal();
    }
    // 自定义重置
    private rightReset() {
        this.freSet.value(this.defaultType);
        this.eqSet.value(this.defaultValue);
        this.changeEq(this.defaultValue);
    }
    // 存local
    private setLocal() {
        typeof this.config.localDate === 'function' && this.config.localDate(this.effect);
    }
    // 预设参数
    private setEffectPreset(type = this.defaultValue, force = false, target?: HTMLElement) {
        this.effect.left = type;

        this.audioEffect.setEffectPreset(type, force);

        if (target) {
            const prefix = this.prefix;
            Utils.query(
                `.${prefix}-panel
                .${prefix}-panel-preset-btn.${prefix}-active`,
            )?.classList.remove(`${prefix}-active`);
            target.classList?.add(`${prefix}-active`);
        }
    }
    // 设置自定义参数
    private customValue() {
        this.audioEffect.customEffect(this.effect.rightValue.slice(0), this.effect.rightType);
    }
    // 更新滑块值
    private updateEffectValue() {
        frequency[<keyof typeof frequency>this.effect.rightType].forEach((item: number, i: number) => {
            this.settingList[i].value(this.eq2ui(this.effect.rightValue[i]), true);
        });
    }
    // 左右滑动
    private panelMove(num: number) {
        if (num) {
            this.customValue();
            this.audioEffect.setGain(0);
            this.element.move.classList.add(`${this.prefix}-right`);
        } else {
            this.audioEffect.reload();
            this.setEffectPreset(this.effect.left, true);
            this.audioEffect.setGain(this.effect.gain);
            this.element.move.classList.remove(`${this.prefix}-right`);
        }
    }
    // 生成ui样式
    private tplUI() {
        const prefix = this.prefix;
        // 均衡器：
        let items = [];
        for (const value in tag2name) {
            if (tag2name.hasOwnProperty(value)) {
                items.push({
                    value,
                    name: tag2name[<keyof typeof tag2name>value],
                });
            }
        }
        this.eqSet = new Selectmenu($(`.${prefix}-panel-right-header-eq-select`), {
            mode: "absolute",
            items,
            arrow: false,
            hideMCS: true,
            // maxHeight: 150,
            // dark: true,
            // value: this.effect.right,
        });
        this.eqSet.value(this.effect.right);
        this.eqSet.on('change', (e: any) => {
            if (e.manual || e.value === 'custom') {
                e.manual && this.changeEq(e.value);
                this.config.track(e.value + '_r');
            }
        });

        // 分段：
        let typeList = [];
        for (const name in frequency) {
            if (frequency.hasOwnProperty(name)) {
                typeList.push({
                    name: `${name}段`,
                    value: name,
                });
            }
        }
        this.freSet = new Selectmenu($(`.${prefix}-panel-right-header-fre-select`), {
            mode: "absolute",
            items: typeList,
            arrow: false,
            hideMCS: true,
            // dark: true,
            // value: this.effect.rightType,
        });
        this.freSet.value(this.effect.rightType);
        this.freSet.on('change', (e: any) => {
            this.changeType(e.value, this.defaultValue);
            if (e.manual) {
                this.config.track(e.value + '_r');
            }
        });

        // 滑块
        let slider;
        frequency[<10>this.customLen].forEach((val: number, i: number) => {
            slider = new Slider(
                $(`.${prefix}-panel-right-body-eq-item${i} .${prefix}-panel-right-body-eq-slider`),
                {
                    // dark: true,
                    // value: this.eq2ui(this.effect.rightValue[i]),
                    // trackLength: 140,
                    // vertical: true,
                    // showTooltip: true,
                    precision: 140,
                    hint: true,
                    aclinic: false,

                    formatTooltip: (val: number) => {
                        return this.ui2eq(val).toFixed(1) + '';
                    },
                },
            );
            slider.value(this.eq2ui(this.effect.rightValue[i]));
            slider.on('move', (e: any) => {
                this.effect.rightValue[i] = this.ui2eq(e.value);
                if (this.effect.right !== 'custom') {
                    this.effect.right = 'custom';
                    this.eqSet.value(this.effect.right);
                    (<any>eqBand)[this.effect.rightType].custom = this.effect.rightValue;
                }
                this.customValue();
            });
            slider.on('change', (e: any) => {
                this.effect.rightValue[i] = this.ui2eq(e.value);
                if (this.effect.right !== 'custom') {
                    this.effect.right = 'custom';
                    this.eqSet.value(this.effect.right);
                    (<any>eqBand)[this.effect.rightType].custom = this.effect.rightValue;
                }
                this.customValue();
            });
            this.settingList.push(slider);
        });

        // gain
        this.gain = new Slider($(`.${prefix}-panel-left-gain .${prefix}-panel-left-gain-center`), {
            // dark: true,
            // value: this.eq2ui(this.effect.gain),
            // trackLength: 220,
            // showTooltip: true,
            precision: 220,
            hint: true,

            formatTooltip: (val: number) => {
                return this.ui2eq(val).toFixed(1) + '';
            },
        });
        this.gain.value(this.eq2ui(this.effect.gain));
        this.gain.on('move', (e: any) => {
            this.effect.gain = this.ui2eq(e.value);
            this.audioEffect.setGain(this.effect.gain);
        });
        this.gain.on('change', (e: any) => {
            this.effect.gain = this.ui2eq(e.value);
            this.audioEffect.setGain(this.effect.gain);
        });
    }
    // 切换均衡器
    private changeEq(eq: string) {
        this.resetEffectValue(eq);
        this.customValue();
        this.updateEffectValue();
    }
    // 切换type
    private changeType(type = this.defaultType, value = this.defaultValue) {
        this.effect.rightType = type;

        const prefix = this.prefix;
        const classList = Utils.query(`.${prefix}-panel-right-body`).classList;
        classList.remove(`${prefix}-panel-3`, `${prefix}-panel-5`);

        this.elementFreList = this.elementFreList || this.getFreList();

        if (type === '10') {
            this.elementFreList.forEach((item: HTMLElement, index: number) => {
                item.textContent = this.parseNum(frequency[type][index]);
            });
        } else {
            classList.add(`${prefix}-panel-${type}`);
            frequency[<keyof typeof frequency>type].forEach((item: number, index: number) => {
                this.elementFreList[index].textContent = this.parseNum(item);
            });
        }
        this.resetEffectValue();
        this.updateEffectValue();
        this.eqSet.value(value);
        this.audioEffect.setEffectType(type);
    }
    private eq2ui(val: number) {
        return val / this.baseRange + this.baseValue;
    }
    private ui2eq(val: number) {
        return (val - this.baseValue) * this.baseRange;
    }
    private parseNum(num: number) {
        if (num < 1000) {
            return num + '';
        } else {
            return num / 1000 + 'k';
        }
    }
    private getFreList() {
        const arr = [];
        for (let i = 0; i < 5; i++) {
            arr.push(
                document.querySelector(
                    `.${this.prefix}-panel-right-body-eq-item${i} .${this.prefix}-panel-right-body-eq-key`,
                ),
            );
        }
        return arr;
    }
    private tpl() {
        const prefix = this.prefix;
        let btn = '';
        let slider = '';
        let active = '';
        for (const item in presetInfo) {
            if (item === this.effect.left) {
                active = `${prefix}-active`;
            }
            btn += `<span class="${prefix}-panel-preset-btn ${active}" data-val="${item}">${presetInfo[<keyof typeof presetInfo>item]}</span>`;
            active = '';
        }
        frequency[<10>this.customLen].forEach((val: number, i: number) => {
            slider += `<div class="${prefix}-panel-right-body-eq-item${i}">
                        <div class="${prefix}-panel-right-body-eq-slider"></div>
                        <div class="${prefix}-panel-right-body-eq-key">${this.parseNum(val)}</div>
                    </div>`;
        });
        return `<div class="${prefix}-panel ${prefix}-${this.config.theme}">
                    <div class="${prefix}-panel-close" data-val="close">${closeSvg}</div>
                    <div class="${prefix}-panel-move">
                        <div class="${prefix}-panel-left">
                            <div class="${prefix}-panel-left-header">音效调节</div>
                            <div class="${prefix}-panel-left-preset">${btn}</div>
                            <div class="${prefix}-panel-left-gain">
                                    <div class="${prefix}-panel-left-gain-title">音量增强</div>
                                    <div class="${prefix}-panel-left-gain-left">-12dp</div>
                                    <div class="${prefix}-panel-left-gain-center">0dp</div>
                                    <div class="${prefix}-panel-left-gain-left">+12dp</div>
                                </div>
                            <div class="${prefix}-panel-left-reset">
                                <span class="${prefix}-panel-preset-btn" data-val="default">重置</span>
                                <span class="${prefix}-panel-left-show-more" data-val="right">自定义</span>
                            </div>
                        </div>
                        <div class="${prefix}-panel-right">
                            <div class="${prefix}-panel-right-return"  data-val="left">预设</div>
                            <div class="${prefix}-panel-right-header">
                                <div class="${prefix}-panel-right-header-eq">
                                    <span>均衡器：</span>
                                    <span class="${prefix}-panel-right-header-eq-select"></span>
                                </div>
                                <div class="${prefix}-panel-right-header-fre">
                                    <span>分段：</span>
                                    <span class="${prefix}-panel-right-header-fre-select"></span>
                                </div>
                            </div>
                            <div class="${prefix}-panel-right-body ${prefix}-panel-${this.effect.rightType}">
                                <div class="${prefix}-panel-right-body-eq">
                                    <div class="${prefix}-panel-right-body-eq-item">
                                        <span>+12</span>
                                        <span>0</span>
                                        <span>-12</span>
                                    </div>
                                    ${slider}
                                </div>
                            </div>
                            <div class="${prefix}-panel-right-reset">
                                <span class="${prefix}-panel-preset-btn" data-val="rightReset">重置</span>
                            </div>
                        </div>
                    </div>
                </div>`;
    }

    exportEffect() {
        return this.effect;
    }
}
