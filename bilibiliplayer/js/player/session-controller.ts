import { getSessionSettings, setSessionSettings } from '@shared/utils';
import { logger } from '../plugins/internal-logger';

class SessionController {
    static storageName: string = 'bilibili_player_settings';
    static aid: number;
    static bvid: string;
    // 每次调用seeion之前一定要传入storageName，aid
    static updateConfig(storageName: string, aid: number, bvid: string) {
        SessionController.storageName = storageName;
        SessionController.aid = aid;
        SessionController.bvid = bvid;
    }
    static getSession(type?: string | undefined, key?: string | undefined) {
        let sessionSettings: any = {};
        if (!getSessionSettings(SessionController.storageName)) {
            return false;
        } else {
            sessionSettings = JSON.parse(getSessionSettings(SessionController.storageName)!);
        }
        if (typeof type === 'string' && typeof sessionSettings[type] !== 'object') {
            return false;
        } else if (typeof type === 'undefined' && typeof key === 'undefined') {
            return sessionSettings;
        } else if (typeof type === 'string' && typeof key === 'undefined') {
            return sessionSettings[type];
        } else if (typeof type === 'string' && typeof key === 'string') {
            return sessionSettings[type][key];
        } else {
            return false;
        }
    }

    static removeSession() {
        const videoaid = SessionController.getSession('video_status', 'videoaid') || '';
        const videobvid = SessionController.getSession('video_status', 'videobvid') || '';
        if (videoaid !== SessionController.aid && videobvid !== SessionController.bvid) {
            if (videoaid !== SessionController.aid) {
                SessionController.setSession('video_status', 'videoaid', SessionController.aid);
                if (videoaid) {
                    SessionController.setSession('video_status', 'videospeed', '');
                    SessionController.setSession('video_status', 'videomirror', '');
                    SessionController.setSession('video_status', 'videosize', '');
                }
            }

            if (videobvid !== SessionController.bvid) {
                SessionController.setSession('video_status', 'videobvid', SessionController.bvid);
                if (videobvid) {
                    SessionController.setSession('video_status', 'videospeed', '');
                    SessionController.setSession('video_status', 'videomirror', '');
                    SessionController.setSession('video_status', 'videosize', '');
                }
            }
        }
    }

    static setSession(type?: any, key?: any, value?: any) {
        // session可能会存放一些与local不同的变量,比如说videospeed这种仅session需要的(videomirror,videospeed).
        let sessionSettings: any = {};
        if (!getSessionSettings(SessionController.storageName)) {
            setSessionSettings(SessionController.storageName, '{}');
        } else {
            sessionSettings = JSON.parse(getSessionSettings(SessionController.storageName)!);
        }
        switch (arguments.length) {
            case 3:
                {
                    try {
                        if (!sessionSettings[type] || typeof sessionSettings !== 'object') {
                            sessionSettings[type] = {};
                        }
                        sessionSettings[type][key] = value;
                        setSessionSettings(SessionController.storageName, JSON.stringify(sessionSettings));
                    } catch (e: any) {
                        logger.w(e);
                    }
                }
                break;
            case 2:
                {
                    try {
                        if (typeof arguments[0] === 'string') {
                            const videoSettings = JSON.parse(getSessionSettings(SessionController.storageName)!);
                            if (videoSettings) {
                                let value = arguments[1];
                                if (typeof arguments[1] === 'object') {
                                    value = arguments[1];
                                } else if (typeof arguments[1] === 'string') {
                                    // 只接受可以被解析的string参数
                                    try {
                                        value = JSON.parse(arguments[1]);
                                    } catch (e) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                                videoSettings[arguments[0]] = value;
                                setSessionSettings(SessionController.storageName, JSON.stringify(videoSettings));
                            }
                        } else {
                            return false;
                        }
                    } catch (e) { }
                }
                break;
            default: {
                return false;
            }
        }
    }
}

export default SessionController;
