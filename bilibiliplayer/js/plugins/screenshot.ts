export interface IScreenshot {
    dom: HTMLVideoElement;
    width?: number;
    height?: number;
}

export function screenshot(config: IScreenshot) {
    const cfg = {
        width: config.dom.videoWidth,
        height: config.dom.videoHeight,
        ...config,
    };

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.setAttribute('width', cfg.width + 'px');
    canvas.setAttribute('height', cfg.height + 'px');
    context.drawImage(cfg.dom, 0, 0, cfg.width, cfg.height);
    return canvas.toDataURL();
}
