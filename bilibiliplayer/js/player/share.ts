const DOMAIN = {
    WEIBO: 'http://service.weibo.com/share/share.php',
    QQWEIBO: 'http://v.t.qq.com/share/share.php',
    QZONE: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey',
    BAIDU: 'http://tieba.baidu.com/f/commit/share/openShareApi',
    QQ: 'http://connect.qq.com/widget/shareqq/index.html',
};

export interface IShareConfig {
    title: string;
    url: string;
    pic?: string;
    description?: string;
    summary?: string;
    shortTitle?: string;
    weiboTag?: string;
    searchPic?: string;
}

export default {
    appkey: {
        weibo: '2841902482',
        qqweibo: '84435a83a11c484881aba8548c6e7340',
    },
    openShareWindow(base: string, config: any): false {
        const temp = [];
        for (const p in config) {
            if (config.hasOwnProperty(p)) {
                temp.push(p + '=' + encodeURIComponent(config[p] || ''));
            }
        }
        const u = base + '?' + temp.join('&');
        window.open(
            u,
            '',
            'width=700, height=680, top=0, left=0, toolbar=no, menubar=no, scrollbars=no, location=yes, resizable=no, status=no',
        );
        return false;
    },
    bind(element: HTMLElement | JQuery, config: { [key: string]: any }, prefix = '') {
        const that = this;
        const buttons = $(element).find('.' + prefix + '-share-btn');
        buttons.each(function (i, e) {
            const btn = $(e);
            if (btn.data('share-init')) {
                return false;
            } else {
                btn.data('share-init', true);
            }
            btn.on('click', function () {
                const type = $(this).attr('share-type');
                if (type === 'weibo') {
                    that.openShareWindow(DOMAIN.WEIBO, {
                        url: config.url,
                        type: '3',
                        count: '1' /** 是否显示分享数，1显示(可选) */,
                        appkey: that.appkey.weibo /** 您申请的应用appkey,显示分享来源(可选) */,
                        title: config.weiboTag + config.title /** 分享的文字内容(可选，默认为所在页面的title) */,
                        pic: config.pic /** 分享图片的路径(可选) */,
                        searchPic: config.searchPic,
                        ralateUid: '' /** 关联用户的UID，分享微博会@该用户(可选) */,
                        language: 'zh_cn' /** 设置语言，zh_cn|zh_tw(可选) */,
                        rnd: Date.now(),
                    });
                } else if (type === 'qqweibo') {
                    that.openShareWindow(DOMAIN.QQWEIBO, {
                        title: config.title,
                        url: config.url,
                        appkey: that.appkey.qqweibo,
                        site: '//www.bilibili.com/',
                        assname: 'bilibiliweb',
                        pic: config.pic,
                    });
                } else if (type === 'qzone') {
                    that.openShareWindow(DOMAIN.QZONE, {
                        url: config.url,
                        showcount: 1,
                        desc: config.description,
                        summary: config.summary,
                        title: config.shortTitle,
                        site: '哔哩哔哩',
                        pics: config.pic,
                        style: '203',
                        width: 98,
                        height: 22,
                    });
                } else if (type === 'baidu') {
                    that.openShareWindow(DOMAIN.BAIDU, {
                        title: config.title,
                        url: config.url,
                        uid: 726865,
                        to: 'tieba',
                        type: 'text',
                        relateUid: '',
                        pic: config.pic && config.pic.replace(/^https:/, 'http:'),
                        key: '',
                        sign: 'on',
                        desc: '',
                        comment: config.description,
                    });
                } else if (type === 'qq') {
                    that.openShareWindow(DOMAIN.QQ, {
                        url: config.url /** 获取URL，可加上来自分享到QQ标识，方便统计 */,
                        desc: '' /** 分享理由(风格应模拟用户对话),支持多分享语随机展现（使用|分隔） */,
                        title: config.title /** 分享标题(可选) */,
                        summary: config.summary /** 分享摘要(可选) */,
                        pics: config.pic /** 分享图片(可选) */,
                        flash: '' /** 视频地址(可选) */,
                        site: '' /** 分享来源(可选) 如：QQ分享 */,
                        style: '201',
                        width: 32,
                        height: 32,
                    });
                }
            });
        });
    },
};
