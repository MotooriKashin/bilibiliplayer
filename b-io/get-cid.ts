import { ajax } from '@shared/utils';
import { ContentType } from '@jsc/namespace';

export interface IConfig {
    aid: number;
    cid?: number;
    bvid?: string;
    p?: number;
    theme?: string;
    show_bv?: number;
    episodeId?: number;
    seasonId?: number;
    season_type?: number;
    type?: number;
}
export async function getAllCid(config: IConfig) {
    if (!config.aid && config.bvid) {
        return await getCid(config);
    }
    if (config.cid) return;
    const type = Number(config.type);
    if ((type === ContentType.Pugv || type === ContentType.PugvCenter) && config.episodeId) {
        if (!config.theme) {
            config.theme = 'green';
        }
        return await getPugvCid(config);
    }
    if (config.episodeId) {
        return await getOgvCid(config);
    }
    if (config.aid || config.bvid) {
        return await getCid(config);
    }
    return config;
}

function getCid(cfg: IConfig) {
    const data: any = {};
    const index = (cfg.p || 1) - 1;
    if (cfg.show_bv) {
        data.bvid = cfg.bvid;
    } else {
        data.aid = cfg.aid;
    }
    return ajax({
        data,
        url: '//api.bilibili.com/x/web-interface/view',
    })
        .then((respose: string) => {
            try {
                const res = JSON.parse(respose);
                if (res?.data) {
                    const pages = res.data.pages;
                    if (pages?.[index]) {
                        cfg.cid = pages[index].cid;
                    } else {
                        cfg.cid = pages?.[0].cid || res.data.cid;
                    }
                    cfg.aid = cfg.aid || res.data.aid;
                }
            } catch (error) {}
        })
        .catch(() => {});
}
function getOgvCid(cfg: IConfig) {
    const data = {
        ep_id: cfg.episodeId,
    };
    return ajax({
        data,
        url: '//api.bilibili.com/pgc/view/web/season',
    })
        .then((respose: string) => {
            try {
                const res = JSON.parse(respose);
                const result = res && res.result;
                if (result) {
                    cfg.seasonId = result.season_id;
                    cfg.season_type = result.type;

                    const episodes = result.episodes;
                    if (Array.isArray(episodes)) {
                        for (let i = 0; i < episodes.length; i++) {
                            if (+episodes[i].id === Number(cfg.episodeId)) {
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
                                    if (+episodes[j].id === Number(cfg.episodeId)) {
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
            } catch (error) {}
        })
        .catch(() => {});
}
function getPugvCid(cfg: IConfig) {
    const data = {
        ep_id: cfg.episodeId,
    };
    return ajax({
        data,
        url: '//api.bilibili.com/pugv/view/web/season',
    })
        .then((respose: string) => {
            try {
                const res = JSON.parse(respose);
                const data = res && res.data;
                if (data) {
                    const episodes = data.episodes;
                    if (Array.isArray(episodes)) {
                        for (let i = 0; i < episodes.length; i++) {
                            if (+episodes[i].id === Number(cfg.episodeId)) {
                                cfg.cid = episodes[i].cid;
                                cfg.aid = episodes[i].aid;
                                cfg.bvid = episodes[i].bvid || '';
                                break;
                            }
                        }
                    }
                }
            } catch (error) {}
        })
        .catch(() => {});
}
