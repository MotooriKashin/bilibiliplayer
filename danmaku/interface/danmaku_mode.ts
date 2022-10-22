import { BaseMode } from "../component/danmaku_mode"
import IDanmakuConfigExtInterface from "./danmaku_config_ext"

/**
 * @file TODO: 完善声明
 */
export interface ISubModeSetInterface {
    1: new (config: IDanmakuConfigExtInterface) => BaseMode;
    4: new (config: IDanmakuConfigExtInterface) => BaseMode;
    5: new (config: IDanmakuConfigExtInterface) => BaseMode;
    6: new (config: IDanmakuConfigExtInterface) => BaseMode;
}
export interface IInstanceSetInterface {
    [key: string]: BaseMode;
}
export interface DanmakuModeInterface {
    (config: IDanmakuConfigExtInterface): IInstanceSetInterface
}
export interface IBaseModeInterface extends BaseMode { }