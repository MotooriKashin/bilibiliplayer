import back from '../../svg/back.svg';
import basarrow from '../../svg/basarrow.svg';
import basletter from '../../svg/basletter.svg';
import enter from '../../svg/enter.svg';
import sequential from '../../svg/sequential.svg';
import circle from '../../svg/circle.svg';
import shuffle from '../../svg/shuffle.svg';
import open from '../../svg/open.svg';
import close from '../../svg/close.svg';
import playing from '../../svg/playing.svg';
import disabled from '../../svg/disabled.svg';
import reverse from '../../svg/reverse.svg';
import remove from '../../svg/remove.svg';
import del from '../../svg/del.svg';
import arrow from '../../svg/arrow.svg';

const svg = {
    back,
    basarrow,
    basletter,
    enter,
    sequential,
    circle,
    shuffle,
    close,
    open,
    playing,
    disabled,
    reverse,
    remove,
    del,
    arrow
};

for (const s in svg) {
    if (svg.hasOwnProperty(s)) {
        svg[<keyof typeof svg>s] = `<span class="svgicon-r">${svg[<keyof typeof svg>s]}</span>`;
    }
}

export default svg;
