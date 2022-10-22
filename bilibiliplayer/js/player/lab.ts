import Player from '../player';
import LABCONFIG from './lab/config';
import pbploader from '@jsc/pbploader';
import { ContentType } from '@jsc/namespace';

import '../../css/lab.less';

class Lab {
    static load(player: Player) {
        // load pbp set to a must load lab
        if (player.config.type === ContentType.OgvPre) return;
        if (!player.config.lightWeight && !player.config.interactivePreview && !player.config.interactiveGraphId) {
            if (!pbploader.isSupport() || pbploader.load(player) === false) {
                console.warn('load pbp failed.');
            }
        }

        // if (window.GrayManager && window.GrayManager.labList && window.GrayManager.labList.length) {
        //     for (let i = 0; i < window.GrayManager.labList.length; i++) {
        //         Lab.loadByLabIndex(player, window.GrayManager.labList[i].id, window.GrayManager.labList[i].params);
        //     }
        // }
    }

    static loadByLabIndex(player: Player, index: number, params: any) {
        Lab.saveLab(index, params);
        if (LABCONFIG[<1>index] && typeof LABCONFIG[<1>index].load === 'function') {
            LABCONFIG[<1>index].load(player, params);
        }
    }

    static saveLab(index: number, params: any) {
        if (!window.GrayManager) {
            return false;
        } else {
            if (!window.GrayManager.labList) {
                window.GrayManager.labList = [];
            }
            if (Lab.searchLabByLabIndex(index) === -1) {
                window.GrayManager.labList.push({
                    id: index,
                    params: params,
                });
            }
        }
    }

    static searchLabByLabIndex(index: number) {
        for (let i = 0; i < window.GrayManager.labList.length; i++) {
            if (index === window.GrayManager.labList[i].id) {
                return i;
            }
        }
        return -1;
    }

    static getParams(player: Player, eventid: string) {
        let params = [];
        if (window.GrayManager && window.GrayManager.labList && window.GrayManager.labList.length) {
            for (let i = 0; i < window.GrayManager.labList.length; i++) {
                const p = Lab.getParamsByLabIndex(player, eventid, window.GrayManager.labList[i].id);
                if (p) {
                    params.push(p);
                }
            }
        }
        return params.join(';');
    }

    static getParamsByLabIndex(player: Player, eventid: string, index: number) {
        if (LABCONFIG[<1>index] && typeof LABCONFIG[<1>index].getParams === 'function') {
            return LABCONFIG[<1>index].getParams(eventid, player);
        }
    }

    static destroy(player: Player) {
        if (window.GrayManager && window.GrayManager.labList && window.GrayManager.labList.length) {
            for (let i = 0; i < window.GrayManager.labList.length; i++) {
                Lab.destroyByLabIndex(player, window.GrayManager.labList[i].id);
            }
        }
    }

    static destroyByLabIndex(player: Player, index: number) {
        if (LABCONFIG[<1>index] && typeof LABCONFIG[<1>index].destroy === 'function') {
            LABCONFIG[<1>index].destroy(player);
        }
    }
}

export default Lab;
