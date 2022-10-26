import Player from "../player";
import GlobalFunction from "./global-function";

export interface VideoTopMessage {
    url: string;
    type?: 'system' | 'bangumi' | 'news';
    name: string;
    bgcolor?: string;
}
class VideoTop {
    protected prefix: string;
    protected container: JQuery<HTMLElement>;
    protected pgcType: number;
    protected globalFunction: GlobalFunction;
    protected element!: JQuery<HTMLElement>;
    protected settingList = [
        {
            title: "接受系统通知",
            type: "system",
            checked: true,
        },
        {
            title: "接受新番通知",
            type: "bangumi",
            checked: true,
        },
        {
            title: "无通知时显示新闻等信息",
            type: "news",
            checked: true,
        }
    ];
    protected panel!: JQuery<HTMLElement>;
    protected setting!: JQuery<HTMLElement>;
    protected ul!: JQuery<HTMLElement>;
    protected time = 60000;
    protected animating = false;
    protected current = 0;
    protected defMsg: VideoTopMessage[] = [
        {
            url: '//app.bilibili.com/?from=bfq',
            bgcolor: '#000000',
            type: 'news',
            name: '客户端下载'
        },
        {
            url: '//link.acg.tv/forum.php',
            type: 'news',
            name: 'bug反馈传送门'
        }
    ];
    protected inited = false;

    constructor(protected player: Player) {
        this.container = player.template.message; // 顶部信息放置区域
        this.prefix = player.prefix;
        this.pgcType = this.player.config.seasonType;
        this.globalFunction = this.player.globalFunction;
        this.init();
    }

    init() {
        const player = this.player;
        const prefix = this.prefix;

        this.element = $(this.TPL()).appendTo(this.container);
        this.panel = this.element.find(`.${prefix}-video-message-panel`);
        this.setting = this.element.find(`.${prefix}-video-message-setting`);
        this.ul = this.element.find(`.${prefix}-video-message-ul`);

        this.setting.append(this.settingList.reduce((s, d) => {
            s += this.TPL_SET(d.title, d.type, d.checked = player.videoSettings.message[<"news">d.type]);
            return s;
        }, ''));

        this.element.find(`.js-action[data-action="prev"]`).on('click', () => {
            this.aimate(true);
        });
        this.element.find(`.js-action[data-action="next"]`).on('click', () => {
            this.aimate();
        });
        this.element.find(`.js-action[data-action="showSetting"]`).on('click', () => {
            this.panel.addClass('active');
        });
        this.element.find(`.js-action[data-action="closeSetting"]`).on('click', () => {
            this.panel.removeClass('active');
        });
        this.setting.find(".setting-checkbox").on("click", function () {
            const that = <HTMLInputElement>$(this)[0];

            player.set('message', that.dataset.type, that.checked);
        });

        (this.settingList.filter(v => v.checked).length > 0) && this.appendMessage(this.defMsg);
    }

    appendMessage(msg: VideoTopMessage[], clear = true) {
        clear && this.ul.empty();
        this.ul.append(msg.reduce((s, d) => {
            s += this.TPL_LI(d.url, d.name);
            return s;
        }, ''));

        if (!this.inited) {
            this.inited = true;
            this.initCurrent();
            this.setInterval();
        }
        $('li[name="message_line"]').find("a").attr("name", "message_line");
    }

    private TPL() {
        const prefix = this.prefix;
        return `
        <div class="${prefix}-video-message-container">
            <a class="${prefix}-video-message-btn slide-btn prev js-action" href="javascript:void(0)" data-action="prev"><i class="${prefix}-iconfont icon-12sent"></i></a>
            <a class="${prefix}-video-message-btn slide-btn next js-action" href="javascript:void(0)" data-action="next"><i class="${prefix}-iconfont icon-12sent"></i></a>
            <div class="${prefix}-video-message-panel">
                <a class="${prefix}-video-message-show-setting js-action" href="javascript:void(0)" data-action="showSetting"></a>
                <div class="${prefix}-video-message-setting">
                    <a class="${prefix}-video-message-close js-action" href="javascript:void(0)" data-action="closeSetting">x</a>
                </div>
                <ul class="${prefix}-video-message-ul"></ul>
            </div>
        </div>
        `;
    }

    private TPL_SET(title: string, type: string, checked?: boolean) {
        return `
        <label><input type="checkbox" class="setting-checkbox" data-type="${type || "news"}"  ${checked ? "checked" : ""}><span>${title}</span></label>
        `;
    }

    private TPL_LI(url: string, name: string, posnum = 1, resourceid = 2319, srcid = "", id = "") {
        return `
        <li class="slide" title="${name || ""}" name="message_line" posnum="${posnum}" resourceid="${resourceid}" srcid="${srcid}" sid="${id}">
            <a href="${url}" target="_blank"><font color="#FFFFFF">${name}</font></a>
        </li>`;
    }

    private initCurrent() {
        let li = this.ul.find("li");
        const cur = li.eq(0);
        if (li.length < 3) {
            li.clone(true).appendTo(this.ul);
            li.clone(true).appendTo(this.ul);
            li = this.ul.find("li");
        }
        li.eq(0).addClass("current").next().addClass("next");
        li.last().addClass("prev");
    }

    private setInterval() {
        setInterval(() => this.aimate(), this.time);
    }

    private aimate(prev?: boolean) {
        if (!this.panel.hasClass("active") && !this.animating) {
            const ul = this.ul;
            const li = ul.find("li");
            this.animating = true;

            if (prev) {
                ul.find(".slide.next").removeClass("next");
                ul.find(".slide.current").addClass("next").removeClass("current");
                const current = ul.find(".slide.prev").addClass("current").removeClass("prev");
                this.current = current.index();
                this.current === 0 ? li.last().addClass("prev") : current.prev().addClass("prev");
            } else {
                ul.find(".slide.prev").removeClass("prev");
                ul.find(".slide.current").addClass("prev").removeClass("current");
                const current = ul.find(".slide.next").addClass("current").removeClass("next");
                this.current = current.index();
                (li.length - 1) === this.current ? li.eq(0).addClass("next") : current.next().addClass("next");
            }

            setTimeout(() => this.animating = false, 600);
        }
    }
}

export default VideoTop;
