export interface IEQBand {
    '10': IEQBands;
    '5': IEQBands;
    '3': IEQBands;
}

export interface IEQBands {
    default: number[];
    bassBooster: number[];
    bassReducer: number[];
    classical: number[];
    dance: number[];
    deep: number[];
    electronic: number[];
    hiphop: number[];
    jazz: number[];
    latin: number[];
    loudness: number[];
    lounge: number[];
    piano: number[];
    pop: number[];
    rnb: number[];
    rock: number[];
    smallSpeakers: number[];
    spokenWord: number[];
    trebleBooster: number[];
    trebleReducer: number[];
    vocalBooster: number[];
    guitar: number[];
}
export interface ICompressorValue {
    threshold: number;
    knee: number;
    ratio: number;
    attack: number;
    release: number;
}
export interface IReverbValue {
    mix: number;
    decay: number;
    fadeIn: number;
    reverse: boolean;
    ir: string;
    highCut: number;
    lowCut: number;
    gain: number;
}

export const eqBand = {
    '10': {
        custom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bassBooster: [5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
        bassReducer: [-5, -4, -3, -2, -1, 0, 0, 0, 0, 0],
        classical: [4.5, 4, 3, 2, -1, -1, 0, 2, 3, 4],
        dance: [4, 7, 5, 0, 2, 3, 5, 4, 3, 0],
        deep: [5, 3, 2, 1, 3, 2, 1, -2, -4, -5],
        electronic: [4.5, 3.5, 1, 0, -2, 2, 0.5, 1, 4, 5],
        hiphop: [5, 4, 1, 3, -1, -1, 1, -1, 2, 3],
        jazz: [4, 3, 1, 2, -2, -2, 0, 1, 3, 4],
        latin: [4.5, 3, 0, 0, -1.5, -1.5, -1.5, 0, 3, 4.5],
        loudness: [6, 4, 0, 0, -2, 0, -1, -5, 5, 1],
        lounge: [-3, -1.5, -0.5, 1.5, 4, 2, 0, -1.5, 2, 1],
        piano: [3, 2, 0, 2.5, 3, 1, 3.5, 4, 3, 3.5],
        pop: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
        rnb: [3, 7, 6, 2, -3, -2, 2, 3, 3, 4],
        rock: [5, 4, 3, 2, -1, -1, 1, 3, 4, 5],
        smallSpeakers: [5, 4, 3, 2, 1, 0, -1, -2, -3, -4],
        spokenWord: [-4, -1, 0, 1, 4, 5, 5, 4, 2, 0],
        trebleBooster: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
        trebleReducer: [0, 0, 0, 0, 0, -1, -2, -3, -4, -5],
        vocalBooster: [-2, -3, -3, 1, 4, 4, 3, 1, 0, -2],
        guitar: [-5, -3, -2, 2, -0.5, 0, 0, 2, 6, 0],
    },
    '5': {
        custom: [0, 0, 0, 0, 0],
        default: [0, 0, 0, 0, 0],
        bassBooster: [3, 0, 0, 0, 0],
        bassReducer: [-3, 0, 0, 0, 0],
        classical: [2.5, -1, 0.5, 2.5, 4],
        dance: [3.6, 3, 4.75, 3.5, 0],
        deep: [2.8, 2, 0.25, -3, -5],
        electronic: [1.4, 2, 0.625, 2.5, 5],
        hiphop: [2.4, -1, 0.5, 0.5, 3],
        jazz: [1.6, -2, 0.25, 2, 4],
        latin: [1.2, -1.5, -1.125, 1.5, 4.5],
        loudness: [1.6, 0, -2, 0, 1],
        lounge: [0.1, 2, -0.375, 0.25, 1],
        piano: [2.1, 1, 3.625, 3.5, 3.5],
        pop: [0.6, 4, 1.5, -0.5, -2],
        rnb: [3, -2, 2.25, 3, 4],
        rock: [2.6, -1, 1.5, 3.5, 5],
        smallSpeakers: [3, 0, -1.25, -2.5, -4],
        spokenWord: [0, 5, 4.75, 3, 0],
        trebleBooster: [0, 1, 2.25, 3.5, 5],
        trebleReducer: [0, -1, -2.25, -3.5, -5],
        vocalBooster: [-0.6, 4, 2.5, 0.5, -2],
        guitar: [-1.7, 0, 0.5, 4, 0],
    },
    '3': {
        custom: [0, 0, 0],
        default: [0, 0, 0],
        bassBooster: [2, 0, 0],
        bassReducer: [-2, 0, 0],
        classical: [2, 0, 3],
        dance: [0, 5, 3],
        deep: [1, 1, -4],
        electronic: [0, 0.5, 4],
        hiphop: [3, 1, 2],
        jazz: [2, 0, 3],
        latin: [0, -1.5, 3],
        loudness: [0, -1, 5],
        lounge: [1.5, 0, 2],
        piano: [2.5, 3.5, 3],
        pop: [2, 2, -1],
        rnb: [2, 2, 3],
        rock: [2, 1, 4],
        smallSpeakers: [2, -1, -3],
        spokenWord: [1, 5, 2],
        trebleBooster: [0, 2, 4],
        trebleReducer: [0, -2, -4],
        vocalBooster: [1, 3, 0],
        guitar: [2, 0, 6],
    },
};

export const frequency = {
    '10': [32, 64, 125, 250, 500, 1e3, 2e3, 4e3, 8e3, 16e3],
    '5': [400, 1e3, 2500, 6e3, 16e3],
    '3': [250, 2e3, 8e3],
};
export const compressorValue = {
    default: {
        threshold: -24,
        knee: 30,
        ratio: 12,
        attack: 0.003,
        release: 0.25,
    },
};
export const reverbValue = {
    default: {
        mix: 0,
        decay: 0.3,
        fadeIn: 0.01,
        reverse: !1,
        ir: 'moorer',
        highCut: 7e3,
        lowCut: 0,
        gain: 1,
    },
    hall: {
        mix: 0.5,
        decay: 1.8,
        fadeIn: 30,
        reverse: !1,
        ir: 'moorer',
        highCut: 7e3,
        lowCut: 0,
        gain: 1,
    },
    room: {
        mix: 0.5,
        decay: 1.4,
        fadeIn: 10,
        reverse: !1,
        ir: 'simple',
        highCut: 7e3,
        lowCut: 80,
        gain: 1,
    },
    live: {
        mix: 0.3,
        decay: 3,
        fadeIn: 17,
        reverse: !1,
        ir: 'simple',
        highCut: 7e3,
        lowCut: 0,
        gain: 1,
    },
    bathroom: {
        mix: 0.9,
        decay: 0.6,
        fadeIn: 0.3,
        reverse: !1,
        ir: 'moorer',
        highCut: 7e3,
        lowCut: 0,
        gain: 2,
    },
};

export const presetInfo = {
    a3d: '3D环绕',
    bassBooster: '超重低音',
    bathroom: '浴室',
    concertHall: '音乐厅',
    phone: '听筒',
    piano: '钢琴',
    pop: '流行时尚',
    rnb: '蓝调',
    spokenWord: '清澈人声',
};
export const tag2name = {
    custom: '自定义',
    default: '默认',
    classical: '古典',
    dance: '舞蹈',
    deep: '低沉',
    electronic: '电音',
    guitar: '吉他',
    hiphop: '嘻哈',
    jazz: '爵士',
    latin: '拉丁',
    piano: '钢琴',
    pop: '流行',
    rnb: '蓝调',
    rock: '摇滚',
    spokenWord: '说唱',
    bassBooster: '重低音',
    bassReducer: '弱低音',
    trebleBooster: '重高音',
    trebleReducer: '弱高音',
    vocalBooster: '人声强化',
    smallSpeakers: '弱人声',
    loudness: '响度模式',
    lounge: '休息室模式',
};
