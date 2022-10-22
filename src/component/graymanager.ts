import { utils } from '@shared/utils';
import unity from './unity';
import feedback from './feedback';
import pageEvents from './page-events';
import axios, { CancelTokenSource } from 'axios';
import { getAllCid, setParentPlayer } from './embedplayer';
import NoFlashTips from '@jsc/no-flash-tips';
import { BilibiliPlayer } from '@jsc/bilibiliplayer/bilibiliPlayer';

interface IParams {
    aid?: string | number;
    cid?: string | number;
    bvid?: string;
    dashSymbol: boolean;
    crossDomain: boolean;
    p: number;
    urlparam?: string;
    extra_params?: string;
    season_type: number;
    playlistId?: number;
    attribute?: number;
}

interface IFetchPlayurlParams {
    avid: string;
    cid: string;
    bvid: string;
    qn: number | string;
    fnver: number;
    fnval: number | string;
    type: string;
    otype: string;
}

interface IFlashTipsBtn {
    title: string;
    width: number;
    height: number;
    type: string;
    theme: string;
    onClick?: (fun: Function) => {};
}

interface IPromiseResult {
    resolve?: Function;
    reject?: Function;
}

interface IReceived {
    _id: number;
    _directive: number;
    _origin: string;
    data: any;
}

/**
 * 灰度管理模块，在配置项里开启Flash或HTML5灰度
 */
class GrayManagerClass {
    // config
    gray_flash_enable = false; // 是否开启了Flash灰度
    gray_html5_enable = false; // 是否开启了HTML5灰度
    initialTime = +new Date(); // 初始化时间戳
    loadingTime!: number;
    fixTime = 0; // 页面切换修正时间戳
    overtime = 15000; // flash加载超时时间
    gray_config_flash = {
        cookie_name: 'flash_player_gray',
        new_player: '//static.hdslb.com/play_recommend.swf',
        suffixes: ['0', '1', '2'],
        track: {
            old: {
                click_event_name: 'oldver_click',
                show_event_name: 'oldver_show',
            },
            new: {
                click_event_name: 'newver_click',
                show_event_name: 'newver_show',
            },
        },
    };
    gray_config_html5 = {
        cookie_name: 'html5_player_gray',
        new_player: '//static.hdslb.com/player/js/bilibiliPlayer.beta.min.js',
        suffixes: ['0', '1', '2', '3', '4'],
        track: {
            new: {
                click_event_name: 'newver_h5_click',
                show_event_name: 'newver_h5_show',
            },
            old: {
                click_event_name: 'oldver_h5_click',
                show_event_name: 'oldver_h5_show',
            },
        },
    };
    gray_config_html5_flash = {
        track: {
            new: {
                click_event_name: 'HTML5_click',
                show_event_name: 'HTML5_show',
            },
            old: {
                click_event_name: 'Flash_click',
                show_event_name: 'Flash_show',
            },
        },
    };
    playerAgentList: Record<string, any> = {};

    hashManage = utils.hashManage;
    isUndefined = utils.isUndefined;
    cookie = utils.cookie;
    ChatGetSettings = utils.ChatGetSettings;
    ChatSaveSettings = utils.ChatSaveSettings;
    ChatRemoveSettings = utils.ChatRemoveSettings;
    localStorage = utils.localStorage;

    loadFeedback = feedback.load;
    getFeedback = feedback.get;

    loadLocalStorage = utils.loadLocalStorage;
    setLocalStorage = utils.setLocalStorage;
    getLocalStorage = utils.getLocalStorage;
    removeLocalStorage = utils.removeLocalStorage;
    GetUrlValue = utils.GetUrlValue;
    get_ip_crc = utils.getIPCrc;
    gray_flash_compatible = unity.flash;
    getHiddenProp = utils.getHiddenProp;
    isDocumentHidden = utils.isDocumentHidden;
    // property
    initialized = false; // 初始化标记
    storageLoaded = false; // storage初始化标记
    initialLoadedSend = false; // 播放器载入耗时发送标记
    loadedTimeSend = false; // 首帧耗时发送标记
    pageno = 1; // 当前分P
    enable = false; // 是否灰度
    playerParams: string | null = null; // 播放器参数
    callbackFn: Function | null = null; // 播放器加载完成回调
    upgrade: string | boolean | undefined = undefined; // 是否是新版播放器
    iframe = false; // 是否是嵌入型Flash
    gray_flash = false; // 是否符合Flash灰度条件
    gray_html5 = true; // 是否符合HTML5灰度条件
    gray_support_html5 = false; // 是否支持HTML5播放器
    gray_support_flash = true; // 是否支持Flash播放器
    isSafari =
        /(webkit)[ /]([\w.]+).*(version)[ /]([\w.]+).*(safari)[ /]([\w.]+)/.test(navigator.userAgent.toLowerCase()) ||
        /(version)(applewebkit)[ /]([\w.]+).*(safari)[ /]([\w.]+)/.test(navigator.userAgent.toLowerCase());

    playerEventLists: IReceived[] = []; // 播放器指令缓存列表
    cancelTokenSources: CancelTokenSource[] = [];
    playurlMaps?: Record<string, any>;

    is_unsupport_html5?: boolean;
    playerType?: string;
    hidden_start_time?: number;
    startTimeSend?: boolean;
    reloadTime?: number;
    html5_btn?: HTMLDivElement;
    flash_loader_timer?: number;
    h5Params?: any;
    isLoadingPlayerjs?: any;
    flashPlayer!: string;
    statusList: any[] = []; // 外部设置播放器状态，当播放器未初始化完成时先存起来
    labList: any[] = [];
    notice_btn?: HTMLDivElement;
    helpBtn?: HTMLDivElement;
    flash_btn?: HTMLDivElement;
    flash_new_btn?: HTMLDivElement;
    html5_new_btn?: HTMLDivElement;

    init(type: string, player: any, playerParams: string, playerType: string, upgrade: boolean, callbackFn: Function) {
        this.isLoadingPlayerjs = false;
        this.h5Params = null;
        this.flashPlayer = player;
        if (!this.initialized) {
            this.initialized = true;

            this.is_unsupport_html5 = !this._checkHTML5();
            this.playerType = playerType;

            this.pageno = window.pageno || Number(this.hashManage.get('page')) || Number(this.GetUrlValue('p')) || 1;
            this.playerParams = playerParams;
            this.upgrade = upgrade;
            this.callbackFn = callbackFn;

            if (
                window.location.host &&
                window.location.host.indexOf('.bilibili.co') === -1 &&
                !/msie [\w.]+/.exec(navigator.userAgent.toLowerCase())
            ) {
                if (window.location.host.indexOf('.bilibili.com') !== -1) {
                    document.domain = 'bilibili.com';
                } else if (window.location.host.indexOf('.bilibili.co') !== -1) {
                    document.domain = 'bilibili.co';
                }
                if (this.isSafari) {
                    this._init();
                } else {
                    this.loadLocalStorage(() => {
                        this._init();
                    });
                }
            } else {
                this._init();
            }

            try {
                const visProp = this.getHiddenProp();
                if (visProp) {
                    const evtname = `${visProp.replace(/[H|h]idden/, '')}visibilitychange`;
                    this.hidden_start_time = +new Date();
                    document.addEventListener(evtname, () => {
                        if (!this.isDocumentHidden()) {
                            this.fixTime = +new Date() - this.hidden_start_time!;
                        }
                    });
                }
            } catch (e) {
                console.warn(e);
            }
            // hack flash test environment
            if (!window.__GetCookie) {
                window.__GetCookie = utils.cookie.get.bind(utils.cookie);
            }
        }
    }

    _init() {
        if (!this.storageLoaded) {
            this.storageLoaded = true;
            // this.loadNewPlayer();

            this.gray_issupport_flash();
            this.gray_issupport_html5();
            this.gray_judge_flash();
            this.gray_judge_html5();

            // 当传入musth5参数时，不支持h5，直接返回
            if (this.onlyH5()) {
                return;
            }
            // default h5 primary
            if (this.ChatGetSettings('defaulth5') === 1) {
                if (this.gray_html5) {
                    this.enable = true;
                    this.gray_initial_html5();
                } else if (this.gray_flash) {
                    this.enable = true;
                    this.gray_initial_flash();
                } else {
                    this.no_gray_initial();
                }
            } else if (this.gray_flash) {
                this.enable = true;
                this.gray_initial_flash();
            } else if (this.gray_html5) {
                this.enable = true;
                this.gray_initial_html5();
            } else {
                this.no_gray_initial();
            }
            if (this.playerParams) {
                this._initCallBack();
            }
        }
    }
    _isH5() {
        if (!this.gray_support_flash) return true;
        if (this.gray_support_html5) {
            if ((!this.playerType && this._getDefaulth5()) || this.playerType === 'html5') return true;
            if (this.playerParams && this.playerParams.match(/lightWeight=\S&/)) return true;
        }
    }

    _getDefaulth5() {
        if (this.getMustH5()) return true;
        return this.gray_support_html5 && this.ChatGetSettings('defaulth5') !== '0';
    }

    _initCallBack() {
        if (!this.startTimeSend) {
            this.startTimeSend = true;
            try {
                if (window.performance && window.performance.timing && window.performance.timing.navigationStart) {
                    const time = +new Date() - performance.timing.navigationStart;
                    window.performance.timing.playerStage0 = +new Date();
                }
            } catch (e) {
                // console.warn(e);
            }
        }
        if (this.enable) {
            this.gray_loader(this.playerType, this.upgrade);
        } else if (this._isH5()) {
            this.gray_loader_html5();
        } else {
            this.gray_loader_flash();
        }
    }

    _checkHTML5() {
        const checkCore = !(
            /msie [\w.]+/.exec(navigator.userAgent.toLowerCase()) ||
            (/Trident/i.test(navigator.userAgent) && /Windows NT 6/.test(navigator.userAgent)) ||
            !window.URL
        );
        if (checkCore) {
            const video = document.createElement('video');
            return video && video.canPlayType && video.canPlayType('video/mp4; codecs="avc1.42001E, mp4a.40.2"');
        }
        return checkCore;
    }

    async reload(playerParams: string) {
        if (!this.playerParams) {
            window.location.reload();
            return;
        }
        // 当传入musth5参数时，不支持h5，直接返回
        if (this.onlyH5()) {
            return;
        }
        try {
            delete window['__playinfo__'];
            window.swfobject && window.swfobject.removeSWF('player_placeholder');
            window.player && window.player.pause();
            this.destoryH5Player();
            if (this.hashManage.get('page') || this.GetUrlValue('p')) {
                window.pageno = Number(this.hashManage.get('page')) || Number(this.GetUrlValue('p')) || 1;
                this.pageno = window.pageno;
            }
        } catch (e) {
            console.log(e);
        }
        this.initialReset();
        this.playerParams = playerParams || this.playerParams;
        // 简化参数
        let config: any = utils.defaultSearch(this.playerParams);
        await getAllCid(config);
        this.playerParams = utils.objToStr(config);

        if (this.playerParams) {
            window.aid = config.aid;
            window.cid = config.cid;
            if (config.show_bv === '1') {
                window.bvid = config.bvid;
            }

            if (this.playurlMaps && this.playurlMaps![window.cid]) {
                window['__playinfo__'] = this.playurlMaps![window.cid];
            } else {
                while (this.cancelTokenSources.length) {
                    this.cancelTokenSources.shift()!.cancel();
                }
            }
        }
        this.reloadTime = +new Date();
        if (this._isH5()) {
            this.gray_loader_html5();
        } else {
            this.gray_loader_flash();
        }
        // if (this.gray_support_html5 && (this.playerType === 'html5' || (!this.playerType && this._getDefaulth5()))) {
        //     this.gray_loader_html5();
        // } else {
        //     this.gray_loader_flash();
        // }
        // this.gray_loader_html5();
        this.playurlMaps = undefined;
    }

    gray_loader(playerType: string | undefined, upgrade: string | boolean | undefined) {
        if (this._isH5()) {
            this.gray_loader_html5(upgrade);
        } else {
            this.gray_loader_flash(upgrade);
        }
    }

    update_params(params: IParams, searchNewCid?: boolean) {
        if (searchNewCid) {
            this.searchNewCid();
        }
        const playerParams = this.playerParams!.split('&');
        for (let i = 0; i < playerParams.length; i++) {
            if (playerParams[i] !== '') {
                const arr = playerParams[i].split('=');
                (<any>params)[arr[0]] = arr[1];
            }
        }
        if (window.aid) {
            params.aid = window.aid;
        }
        if (window.cid) {
            params.cid = window.cid;
        }
        if (window.bvid) {
            params.bvid = window.bvid;
        }
        // dash gray policy only html5
        try {
            // all default dash
            params.dashSymbol = true;
            this.cookie.set('CURRENT_FNVAL', '4048');
            // if (this.GetUrlValue('dashSymbol')) {
            //     params.dashSymbol = true;
            //     this.cookie.set('CURRENT_FNVAL', '8');
            // } else {
            //     const idSuffix = this.cookie.get('DedeUserID').slice(-1);
            //     if($.inArray(idSuffix, this.gray_config_html5.suffixes) > -1) {
            //         params.dashSymbol = true;
            //     }
            // }
        } catch (e) {
            console.debug(e);
        }

        return params;
    }

    searchNewCid() {
        if (typeof window.pageno === 'undefined') {
            window.pageno = this.pageno;
        } else if (window.pageno !== this.pageno) {
            const data = window.bvid ? { bvid: window.bvid } : { aid: window.aid };
            axios({
                url: `//www.bilibili.com/widget/getPageList`,
                method: 'get',
                data: data,
                withCredentials: true,
                responseType: 'json',
            }).then((response) => {
                const data = response.data;
                if (data) {
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].page === window.pageno) {
                            window.cid = data[i].cid;
                            this.pageno = <number>window.pageno;
                        }
                    }
                }
            });
        }
    }

    _loadNoFlashTips() {
        import(/* webpackChunkName: "no-flash-tips" */ '@jsc/no-flash-tips').then((s) => {
            window.NoFlashTips = s.default;
            this._createNoFlashTipsInstance();
        });
    }

    _getNoFlashTips() {
        const that = this;
        if (!window.NoFlashTips) {
            that._loadNoFlashTips();
        } else {
            that._createNoFlashTipsInstance();
        }
    }

    _createNoFlashTipsInstance() {
        const that = this;
        const options = {
            backgroundColor: 'white',
            msg: '主人，未安装Flash插件，暂时无法观看视频，您可以…',
            msgColor: '#000',
            msgSize: 14,
            btnList: [
                {
                    title: '下载Flash插件',
                    width: 166,
                    height: 40,
                    type: 'flash',
                    theme: 'white',
                } as IFlashTipsBtn,
            ],
            hasOrText: false,
        };
        if (!this.is_unsupport_html5) {
            options.btnList[0].theme = 'white';
            options.btnList.push({
                title: '使用HTML5播放器',
                width: 166,
                height: 40,
                type: 'html5',
                theme: 'blue',
                onClick(destroy) {
                    // console.log('rua');
                    that.html5_btn?.click();
                    typeof destroy === 'function' && destroy();
                },
            } as IFlashTipsBtn);
        }
        // @ts-ignore
        new window.NoFlashTips(document.querySelector('#bilibili-player') || document.querySelector('#bofqi'), options);
    }

    init_bgray_btn() {
        const bofqi = document.querySelector('#bilibili-player') || document.querySelector('#bofqi');
        const wrap = bofqi && bofqi.parentNode;
        const hasClass = ` ${wrap} `.indexOf(' movie_play ') > -1;
        const head = document.querySelector('head');
        if (head) {
            head.insertAdjacentHTML(
                'beforeend',
                `${'<style>.player-wrapper {position: relative;} .player-fullscreen-fix {position: fixed;top: 0;left: 0;margin: 0;padding: 0;width: 100%;height: 100%;}' +
                '.player-fullscreen-fix #bilibili-player .player {position: fixed!important;border-radius: 0;z-index: 100000!important;left: 0;top: 0;width: 100%!important;height: 100%!important;}' +
                '.player-fullscreen-fix #bofqi .player {position: fixed!important;border-radius: 0;z-index: 100000!important;left: 0;top: 0;width: 100%!important;height: 100%!important;}' +
                '.bgray-btn-wrap {position: absolute; top: 10px; left: 50%; margin-left: 490px; width: 70px; height: 200px;} .widescreen .bgray-btn-wrap {margin-left: 580px;} .bgray-btn {transition: all 0.3s; cursor: pointer; margin: 10px 0; background-color: #fff; text-align: center; padding: 7px 5px; display: block; left: 100%; font-size: 12px; line-height: 12px; margin-left: 10px; width: 20px; border-radius: 4px; border: 1px solid #e5e9ef; color: #99a2aa;} .bgray-btn-feedback { height: 72px; margin-bottom: 5px;} .bgray-btn-help { height: 24px; margin-top: 5px;} .bgray-btn:hover {color: #6d757a; border-color: #6d757a;}.bgray-btn.player-feedback-disable{color:#ccd0d7}.bgray-btn.player-feedback-disable:hover{color:#ccd0d7;border-color:#ccd0d7;} .bgray-btn.player-feedback-disable{color:#ccd0d7}.bgray-btn.player-feedback-disable:hover{color:#ccd0d7;border-color:#ccd0d7;} .bgray-btn.active {cursor: default; color: #00a1d6; border-color: #00a1d6;}'
                }${hasClass
                    ? '.movie_play {overflow: visible;} .bgray-btn-wrap {top: -10px;} #bilibili-player {box-shadow: 0 0 0;} #bofqi {box-shadow: 0 0 0;}'
                    : ''
                }.bgray-line {display: none; width: 42px; margin: 0 auto; border-bottom: 1px solid #e5e9ef;}` +
                '.bgray-btn {display: none;} .bgray-btn.show {display: none;}' +
                '@media screen and (min-width: 1400px) {.bgray-btn-wrap {margin-left: 580px;}}' +
                '.bgray-btn.happyfoolsday {line-height: 13px; background-color: #00a1d6; border-color: #00a1d6; color: #fff;} .bgray-btn.happyfoolsday:hover {background-color: #00b5e5; border-color: #00b5e5; color: #fff;}' +
                '.webfullscreen .player{position: fixed;top: 0;left: 0;}' +
                'object#player_placeholder{display: block;box-shadow: 0 0 8px #e5e9ef;}' +
                '</style>',
            );
        }
        const bgray = document.createElement('div');
        bgray.classList.add('bgray-btn-wrap');
        wrap?.appendChild(bgray);
        this.notice_btn = document.createElement('div');
        this.notice_btn.setAttribute('class', 'bgray-btn show bgray-btn-feedback');
        this.notice_btn.innerHTML = '播放<br/>问题<br/>反馈';
        this.notice_btn.addEventListener('click', e => {
            this.getFeedback();
        });
        bgray.appendChild(this.notice_btn);

        this.helpBtn = document.createElement('div');
        this.helpBtn.setAttribute('class', 'bgray-btn show bgray-btn-help');
        this.helpBtn.textContent = '帮助';
        this.helpBtn.addEventListener('click', e => {
            window.open("//www.bilibili.com/blackboard/help.html#常见播放问题自救方法");
        });
        bgray.appendChild(this.helpBtn);

        this.removeLocalStorage('verticalDanmaku');
        this.removeLocalStorage('verticalDM');

        return bgray;
    }

    no_gray_initial() {
        const gray =
            document.querySelector('#bilibili-player .b-player-gray') ||
            document.querySelector('#bofqi .b-player-gray');
        gray && gray.parentNode && gray.parentNode.removeChild(gray);
        const that = this;
        if (!window.flashChecker().hasFlash || this.isNoFlash()) {
            that.setLocalStorage('defaulth5', 1);
        }
        const bgray = this.init_bgray_btn();
        this.html5_btn = document.createElement('div');
        this.html5_btn.classList.add('bgray-btn');
        this.html5_btn.innerHTML = 'HTML5<br/>播放器';
        this.html5_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_html5(false);
                that.cookie.set(that.gray_config_html5.cookie_name, false, 7);
            }
        });
        bgray.appendChild(this.html5_btn);
        this.flash_btn = document.createElement('div');
        this.flash_btn.classList.add('bgray-btn');
        this.flash_btn.innerHTML = 'Flash<br/>播放器';
        this.flash_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                window.player && window.player.destroy && window.player.destroy();
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_flash(false);
                that.cookie.set(that.gray_config_flash.cookie_name, false, 7);
            }
        });
        bgray.appendChild(this.flash_btn);
    }

    gray_judge_flash() {
        // Flash Gray Judge
        if (!this.gray_flash_enable || !this.playerParams || this.isNoFlash()) {
            this.gray_flash = false;
            return this.gray_flash;
        }
        // this.gray_flash = true;
        // return this.gray_flash; // 全量灰度
        let idSuffix;

        try {
            idSuffix = this.cookie.get('DedeUserID').slice(-1);
            this.gray_flash = this.gray_config_flash.suffixes && this.gray_config_flash.suffixes.indexOf(idSuffix) > -1;
        } catch (e) {
            this.gray_flash = false;
        }
        return this.gray_flash;
    }

    gray_initial_flash() {
        const that = this;
        const gray =
            document.querySelector('#bilibili-player .b-player-gray') ||
            document.querySelector('#bofqi .b-player-gray');
        gray && gray.parentNode && gray.parentNode.removeChild(gray);
        const grayParams = this.gray_config_flash.track;
        const bgray = this.init_bgray_btn();
        const line = document.createElement('div');
        line.classList.add('bgray-line');
        bgray.appendChild(line);
        this.flash_btn = document.createElement('div');
        this.flash_btn.classList.add('bgray-btn');
        this.flash_btn.setAttribute('type', 'old');
        this.flash_btn.innerHTML = '旧版<br/>播放器';
        this.flash_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                window.player && window.player.destroy && window.player.destroy();
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_flash(false);
                that.cookie.set(that.gray_config_flash.cookie_name, false, 7);
            }
        });
        bgray.appendChild(this.flash_btn);

        this.flash_new_btn = document.createElement('div');
        this.flash_new_btn.classList.add('bgray-btn');
        this.flash_new_btn.setAttribute('type', 'new');
        this.flash_new_btn.innerHTML = '新版<br/>播放器';
        this.flash_new_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                window.player && window.player.destroy && window.player.destroy();
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_flash(true);
                that.cookie.set(that.gray_config_flash.cookie_name, true, 7);
            }
        });
        bgray.appendChild(this.flash_new_btn);

        this.html5_btn = document.createElement('div');
        this.html5_btn.classList.add('bgray-btn');
        this.html5_btn.innerHTML = 'HTML5<br/>播放器';
        this.html5_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_html5(false);
                that.cookie.set(that.gray_config_html5.cookie_name, false, 7);
            }
        });
        bgray.appendChild(this.html5_btn);

        this.html5_new_btn = document.createElement('div');
        this.html5_new_btn.classList.add('bgray-btn');
        this.html5_new_btn.innerHTML = '新版HTML5<br/>播放';
        this.html5_new_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_html5(true);
                that.cookie.set(that.gray_config_html5.cookie_name, true, 7);
            }
        });
        bgray.appendChild(this.html5_new_btn);
    }

    initialReset() {
        this.initialTime = +new Date();
        this.fixTime = 0;
        this.reloadTime = 0;
        // analysis.reset();
    }

    gray_loader_flash(upgrade?: string | boolean) {
        if (typeof upgrade === 'undefined' || upgrade === '') {
            if (this.gray_flash) {
                const cookieName = this.gray_config_flash.cookie_name;
                this.upgrade = this.cookie.get(cookieName) !== 'false';
            } else {
                this.upgrade = false;
            }
        } else {
            this.upgrade = upgrade;
        }
        if (this.ChatGetSettings('defaulth5') === '1') {
            this.setLocalStorage('defaulth5', 0);
        }
        if (!window.flashChecker().hasFlash) {
            this._getNoFlashTips();
            return;
        }
        if (!(window.swfobject && window.swfobject.embedSWF)) {
            utils.loadScript({
                url: '//static.hdslb.com/js/swfobject.js',
                success: () => {
                    this.loadFlashPlayer();
                },
            });
        } else {
            this.loadFlashPlayer();
        }
    }
    loadFlashPlayer() {
        const bofqi = document.querySelector('#bilibili-player') || document.querySelector('#bofqi');
        if (this.iframe) {
            const param = window.bvid ? `bvid=${window.bvid}` : `aid=${window.aid}`;
            bofqi!.innerHTML = `<iframe height="482" width="950" class="player" src="https://secure.bilibili.com/secure,cid=${window.cid}&${param}" scrolling="no" border="0" frameborder="no" framespacing="0" onload="window.securePlayerFrameLoaded=true"></iframe><img src="https://secure.bilibili.com/images/grey.gif" id="img_ErrCheck" style="display:none" /><script type="text/javascript" src="//static.hdslb.com/js/page.player_error.js"></script>`;
        } else {
            const params: any = {};
            this.update_params(params);
            bofqi!.innerHTML = '<div id="player_placeholder" class="player"></div>';
            // const requestParam = `lastCompiled=${bPlayer.metadata.lastCompiled}`;
            const flashPlayerUrl = `//static.hdslb.com/play.swf`;
            const url = this.flashPlayer || (this.upgrade ? this.gray_config_flash.new_player : flashPlayerUrl);
            window.swfobject.embedSWF(
                url,
                'player_placeholder',
                '950',
                '482',
                '0',
                '',
                params,
                {
                    bgcolor: '#ffffff',
                    allowfullscreeninteractive: 'true',
                    allowfullscreen: 'true',
                    quality: 'high',
                    allowscriptaccess: 'always',
                    wmode: /Firefox/.test(navigator.userAgent) ? 'opaque' : 'direct',
                },
                {
                    class: 'player',
                },
                () => {
                    typeof this.callbackFn === 'function' && this.callbackFn();
                    typeof window.PlayerMediaLoaded === 'function' && window.PlayerMediaLoaded();
                    this.gray_flash_compatible();
                },
            );
            this.flash_loader_timeout();
            if (params.attribute) {
                this.checkInteractive(true, Number(params.attribute));
            }
        }
    }

    flash_loader_timeout() {
        const that = this;
        this.flash_loader_timer = window.setTimeout(() => {
            try {
                if (!that.isDocumentHidden() && !that.iframe && that.ChatGetSettings('defaulth5') !== '0') {
                    that.initialReset();
                    that.html5_btn?.click();
                }
            } catch (e) {
                console.warn(e);
            }
        }, this.overtime);
    }

    gray_issupport_flash() {
        if (this.playerParams && this.playerParams.match(/playlistId=(\d+)/)) {
            this.gray_support_flash = false;
        }
    }

    gray_issupport_html5() {
        // HTML5 Gray Judge
        // if(!this.gray_html5_enable) {
        //     this.gray_html5 = false;
        //     return this.gray_html5;
        // }
        // 不支持IE10及以下浏览器 不支持Win7 IE11
        if (this.is_unsupport_html5) {
            this.gray_support_html5 = false;
            return this.gray_support_html5;
        }
        if (
            /linux/i.test(navigator.userAgent.toLowerCase()) ||
            /Mac OS X[\s_\-/](\d+[.\-_]\d+[.\-_]?\d*)/i.test(navigator.userAgent) ||
            !window.flashChecker().hasFlash ||
            this.default_html5_policy()
        ) {
            if (
                this.ChatGetSettings('defaulth5') == null ||
                (this.ChatGetSettings('defaulth5') === '0' && !this.ChatGetSettings('hasRevertDefaulth5'))
            ) {
                this.setLocalStorage('defaulth5', 1);
            }
        }
        this.setLocalStorage('hasRevertDefaulth5', 1);

        // 古老iframe Flash播放器的取值
        const bofqi = document.querySelector('#bilibili-player') || document.querySelector('#bofqi');
        if (bofqi) {
            const iframePlayer = bofqi.querySelector('iframe.player');
            if (iframePlayer && !iframePlayer.classList.contains('bilibiliHtml5Player')) {
                const aid = iframePlayer.getAttribute('src')!.match(/aid=(\d+)/),
                    cid = iframePlayer.getAttribute('src')!.match(/cid=(\d+)&/),
                    preAd = iframePlayer.getAttribute('src')!.match(/pre_ad=(\d+)/);
                const bvid = iframePlayer.getAttribute('src')!.match(/bvid=(\w+)&?/);
                let caid = -1,
                    ccid = -1,
                    cbvid = '';
                if (aid && aid[1]) {
                    caid = window.aid = Number(aid[1]);
                }
                if (cid && cid[1]) {
                    ccid = window.cid = Number(cid[1]);
                }
                if (bvid && bvid[1]) {
                    cbvid = window.bvid = bvid[1];
                }
                if (ccid && (caid || cbvid)) {
                    this.gray_support_html5 = true;
                    this.iframe = true;
                    if (cbvid) {
                        this.playerParams = `cid=${ccid}&bvid=${cbvid}&pre_ad=${preAd ? preAd[1] : '0'}`;
                    } else {
                        this.playerParams = `cid=${ccid}&aid=${caid}&pre_ad=${preAd ? preAd[1] : '0'}`;
                    }
                }
            } else if (!bofqi.querySelector('embed')) {
                this.gray_support_html5 = true;
            }
        }
        return false;
    }

    default_html5_policy() {
        try {
            let m;
            if (/Edge/.test(navigator.userAgent)) {
                return false;
            } else if (/Chrome\/\d+/i.test(navigator.userAgent)) {
                // Chrome default policy 45+
                m = navigator.userAgent.match(/Chrome\/(\d+)/);
                if (m && parseInt(m[1], 10) >= 45) {
                    return true;
                }
            } else if (/Firefox\/\d+/i.test(navigator.userAgent)) {
                // Firefox default policy 47+
                m = navigator.userAgent.match(/Firefox\/(\d+)/);
                if (m && parseInt(m[1], 10) >= 47) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    gray_judge_html5() {
        if (!this.gray_html5_enable || !this.playerParams) {
            this.gray_html5 = false;
            return this.gray_html5;
        }
        // this.gray_html5 = true;
        // return this.gray_html5; // 全量灰度
        let idSuffix;

        try {
            idSuffix = this.cookie.get('DedeUserID').slice(-1);
            this.gray_html5 = this.gray_config_html5.suffixes && this.gray_config_html5.suffixes.indexOf(idSuffix) > -1;
            // this.gray_html5 = $.inArray(idSuffix, this.gray_config_html5.suffixes) > -1 || this.cookie.get('HTML5PlayerCRC32') === '3819803418';
            // if(!this.cookie.get('HTML5PlayerCRC32')) {
            //     var that = this;
            //     $.get('//api.bilibili.com/client_info?type=jsonp', function(data){
            //         if(data && data.data && data.data.ip) {
            //             that.get_ip_crc(data.data.ip + 'HTML5PlayerCRC32');
            //         }
            //     });
            // }
        } catch (e) {
            this.gray_html5 = false;
        }

        return this.gray_html5;
    }

    gray_initial_html5() {
        // 内测说明公告
        const that = this;
        const grayParams = this.gray_config_html5.track;
        const grayParamsFlash = this.gray_config_flash.track;
        if (!window.flashChecker().hasFlash && this.ChatGetSettings('defaulth5') == null) {
            that.setLocalStorage('defaulth5', 1);
            // Safari不隐藏
            // if(!/(webkit)[ \/]([\w.]+).*(version)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.test(navigator.userAgent.toLowerCase()) && !/(version)(applewebkit)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.test(navigator.userAgent.toLowerCase())) {
            // $('<style>.bgray-btn-wrap {display:none;}</style>').appendTo('head');
            // }
        }

        // var defaulth5 = notice.find('#defaulth5');
        // if(ChatGetSettings("defaulth5") == 1) {
        //     defaulth5.prop('checked', true);
        // }

        // defaulth5.change(function() {
        //     if($(this).prop('checked')) {
        //         that.setLocalStorage("defaulth5", 1);
        //     } else {
        //         that.setLocalStorage("defaulth5", 0);
        //     }
        // });

        const bgray = this.init_bgray_btn();
        const line = document.createElement('div');
        line.classList.add('bgray-line');
        bgray.appendChild(line);
        this.flash_btn = document.createElement('div');
        this.flash_btn.classList.add('bgray-btn');
        this.flash_btn.setAttribute('type', 'old');
        this.flash_btn.innerHTML = '旧版<br/>播放器';
        this.flash_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                window.player && window.player.destroy && window.player.destroy();
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_flash(false);
                that.cookie.set(that.gray_config_flash.cookie_name, false, 7);
            }
        });
        bgray.appendChild(this.flash_btn);

        this.flash_new_btn = document.createElement('div');
        this.flash_new_btn.classList.add('bgray-btn');
        this.flash_new_btn.setAttribute('type', 'new');
        this.flash_new_btn.innerHTML = '新版<br/>播放器';
        this.flash_new_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                window.player && window.player.destroy && window.player.destroy();
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_flash(true);
                that.cookie.set(that.gray_config_flash.cookie_name, true, 7);
            }
        });
        bgray.appendChild(this.flash_new_btn);

        this.html5_btn = document.createElement('div');
        this.html5_btn.classList.add('bgray-btn');
        this.html5_btn.innerHTML = 'HTML5<br/>播放器';
        this.html5_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_html5(false);
                that.cookie.set(that.gray_config_html5.cookie_name, false, 7);
            }
        });
        bgray.appendChild(this.html5_btn);

        this.html5_new_btn = document.createElement('div');
        this.html5_new_btn.classList.add('bgray-btn');
        this.html5_new_btn.innerHTML = '新版HTML5<br/>播放';
        this.html5_new_btn.addEventListener('click', function (e) {
            if (!this.classList.contains('active')) {
                bgray.querySelector('.active')?.classList.remove('active');
                this.classList.add('active');
                that.initialReset();
                that.gray_loader_html5(true);
                that.cookie.set(that.gray_config_html5.cookie_name, true, 7);
            }
        });
        bgray.appendChild(this.html5_new_btn);
        // if(ChatGetSettings("firstentergraytest") != 'v0.9.5' && ChatGetSettings("defaulth5") == 1) {
        //     that.setLocalStorage("firstentergraytest", 'v0.9.5');
        // }

        if (this._getDefaulth5() && this.iframe) {
            const iframePlayer =
                document.querySelector('#bilibili-player iframe.player') ||
                document.querySelector('#bofqi iframe.player');
            iframePlayer && iframePlayer.parentNode && iframePlayer.parentNode.removeChild(iframePlayer);
            if (this.upgrade) {
                this.html5_new_btn.click();
            } else {
                this.html5_btn.click();
            }
        } else if (this._getDefaulth5()) {
            if (this.upgrade) {
            } else {
            }
        }
    }

    gray_loader_html5(upgrade?: string | boolean) {
        const that = this;
        this.destoryH5Player();
        if (typeof upgrade === 'undefined' || upgrade === '') {
            if (this.gray_html5 && this.gray_support_html5) {
                const cookieName = this.gray_config_html5.cookie_name;
                this.upgrade = this.cookie.get(cookieName) !== 'false';
            } else {
                this.upgrade = false;
            }
        } else {
            this.upgrade = upgrade;
        }
        if (this.playerType !== 'html5' && !this.getMustH5()) {
            that.setLocalStorage('defaulth5', 1);
        }
        const params: any = {};
        this.update_params(params, true);
        const bofqi = document.querySelector('#bilibili-player') || document.querySelector('#bofqi');
        if (window.location.host && window.location.host.indexOf('.bilibili.co') === -1) {
            // default inset
            // if(!this.hashManage.get('iframe') || this.hashManage.get('iframe') != '0') { // default iframe
            // iframe html5 player
            params.p = (this.hashManage.get('page') as number) || 1;
            params.crossDomain = true;
            let urlParams: string | Array<string> = [];
            const keys = Object.keys(params);
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] === 'record') {
                    window.RECORD_STRING = params[keys[i]];
                } else {
                    urlParams.push(`${keys[i]}=${encodeURIComponent(params[keys[i]])}`);
                }
            }
            urlParams = urlParams.join('&');
            window.Html5IframeInitialized = () => {
                this.gray_html5_compatible();
            };
            bofqi!.innerHTML = `<iframe class="player bilibiliHtml5Player" style="position: relative;" src="${this.upgrade
                ? '//www.bilibili.com/blackboard/html5playerbeta.html'
                : '//www.bilibili.com/blackboard/html5player.html'
                }?${urlParams}" scrolling="no" border="0" frameborder="no" framespacing="0"></iframe>`;
            if (params.attribute) {
                that.checkInteractive(false, Number(params.attribute));
            }
        } else {
            // normal html5 player
            params.p = window.pageno || this.hashManage.get('page') || this.GetUrlValue('p') || 1;
            if (params.urlparam) {
                params.extra_params = window.decodeURIComponent(params.urlparam);
            }
            bofqi!.innerHTML = '<div id="player_placeholder" class="player"></div>';

            const result = {} as IPromiseResult;
            const playerSourceDefer = new Promise((resolve, reject) => {
                result.resolve = resolve;
                result.reject = reject;
            });
            playerSourceDefer.catch(() => { });
            const loadBilibiliPlayer = (corePlayer: any, done: boolean) => {
                this.h5Params = {
                    done,
                    params,
                    corePlayer,
                };
                playerSourceDefer
                    .then(() => {
                        this.destoryH5Player();
                        if (done) {
                            window.player = new window.BilibiliPlayer(params, corePlayer);
                        } else {
                            corePlayer && corePlayer.destroy();
                            window.player = new window.BilibiliPlayer(params);
                        }
                        // compatible
                        that.gray_html5_compatible(done);
                    })
                    .catch(() => {
                        if (this.isLoadingPlayerjs) {
                            return;
                        }
                        const playerStyle = document.querySelector('style[data-injector="bilibili-player"]');
                        playerStyle && playerStyle.parentNode && playerStyle.parentNode.removeChild(playerStyle);

                        this.isLoadingPlayerjs = import(
                            /* webpackChunkName: "player", webpackPreload: true */ '@jsc/bilibiliplayer/bilibiliPlayer'
                        ).then((s) => {
                            window.BilibiliPlayer = s.BilibiliPlayer;
                            this.newH5Player();
                            this.h5Params = null;
                            this.isLoadingPlayerjs = false;
                        });
                    });
            };
            const playerElement = bofqi!.querySelector('.player');
            const biliPlayerElement = bofqi!.querySelector('#bilibiliPlayer');
            if (playerElement && biliPlayerElement) {
                biliPlayerElement.setAttribute('data-prerender', 'true');
            } else {
                bofqi!.innerHTML =
                    '<div class="player"><div id="bilibiliPlayer"></div></div><div id="player_placeholder"></div>';
            }
            if (window.BilibiliPlayer) {
                window.player = new window.BilibiliPlayer(params);
                // compatible
                this.gray_html5_compatible();
            } else {
                const s = document.getElementById('playerSource');
                if (s) {
                    s.onload = () => {
                        result.resolve && result.resolve();
                    };
                    s.onerror = () => {
                        result.reject && result.reject();
                    };
                } else {
                    result.reject && result.reject();
                }
                if (+params.pre_ad) {
                    loadBilibiliPlayer(null, false);
                } else if (+params.season_type) {
                    loadBilibiliPlayer(undefined, false);
                    // 暂时禁用core-plaryer
                    // pgc
                    // this.corePlayer = new CorePlayer(params);
                    // this.corePlayer.loadedmetadata
                    //     .then((corePlayer: any) => loadBilibiliPlayer(corePlayer, true))
                    //     .catch((corePlayer: any) => loadBilibiliPlayer(corePlayer, false));
                } else if (params.playlistId) {
                    loadBilibiliPlayer(null, false);
                } else {
                    loadBilibiliPlayer(undefined, false);
                    // 暂时禁用core-plaryer
                    // this.corePlayer = new CorePlayer(params);
                    // this.corePlayer.loadedmetadata
                    //     .then((corePlayer: any) => loadBilibiliPlayer(corePlayer, true))
                    //     .catch((corePlayer: any) => loadBilibiliPlayer(corePlayer, false));
                }
            }
            if (params.attribute) {
                that.checkInteractive(false, Number(params.attribute));
            }
        }
    }

    newH5Player() {
        if (!this.h5Params) {
            return;
        }
        this.destoryH5Player();
        if (this.h5Params.done) {
            window.player = new window.BilibiliPlayer(this.h5Params.params, this.h5Params.corePlayer);
        } else {
            this.h5Params.corePlayer && this.h5Params.corePlayer.destroy();
            window.player = new window.BilibiliPlayer(this.h5Params.params);
        }
        // compatible
        this.gray_html5_compatible(this.h5Params.done);
        if (window.parent !== window) {
            setParentPlayer();
        }
        // let data;
        // while (this.statusList.length) {
        //     data = this.statusList.shift();
        //     this.setPlayerState(data);
        // }
    }

    destoryH5Player() {
        window.player && window.player.destroy && window.player.destroy();
    }

    gray_html5_compatible(isCorePlayer?: boolean) {
        const nextAutoPlayVideo = () => {
            const getNextAutoPlayVideo = this.getPlayerAgentProp('getNextAutoPlayVideo');
            return typeof getNextAutoPlayVideo === 'function' ? getNextAutoPlayVideo() : null;
        };
        const onTimeUpdate = () => {
            if (
                window.player &&
                window.player.getDuration() - 5 > 0 &&
                window.player.getCurrentTime() > window.player.getDuration() - 5
            ) {
                window.player.removeEventListener('video_media_time', onTimeUpdate);
            }
        };
        const onPlayerDestroy = () => {
            if (window.player) {
                window.player.removeEventListener('video_media_time', onTimeUpdate);
                window.player.removeEventListener('video_destroy', onPlayerDestroy);
            }
        };
        if (window.player) {
            window.player.addEventListener('video_media_time', onTimeUpdate);
            window.player.addEventListener('video_destroy', onPlayerDestroy);
        }
        unity.html5.call(this, isCorePlayer);
    }

    loadedCallback(type: string) {
        clearTimeout(this.flash_loader_timer);
        const baktime = +new Date() - this.loadingTime - this.fixTime;
        let time = baktime;
        if (window.performance && window.performance.timing && window.performance.timing.navigationStart) {
            time = +new Date() - window.performance.timing.navigationStart - this.fixTime;
            if (!window.performance.timing.playerStage3) {
                window.performance.timing.playerStage3 = +new Date();
            }
        }
        if (!this.loadedTimeSend) {
            this.loadedTimeSend = true;
        } else if (this.reloadTime) {
            this.reloadTime = 0;
        }
        return time;
    }

    initialCallback(type: string) {
        clearTimeout(this.flash_loader_timer);
        const time = +new Date() - this.loadingTime;
        if (!this.initialLoadedSend) {
            this.initialLoadedSend = true;
            if (window.performance && window.performance.timing && !window.performance.timing.playerStage1) {
                window.performance.timing.playerStage1 = +new Date();
            }
        }
        return time;
    }

    initCallback(type: string) {
        clearTimeout(this.flash_loader_timer);
        const time = +new Date() - this.loadingTime;
        if (!this.initialLoadedSend) {
            this.initialLoadedSend = true;
            if (window.performance && window.performance.timing && !window.performance.timing.playerStage1) {
                window.performance.timing.playerStage1 = +new Date();
            }
        }
        return time;
    }

    loadExtraMenuConfig(type: string) {
        let v = null;
        const exconfig = [];
        if (type === 'flash' || type === 'flash_gray') {
            if (this.gray_html5 && this.gray_support_html5 && this.playerType !== 'flash') {
                exconfig.push({ label: '旧版HTML5播放器', id: 'change_h5' });
                exconfig.push({ label: '新版HTML5播放器', id: 'change_new_h5' });
            } else if (this.gray_support_html5 && this.playerType !== 'flash') {
                exconfig.push({ label: 'HTML5播放器', id: 'change_h5' });
            }
            if (this.gray_flash) {
                if (this.upgrade) {
                    exconfig.push({ label: '新版播放器', id: 'change_new_flash', active: true });
                    exconfig.push({ label: '旧版播放器', id: 'change_flash' });
                } else {
                    exconfig.push({ label: '新版播放器', id: 'change_new_flash' });
                    exconfig.push({ label: '旧版播放器', id: 'change_flash', active: true });
                }
            } else {
                exconfig.push({ label: 'Flash播放器', id: 'change_flash', active: true });
            }
        } else if (window.flashChecker().hasFlash && this.playerType !== 'html5') {
            if (this.gray_html5 && this.gray_support_html5) {
                if (this.upgrade) {
                    exconfig.push({ label: '旧版HTML5播放器', id: 'change_h5' });
                    exconfig.push({ label: '新版HTML5播放器', id: 'change_new_h5', active: true });
                } else {
                    exconfig.push({ label: '旧版HTML5播放器', id: 'change_h5', active: true });
                    exconfig.push({ label: '新版HTML5播放器', id: 'change_new_h5' });
                }
            } else if (this.gray_support_html5) {
                exconfig.push({ label: 'HTML5播放器', id: 'change_h5', active: true });
            }

            if (this.gray_flash) {
                exconfig.push({ label: '新版Flash播放器', id: 'change_new_flash' });
                exconfig.push({ label: '旧版Flash播放器', id: 'change_flash' });
            } else {
                exconfig.push({ label: 'Flash播放器', id: 'change_flash' });
            }
        } else if (this.gray_support_html5) {
            if (this.gray_html5) {
                if (this.upgrade) {
                    exconfig.push({ label: '旧版HTML5播放器', id: 'change_h5' });
                    exconfig.push({ label: '新版HTML5播放器', id: 'change_new_h5', active: true });
                } else {
                    exconfig.push({ label: '旧版HTML5播放器', id: 'change_h5', active: true });
                    exconfig.push({ label: '新版HTML5播放器', id: 'change_new_h5' });
                }
            } else {
                exconfig.push({ label: 'HTML5播放器', id: 'change_h5', active: true });
            }
            // 稍后再看不显示Flash播放器
            if (!this.isNoFlash()) {
                exconfig.push({ label: 'Flash播放器', id: 'change_flash' });
            }
        }
        // console.debug('extra config:');
        // console.debug(exconfig);
        // if((/linux/i).test(navigator.userAgent.toLowerCase()) || (/Mac OS X[\s\_\-\/](\d+[\.\-\_]\d+[\.\-\_]?\d*)/i).test(navigator.userAgent)) {
        v = '20161115';
        // }
        return { ver: v, menuItems: exconfig };
    }
    isNoFlash() {
        return (
            /www\.bilibili\.com\/watchlater/.test(window.location.href) ||
            /www\.bilibili\.com\/playlist/.test(window.location.href)
        );
    }

    clickMenu(id: string) {
        // console.debug('click event: ' + id);
        const that = this;
        setTimeout(() => {
            typeof window.heimu === 'function' && window.heimu(9, 0);
            const toggleBlackSide = pageEvents.getPlayerAgentProp('toggleBlackSide');
            if (id === 'change_h5') {
                that.initialReset();
                typeof toggleBlackSide === 'function' && toggleBlackSide(false);
                that.html5_btn?.click();
            } else if (id === 'change_new_h5') {
                that.initialReset();
                typeof toggleBlackSide === 'function' && toggleBlackSide(false);
                that.html5_new_btn?.click();
            } else if (id === 'change_flash') {
                that.initialReset();
                typeof toggleBlackSide === 'function' && toggleBlackSide(false);
                that.flash_btn?.click();
            } else if (id === 'change_new_flash') {
                that.initialReset();
                typeof toggleBlackSide === 'function' && toggleBlackSide(false);
                that.flash_new_btn?.click();
            }
        }, 0);

        return true;
    }
    getPlayerAgentProp(prop: string) {
        const agent = window.PlayerAgent;
        return (agent && agent[<keyof typeof agent>prop]) || window[<keyof Window>prop];
    }
    html5AndFlash(ele: string, obj: Element | null, cb: string) {
        let fun;
        if (obj) {
            fun = () => {
                this.getPlayerAgentProp(ele)((d: string) => {
                    (<any>obj)[cb] && (<any>obj)[cb](d);
                });
            };
        } else {
            fun = this.getPlayerAgentProp(ele);
        }
        return fun;
    }
    VideoPlayerAgent() {
        const data: Record<string, any> = {};
        const object = document.querySelector('#bilibili-player>object') || document.querySelector('#bofqi>object');
        const playerAgent = [
            'attentionTrigger',
            'getAuthorInfo',
            'elecPlugin',
            'objBPPlugin',
            'playerCallSendCoin',
            'playerCallSendLike',
            'playerCallSendCollect',
            'callBangumiFollow',
            'getActionState',
        ];
        for (let i = 0, len = playerAgent.length; i < len; i++) {
            const element = playerAgent[i];
            const prop = this.getPlayerAgentProp(element);
            if (prop) {
                data[element] = element;
                switch (element) {
                    case 'attentionTrigger':
                        this.playerAgentList[element] = this.html5AndFlash(element, object, 'onAttentionCallBack');
                        break;
                    case 'playerCallSendLike':
                        this.playerAgentList[element] = this.html5AndFlash(element, object, 'onLikeCallBack');
                        break;
                    case 'elecPlugin':
                        if (typeof prop['isCharged'] === 'function') {
                            data[element] = prop['isCharged']() ? element : null;
                        }
                        this.playerAgentList[element] = prop;
                        break;
                    default:
                        this.playerAgentList[element] = prop;
                        break;
                }
            }
        }
        return data;
    }
    checkInteractive(fromFlash: boolean, params: number) {
        try {
            if (params && params >> 29 === 1) {
                if (window.PlayerAgent && typeof window.PlayerAgent.showInteractDialog === 'function') {
                    if (fromFlash) {
                        window.PlayerAgent.showInteractDialog(1, () => {
                            this.setLocalStorage('firstInteractive', '1');
                            this.setLocalStorage('defaulth5', '1');
                            this.reload(String(this.playerParams));
                        });
                    } else if (this.ChatGetSettings('firstInteractive') !== '1') {
                        this.setLocalStorage('firstInteractive', '1');
                        window.PlayerAgent.showInteractDialog(0);
                    }
                } else {
                    setTimeout(() => {
                        this.checkInteractive(fromFlash, params);
                    }, 500);
                }
            }
        } catch (e) {
            console.debug('[Player] > try to analyze attribute error');
        }
    }

    private onlyH5() {
        if (this.getMustH5()) {
            if (this.gray_support_html5) {
                return false;
            } else {
                this.mustH5();
                return true;
            }
        }
        return false;
    }

    private getMustH5() {
        return this.playerParams && this.playerParams.match(/musth5=([^\s&]+)/);
    }

    private mustH5() {
        import(/* webpackChunkName: "musth5" */ '@jsc/must-h5').then((s) => {
            new s.default({
                id: 'bofqi',
                url: '//s1.hdslb.com/bfs/static/player/img/h5.png',
                textList: ['您当前的浏览器不支持HTML5播放器', '请切换浏览器再试试哦~'],
            });
        });
    }
}

const grayManager = new GrayManagerClass();

export default grayManager;


//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        pageno?: number;
        directiveDispatcher: (receive: string | IReceived) => void;
        __GetCookie: (cookieName: string) => string;
        __playinfo__?: Record<string, any>;
        __playurlMap__?: Record<string, any>;
        __INITIAL_STATE__?: Record<string, any>;
        swfobject: {
            removeSWF: (target: string) => void;
            embedSWF: (...args: any[]) => void;
        };
        aid: number;
        cid: number;
        bvid?: string;
        RECORD_STRING: string;
        NoFlashTips: typeof NoFlashTips;
        Html5IframeInitialized: () => void;
        BilibiliPlayer: typeof BilibiliPlayer;
    }
    interface PerformanceTiming {
        [key: string]: number;
    }
}