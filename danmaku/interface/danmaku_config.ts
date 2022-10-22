import ITextDataInterface from "./text_data";

/**
 * @file TODO: 完善声明
 */
export default interface IDanmakuConfigInterface {
    container: HTMLDivElement;
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