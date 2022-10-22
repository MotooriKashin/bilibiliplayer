/**
 * @file TODO: 完善声明
 */
export default interface ITextDataInterface extends ITextData {
    zIndex?: number;
    divClassName?: string;
    duration?: number;
    canvas?: {
        canvas: CanvasImageSource;
        width: number;
        height: number;
    }[];
    vDanmaku?: boolean;
    showed?: boolean;
    attr?: number;
    flag?: number;
    headImg?: string;
    picture?: string;
    on?: boolean;
    likes?: {
        num: number
    };
    border?: boolean;
    borderColor?: number;
    offsetTop?: number;
    pool?: number;
    uhash?: string;
    weight?: number;
}
export interface ITextData {
    dmid: string;
    mode: number;
    size: number;
    date: number;
    class: number;
    stime: number;
    color: number;
    uid: string;
    text: string;
    mid?: number;
    uname?: string;
}