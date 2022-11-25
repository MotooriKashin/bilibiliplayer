import Player from "../../player";
import { IViewPoint } from "../user";
import "../../../css/view-point.less";
import STATE from "../state";

let videoDuration: number;
let trackerWrp: HTMLElement; // 进度条可控区域，高28px
let handleWidth: number; // 进度条圆形把手的宽度
let sliderTracker: HTMLDivElement;
let sliderBar: HTMLDivElement;

function initSharedTools(player: Player) {
    handleWidth = (<HTMLDivElement>(player.template.controller.find(".bpui-slider-handle")[0])).clientWidth;
    trackerWrp = <HTMLDivElement>player.template.controller.find(".bpui-slider-tracker-wrp")[0];
    videoDuration = player.duration()!;
}
function Time2Pos(time: number) {
    // 进度条上的鼠标坐标与视频时间点的互算公式，从bilibiliPlayer.js复制过来
    // 使视频看点标记与点击进度条后实际跳转的时间点准确对应
    return time / videoDuration * (trackerWrp.clientWidth - handleWidth) + handleWidth / 2 + "px"
}
function Mouse2Pos(e: MouseEvent) {
    let box = sliderBar.getBoundingClientRect();
    let pos = (e.pageX - (box.left + window.scrollX - document.body.clientLeft) - handleWidth / 2) / (trackerWrp.clientWidth - handleWidth) * videoDuration;
    0 > pos && (pos = 0);
    pos > videoDuration && (pos = videoDuration);
    return pos;
}
function divWithClass(className: string) {
    let div = document.createElement("div");
    div.className = className;
    return div;
}
class Timer {
    constructor(public callback: Function) { }
    private handle: any;
    start() { if (!this.handle) this.handle = setInterval(() => this.callback(), 3000) }
    stop() { if (this.handle) { clearInterval(this.handle); this.handle = null } }
}
class CSS {
    static hash: { [key: string]: boolean } = {};
    static add(cssText: string, symbol: string) {
        if (!Object.hasOwn(CSS.hash, symbol)) {
            let style = document.createElement("style");
            style.setAttribute("type", "text/css");
            style.appendChild(document.createTextNode(cssText));
            document.head.appendChild(style);
            CSS.hash[symbol] = true;
        }
    }
}

class ViewPointList {
    private chptInfo?: HTMLDivElement[]; // 数组，存放每一看点的UI卡片
    private timer: Timer;
    private vpUI: { info: IViewPoint, el: HTMLElement }[];
    private type: number; // type = 1：赛事看点，type = 2：普通视频分段
    private chptName!: HTMLDivElement;

    constructor(private player: Player, private viewPoints: IViewPoint[]) {
        sliderTracker = <HTMLDivElement>player.template.controller.find(".bilibili-player-video-progress .bpui-slider-tracker")[0]; // 播放进度区域，6px
        sliderBar = <HTMLDivElement>player.template.controller.find(".bilibili-player-video-progress-bar")[0];
        initSharedTools(player);

        this.timer = new Timer(() => this.refreshPanel());
        this.initGeneralUI();
        this.bindEvents();

        this.type = viewPoints[0].type;
        this.vpUI = [];
        for (let v of viewPoints) {
            let viewPointUI;
            if (this.type == 1) {
                viewPointUI = new eSportViewPoint(v, player);
            } else if (this.type == 2) {
                viewPointUI = new CommonViewPoint(v);
            }
            if (viewPointUI) {
                this.vpUI.push({ info: v, el: viewPointUI.ui });
                sliderTracker.appendChild(viewPointUI.ui);
            }
        }

        if (this.type == 1) {
            this.arrangeEsportVP();
        } else if (this.type == 2) {
            this.arrangeCommonVP();
        }
    }

    private arrangeCommonVP() {
        let duration = this.vpUI[this.vpUI.length - 1].info.to;
        for (let vp of this.vpUI) {
            let ui = vp.el;
            ui.className = "bilibili-progress-segmentation";
            let ratio = videoDuration / duration / duration;
            ui.style.width = (vp.info.to - vp.info.from) * ratio * 100 + "%";
            ui.style.left = vp.info.from * ratio * 100 + "%";
            ui.innerHTML = "<div><div></div></div>";
            ui.onmouseenter = () => this.chptName.innerHTML = vp.info.content;
        }
    }

    private arrangeEsportVP() {
        CSS.add(`#app #bilibiliPlayer .bilibili-player-video-progress-detail > .bilibili-player-video-progress-detail-img {top:-120px}
            .bilibili-player-video-progress-detail > .bilibili-player-video-progress-detail-time {top:-48px}`, "esportVP_CSS");
        let update = () => { // 刷新看点标记的位置
            for (let vp of this.vpUI) {
                vp.el.style.left = Time2Pos(vp.info.to);
            }
        }
        setTimeout(() => update(), 500); // 等待进度条完全加载
        this.chptName.style.top = "-150px";

        let playerArea = <HTMLElement>document.getElementsByClassName("bilibili-player-area")[0],
            visibility = true;
        let hide = () => {
            if (!visibility) return;
            visibility = false;
            for (let vp of this.vpUI) vp.el.style.opacity = "0";
            setTimeout(() => {
                for (let vp of this.vpUI)
                    vp.el.style.visibility = "hidden";
            }, 100);
        }
        playerArea.addEventListener("mouseleave", e => {
            hide();
        });
        playerArea.addEventListener("mousemove", e => {
            let clientRect = playerArea.getBoundingClientRect();
            if (e.pageY < clientRect.top + window.scrollY + clientRect.height * 0.65) {
                hide();
            } else {
                visibility = true;
                for (let vp of this.vpUI) {
                    vp.el.style.visibility = "";
                    vp.el.style.opacity = "1";
                }
            }
        });
        // 鼠标与看点图标的交互
        trackerWrp.addEventListener("mousemove", e => {
            let closestPoint = 1e6;
            // 鼠标位置->视频时间点
            let pos = Mouse2Pos(e);
            let thumbnailArea = 80 / (trackerWrp.clientWidth - handleWidth) * videoDuration;
            let hitArea = trackerWrp.clientWidth > 400 ? thumbnailArea / 10 : thumbnailArea / 20; // 显示标题的鼠标坐标范围
            for (let vp of this.vpUI) {
                vp.el.style.zIndex = "";
                if (vp.info.to >= pos - hitArea && vp.info.to <= pos + hitArea && Math.abs(vp.info.to - pos) < closestPoint) {
                    this.chptName.innerHTML = vp.info.content;
                    closestPoint = Math.abs(vp.info.to - pos);
                    vp.el.style.zIndex = "1000";
                }
            }
            if (closestPoint == 1e6) this.chptName.innerHTML = "";
        });
        this.player.bind(STATE.EVENT.VIDEO_PLAYER_RESIZE, () => update());
        trackerWrp.addEventListener("mouseleave", () => {
            for (let vp of this.vpUI) {
                vp.el.className = "bilibili-progress-segmentation-logo";
            }
        });

    }

    private initGeneralUI() {
        // 创建显示在视频预览缩略图上方的看点标题
        this.chptName = divWithClass("bilibili-progress-detail-chapter");
        (<HTMLDivElement>document.querySelector(".bilibili-player-video-progress-detail")).appendChild(this.chptName);

        // 添加“视频看点”面板
        let wrapList = <HTMLDivElement>document.querySelector("div.bilibili-player-wraplist"); // 获取播放器右侧面板的容器div
        let panels = wrapList.children;

        let chptPanel = divWithClass("bilibili-player-filter-wrap bilibili-player-chapterList"); // “视频看点”容器
        chptPanel.style.display = "none";
        wrapList.appendChild(chptPanel);

        let chptBtn = divWithClass("bilibili-player-filter-btn bilibili-player-filter-chapter bpui-component bpui-button bpui-button-type-small button"); // “视频看点”按钮
        chptBtn.innerHTML = '<span class="bpui-button-text"><span>视频看点</span></span>';
        document.querySelector("div.bilibili-player-filter")!.appendChild(chptBtn);

        chptBtn.onclick = () => {
            let activePanel = <HTMLDivElement>document.querySelector("div.bilibili-player-filter-btn.active");
            if (activePanel == chptBtn) return;
            // 切换按钮的激活状态
            activePanel.classList.remove("active");
            chptBtn.classList.add("active");
            for (let i = 0; i < panels.length; i++) {
                const element = <HTMLDivElement>panels[i];
                if (element.style.display == "block") {
                    element.style.display = "none";
                    break;
                }
            }
            // 创建各个看点对应的UI卡片
            if (!this.chptInfo) {
                this.chptInfo = [];
                for (let i = 0, v; i < this.viewPoints.length; i++) {
                    v = this.viewPoints[i];
                    this.chptInfo[i] = this.chptInfoTPL(v.from, v.to - v.from, v);
                    chptPanel.appendChild(this.chptInfo[i]);
                }
            };
            chptPanel.style.display = "block";
            // 将当前的播放进度对应的UI卡片显示为灰色底色
            this.refreshPanel();
        }
        chptPanel.onmouseenter = () => this.refreshPanel();
    }

    private bindEvents() {
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAYING, () => this.timer.start());
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => this.timer.start());
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, () => this.refreshPanel());
    }

    private chptInfoTPL(from: number, dura: number, v: IViewPoint) {
        let timeFormat = (t: number) => t < 10 ? "0" + t : t;
        let div = divWithClass("bilibili-player-chapter-info");
        div.innerHTML = `<img width="112" height="63" src="${v.imgUrl}"/>
                            <p class="chapter-name">${v.content}</p>
                            <span style="margin-left: 138px">${timeFormat(Math.floor(from / 60))}:${timeFormat(from % 60)}</span>
                            <span style="margin-right: 5px; float: right;">${dura >= 60 ? `${Math.floor(dura / 60)}分` : ""}${dura > 0 ? `${dura % 60}秒` : ""}</span>`;
        div.onclick = (jumpto => () => {
            this.player.seek(jumpto);
            let active = document.querySelector(".bilibili-player-chapter-info.active");
            active && active.classList.remove("active");
            div.classList.add("active");
        })(from);
        return div;
    }

    private refreshPanel() {
        if (!this.chptInfo) return;
        let progress = this.player.currentTime() || 0;
        if (this.type == 1) {
            let active = document.querySelector(".bilibili-player-chapter-info.active");
            active && active.classList.remove("active");
            for (let i = 0, v; i < this.viewPoints.length; i++) {
                v = this.viewPoints[i];
                if (Math.abs(progress - v.to) < 5) {
                    this.chptInfo[i].classList.add("active");
                    break;
                }
            }
        } else {
            for (let i = 0, v; i < this.viewPoints.length; i++) {
                v = this.viewPoints[i];
                if (progress < v.to) {
                    let active = document.querySelector(".bilibili-player-chapter-info.active");
                    active && active.classList.remove("active");
                    this.chptInfo[i].classList.add("active");
                    break;
                }
            }
        }
    }
}

class BaseViewPoint {
    public ui: HTMLElement;
    constructor(className: string, v: IViewPoint) {
        this.ui = document.createElement("div");
        this.ui.className = className;
    }
}

class eSportViewPoint extends BaseViewPoint {
    constructor(v: IViewPoint, player: Player) {
        super("bilibili-progress-segmentation-logo", v);

        let title = document.createElement("div"); // 看点标题
        title.innerHTML = "-> " + v.content;
        title.className = "bilibili-progress-detail-chapter";
        title.style.cssText = "width: auto; transform: translateX(-50%); display: none";

        let img: HTMLImageElement | SVGSVGElement;
        if (v.logoUrl) {
            img = <HTMLImageElement>document.createElement("img"); // 看点图标
            img.id = "segmentation-logo"; img.width = 32; img.height = 36; img.src = v.logoUrl;
        } else {
            img = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            img.setAttribute("viewBox", "0 -3 32 36");
            img.innerHTML = `
            <defs>
            <radialGradient id="gradient">
                    <stop offset="10%" stop-color="#ffe78f"></stop>
                    <stop offset="40%" stop-color="#ffe996"></stop>
                    <stop offset="95%" stop-color="#fcecae"></stop>
                </radialGradient>
            </defs>
            <path style="fill: rgb(252, 236, 174); stroke: rgb(252, 236, 174);" d="M 16 32.097 C 13.312 32.106 10.608 30.145 11 25.897 C 11.265 22.744 16 17.097 16 17.097 C 16 17.097 20.822 22.697 21.022 25.897 C 21.322 30.097 18.801 32.088 16 32.097 Z" transform="matrix(-1, 0, 0, -1, 32.021761, 49.196602)"></path>
            <circle cx="16" cy="22" r="5" fill="url(#gradient)"/>`;
        }
        img.addEventListener("mousemove", e => e.stopPropagation());
        img.addEventListener("mouseenter", () => {
            title.style.display = "";
            img.style.zIndex = "1000";
        });
        img.addEventListener("mouseleave", () => {
            title.style.display = "none";
            img.style.zIndex = "";
        });
        img.addEventListener("click", () => player.seek(v.from));
        this.ui.appendChild(title);
        this.ui.appendChild(img);
    }
}

class CommonViewPoint extends BaseViewPoint {
    constructor(v: IViewPoint) {
        super("bilibili-progress-segmentation", v);
    }
}

export default ViewPointList;