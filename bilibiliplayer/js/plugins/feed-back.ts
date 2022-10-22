import ApiFeedbackModify, { ApiFeedbackModifyInData, ApiFeedbackModifyOutData } from '../io/api-sm-feedback';
import { Button } from '@jsc/player-auxiliary/js/ui/button';
import { Tabmenu } from '@jsc/player-auxiliary/js/ui/tabmenu';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';

export interface IDataInterface {
    cid: number;
    sid: number; // 字幕 id
    from: number; // 开始时间
    to: number; // 结束时间
    content?: string; // 反馈字幕
    tid?: number; // 反馈原因id
    metadata?: string; // 反馈原因id
}

interface IConfigInterface {
    title?: string; // 面板标题
    container?: JQuery;
    showTextArea?: boolean;
    theme?: string;
    prefix?: string;
    labels?: any[];
}
class FeedbackPanel {
    private prefix: string;
    private config: IConfigInterface;
    private data: IDataInterface;
    private TPL!: JQuery;
    private feedback: any;
    private container: JQuery;
    private submitBtn!: Button;
    private inited: boolean = false;
    private showTextArea: boolean = false; // 根据操作变化
    private feedbackList: IDataInterface[] = []; // 已反馈字幕列表

    constructor(config: IConfigInterface) {
        this.prefix = config.prefix!;
        this.config = $.extend(
            true,
            {},
            {
                title: '反馈',
                container: $(`.${this.prefix}-video-wrap`),
                showTextArea: false, // 初始化后不可变
                theme: 'black',
                labels: [],
            },
            config,
        );
        this.data = {
            cid: 0,
            sid: 0,
            tid: 0,
            from: 0,
            to: 0,
            content: '',
            metadata: '',
        };
        this.container = config.container!;
    }

    isTextShow() {
        if (this.showTextArea) {
            this.TPL.find('textarea').show();
        } else {
            this.TPL.find('textarea').hide();
        }
    }

    show(data: IDataInterface, labels?: any[]) {
        if (labels) {
            this.config.labels = labels;
        }
        if (!this.inited) {
            this.init();
        }
        this.data = $.extend(true, this.data, data);
        this.showRadio();
        this.isTextShow();
        this.feedback.content.text(data.content);
        this.TPL.css('display', 'flex');
    }

    hide() {
        this.TPL.find('textarea').val('');
        this.showTextArea = this.config.showTextArea!;
        this.data.tid = 0;
        this.submitBtn.disable();
        this.TPL.css('display', 'none');
    }

    judge(data: IDataInterface) {
        return this.feedbackList.some((item: IDataInterface) => {
            return item.content === data.content && item.from === data.from;
        });
    }

    private init() {
        const prefix = this.prefix;
        this.inited = true;
        this.container.append(this.REPORT_TPL());

        this.TPL.find(`.${prefix}-feedback-close`).click(() => {
            this.hide();
        });
        this.feedback = {
            panel: this.TPL.find(`.${prefix}-feedback-panel`),
            submit: this.TPL.find(`.${prefix}-feedback-submit`),
            content: this.TPL.find(`.${prefix}-feedback-content`),
            radio: this.TPL.find(`.${prefix}-radios`),
        };
        this.submitBtn = new Button(this.feedback.submit, {
            disabled: true,
        }).on('click', () => {
            if (this.data.tid !== 0) {
                this.sendFeedback();
            }
        });
        this.showRadio();
    }

    private showRadio() {
        this.feedback.radio.html('');
        if (this.config.labels!.length > 0) {
            new Tabmenu(this.feedback.radio, {
                type: "radios",
                defaultSelected: false,
                items: this.config.labels!,
            }).on('change', (e) => {
                this.submitBtn.enable();
                this.data.tid = +e.value;
                switch (e.value) {
                    case '5':
                        this.showTextArea = true;
                        break;
                    default:
                        this.showTextArea = false;
                }
                this.isTextShow();
            });
        }
    }

    private sendFeedback() {
        if (this.data.content) {
            const data: IDataInterface = {
                cid: this.data.cid,
                sid: this.data.sid,
                tid: this.data.tid,
                from: this.data.from,
                to: this.data.to,
                content: this.data.content,
                metadata: '' + this.TPL.find('textarea').val(),
            };
            new ApiFeedbackModify(<ApiFeedbackModifyInData>data).getData({
                success: (res: ApiFeedbackModifyOutData) => {
                    this.callback('反馈成功!', res);
                },
                error: (error: JQuery.jqXHR<any>) => {
                    this.callback('反馈失败', error);
                },
            });
        }
    }

    private callback(defText: any, resp: any) {
        let respText = defText;
        switch (resp.code) {
            case 0:
                this.feedbackList.push(this.data);
                respText = '反馈成功!';
                break;
            default:
                respText = resp.message || '反馈失败';
                break;
        }
        new Tooltip({
            name: 'response',
            target: this.container,
            position: 'center-center',
            padding: [15, 20, 15, 20],
            text: respText,
        });
        this.hide();
    }

    private REPORT_TPL() {
        const prefix = this.prefix;
        this.TPL = $(`
            <div class="${prefix}-feedback-wrap" style="z-index:9999">
                <div class="${prefix}-feedback-box">
                    <div class="${prefix}-feedback-panel">
                        <div class="${prefix}-feedback-title">${this.config.title}<span class="${prefix}-feedback-close"><i class="${prefix}-iconfont icon-close"></i></span></div>
                        <div class="${prefix}-feedback-content"></div>
                        <div class="${prefix}-feedback-select-list-wrap">
                            <div class="${prefix}-panel-setting">
                                <div class="${prefix}-setting-btn-wrap">
                                    <div class="${prefix}-radios"></div>
                                </div>
                            </div>
                        </div>
                        <textarea maxlength="100" style="display:none;" class="${prefix}-feedback-reason" placeholder="请输入详细的理由"></textarea>
                        <div class="${prefix}-feedback-bottom">
                            <div class="${prefix}-feedback-submit">确定</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        return this.TPL;
    }
}

export default FeedbackPanel;
