import Main from './ts/main';

export interface IConfig {
    wrappers?: IWrap[];
    width?: number;
    height?: number;
    rate?: number;
    fps?: number;
    time?: number;
    background?: string;
    fixedSize?: boolean;
    imgWidth?: number;
    imgHeight?: number;
    isPNG?: number;
    quality?: number;
    rendering?: Function;
    danmakuType?: Function;
    result?: Function;
}
export interface IData {
    code: number;
    result: string;
    message: string;
}
interface IWrap {
    dom: any;
    dmType: string;
    width: number;
    height: number;
    margin: number[];
    isVideo: boolean;
    dmLayer?: any;
}

class ScreenShot {
    config: Required<IConfig>;
    data: IData;
    constructor(config: IConfig) {
        this.data = {
            code: 200,
            result: '',
            message: '', // 提示信息
        };
        this.config = {
            wrappers: [], // 所有截图容器
            width: 620,
            height: 420,
            rate: 0.7, // 比例
            fps: 24, // 每秒多少帧
            time: 2000, // gif总时间(ms)
            background: '#000',
            fixedSize: false, // 是否固定尺寸
            imgWidth: 300, // 固定尺寸宽px
            imgHeight: 200, // 固定尺寸高px
            isPNG: 1, // 1:截图  0: 截gif
            quality: 80, // gif画质 越小越高
            rendering: () => {},
            danmakuType: () => {},
            result: () => {},
            ...config,
        };
        new Main(this.config, this.data);
    }
}

export default ScreenShot;
