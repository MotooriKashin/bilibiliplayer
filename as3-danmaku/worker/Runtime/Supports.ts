const supported = {
    "js": ["*"],
    "Runtime": ["*", "openWindow", "injectStyle"],
    "Display": ["*"],
    "Player": ["*"],
    "Tween": ["*"],
    "Utils": ["*"]
};

/**
 * 检查特性是否受支持
 * @param featureName 特性名
 * @param subfeature 二级特性
 */
export function supports(featureName: string, subfeature: string = "*") {
    if (!supported.hasOwnProperty(featureName)) {
        return false;
    } else {
        if (supported[<'js'>featureName].indexOf(subfeature) >= 0) {
            return true;
        }
    }
    return false;
};

/**
 * 加载组件
 * @param libraryName 组件名
 * @param callback 成功/失败回调
 */
export function requestLibrary(libraryName: string, callback: Function) {
    if (libraryName === 'libBitmap') {
        callback(null, {
            'type': 'noop'
        });
    } else {
        callback(new Error('Could not load unknown library [' +
            libraryName + ']'), null);
    }
}