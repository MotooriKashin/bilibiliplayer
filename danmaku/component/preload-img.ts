import enterprise from '../less/enterprise.svg';
import person from '../less/person.svg';
import like from '../less/like.svg';
import liked from '../less/liked.svg';

interface IimgData {
    img: HTMLImageElement;
    width: number;
    height: number;
    icon?: HTMLImageElement;
}
export const imgObj: { [key: string]: IimgData } = {};
export const svgObj: { [key: string]: HTMLImageElement } = {};
const preloadList: Promise<unknown>[] = [];
const flagToSvg = {
    0: person,
    1: enterprise,
    like,
    liked,
};

function load(picture: string, flag?: number) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = picture;
        img.onload = () => {
            imgObj[picture] = {
                img,
                width: img.width,
                height: img.height,
            };
            if (!svgObj[flag!] && flagToSvg[<keyof typeof flagToSvg>flag]) {
                loadSvg(String(flag))
                    .then(() => {
                        resolve(imgObj[picture]);
                    })
                    .catch(() => {
                        reject();
                    });
            } else {
                resolve(imgObj[picture]);
            }
        };
        img.onerror = () => {
            reject();
        };
    });
}
export function loadSvg(flag: string) {
    return new Promise((resolve: (value?: unknown) => void, reject) => {
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(flagToSvg[<keyof typeof flagToSvg>flag]);
        img.onload = () => {
            svgObj[flag] = img;
            resolve();
        };
        img.onerror = () => {
            reject();
        };
    });
}
export function loadImg(picture: string, flag?: number): Promise<unknown> {
    if (flagToSvg[<keyof typeof flagToSvg>flag] && !svgObj[flag!]) {
        preloadList[<number><unknown>picture] = load(picture, flag);
    }
    return preloadList[<number><unknown>picture] || (preloadList[<number><unknown>picture] = load(picture, flag));
}
