import Tooltip from './tooltip';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import { Button } from '../ui/button';
import { Tabmenu } from '../ui/tabmenu';

interface IConfig {
    container?: JQuery;
    showTextArea?: boolean;
    theme?: string;
}

interface IDanmaku {
    border?: boolean;
    borderColor?: number;
    class?: number;
    color?: number;
    date?: number;
    dmid?: string;
    mode?: number;
    on?: true;
    size?: number;
    stime?: number;
    text?: string;
    uid?: string | number;
}

interface IReportInfo {
    template?: JQuery;
    showTextArea?: boolean;
    reportType?: number;
    reportList?: string;
    wrap?: JQuery;
    panel?: JQuery;
    success_box?: JQuery;
    dmid?: string;
    show?: (danmaku: IDanmaku, container?: JQuery) => void;
    hide?: () => void;
    reason?: () => number | string | string[];
    content?: (text: string) => void;
}
type DefText =
    | '举报成功!'
    | '举报失败'
    | '举报失败，请先激活账号。'
    | '举报失败，系统拒绝受理您的举报请求。'
    | '举报失败，您已经被禁言。'
    | '您的操作过于频繁，请稍后再试。'
    | '您已经举报过这条弹幕了。'
    | '举报失败，系统错误。';

class Report {
    report: IReportInfo;
    reported: string[];

    private auxiliary: Auxiliary;
    private prefix: string;
    private config: IConfig;
    private TPL!: JQuery;
    private selecter!: Tabmenu;
    constructor(auxiliary: Auxiliary, config: IConfig) {
        this.auxiliary = auxiliary;
        this.prefix = this.auxiliary.prefix;
        this.config = $.extend(
            true,
            {},
            {
                container: $(`.${this.prefix}-auxiliary-area`),
                // container: $('.bilibili-player-wraplist'),
                showTextArea: false,
                theme: 'white',
            },
            config,
        );
        this.report = {};
        this.reported = [];
        this.reportInit();
        this.isTextShow();
    }
    REPORT_TPL() {
        const prefix = this.prefix;
        this.TPL = $(`
            <div class="${prefix}-danmaku-report-wrap" style="z-index:9999">
                <div class="${prefix}-danmaku-report-success-box">
                </div>
                <div class="${prefix}-danmaku-report-box">
                    <div class="${prefix}-danmaku-report-panel">
                        <div class="${prefix}-report-panel-title">举报弹幕<i class="${prefix}-iconfont ${prefix}-panel-close icon-close"></i></div>
                        <div class="${prefix}-report-content">举报文字</div>
                        <input type="hidden" class="${prefix}-report-id" value="" />
                        <input type="hidden" class="${prefix}-report-dmid" value="" />
                        <div class="${prefix}-report-select-list-wrap">
                            <div class="${prefix}-panel-setting">
                                <div class="${prefix}-setting-btn-wrap">
                                    <div class="${prefix}-radios"></div>
                                </div>
                            </div>
                        </div>
                        <textarea maxlength="100" style="display:none;" class="${prefix}-report-reason" placeholder="请输入详细的理由"></textarea>
                        <div class="${prefix}-danmaku-report-bottom">
                            <div class="${prefix}-danmaku-report-submit">确定</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        return this.TPL;
    }
    isTextShow() {
        if (this.config.showTextArea) {
            this.report.template!.find('textarea').show();
        } else {
            this.report.template!.find('textarea').hide();
        }
    }
    private postReport(data: any, callback: Function) {
        // 223001
        this.auxiliary.directiveManager.sender(WD.DR_SEND_REPORT, data, (received?: IReceived) => {
            const res = received!['data'];
            if (res) {
                callback('举报成功!', res);
            } else {
                callback('举报失败');
            }
        });
    }
    private reportInit() {
        const that = this;
        const prefix = this.prefix;
        this.report = {
            template: that.REPORT_TPL(),
            show: (danmaku: IDanmaku, container?: JQuery) => {
                this.report.hide!();
                this.reportInit();
                if (this.config.theme === 'white') {
                    this.report.template!.addClass(`${prefix}-danmaku-report-wrap-white`);
                }
                container = this.config.container || container;
                this.report.template!.css('display', 'flex').appendTo(container!);
                this.report.content!(danmaku.text!);
                this.report.dmid = danmaku.dmid;
                this.report.wrap!.show();
                this.report.panel!.show();
                this.report.success_box!.hide();
            },
            hide: () => {
                this.report.reason!();
                this.report.template && this.report.template.remove && this.report.template.remove();
            },
            reason: () => {
                if (this.report.reportType === 11) {
                    return this.report.template!.find('textarea').val()!;
                } else {
                    return '';
                }
            },
            content: (value?: string) => {
                if (typeof value === 'undefined') {
                    return this.report.template!.find(`.${prefix}-report-content`).html();
                } else {
                    this.report.template!.find(`.${prefix}-report-content`).text(value).attr('title', value);
                }
            },
            reportType: 0,
        };
        this.report.template!.find(`.${prefix}-panel-close`).click(() => {
            this.report.hide!();
        });
        this.report.panel = this.report.template!.find(`.${prefix}-danmaku-report-panel`);
        this.report.wrap = this.report.template!.find(`.${prefix}-danmaku-report-wrap`);
        this.report.success_box = this.report.template!.find(`.${prefix}-danmaku-report-success-box`);
        const submitBtn = new Button(this.report.template!.find(`.${prefix}-danmaku-report-submit`), {
            type: "small",
            click: () => {
                if (that.report.reportType) {
                    const data = {
                        dmid: that.report.dmid, // danmaku id
                        reason: that.report.reportType,
                        content: that.report.reason!(),
                    };
                    const callback = (defText: DefText, resp: any) => {
                        let respText = defText;
                        switch (resp.code) {
                            case 0:
                                respText = '举报成功!';
                                break;
                            case -1:
                                respText = '举报失败，请先激活账号。';
                                break;
                            case -2:
                                respText = '举报失败，系统拒绝受理您的举报请求。';
                                break;
                            case -3:
                                respText = '举报失败，您已经被禁言。';
                                break;
                            case -4:
                                respText = '您的操作过于频繁，请稍后再试。';
                                break;
                            case -5:
                                respText = '您已经举报过这条弹幕了。';
                                break;
                            case -6:
                                respText = '举报失败，系统错误。';
                                break;
                            default:
                                respText = resp.message || '举报失败';
                                break;
                        }
                        if (resp.code === 0 || resp.code === -5) {
                            that.reported.push(that.report.dmid!);
                            console.log(that.reported);
                        }
                        switch (that.config.theme) {
                            case 'white':
                                new Tooltip({
                                    name: 'response',
                                    target: that.auxiliary.template.auxiliaryArea,
                                    position: 'center-center',
                                    padding: [15, 20, 15, 20],
                                    text: respText,
                                });
                                break;
                            default:
                                new Tooltip({
                                    name: 'response',
                                    target: that.auxiliary.template.playerWrap,
                                    position: 'center-center',
                                    padding: [15, 20, 15, 20],
                                    text: respText,
                                });
                                break;
                        }
                        that.report.panel!.hide();
                        that.report.reportList = '';
                        that.report.hide!();
                    };
                    that.postReport(data, callback);
                }
            }
        });
        this.selecter = new Tabmenu(this.report.template!.find(`.${prefix}-radios`), {
            type: "radios",
            defaultSelected: false,

            items: [
                {
                    name: '违法违禁',
                    value: '1',
                },
                {
                    name: '色情低俗',
                    value: '2',
                },
                {
                    name: '恶意刷屏',
                    value: '9',
                },
                {
                    name: '赌博诈骗',
                    value: '3',
                },
                {
                    name: '人身攻击',
                    value: '4',
                },
                {
                    name: '侵犯隐私',
                    value: '5',
                },
                {
                    name: '垃圾广告',
                    value: '6',
                },
                {
                    name: '视频无关',
                    value: '10',
                },
                {
                    name: '引战',
                    value: '7',
                },
                {
                    name: '剧透',
                    value: '8',
                },
                {
                    name: '青少年不良信息',
                    value: '12',
                },
                {
                    name: '其它',
                    value: '11',
                },
            ],

            change: e => {
                submitBtn.enable();
                switch (e.value) {
                    case '11':
                        {
                            this.config.showTextArea = true;
                            this.report.reportType = parseInt(e.value, 10);
                        }
                        break;
                    default: {
                        this.config.showTextArea = false;
                        this.report.reportType = parseInt(e.value, 10);
                    }
                }
                this.isTextShow();
            }
        });
    }
}

export default Report;
