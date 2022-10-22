export interface IPresetItem {
    name: string;
    preset?: string;
}
export default {
    default: {
        items: [
            {
                name: 'eq',
                preset: 'default',
            },
        ],
    },
    bassBooster: {
        items: [
            {
                name: 'eq',
                preset: 'bassBooster',
            },
        ],
    },
    piano: {
        items: [
            {
                name: 'eq',
                preset: 'piano',
            },
            {
                name: 'reverb',
                preset: 'room',
            },
        ],
    },
    pop: {
        items: [
            {
                name: 'eq',
                preset: 'pop',
            },
        ],
    },
    rnb: {
        items: [
            {
                name: 'eq',
                preset: 'rnb',
            },
        ],
    },
    spokenWord: {
        items: [
            {
                name: 'eq',
                preset: 'spokenWord',
            },
        ],
    },
    concertHall: {
        items: [
            {
                name: 'reverb',
                preset: 'hall',
            },
        ],
    },
    bathroom: {
        items: [
            {
                name: 'reverb',
                preset: 'bathroom',
            },
        ],
    },
    a3d: {
        items: [
            {
                name: 'a3d',
            },
        ],
    },
    phone: {
        items: [
            {
                name: 'phone',
            },
        ],
    },
};
