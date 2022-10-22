import ITextDataInterface from "./text_data";

/**
 * @file TODO: 完善声明
 */
export default interface IDanmakuConfigExtInterface {
    height: number;
    width: number;
    devicePR: number;
    container: HTMLElement;
    bold: boolean;
    duration: number;
    danmakuNumber: number;
    danmakuArea: number; // 0-100(0为无限，50为半屏，100为满屏)
    fontBorder: number;
    fontFamily: string;
    fontSize: number;
    fullScreenSync: boolean;
    offsetTop: number;
    offsetBottom: number;
    opacity: number;
    preventShade: boolean;
    speedPlus: number;
    speedSync: boolean;
    type: 'div' | 'canvas';
    videoSpeed: number;
    visible: boolean;
    isRecycling: boolean;
    verticalDanmaku: boolean;
    preTime: number;

    danmakuFilter: (danmaku: ITextDataInterface) => boolean;
    danmakuInserting: (danmaku: ITextDataInterface) => void;
    containerUpdating: (container: HTMLElement) => void;
    listUpdating: (danmakuList: ITextDataInterface[]) => void;
    countUpdating: (count: number) => void;
    timeSyncFunc: () => number;
}
export interface IDmTrack {
    all: number;
    allbas: number;
    view: number;
    dm: number;
    bas: number;
    one: number;
    two: number;
    three: number;
    four: number;
    loadstart: number;
    loadtime: number;
    dmnum: number;
    dmexposure: number;
    appendtime: number;
    dmdetail: number;
    dmdetailfail: number;
    dmfail: number;
    combofail: number;
    dmviewnull: number;
    fail: string;
    dmSetIO?: any;

    delNum?: number;
    highNum?: number;
    render?: number;
    num?: number;
}