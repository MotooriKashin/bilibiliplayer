/**
 * Created by Hellcom on 2016/9/14.
 */

import SpaceManager from './space_manager';

import IDanmakuConfigExtInterface from '../interface/danmaku_config_ext';
import IRenderExtInterface from '../interface/render_ext';
import { ISubModeSetInterface, IInstanceSetInterface, DanmakuModeInterface } from '../interface/danmaku_mode';

/**
 * 弹幕的生存周期管理者
 * 原管理者特化为空间管理器
 */
export abstract class BaseMode {
config: IDanmakuConfigExtInterface;
spaceManager!: SpaceManager;

    constructor(config: IDanmakuConfigExtInterface) {
        this.config = config;
    }

onStart(text: IRenderExtInterface): void {
        this.spaceManager.add(text);
        text.manager = this;
    }

onEnd(text: IRenderExtInterface, isRemoveRecycling?: boolean): HTMLElement | void {
        this.spaceManager.remove(text);
        text.manager = null;
        text.free();
    }

abstract onUpdate(text: IRenderExtInterface, time: number): boolean;
}

/**
 * 模式1: 滚动弹幕
 */
class Mode1 extends BaseMode {
    constructor(config: IDanmakuConfigExtInterface) {
        super(config);
        this.spaceManager = new SpaceManager(config, true);
    }

onUpdate(text: IRenderExtInterface, time: number): boolean {
        if (text.isHover) {
            return true;
        }
        if (!text.paused && text.rest < (+new Date() - text.pauseTime) / 1000) {
            return false;
        } else {
            text._x = text.getX();
            text._y = text.y;
            return true;
        }
    }

onEnd(text: IRenderExtInterface, isRemoveRecycling?: boolean): HTMLElement | void {
        this.spaceManager.remove(text);
        text.manager = null;
        return text.free(isRemoveRecycling);
    }
}

/**
 * 模式4: 底部弹幕
 */
class Mode4 extends BaseMode {
    constructor(config: IDanmakuConfigExtInterface) {
        super(config);
        this.spaceManager = new SpaceManager(config);
    }

onUpdate(text: IRenderExtInterface, time: number): boolean {
        if (text.isHover) {
            return true;
        }
        if (text.end < time) {
            return false;
        } else {
            text._x = text.x;
            text._y =
                this.config.height * (this.config.preventShade ? 0.85 : 1) -
                (this.config.offsetBottom || 0) -
                text.y -
                text.height +
                (this.config.offsetTop || 0);
            return true;
        }
    }
}

/**
 * 模式5: 顶部弹幕
 */
class Mode5 extends BaseMode {
    constructor(config: IDanmakuConfigExtInterface) {
        super(config);
        this.spaceManager = new SpaceManager(config);
    }

onUpdate(text: IRenderExtInterface, time: number): boolean {
        if (text.isHover) {
            return true;
        }
        if (text.end < time) {
            return false;
        } else {
            text._x = text.x;
            text._y = text.y;
            return true;
        }
    }
}

/**
 * 模式6: 逆向弹幕
 */
class Mode6 extends BaseMode {
    constructor(config: IDanmakuConfigExtInterface) {
        super(config);
        this.spaceManager = new SpaceManager(config, true);
    }

onUpdate(text: IRenderExtInterface, time: number): boolean {
        if (text.isHover) {
            return true;
        }
        if (!text.paused && text.rest < (+new Date() - text.pauseTime) / 1000) {
            return false;
        } else {
            text._x = text.getX();
            text._y = text.y;
            return true;
        }
    }

onEnd(text: IRenderExtInterface, isRemoveRecycling?: boolean): HTMLElement | void {
        this.spaceManager.remove(text);
        text.manager = null;
        return text.free(isRemoveRecycling);
    }
}

const MODE_SET: ISubModeSetInterface = {
    '1': Mode1,
    '4': Mode4,
    '5': Mode5,
    '6': Mode6,
};

let danmakuMode: DanmakuModeInterface = function (config) {
    let instanceSet: IInstanceSetInterface = {};

    for (let i in MODE_SET) {
        if (MODE_SET.hasOwnProperty(i)) {
            instanceSet[i] = new MODE_SET[<keyof ISubModeSetInterface><unknown>i](config);
        }
    }

    return instanceSet;
};

export default danmakuMode;
