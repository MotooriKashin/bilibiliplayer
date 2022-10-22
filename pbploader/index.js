import api from './api';
const CURRENT_VERSION = '1.0.0';
const DEFAULT_MODULE_DATA = {
    modules: [
        {
            params: {},
            script_src: '//i0.hdslb.com/bfs/static/pbp/pbp-stable.min.js',
            name: 'pbp',
            load_mode: 'pbp',
            version: 'stable',
        },
    ],
};

export default class pbploader {
    static isSupport() {
        if (!Promise) return false;
        try {
            localStorage && sessionStorage;
        } catch (e) {
            return false;
        }
        return true;
    }

    static load(player) {
        let cfg = player.config;
        pbploader
            .loadModules(cfg)
            .then((module) => {
                let mode = module.load_mode;
                let params = module.params;
                params.panelDisabled = true;
                if (mode == 'pbp') {
                    player.loadLab(1, params);
                }
                console.debug(`load module ${module.name}`);
            })
            .catch((e) => {
                console.warn('load module failed');
            });
        return true;
    }

    static loadModules(cfg) {
        return new Promise((resolve, reject) => {
            let aid = cfg.aid;
            let bvid = cfg.bvid;
            let cid = cfg.cid;
            if (!cid) {
                reject('cid miss');
                return;
            }
            let loaderApi = localStorage.getItem('pbploader_api') || '';
            api.getModules({
                aid: aid,
                bvid: bvid,
                cid: cid,
                loaderApi: loaderApi,
                version: CURRENT_VERSION,
                defaultResult: null,
            })
                .then(resolve)
                .catch(reject);
        }).then((moduleData) => {
            return new Promise((resolve, reject) => {
                if (!moduleData) {
                    reject(null);
                }
                let modules = moduleData.modules;
                for (let i = 0; i < modules.length; i++) {
                    let module = modules[i];
                    if (!module.script_src) {
                        console.warn('script_src miss');
                        continue;
                    }
                    let mode = module.load_mode;
                    if (mode == 'pbp' && window.BiliPBP) {
                        try {
                            if (!localStorage.getItem('pbpstate_clear')) {
                                localStorage.removeItem('pbpstate');
                                localStorage.setItem('pbpstate_clear', '1');
                            }
                            const state = localStorage.getItem('pbpstate');
                            if (!state) localStorage.setItem('pbpstate', '1');
                        } catch (e) {
                            console.error(e);
                        }
                        resolve(module);
                        continue;
                    }
                    const script = document.createElement('script');
                    script.src = module.script_src;
                    script.onerror = () => {
                        if (mode == 'pbp') reject('pbp load error');
                    };
                    script.onload = () => {
                        if (mode == 'pbp') resolve(module);
                    };

                    if (mode == 'script_load') {
                        document.body.appendChild(script);
                    } else if (mode == 'pbp') {
                        try {
                            if (!localStorage.getItem('pbpstate_clear')) {
                                localStorage.removeItem('pbpstate');
                                localStorage.setItem('pbpstate_clear', '1');
                            }
                            const state = localStorage.getItem('pbpstate');
                            if (!state) localStorage.setItem('pbpstate', '1');
                        } catch (e) {
                            console.error(e);
                        }
                        document.body.appendChild(script);
                    }
                }
            });
        });
    }
}
