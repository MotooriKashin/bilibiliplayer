import { StoryChoices, ApiSkin } from '../../io/api-interactive';
import Konva from 'konva';
const intButton = function (
    data: StoryChoices,
    type: number,
    skin?: ApiSkin,
    choiceLength?: number,
    dimensionWidth?: number,
): Promise<Konva.Group> {
    const defaultWidth = 667;
    const buttonWidth = choiceLength === 3 ? 202 : 309;
    const iv_button = new Konva.Group({
        id: 'iv-button',
    });
    const tipsGroup = new Konva.Group();
    const tip = new Konva.Group();
    const imgChooiceGourp = new Konva.Group();
    const round = new Konva.Group();
    //按钮文案
    const buttonText = new Konva.Text({
        id: 'text',
        text: data.option,
        fontSize: 14,
        wrap: type === 2 ? 'none' : 'char',
        ellipsis: true,
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, 'PingFang SC','Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        fill: hex8ToRgba(skin!.title_text_color!),
        height: type === 2 ? 44 : 52,
        align: 'center',
        verticalAlign: 'middle',
        shadowColor: hex8ToRgba(skin!.title_shadow_color!),
        shadowBlur: skin!.title_shadow_radius,
        shadowOffsetX: skin!.title_shadow_offset_x || 0,
        shadowOffsetY: -skin!.title_shadow_offset_y! || 0,
        padding: 12,
    });
    if (type === 1 || type === 4) {
        if (type === 4 && choiceLength === 4) {
            iv_button.width(144);
            buttonText.width(144);
            iv_button.offsetX(72);
        } else {
            iv_button.width(buttonWidth);
            buttonText.width(buttonWidth);
            iv_button.offsetX(choiceLength === 3 ? 101 : 155);
        }
        iv_button.height(44);
        iv_button.offsetY(22);
    }

    if (type === 2) {
        if (buttonText.width() < 80) {
            buttonText.width(80);
        }
    }

    //img onload
    return new Promise((resolve, reject) => {
        loadBgAsync(skin!.choice_image!)
            .then((imageObj: HTMLImageElement) => {
                //img background
                if (type === 1 || type === 4) {
                    CTI(tbg()).then((image: HTMLImageElement) => {
                        CTI(bgc(imageObj, type === 4 && choiceLength === 4 ? 144 : buttonWidth)).then(
                            (fillPatternImage: HTMLImageElement) => {
                                const BGL = new Konva.Image({
                                    x: 1,
                                    y: 0,
                                    image: image,
                                    fillPatternImage: fillPatternImage,
                                    fillPatternOffset: {
                                        x: 0,
                                        y: 5,
                                    },
                                    fillPatternScale: {
                                        x: 0.25,
                                        y: 0.25,
                                    },
                                    //fillPatternRepeat: 'repeat-x',
                                    width: type === 4 && choiceLength === 4 ? 144 : buttonWidth,
                                    height: 52,
                                });
                                iv_button.add(BGL);
                                iv_button.add(buttonText);
                                resolve(iv_button);
                            },
                        );
                    });
                }

                //点定位
                if (type === 2) {
                    CTI(tbg()).then((image: HTMLImageElement) => {
                        CTI(pbgc(imageObj, buttonText.width())).then((fillPatternImage: HTMLImageElement) => {
                            CTI(pRound(imageObj)).then((pRoundFillPatternImage: HTMLImageElement) => {
                                CTI(pLine(imageObj)).then((pLineFillPatternImage: HTMLImageElement) => {
                                    const BG = new Konva.Image({
                                        x: -3,
                                        y: -2,
                                        image: image,
                                        fillPatternImage: fillPatternImage,
                                        fillPatternOffset: {
                                            x: 5,
                                            y: 2,
                                        },
                                        fillPatternScale: {
                                            x: 0.33,
                                            y: 0.33,
                                        },
                                        fillPatternRepeat: 'repeat-x',
                                        width: buttonText.width() + 6,
                                        height: 48,
                                    });
                                    const roundBG = new Konva.Image({
                                        x: 0,
                                        y: 0,
                                        image: image,
                                        //fill:'#fff',
                                        fillPatternImage: pRoundFillPatternImage,
                                        fillPatternScale: {
                                            x: 0.24,
                                            y: 0.24,
                                        },
                                        fillPatternRepeat: 'repeat-x',
                                        width: 21,
                                        height: 21,
                                        offsetX: 11,
                                        offsetY: 11,
                                    });
                                    const lineBG = new Konva.Image({
                                        x: 0,
                                        y: 0,
                                        image: image,
                                        fillPatternImage: pLineFillPatternImage,
                                        fillPatternScale: {
                                            x: 0.24,
                                            y: 0.24,
                                        },
                                        fillPatternRepeat: 'repeat',
                                        width: 21,
                                        height: 23,
                                        offsetX: 11,
                                    });
                                    imgChooiceGourp.add(BG);
                                    imgChooiceGourp.add(buttonText);
                                    tip.add(lineBG);
                                    tip.add(imgChooiceGourp);
                                    round.add(roundBG);

                                    //选项连接线定位
                                    const textAlign = data.text_align;
                                    const choicesX = (data.x! / dimensionWidth!) * defaultWidth;
                                    if (textAlign === 1 || textAlign === 3) {
                                        if (textAlign === 3) {
                                            lineBG.rotation(180);
                                            lineBG.offsetX(buttonText.width() / 2 + 10);
                                            lineBG.offsetY(1);

                                            tipsGroup.offsetX(buttonText.width() / 2);
                                            tipsGroup.offsetY(-17);
                                        }
                                        if (textAlign === 1) {
                                            lineBG.offsetX(-(buttonText.width() / 2 - 10));
                                            lineBG.offsetY(-buttonText.height() + 2);

                                            tipsGroup.offsetX(buttonText.width() / 2);
                                            tipsGroup.offsetY(17 + buttonText.height());
                                        }
                                        const arrowBoundary = buttonText.width() / 2;
                                        if (choicesX - arrowBoundary < 0) {
                                            tipsGroup.offsetX(buttonText.width() / 2 + (choicesX - arrowBoundary) - 10);
                                            if (textAlign === 3) {
                                                lineBG.offsetX(buttonText.width() / 2 + (choicesX - arrowBoundary));
                                            } else {
                                                lineBG.offsetX(
                                                    -buttonText.width() / 2 - (choicesX - arrowBoundary) + 20,
                                                );
                                            }
                                        } else if (arrowBoundary + choicesX > defaultWidth) {
                                            tipsGroup.offsetX(
                                                choicesX + arrowBoundary - defaultWidth + buttonText.width() / 2 + 10,
                                            );
                                            if (textAlign === 3) {
                                                lineBG.offsetX(
                                                    choicesX +
                                                    arrowBoundary -
                                                    defaultWidth +
                                                    buttonText.width() / 2 +
                                                    20,
                                                );
                                            } else {
                                                lineBG.offsetX(
                                                    -buttonText.width() / 2 - (choicesX + arrowBoundary - defaultWidth),
                                                );
                                            }
                                        } else {
                                            tipsGroup.offsetX(buttonText.width() / 2);
                                        }
                                    } else {
                                        if (textAlign === 2) {
                                            lineBG.offsetX(-12);
                                            lineBG.rotation(90);

                                            tipsGroup.offsetY(buttonText.height() / 2);
                                            tipsGroup.offsetX(-17);
                                        } else {
                                            lineBG.offsetX(32);
                                            lineBG.rotation(-90);
                                            lineBG.offsetY(-buttonText.width());

                                            tipsGroup.offsetY(buttonText.height() / 2);
                                            tipsGroup.offsetX(17 + buttonText.width());
                                        }
                                    }

                                    tipsGroup.add(tip);
                                    iv_button.add(tipsGroup);
                                    iv_button.add(round);
                                    resolve(iv_button);
                                });
                            });
                        });
                    });
                }
            })
            .catch(() => {
                iv_button.add(buttonText);
                resolve(iv_button);
            });
    });
};

//皮肤切割
const tbg = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
};
const bgc = (image: any, width: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 4;
    canvas.height = 220;
    canvas.getContext('2d')!.drawImage(image, 0, 0, 309, 215, 0, 0, 309, 215);
    canvas.getContext('2d')!.drawImage(image, 309, 0, 1, 215, 309, 0, width * 4 - 618, 215);
    canvas.getContext('2d')!.drawImage(image, 310, 0, 309, 215, width * 4 - 309, 0, 309, 215);
    return canvas;
};

const pbgc = (image: any, width: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 3 + 35;
    canvas.height = 220;
    canvas.getContext('2d')!.drawImage(image, 0, 220, 120, 215, 0, 0, 120, 215);
    canvas.getContext('2d')!.drawImage(image, 121, 220, 1, 215, 120, 0, canvas.width - 240, 215);
    canvas.getContext('2d')!.drawImage(image, 122, 220, 120, 215, canvas.width - 120, 0, 120, 215);
    return canvas;
};

const pRound = (image: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 88;
    canvas.height = 88;
    canvas.getContext('2d')!.drawImage(image, 250, 225, 88, 88, 0, 0, 88, 88);
    return canvas;
};

const pLine = (image: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 84;
    canvas.height = 98;
    canvas.getContext('2d')!.drawImage(image, 349, 215, 88, 118, 0, 0, 88, 118);
    return canvas;
};

//canvas to img
const CTI = (canvas: any) => {
    return new Promise((resolve: (value: HTMLImageElement) => void, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve(image);
        };
        image.onerror = () => {
            resolve(image); // ignore base64 error
        };
        image.src = canvas.toDataURL('image/png');
    });
};

const hex8ToRgba = (hex: string) => {
    let alpha = false,
        h8 = hex.slice(0);
    if (h8.length === 3) h8 = [...h8].map((x) => x + x).join('');
    else if (h8.length === 8) alpha = true;
    let h = parseInt(h8, 16);
    return (
        'rgb' +
        (alpha ? 'a' : '') +
        '(' +
        (h >>> (alpha ? 24 : 16)) +
        ', ' +
        ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)) +
        ', ' +
        ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) +
        (alpha ? `, ${h & 0x000000ff}` : '') +
        ')'
    );
};

const loadBgAsync = (url: string) => {
    return new Promise(function (resolve: (value: HTMLImageElement) => void, reject) {
        const imageObj = new Image();
        imageObj.setAttribute('crossOrigin', 'anonymous');
        imageObj.onload = function () {
            resolve(imageObj);
        };

        imageObj.onerror = function () {
            reject(new Error('Could not load image at ' + url));
        };
        imageObj.src = url;
    });
};
export { hex8ToRgba, intButton };
export default intButton;
