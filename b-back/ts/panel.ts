import { IConfig } from '../index';
import { tabList, ajax, isEmail, isQQ, track } from './state';
import closeSvg from '../static/img/close.svg';
import SpeedTester, { IReportData } from '@jsc/speed-tester';
import Bar from './circle-bar';

interface IData {
    content: string;
    aid: number;
    bvid: string;
    tag_id: number;
    jsonp: string;
    browser: string;
    version: string;
    email?: string;
    qq?: string;
    other?: string;
}
interface IOptions {
    ip?: string;
    dns?: string;
    avid?: number;
    bvid?: string;
    cid?: number;
    uuid?: string;
    ua?: string;
    version?: string;
    header?: any;
    progress?: string;
    playurl?: string;
    speed?: number | string;
    reason?: string;
    speedDetails?: Array<IReportData>;
}
interface IPlayInfo {
    url: string;
    cid: number;
    progress: number;
    videoInfo: any;
    testLog: any;
    eventLog: any;
    dashDetails: any;
    showBv: boolean;
}
interface IResponseData {
    code: number;
    message?: string;
    data?: any;
}
interface IAjaxConfig {
    data: IData;
    success: (res: IResponseData) => void;
    error: () => void;
}
export default class Panel {
    private prefix: string;
    private showClass: string;
    private inited!: boolean;
    private container: HTMLElement;
    private templete!: { [key: string]: HTMLElement; };
    private data!: IData;
    private options!: IOptions;
    private clientPromise!: Promise<any>;
    private playInfo!: IPlayInfo;
    private bar!: Bar;
    private once!: boolean;
    constructor(private config: Required<IConfig>) {
        this.container = this.config.container;
        this.prefix = this.config.prefix;
        this.showClass = `${this.prefix}-show`;
    }
    showPanel() {
        if (!this.inited) {
            this.init();
        }
        this.getClient();
        this.reset();
        this.show(this.templete.wrap);
    }
    hidePanel() {
        if (this.inited) {
            this.hide(this.templete.wrap);
            this.bar?.dispose();
        }
    }
    // 一键反馈
    directFeedback(cb: (success: boolean) => void) {
        if (this.once) {
            return;
        }
        this.resetDate();
        this.once = true;
        this.data.tag_id = 307;
        this.playInfo = this.config.getPlayInfo();
        if (this.playInfo.showBv) {
            delete (<any>this).data.aid;
        } else {
            delete (<any>this).data.bvid;
        }
        this.submitRequest({
            data: this.data,
            success: (res: IResponseData) => {
                if (res.code === 0) {
                    cb(true);
                } else {
                    cb(false);
                }
            },
            error: () => {
                cb(false);
            },
        });
    }
    destroy() {
        if (this.inited) {
            this.inited = false;
            this.container.removeChild(this.templete.wrap);
            this.hide(this.templete.submit);
        }
    }

    resetDate() {
        this.data = {
            tag_id: 0,
            content: '',
            jsonp: 'jsonp',
            aid: this.config.aid,
            bvid: this.config.bvid,
            browser: window.navigator.userAgent,
            version: this.config.version,
        };
        this.once = false;
    }
    private reset() {
        this.resetDate();
        (this.templete.otherInput as HTMLInputElement).value = '';
        (this.templete.contact as HTMLInputElement).value = '';
        this.templete.title.textContent = '播放器问题反馈';
        this.hideCurrent();
        this.hide(document.querySelector(`.${this.prefix}-tabmenu-list.${this.showClass}`)!);
        this.hide(this.templete.other);
        this.hide(this.templete.submit);
        this.show(this.templete.context);
    }
    private init() {
        this.inited = true;
        const prefix = this.prefix;
        this.container.insertAdjacentHTML('beforeend', this.tpl());
        this.templete = {
            wrap: document.querySelector(`.${prefix}`)!,
            panel: document.querySelector(`.${prefix}-panel`)!,
            title: document.querySelector(`.${prefix}-title-content`)!,
            context: document.querySelector(`.${prefix}-content-default`)!,
            other: document.querySelector(`.${prefix}-content-input`)!,
            otherInput: document.querySelector(`.${prefix}-content-input .${prefix}-input`)!,
            otherErr: document.querySelector(`.${prefix}-input-overrange`)!,
            contact: document.querySelector(`.${prefix}-contact-information-input`)!,
            typeErr: document.querySelector(`.${prefix}-type-error`)!,
            submit: document.querySelector(`.${prefix}-submit`)!,
        };
        this.events();
    }
    private events() {
        this.templete.otherInput.addEventListener('keyup', (e) => {
            if ((this.templete.otherInput as HTMLInputElement).value.length >= 100) {
                this.show(this.templete.otherErr);
            } else {
                this.hide(this.templete.otherErr);
            }
        });
        this.templete.panel.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const val = target?.dataset?.val;
            // console.log(val);
            switch (val) {
                case 'close':
                    this.hidePanel();
                    break;
                case 'presubmit':
                    this.beforeSubmit();
                    break;
                case 'submit':
                    this.submit();
                    break;
                case 'qq':
                    this.hide(this.templete.typeErr);
                    break;
                case 'test':
                    this.showTestSuc();
                    break;
                default:
                    this.tabmenu(Number(val), e.target as HTMLElement);
                    break;
            }
            if (track[<keyof typeof track>val]) {
                this.config.track(track[<keyof typeof track>val]);
            }
        });
    }
    // 选择反馈原因
    private tabmenu(tagId: number, target: HTMLElement) {
        if (!tagId || this.data.tag_id === tagId) return;

        if (tagId === 307) {
            this.show(this.templete.other);
        } else {
            this.hide(this.templete.other);
        }
        this.show(this.templete.submit);
        this.hide(document.querySelector(`.${this.prefix}-tabmenu-list.${this.showClass}`)!);
        this.show(target);

        this.data.tag_id = tagId;
    }
    // 提交前整理数据
    private beforeSubmit() {
        if (!this.data.tag_id) {
            return this.createToolTip('你还没选反馈理由噢 > <');
        }
        const qq = (<HTMLInputElement>this.templete.contact).value;
        if (!this.contactInformationCheck(qq)) {
            return false;
        }
        if (isEmail(qq)) {
            this.data.email = qq;
        } else if (isQQ(qq)) {
            this.data.qq = qq;
        }

        this.playInfo = this.config.getPlayInfo();
        if (this.playInfo.showBv) {
            delete (<any>this).data.aid;
        } else {
            delete (<any>this).data.bvid;
        }
        this.data.content = '';
        switch (this.data.tag_id) {
            case 307:
                const text = (this.templete.otherInput as HTMLInputElement).value;
                if (!text) {
                    return this.createToolTip('请描述具体的问题噢 > <');
                }
                if (text?.length >= 100) {
                    return;
                }
                this.data.content = text;
                break;
            case 300:
            case 301:
            case 305:
                if (this.playInfo.url) {
                    this.config.track('player_feedback_confirm');
                    this.showTest();
                    return;
                }
                break;
            default:
                break;
        }

        this.submit();
    }

    // 提交
    private submit() {
        this.data.other = JSON.stringify({
            cache_info: this.options.header?.HTTP_X_CACHE_SERVER,
            dns_info: this.options.dns,
            progress: this.playInfo.progress,
            cid: this.playInfo.cid,
            playurl: this.playInfo.url,
            video_info: this.playInfo.videoInfo,
            test_log: this.playInfo.testLog,
            event_log: this.playInfo.eventLog,
            speed: this.options.speed,
            speedDetails: this.options.speedDetails,
            dashDetails: this.playInfo.dashDetails,
        });
        this.submitRequest({
            data: this.data,
            success: (res: IResponseData) => {
                if (res.code === 0) {
                    this.showSuccess();
                } else if (res.code === 18003) {
                    this.showFail('', '你今天已经提交太多次啦 > <');
                    this.hide(document.querySelector(`.${this.prefix}-fail-resubmit`)!);
                } else {
                    this.showFail(`:${res.code}`);
                }
            },
            error: () => {
                this.showFail('');
                this.show(document.querySelector(`.${this.prefix}-fail-resubmit`)!);
            },
        });
    }
    private submitRequest(config: IAjaxConfig) {
        $.ajax({
            url: '//api.bilibili.com/x/web-interface/feedback',
            type: 'post',
            data: config.data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (res: IResponseData) => {
                config.success(res);
            },
            error: () => {
                config.error();
            },
        });
    }
    // 反馈成功
    private showSuccess() {
        if (!this.templete.success) {
            this.templete.success = document.querySelector(`.${this.prefix}-content-success`)!;
            this.templete.success.innerHTML = this.successTpl();
        }
        this.hideCurrent();
        this.show(this.templete.success);
        this.templete.title.textContent = '反馈提交成功';
    }
    // 反馈失败
    private showFail(code: string, title?: string) {
        if (!this.templete.fail) {
            this.templete.fail = document.querySelector(`.${this.prefix}-content-fail`)!;
            this.templete.fail.innerHTML = this.failTpl();
        }
        this.hideCurrent();
        this.show(this.templete.fail);
        document.querySelector(`.${this.prefix}-content-fail-title-code`)!.textContent = code;
        this.templete.title.textContent = title ?? '反馈提交失败';
    }
    // 测试面板
    private showTest() {
        if (!this.templete.test) {
            this.templete.test = document.querySelector(`.${this.prefix}-content-test`)!;
            this.templete.test.innerHTML = this.testTpl();
        }
        this.hideCurrent();
        this.show(this.templete.test);
    }
    // 点击测试显示面板
    private showTestSuc() {
        if (!this.templete.testSuc) {
            this.templete.testSuc = document.querySelector(`.${this.prefix}-content-test-success`)!;
            this.templete.testSuc.innerHTML = this.testSuccessTpl();
            this.bar = new Bar({
                prefix: this.prefix + '-circle',
                container: document.querySelector(`.${this.prefix}-content-test-success-circle-wrap`)!,
                timeout: 5000,
            });
        }
        this.bar.reset();
        this.bar.start();
        this.hideCurrent();
        this.show(this.templete.testSuc);
        this.startTest();
    }
    // 测试
    private startTest() {
        let speedtester = new SpeedTester({
            timeout: 5000,
            defaultData: 1 * 1024 * 1024,
            onProgress: (progress: number, total: number, speed: number) => {
                // console.log(`progress: ${progress}, total: ${total}`);
                this.options.speed = speedtester.trans(speed);
            },
        });
        speedtester
            .start()
            .then((reportData: Array<IReportData>) => {
                if (reportData) {
                    this.options.speedDetails = reportData;
                }
                if (reportData.length && reportData[0].speed) {
                    this.options.speed = speedtester.trans(reportData[0].speed);
                    this.bar?.end(this.options.speed);
                } else {
                    this.showTestFail();
                    this.options.speed = 0;
                }
            })
            .catch(() => {
                this.showTestFail();
                this.options.speed = 0;
            });
    }
    // 测试失败
    private showTestFail() {
        if (!this.templete.testFail) {
            this.templete.testFail = document.querySelector(`.${this.prefix}-content-test-fail`)!;
            this.templete.testFail.innerHTML = this.testFailTpl();
        }
        this.hideCurrent();
        this.show(this.templete.testFail);
    }
    // 获取网络信息
    private getClient() {
        this.clientPromise = ajax({
            url: '//api.bilibili.com/client_info?type=json',
            withCredentials: true,
            responseType: 'json',
        }).then((res: IResponseData) => {
            const data = res.data;
            this.options = {
                ip: data.ip,
                dns: data.dns,
                uuid: window['uid'] || '',
                ua: navigator.userAgent,
                header: data.header,
                speed: '',
                reason: '',
            };
        });
        return this.clientPromise;
    }
    private createToolTip(text: string) {
        if (!this.templete.tooltip) {
            this.templete.tooltip = document.createElement('div');
            this.templete.tooltip.className = `${this.prefix}-tooltip`;
            this.templete.panel.appendChild(this.templete.tooltip);
        }
        this.templete.tooltip.textContent = text;
        this.show(this.templete.tooltip);
        setTimeout(() => {
            this.hide(this.templete.tooltip);
        }, 3000);
    }

    // 显示
    private show(dom: HTMLElement) {
        dom?.classList.add(this.showClass);
    }
    // 隐藏
    private hide(dom: HTMLElement) {
        dom?.classList.remove(this.showClass);
    }
    // 隐藏
    private hideCurrent() {
        this.hide(document.querySelector(`.${this.prefix}-content>.${this.showClass}`)!);
    }
    private contactInformationCheck(val: string) {
        if (!val || isEmail(val) || isQQ(val)) {
            this.hide(this.templete.typeErr);
            return true;
        } else {
            this.show(this.templete.typeErr);
            return false;
        }
    }
    // 生成选项
    private tabmenuTPL() {
        let tabmenu = '';
        for (let i = 0; i < tabList.length; i++) {
            tabmenu += `<div class="${this.prefix}-tabmenu-list" data-val="${tabList[i].value}">${tabList[i].title}</div>`;
        }
        return tabmenu;
    }
    private tpl() {
        const prefix = this.prefix;
        const id = this.config.bvid ? `bvid=${this.config.bvid}` : `avid=${this.config.aid}`;
        return ` <div class="${prefix}">
            <div class="${prefix}-panel">
                <div class="${prefix}-title">
                    <span class="${prefix}-title-content"></span>
                    <span class="${prefix}-panel-close" data-val="close">${closeSvg}</span>
                </div>
                <div class="${prefix}-content">
                    <div class="${prefix}-content-default ${this.showClass}">
                        <div class="${prefix}-content-tabmenu">${this.tabmenuTPL()}</div>
                        <div class="${prefix}-content-input">
                            <input type="text" class="${prefix}-input" placeholder="问题描述，限100字以内">
                            <div class="${prefix}-input-overrange">超出100字</div>
                        </div>
                        <div class="${prefix}-contact-information">
                            <span class="${prefix}-contact-information-tip">联系方式</span>
                            <input type="text" class="${prefix}-contact-information-input" placeholder="留下QQ/邮箱，便于进一步解决问题" data-val="qq">
                            <div class="${prefix}-type-error">请输入正确的联系方式</div>
                        </div>
                        <div class="${prefix}-submit-wrap">
                            <div class="${prefix}-submit disable" data-val="presubmit">确定</div>
                        </div>
                        <div class="${prefix}-version-wrap">
                            <a href="//www.bilibili.com/blackboard/webplayer_history.html#html5" target="_blank" class="${prefix}-version-store" data-val="store">版本记录</a>
                            <a href="//www.bilibili.com/blackboard/activity-GBnHKZEX.html" target="_blank" class="${prefix}-version-forum" data-val="forum">反馈论坛</a>
                            <a href="//www.bilibili.com/blackboard/help.html#常见问题自救方法?id=c9954d53034d43d796465e24eb792593" target="_blank" class="${prefix}-version-selfhelp" data-val="selfhelp">自救方法</a>
                            <a href="//www.bilibili.com/blackboard/video-diagnostics.html?${id}&cid=${this.config.cid
            }" target="_blank" class="${prefix}-version-networkspeed" data-val="networkspeed">播放测速</a>
                        </div>
                    </div>
                    <div class="${this.prefix}-content-success"></div>
                    <div class="${this.prefix}-content-fail"></div>
                    <div class="${this.prefix}-content-test"></div>
                    <div class="${this.prefix}-content-test-success"></div>
                    <div class="${this.prefix}-content-test-fail"></div>
                </div>
            </div>
        </div>`;
    }
    private successTpl() {
        const success = `${this.prefix}-content-success`;
        return `<div class="${success}-image"></div>
        <div class="${success}-title">反馈已收到我们会持续跟进,大感谢!</div>
        <div class="${success}-tips-wrap">
            <div class="${success}-tips">播放器问题反馈邮箱: <a href="mailto:feedback@bilibili.com">feedback@bilibili.com</a></div>
            <div class="${success}-tips">QQ反馈群: 418984413</div>
            <div class="${success}-tips">反馈论坛: <a href="https://www.bilibili.com/blackboard/activity-GBnHKZEX.html" target="_blank">#用户反馈论坛#</a></div>
        </div>`;
    }
    private failTpl() {
        const fail = `${this.prefix}-content-fail`;
        return `<div class="${fail}-title">啊哦，提交失败啦> <<span class="${fail}-title-code">404</span></div>
        <div class="${fail}-image"></div>
        <div class="${fail}-tips-wrap">
            <div class="${fail}-tips">播放器问题反馈邮箱: <a href="mailto:feedback@bilibili.com">feedback@bilibili.com</a></div>
            <div class="${fail}-tips">QQ反馈群: 418984413</div>
            <div class="${fail}-tips">反馈论坛: <a href="https://www.bilibili.com/blackboard/activity-GBnHKZEX.html" target="_blank">#用户反馈论坛#</a></div>
        </div>
        <div class="${fail}-resubmit ${this.showClass}" data-val="submit">重新提交</div>`;
    }
    private testTpl() {
        const pre = `${this.prefix}-content-test`;
        return `<div class="${pre}-title">距离反馈递交就差一步啦 (ฅ>ω<*ฅ)</div>
        <div class="${pre}-image"></div>
        <div class="${pre}-tips">（非必需）上报网络速度，以帮助我们更好定位问题</div>
        <div class="${pre}-btn-wrap">
            <div class="${pre}-speedtest" data-val="test">一键测速</div>
            <div class="${pre}-submit" data-val="submit">提交</div>
        </div>`;
    }
    private testSuccessTpl() {
        const suc = `${this.prefix}-content-test-success`;
        return `<div class="${suc}-title">距离反馈递交就差一步啦 (ฅ>ω<*ฅ)</div>
        <div class="${suc}-circle-wrap"></div>
        <div class="${suc}-submit" data-val="submit">提交</div>`;
    }
    private testFailTpl() {
        const fail = `${this.prefix}-content-test-fail`;
        return `<div class="${fail}-image"></div>
        <div class="${fail}-title">测速失败啦，如果亲赶时间，可以选择直接提交啦> <</div>
        <div class="${fail}-btn-wrap">
           <div class="${fail}-speedtest" data-val="test">重新测速</div>
            <div class="${fail}-submit" data-val="submit">提交</div>
        </div>`;
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        uid?: string;
    }
}