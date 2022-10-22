/**
 * @description bilibili video info plugin
 * @author dingjianqiang@bilibili.com
 * @date 2016/05/16
 */
import Clipboard from 'clipboard';
import STATE from '../player/state';
import Player from '../player';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';

interface IInfoInterface {
    data?: number | string;
    name?: string;
    type?: string;
    title?: string;
}

interface IConfigInterface {
    infos?: IInfoInterface[];
}

interface IInfosInterface {
    infos?: IInfoInterface[];
    type?: string;
    title?: string;
    data?: string;
    name?: string;
    unit?: string;
    [name: string]: any;
}

class VideoInfo {
    updateStatus: boolean;
    private player: Player;
    private config: IConfigInterface;
    private container: JQuery;
    private initialized: boolean;
    private infos: IInfosInterface;
    private graphWidth: number;
    private graphHeight: number;
    private minValue: number;
    private cssPrefix: string;
    private componentName: string;
    private maxValue!: number;
    private perValue!: number;
    private $panel!: JQuery;
    private cacheInfos!: IInfosInterface;
    private $container!: JQuery;
    private $close!: JQuery;
    private clipboard!: Clipboard;
    private pageSource!: JQuery;
    rendered = false;

    constructor(player: Player, config?: IConfigInterface) {
        this.player = player;
        if (config && config.infos && config.infos instanceof Array) {
            this.config = $.extend(
                {
                    infos: [],
                },
                config,
            );
        } else {
            this.config = {
                infos: [],
            };
        }
        this.container = player.template.playerWrap;
        this.initialized = false;

        this.updateStatus = false;
        this.infos = {};

        this.graphWidth = 180;
        this.graphHeight = 14;
        // this.maxValue = 140;
        this.minValue = 0;
        // this.perValue = this.graphHeight / (this.maxValue - this.minValue);

        this.cssPrefix = player.prefix;
        this.componentName = 'video-info';

        this.initialize();
    }

    private reCssPrefix(className: string) {
        return this.cssPrefix + '-' + this.componentName + '-' + className;
    }

    private getGraph(info: IInfosInterface, point?: number | string) {
        let svg = '';
        let tmp = '';
        let lineArr;

        if (!point && point !== 0) {
            for (let i = 0, len = this.graphWidth / 2; i < len; i++) {
                info.graphPointArr.push(0);
                info.graphLineArr.push([i * 2, this.graphHeight]);
            }
        } else {
            info.graphPointArr.splice(0, 1);
            info.graphPointArr.push(point);

            info.graphLineArr = [];

            // set max Value
            // for (i = 0, len = info.graphPointArr.length; i < len; i ++) {
            //     pointHeight = this.graphHeight - info.graphPointArr[i] * this.perValue;
            //     pointHeight = pointHeight > this.graphHeight ? this.graphHeight : pointHeight;
            //     pointHeight = pointHeight < this.minValue ? this.minValue : pointHeight;
            //     info.graphLineArr.push([i * 2,  pointHeight]);
            // }

            // dynamic calc
            // this.minValue = Math.min.apply(this, info.graphPointArr);
            this.maxValue = Math.max.apply(this, info.graphPointArr) || 1;
            this.perValue = this.graphHeight / (this.maxValue - this.minValue);

            for (let i = 0, len = info.graphPointArr.length; i < len; i++) {
                const point = info.graphPointArr[i];
                info.graphLineArr.push([i * 2, this.graphHeight - (point - this.minValue) * this.perValue]);
            }
        }

        // update graph line array

        lineArr = info.graphLineArr;

        svg +=
            '<svg width="' +
            this.graphWidth +
            '" height="' +
            this.graphHeight +
            '" viewBox="0 0 ' +
            this.graphWidth +
            ' ' +
            this.graphHeight +
            '"><g><polyline stroke="white" fill="none" points="';

        for (let i = 0, len = lineArr.length; i < len; i++) {
            tmp += lineArr[i].join(',') + ' ';
        }

        svg += tmp;
        svg += '"></polyline></g></svg>';

        return svg;
    }

    private infoTemplate(infos: IInfosInterface | IInfosInterface[]) {
        const that = this;
        let infosHtml = '';
        let info;

        if (infos instanceof Array) {
            infos.forEach(function (value) {
                infosHtml += that.infoTemplate(value);
            });
        } else if (typeof infos === 'object' && infos.type && infos.title) {
            info = infos;

            that.infos[info.name!] = {
                type: info.type,
                title: info.title,
                data: info.data,
            };

            switch (info.type) {
                case 'text':
                    infosHtml +=
                        '<div class="info-line" data-name="' +
                        info.name +
                        '"><span class="info-title">' +
                        info.title +
                        ':</span><span class="info-data" >' +
                        info.data +
                        '</span></div>';
                    break;
                case 'graph':
                    that.infos[info.name!].unit = info.unit;
                    that.infos[info.name!].graphPointArr = [];
                    that.infos[info.name!].graphLineArr = [];
                    infosHtml +=
                        '<div class="info-line" data-name="' +
                        info.name +
                        '"><span class="info-title">' +
                        info.title +
                        ':</span><span class="info-graph">' +
                        this.getGraph(that.infos[info.name!]) +
                        '</span><span class="info-data" >' +
                        info.data +
                        ' ' +
                        (info.unit || '') +
                        '</span></div>';
                    break;
                case 'log':
                    infosHtml +=
                        '<div class="info-line" data-name="' +
                        info.name +
                        '"><span class="info-title">' +
                        info.title +
                        ':</span><span class="info-data info-log show">[Show]</span> <span class="info-data info-copy">[Copy]</span> <span class="info-data info-download">[Download]</span></div>';
                    break;
                default:
                    break;
            }
        }
        return infosHtml;
    }

    private reUpdate(data: IConfigInterface) {
        if (data && data.infos && data.infos instanceof Array) {
            this.config = $.extend(
                {
                    infos: [],
                },
                data,
            );

            this.$panel.html(this.infoTemplate(this.config.infos!));
            this.updateLog();

            this.cacheInfos = this.infos;
        }
    }

    private updateLog() {
        const that = this;
        this.$panel.find('.info-log').click(() => {
            that.player.logger(true);
        });
    }

    private createClipBoard() {
        if (!this.clipboard) {
            this.clipboard = new Clipboard(this.$panel.find('.info-copy')[0], {
                text: () => {
                    return (this.player.eventLog.text() || []).join('\n');
                },
                container: this.player.container[0],
            });
            this.clipboard.on('success', () => {
                this.createClipBoardTip('success');
            });
            this.clipboard.on('error', () => {
                this.createClipBoardTip('error');
            });
        }
    }

    private createClipBoardTip(text: string) {
        new Tooltip({
            name: 'logCopy',
            target: this.$panel.find('.info-copy'),
            position: 'bottom-center',
            text: text,
        });
    }

    private reRefresh(infos: IInfosInterface | IInfosInterface[]) {
        const that = this;
        let info;
        let $line;

        if (infos instanceof Array) {
            infos.forEach(function (value) {
                that.reRefresh(value);
            });
        } else if (typeof infos === 'object') {
            info = that.infos[infos.name!];

            if (!info) {
                that.$panel.append(that.infoTemplate(infos));
                info = that.infos[infos.name!];
            } else {
                info.data = infos.data;
            }

            $line = that.$panel.find('.info-line[data-name="' + infos.name + '"]');

            switch (info.type) {
                case 'text':
                    $line.find('.info-data').text(info.data);
                    break;
                case 'graph':
                    $line
                        .find('.info-graph')
                        .html(that.getGraph(info, info.data))
                        .next()
                        .text(info.data + ' ' + info.unit);
                    break;
                default:
                    break;
            }
        }
    }

    private initialize() {
        const cssPrefix = this.reCssPrefix.bind(this);
        const infos = this.config.infos;

        this.$container = $('<div>').addClass(cssPrefix('container'));

        this.$close = $('<a href="javascript:void(0);">')
            .addClass(cssPrefix('close'))
            .text('[x]')
            .appendTo(this.$container);
        this.$panel = $('<div>').addClass(cssPrefix('panel')).appendTo(this.$container);

        this.$panel.html(this.infoTemplate(infos!));

        this.initialized = true;

        this.bindEvents();

        this.cacheInfos = this.infos;
    }

    private bindEvents() {
        const that = this;
        this.$close.on('click', function () {
            that.hide();
        });
        this.$panel.on('click', (e) => {
            if ($(e.target)) {
                if ($(e.target).hasClass('info-log')) {
                    that.logToggle();
                } else if ($(e.target).hasClass('info-download')) {
                    that.player.eventLog.download();
                }
            }
        });
        this.player.bind(STATE.EVENT.VIDEO_LOG_CLOSE, () => {
            that.logToggle();
        });
    }

    private renderContainer() {
        if (!this.rendered) {
            this.rendered = true;
            this.$container.appendTo(this.container);
        }
    }

    private logToggle() {
        const $dom = this.$container.find('.info-data.info-log');
        if ($dom.hasClass('show')) {
            this.showLog($dom);
        } else if ($dom.hasClass('hide')) {
            this.hideLog($dom);
        }
    }

    private showLog($dom: JQuery) {
        if (!$dom) {
            $dom = this.$container.find('.info-data.info-log');
        }
        if ($dom.hasClass('show')) {
            $dom.text('[Hide]');
            $dom.removeClass('show').addClass('hide');
            this.player.eventLog.show();
        }
    }

    hideLog($dom?: JQuery) {
        if (!$dom) {
            // only for hide eventlog callback
            $dom = this.$container.find('.info-data.info-log');
        }
        if ($dom.hasClass('hide')) {
            $dom.text('[Show]');
            $dom.removeClass('hide').addClass('show');
            this.player.eventLog.hide();
        }
    }

    toggle() {
        if (!this.$container || !this.$container.hasClass('active')) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        if (!this.initialized) {
            this.initialize();

            this.initialized = true;
        }
        this.renderContainer();
        this.restoreData();
        this.$container.addClass('active');
        if (!this.clipboard) {
            this.createClipBoard();
        }
        this.updateStatus = true;
    }

    hide() {
        this.updateStatus = false;
        this.$container.removeClass('active');
    }

    refresh(data: IInfosInterface | IInfosInterface[]) {
        this.cacheData(data);
        if (this.updateStatus) {
            this.reRefresh(data);
        }
    }

    update(data: IConfigInterface) {
        return this.reUpdate(data);
    }

    private remove(name: string) {
        if (typeof this.infos[name] === 'object') {
            delete this.infos[name];
            this.$panel.find('.info-line[data-name="' + name + '"]').remove();
        }
    }

    private cacheData(data: IInfosInterface | IInfosInterface[]) {
        const that = this;
        let key;
        let value;
        let info;

        if (data instanceof Array) {
            data.forEach(function (value) {
                that.cacheData(value);
            });
        } else if (typeof data === 'object') {
            key = data.name;
            value = data.data;
            info = this.cacheInfos[key!];

            if (info) {
                if (info.type === 'text') {
                    info.data = value;
                } else if (info.type === 'graph') {
                    info.data = value;

                    this.getGraph(info, value);
                }
            }
        }
    }

    private restoreData() {
        const that = this;
        let $line;
        let info;
        for (const key in this.cacheInfos) {
            if (this.cacheInfos.hasOwnProperty(key)) {
                info = this.cacheInfos[key];

                $line = that.$panel.find('.info-line[data-name="' + key + '"]');

                switch (info.type) {
                    case 'text':
                        $line.find('.info-data').text(info.data);
                        break;
                    case 'graph':
                        $line
                            .find('.info-graph')
                            .html(that.getGraph(info, info.data))
                            .next()
                            .text(info.data + ' ' + info.unit);
                        break;
                    default:
                        break;
                }
            }
        }
    }
}

export default VideoInfo;
