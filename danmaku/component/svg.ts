import dmhead from '../less/dmhead.svg';
import dmtail from '../less/dmtail.svg';
import like from '../less/like.svg';
import liked from '../less/liked.svg';
import dmcenter from '../less/dmcenter.svg';

const raw = {
    dmcenter,
    dmhead,
    dmtail,
    like,
    liked,
};

type TypeRaw = typeof raw;

const svg: Partial<TypeRaw> = {};

let pid = 0;

const defineUniqueInstance = (name: keyof TypeRaw) => {
    Object.defineProperty(svg, name, {
        enumerable: true,
        configurable: true,
        get() {
            const html = `<span class="bp-svgicon">${raw[name]}</span>`;

            // @see webpack config
            return html.replace(/svgo-inline-loader-/g, `dm-${pid++}-svgo-`);
        },
    });
};

for (const s in raw) {
    if (raw.hasOwnProperty(s)) {
        defineUniqueInstance(<keyof TypeRaw>s);
    }
}

export default <TypeRaw>svg;
