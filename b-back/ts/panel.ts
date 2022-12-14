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
    // ????????????
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
        this.templete.title.textContent = '?????????????????????';
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
    // ??????????????????
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
    // ?????????????????????
    private beforeSubmit() {
        if (!this.data.tag_id) {
            return this.createToolTip('??????????????????????????? > <');
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
                    return this.createToolTip('??????????????????????????? > <');
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

    // ??????
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
                    this.showFail('', '????????????????????????????????? > <');
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
    // ????????????
    private showSuccess() {
        if (!this.templete.success) {
            this.templete.success = document.querySelector(`.${this.prefix}-content-success`)!;
            this.templete.success.innerHTML = this.successTpl();
        }
        this.hideCurrent();
        this.show(this.templete.success);
        this.templete.title.textContent = '??????????????????';
    }
    // ????????????
    private showFail(code: string, title?: string) {
        if (!this.templete.fail) {
            this.templete.fail = document.querySelector(`.${this.prefix}-content-fail`)!;
            this.templete.fail.innerHTML = this.failTpl();
        }
        this.hideCurrent();
        this.show(this.templete.fail);
        document.querySelector(`.${this.prefix}-content-fail-title-code`)!.textContent = code;
        this.templete.title.textContent = title ?? '??????????????????';
    }
    // ????????????
    private showTest() {
        if (!this.templete.test) {
            this.templete.test = document.querySelector(`.${this.prefix}-content-test`)!;
            this.templete.test.innerHTML = this.testTpl();
        }
        this.hideCurrent();
        this.show(this.templete.test);
    }
    // ????????????????????????
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
    // ??????
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
    // ????????????
    private showTestFail() {
        if (!this.templete.testFail) {
            this.templete.testFail = document.querySelector(`.${this.prefix}-content-test-fail`)!;
            this.templete.testFail.innerHTML = this.testFailTpl();
        }
        this.hideCurrent();
        this.show(this.templete.testFail);
    }
    // ??????????????????
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

    // ??????
    private show(dom: HTMLElement) {
        dom?.classList.add(this.showClass);
    }
    // ??????
    private hide(dom: HTMLElement) {
        dom?.classList.remove(this.showClass);
    }
    // ??????
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
    // ????????????
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
                            <input type="text" class="${prefix}-input" placeholder="??????????????????100?????????">
                            <div class="${prefix}-input-overrange">??????100???</div>
                        </div>
                        <div class="${prefix}-contact-information">
                            <span class="${prefix}-contact-information-tip">????????????</span>
                            <input type="text" class="${prefix}-contact-information-input" placeholder="??????QQ/????????????????????????????????????" data-val="qq">
                            <div class="${prefix}-type-error">??????????????????????????????</div>
                        </div>
                        <div class="${prefix}-submit-wrap">
                            <div class="${prefix}-submit disable" data-val="presubmit">??????</div>
                        </div>
                        <div class="${prefix}-version-wrap">
                            <a href="//www.bilibili.com/blackboard/webplayer_history.html#html5" target="_blank" class="${prefix}-version-store" data-val="store">????????????</a>
                            <a href="//www.bilibili.com/blackboard/activity-GBnHKZEX.html" target="_blank" class="${prefix}-version-forum" data-val="forum">????????????</a>
                            <a href="//www.bilibili.com/blackboard/help.html#?????????????????????????id=c9954d53034d43d796465e24eb792593" target="_blank" class="${prefix}-version-selfhelp" data-val="selfhelp">????????????</a>
                            <a href="//www.bilibili.com/blackboard/video-diagnostics.html?${id}&cid=${this.config.cid
            }" target="_blank" class="${prefix}-version-networkspeed" data-val="networkspeed">????????????</a>
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
        <div class="${success}-title">????????????????????????????????????,?????????!</div>
        <div class="${success}-tips-wrap">
            <div class="${success}-tips">???????????????????????????: <a href="mailto:feedback@bilibili.com">feedback@bilibili.com</a></div>
            <div class="${success}-tips">QQ?????????: 418984413</div>
            <div class="${success}-tips">????????????: <a href="https://www.bilibili.com/blackboard/activity-GBnHKZEX.html" target="_blank">#??????????????????#</a></div>
        </div>`;
    }
    private failTpl() {
        const fail = `${this.prefix}-content-fail`;
        return `<div class="${fail}-title">????????????????????????> <<span class="${fail}-title-code">404</span></div>
        <div class="${fail}-image"></div>
        <div class="${fail}-tips-wrap">
            <div class="${fail}-tips">???????????????????????????: <a href="mailto:feedback@bilibili.com">feedback@bilibili.com</a></div>
            <div class="${fail}-tips">QQ?????????: 418984413</div>
            <div class="${fail}-tips">????????????: <a href="https://www.bilibili.com/blackboard/activity-GBnHKZEX.html" target="_blank">#??????????????????#</a></div>
        </div>
        <div class="${fail}-resubmit ${this.showClass}" data-val="submit">????????????</div>`;
    }
    private testTpl() {
        const pre = `${this.prefix}-content-test`;
        return `<div class="${pre}-title">????????????????????????????????? (???>??<*???)</div>
        <div class="${pre}-image"></div>
        <div class="${pre}-tips">?????????????????????????????????????????????????????????????????????</div>
        <div class="${pre}-btn-wrap">
            <div class="${pre}-speedtest" data-val="test">????????????</div>
            <div class="${pre}-submit" data-val="submit">??????</div>
        </div>`;
    }
    private testSuccessTpl() {
        const suc = `${this.prefix}-content-test-success`;
        return `<div class="${suc}-title">????????????????????????????????? (???>??<*???)</div>
        <div class="${suc}-circle-wrap"></div>
        <div class="${suc}-submit" data-val="submit">??????</div>`;
    }
    private testFailTpl() {
        const fail = `${this.prefix}-content-test-fail`;
        return `<div class="${fail}-image"></div>
        <div class="${fail}-title">??????????????????????????????????????????????????????????????????> <</div>
        <div class="${fail}-btn-wrap">
           <div class="${fail}-speedtest" data-val="test">????????????</div>
            <div class="${fail}-submit" data-val="submit">??????</div>
        </div>`;
    }
}

//////////////////////////// ???????????? ////////////////////////////
declare global {
    interface Window {
        uid?: string;
    }
}