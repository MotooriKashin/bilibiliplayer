import { utils } from '@shared/utils';
import GrayManager from './graymanager';
import { ContentType } from '@jsc/namespace';

async function EmbedPlayer(
    type: string,
    player: any,
    playerParamsArg: string,
    playerType: string,
    upgrade: boolean,
    callbackFn: Function,
    isIframe: boolean,
) {
    player = '';
    let config: any = utils.defaultSearch(playerParamsArg);
    config.show_bv = window['show_bv'] ?? config.show_bv;
    await getAllCid(config);
    if (isIframe) {
        if (NotInReferrerList()) return;
        if (config.crossDomain) {
            if (window.location.host.indexOf('.bilibili.com') !== -1) {
                document.domain = 'bilibili.com';
            } else if (window.location.host.indexOf('.bilibili.co') !== -1) {
                document.domain = 'bilibili.co';
            }
        }
        preLoadIframe(config);
        if (config.gamePlayer) {
            config = {
                gamePlayer: config.gamePlayer,
                hasDanmaku: config.hasDanmaku,
                aid: config.aid,
                bvid: config.bvid,
                show_bv: window.show_bv,
                cid: config.cid,
                p: config.p,
                autoplay: config.autoplay ? 1 : '',
                gamePlayerType: config.hasDanmaku ? 0 : '1',
            };
            player = '//player.bilibili.com/tools/gameplayer/GamePlayer.swf';
        }
        if (!config.playlistId) {
            const list = window.getPlayList();
            if (config.playlist && list) {
                const data = list && list.data;
                const text = JSON.stringify(list);
                config.aid = config.aid || (data && data.list && data.list[0].aid);
                config.bvid = config.bvid || (data && data.list && data.list[0].bvid);
                config.cid = config.cid || (data && data.list && data.list[0].pages[0].cid);
                config.playlist = encodeURIComponent(text);
                config.playlist_order = config.playlist_order;
            }
        }
    }
    playerParamsArg = utils.objToStr(config);
    // bangumi callback hack
    const placeholder = document.querySelector('#player_placeholder');
    if (placeholder && placeholder.parentNode !== null) {
        placeholder.parentNode.removeChild(placeholder);
    }
    // extend player params
    const bofqi = document.querySelector('#bilibili-player') || document.querySelector('#bofqi');
    const extentParamsNode = Array.prototype.filter.call(bofqi && bofqi.childNodes, (item: ChildNode) => {
        return item.nodeType === 3;
    });
    let text = '';
    extentParamsNode.forEach((item: ChildNode) => {
        text += item.textContent;
    });
    const extendParams = text.match(/\[flashvars\](.*)\[\/flashvars\]/);
    let playerParams = playerParamsArg;

    if (utils.GetUrlValue('d')) {
        playerParams = `${playerParams}&d=${utils.GetUrlValue('d')}`;
    }
    if (utils.GetUrlValue('t')) {
        playerParams = `${playerParams}&t=${utils.GetUrlValue('t')}`;
    }
    if (utils.GetUrlValue('start_progress')) {
        playerParams = `${playerParams}&start_progress=${utils.GetUrlValue('start_progress')}`;
    }
    if (utils.GetUrlValue('lastplaytime')) {
        playerParams = `${playerParams}&lastplaytime=${utils.GetUrlValue('lastplaytime')}`;
    }
    if (extendParams != null) {
        playerParams = `${playerParams}&${extendParams[1]}`;
        extentParamsNode.forEach((item: any) => {
            item.parentNode.removeChild(item);
        });
    }
    if (playerParams) {
        window.aid = <any>playerParams.match(/aid=(\d+)/) && playerParams.match(/aid=(\d+)/)![1];
        window.cid = <any>playerParams.match(/cid=(\d+)&/);
        if (window.cid) {
            window.cid = (<any>window).cid[1];
        }
        const bvid = playerParams.match(/bvid=(\w+)&?/);
        const show = playerParams.match(/show_bv=1&?/);
        // 如果 bvid 和 show 都存在，才赋值到 window.bvid
        // 后续可以使用 window.bvid 当作总开关（仅在 video 仓库中使用）
        if (bvid && show) {
            window.bvid = bvid[1];
        }
    }
    GrayManager.loadingTime = +new Date();
    GrayManager.init(type, player, playerParams, playerType, upgrade, callbackFn);

    const mouseevnet = (e: Event) => {
        if (e.target !== null && (<HTMLDivElement>e.target)['id'] === 'player_placeholder') {
            const delta = window.deltaFilter(<WheelEvent>e),
                obj: any = document.getElementById('player_placeholder');
            if (
                delta &&
                obj &&
                obj.scrollHappened &&
                obj.scrollHappened(delta) &&
                !(
                    /(webkit)[ /]([\w.]+).*(version)[ /]([\w.]+).*(safari)[ /]([\w.]+)/.test(
                        navigator.userAgent.toLowerCase(),
                    ) ||
                    /(version)(applewebkit)[ /]([\w.]+).*(safari)[ /]([\w.]+)/.test(navigator.userAgent.toLowerCase())
                )
            ) {
                e.preventDefault();
            }
        }
    };
    document.body.addEventListener('mousewheel', mouseevnet, { passive: false });
    document.body.addEventListener('DOMMouseScroll', mouseevnet, { passive: false });

    return false;
}
export async function getAllCid(config: any) {
    if (!config.aid && config.bvid) {
        return await getCid(config);
    }

    if (config.cid) return;
    if (+config.type === ContentType.Pugv && config.episodeId) {
        config.type = window.bPlayer.type.Pugv;
        config.urlparam = '';
        if (!config.theme) {
            config.theme = 'green';
        }
        return await getPugvCid(config);
    }
    if (config.episodeId) {
        config.urlparam = 'module%3Dbangumi';
        config.player_type = 1;
        return await getOgvCid(config);
    }
    if (config.aid || config.bvid) {
        return await getCid(config);
    }
    return config;
}
// -------------------------------------------
function preLoadIframe(config: any) {
    window.getPlayList = () => {
        return callParentFunction('getPlayList');
    };
    window.PlayerAgent = {
        showPay: () => {
            if (utils.GetUrlValue('type') === '0') {
                //  window.bPlayer.type.Pugv
                window.open('https://www.bilibili.com/cheese/play/ep' + config.episodeId);
            } else {
                const avpath = window.show_bv ? window.bvid : `av${window.aid}`;
                window.open('https://www.bilibili.com/video/' + avpath);
            }
        },
        showVipPay: () => {
            if (utils.GetUrlValue('auxiliary') === '0') {
                //  window.bPlayer.type.Pugv
                window.open('https://www.bilibili.com/cheese/play/ep' + config.episodeId);
            } else {
                const avpath = window.show_bv ? window.bvid : `av${window.aid}`;
                window.open('https://www.bilibili.com/video/' + avpath);
            }
        },
    };
    window.onunload = () => {
        try {
            window.player && window.player.destroy();
        } catch (e) { }
    };
    try {
        window.parent.GrayManager = window.GrayManager;
        window.heimu = window.parent.heimu = <any>undefined;
        if (window.parent.PlayerAgent) {
            window.PlayerAgent = window.parent.PlayerAgent;
        }
        window.elecPlugin = window.parent.elecPlugin;

        const funcs = [
            'player_widewin',
            'player_fullwin',
            'callAppointPart',
            'playerCallSendLike',
            'playerCallSendCollect',
            'playerCallSendCoin',
            'showPay',
            'show1080p',
            'attentionTrigger',
            'showRealNameBind',
            'getAuthorInfo',
        ];
        for (let i = 0; i < funcs.length; i++) {
            if (typeof window.parent[<keyof Window>funcs[i]] === 'function' && window.parent !== window) {
                (<any>window)[funcs[i]] = (...arg: any) => {
                    return (<any>window).parent[funcs[i]].apply(window.parent, arg);
                };
            }
        }
    } catch (e) {
        console.warn(e);
    }
}
function callParentFunction(name: string, ...arg: any) {
    try {
        if (window.top !== window.self) {
            return window.parent && (<any>window).parent[name] && (<any>window).parent[name].apply(null, arg);
        } else {
            return false;
        }
    } catch (e) {
        console.warn(e);
    }
}
export function setParentPlayer() {
    try {
        window.parent.player = window.player;
        if (typeof window.parent['Html5IframeInitialized'] === 'function') {
            window.parent['Html5IframeInitialized']();
        }
    } catch (e) { }
}
function NotInReferrerList() {
    if (window.top === window.self || !window.REFERRER_LIST) {
        return false;
    }
    try {
        const h = window.document.referrer.match(/^http(s)?:\/\/(.*?)\//);
        if (
            h &&
            h[2] &&
            !new RegExp(window.REFERRER_LIST.join('|').replace(/\./g, '\\.').replace(/\*/g, '.*')).test(h[2])
        ) {
            return true;
        } else if (
            !window.document.referrer &&
            window.navigator.userAgent.indexOf('MicroMessenger') === -1 &&
            window.navigator.userAgent.indexOf('IqiyiApp') === -1
        ) {
            return true;
        }
    } catch (e) { }
    return false;
}
function getCid(cfg: any) {
    const data: any = {};
    const index = (cfg.p || 1) - 1;
    if (window['show_bv']) {
        data.bvid = cfg.bvid;
    } else {
        data.aid = cfg.aid;
    }
    return utils
        .ajax({
            data,
            method: 'GET',
            url: '//api.bilibili.com/x/web-interface/view',
            async: true,
            withCredentials: true,
        })
        .then((respose: any) => {
            try {
                const res = JSON.parse(respose);
                if (res?.data) {
                    if (!window['__INITIAL_STATE__']) {
                        window['__INITIAL_STATE__'] = {
                            videoData: res.data,
                        };
                    }
                    if (!cfg.cid) {
                        const pages = res.data.pages;
                        if (pages?.[index]) {
                            cfg.cid = pages[index].cid;
                        } else {
                            cfg.cid = pages?.[0].cid || res.data.cid;
                        }
                    }
                    cfg.aid = cfg.aid || res.data.aid;
                }
            } catch (error) { }
        })
        .catch(() => { });
}
function getOgvCid(cfg: any) {
    const data: any = {
        ep_id: cfg.episodeId,
    };
    return utils
        .ajax({
            data,
            method: 'GET',
            url: '//api.bilibili.com/pgc/view/web/season',
            async: true,
            withCredentials: true,
        })
        .then((respose: any) => {
            try {
                const res = JSON.parse(respose);
                const result = res && res.result;
                if (result) {
                    cfg.seasonId = result.season_id;
                    cfg.season_type = result.type;

                    const episodes = result.episodes;
                    if (Array.isArray(episodes)) {
                        for (let i = 0; i < episodes.length; i++) {
                            if (+episodes[i].id === +cfg.episodeId) {
                                cfg.cid = episodes[i].cid;
                                cfg.aid = episodes[i].aid;
                                cfg.bvid = episodes[i].bvid || '';
                                return;
                            }
                        }
                    }
                    const section = result.section;
                    if (Array.isArray(section)) {
                        for (let i = 0; i < section.length; i++) {
                            const episodes = section[i].episodes;
                            if (Array.isArray(episodes)) {
                                for (let j = 0; j < episodes.length; j++) {
                                    if (+episodes[j].id === +cfg.episodeId) {
                                        cfg.cid = episodes[j].cid;
                                        cfg.aid = episodes[j].aid;
                                        cfg.bvid = episodes[j].bvid || '';
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) { }
        })
        .catch(() => { });
}
function getPugvCid(cfg: any) {
    const data: any = {
        ep_id: cfg.episodeId,
    };
    return utils
        .ajax({
            data,
            method: 'GET',
            url: '//api.bilibili.com/pugv/view/web/season',
            async: true,
            withCredentials: true,
        })
        .then((respose: any) => {
            try {
                const res = JSON.parse(respose);
                const data = res && res.data;
                if (data) {
                    const episodes = data.episodes;
                    if (Array.isArray(episodes)) {
                        for (let i = 0; i < episodes.length; i++) {
                            if (+episodes[i].id === +cfg.episodeId) {
                                cfg.cid = episodes[i].cid;
                                cfg.aid = episodes[i].aid;
                                cfg.musth5 = 1;
                                cfg.bvid = episodes[i].bvid || '';
                                break;
                            }
                        }
                    }
                }
            } catch (error) { }
        })
        .catch(() => { });
}
export default EmbedPlayer;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        show_bv: boolean;
        getPlayList: () => any;
        PlayerAgent: {
            showPay: () => void;
            showVipPay: () => void;
            showInteractDialog?: Function;
            player_fullwin?: Function;
            PlayerSetOnline?: Function;
            player_widewin?: Function;
            getActionState?: Function;
            triggerReload?: Function;
            getAuthorInfo?: Function;
            playerCallSendTriple?: Function;
        };
        REFERRER_LIST?: string[];
    }
}