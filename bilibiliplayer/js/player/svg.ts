import add from '../../svg/add.svg';
import authO from '../../svg/auth-o.svg';
import authP from '../../svg/auth-p.svg';
import back from '../../svg/back.svg';
import chase from '../../svg/chase.svg';
import coin from '../../svg/coin.svg';
import collection from '../../svg/collection.svg';
import danmuSetting from '../../svg/danmu-setting.svg';
import dantypeAdvancedDisabled from '../../svg/dantype-advanced-disabled.svg';
import dantypeAdvanced from '../../svg/dantype-advanced.svg';
import dantypeBackward from '../../svg/dantype-backward.svg';
import dantypeBottomDisabled from '../../svg/dantype-bottom-disabled.svg';
import dantypeBottom from '../../svg/dantype-bottom.svg';
import dantypeColorDisabled from '../../svg/dantype-color-disabled.svg';
import dantypeColor from '../../svg/dantype-color.svg';
import dantypeScrollDisabled from '../../svg/dantype-scroll-disabled.svg';
import dantypeScroll from '../../svg/dantype-scroll.svg';
import dantypeTopDisabled from '../../svg/dantype-top-disabled.svg';
import dantypeTop from '../../svg/dantype-top.svg';
import dantype from '../../svg/dantype.svg';
import droplistDown from '../../svg/droplist-down.svg';
import droplistUp from '../../svg/droplist-up.svg';
import enter from '../../svg/enter.svg';
import feedback from '../../svg/feedback.svg';
import fullpageOff from '../../svg/fullpage-off.svg';
import fullpage from '../../svg/fullpage.svg';
import fullscreenOff from '../../svg/fullscreen-off.svg';
import fullscreen from '../../svg/fullscreen.svg';
import like from '../../svg/like.svg';
import loopOff from '../../svg/loop-off.svg';
import loopOn from '../../svg/loop-on.svg';
import more from '../../svg/more.svg';
import next from '../../svg/next.svg';
import pause from '../../svg/pause.svg';
import pip from '../../svg/pip.svg';
import playState from '../../svg/play-state.svg';
import play from '../../svg/play.svg';
import replay from '../../svg/replay.svg';
import setting from '../../svg/setting.svg';
import share from '../../svg/share.svg';
import down from '../../svg/down.svg';
import left from '../../svg/left.svg';
import right from '../../svg/right.svg';
import up from '../../svg/up.svg';
import subtitleOff from '../../svg/subtitle-off.svg';
import subtitleOn from '../../svg/subtitle-on.svg';
import volumeOff from '../../svg/volume-off.svg';
import volume from '../../svg/volume.svg';
import widescreenOff from '../../svg/widescreen-off.svg';
import widescreen from '../../svg/widescreen.svg';
import fullscreen2 from '../../svg/fullscreen-2.svg';
import check from '../../svg/check.svg';
import nav from '../../svg/nav.svg';
import newPauseState from '../../svg/new-pause-state.svg';
import newPlayState from '../../svg/new-play-state.svg';
import checkHover from '../../svg/check_hover.svg';
import navHover from '../../svg/nav_hover.svg';
import rCheck from '../../svg/rookie-check.svg';
import rNav from '../../svg/rookie-nav.svg';
import auto from '../../svg/auto.svg';
import autoClose from '../../svg/auto-close.svg';
import gameLogo from '../../svg/game-logo.svg';
import grade from '../../svg/grade.svg';
import star1 from '../../svg/star-1.svg';
import star2 from '../../svg/star-2.svg';
import star3 from '../../svg/star-3.svg';
import star4 from '../../svg/star-4.svg';
import star5 from '../../svg/star-5.svg';
import hide from '../../svg/hide.svg';
import arrow from '../../svg/arrow.svg';
import sync from '../../svg/sync.svg';
import upLabel from '../../svg/up-label.svg';
import link from '../../svg/link.svg';
import bubbleM from '../../svg/bubble-middle.svg';
import bubbleL from '../../svg/bubble-left.svg';
import dmback from '../../svg/dmback.svg';
import dolby from '../../svg/dolby.svg';
import bigvip from '../../svg/bigvip.svg';
import hires from '../../svg/hires.svg';
import popupClose from '../../svg/popup-close.svg';
import popupTick from '../../svg/popup-tick.svg';
import clockIn from '../../svg/clock-in.svg';
import heart from '../../svg/heart.svg';
import iconed from '../../svg/iconed.svg';
import dove from '../../svg/dove.svg';
import reserve from '../../svg/reserve.svg';

const raw = {
    auto,
    arrow,
    autoClose,
    add,
    authO,
    authP,
    back,
    chase,
    coin,
    collection,
    danmuSetting,
    dantypeAdvancedDisabled,
    dantypeAdvanced,
    dantypeBackward,
    dantypeBottomDisabled,
    dantypeBottom,
    dantypeColorDisabled,
    dantypeColor,
    dantypeScrollDisabled,
    dantypeScroll,
    dantypeTopDisabled,
    dantypeTop,
    dantype,
    droplistDown,
    droplistUp,
    enter,
    feedback,
    fullpageOff,
    fullpage,
    fullscreenOff,
    fullscreen,
    like,
    gameLogo,
    loopOff,
    loopOn,
    more,
    next,
    pause,
    pip,
    playState,
    play,
    replay,
    setting,
    share,
    down,
    left,
    right,
    up,
    subtitleOff,
    subtitleOn,
    volumeOff,
    volume,
    widescreenOff,
    widescreen,
    fullscreen2,
    check,
    nav,
    newPauseState,
    newPlayState,
    rCheck,
    rNav,
    checkHover,
    navHover,
    grade,
    star1,
    star2,
    star3,
    star4,
    star5,
    hide,
    sync,
    upLabel,
    link,
    bubbleM,
    bubbleL,
    dmback,
    dolby,
    bigvip,
    hires,
    popupClose,
    popupTick,
    clockIn,
    heart,
    iconed,
    dove,
    reserve
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
            return html.replace(/svgo-inline-loader-/g, `pid-${pid++}-svgo-`);
        },
    });
};

for (const s in raw) {
    if (raw.hasOwnProperty(s)) {
        defineUniqueInstance(<keyof TypeRaw>s);
    }
}

export default <TypeRaw>svg;
