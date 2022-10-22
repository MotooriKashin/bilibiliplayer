// keyword user color regexp -> t u c r
import { download, upload } from '@shared/utils';
import Auxiliary from '../auxiliary';

class BlocklistIO {
    private auxiliary: Auxiliary;
    constructor(auxiliary: Auxiliary) {
        this.auxiliary = auxiliary;
    }
    downLoadFile() {
        let data: any;
        let xmlList: string;
        let reXml = '';
        try {
            data = this.auxiliary.block.block.setting;
            const dataList = data['list'];
            let content = '';
            for (let i = 0; i < dataList.length; i++) {
                let t: string;
                if (dataList[i]['t'] === 'keyword') {
                    t = 't';
                } else if (dataList[i]['t'] === 'user') {
                    t = 'u';
                } else if (dataList[i]['t'] === 'regexp') {
                    t = 'r';
                } else if (dataList[i]['t'] === 'color') {
                    t = 'c';
                } else {
                    t = 't';
                }
                if (/[<|>|&]/g.test(dataList[i]['v'])) {
                    content = this.escape(dataList[i]['v']);
                } else {
                    content = dataList[i]['v'];
                }
                // reXml += `<item enabled="${dataList[i]['s']}">${t}=${content}</item>\n`;
                // xmlList = `<filters>\n${reXml}</filters>`;
                reXml += '<item enabled="' + dataList[i]['s'] + '">' + t + '=' + content + '</item>\n';
                xmlList = `<filters>\n${reXml}</filters>`;
            }
        } catch (e) {
            console.log(e);
        }
        if (!xmlList!) {
            return;
        }
        download({
            text: xmlList!,
            type: 'text/xml',
            fileName: 'tv.bilibili.player.xml',
        });
    }
    upLoadFile(callback: (list: any[]) => void) {
        upload((reader: any) => {
            let result: string | JQuery.PlainObject = '';
            try {
                result = reader.result ? reader.result.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '') : '';
                result = new window.DOMParser().parseFromString(<string>result, 'text/xml');
            } catch (e) {
                console.error('parse blocklist error');
            }
            const filterList = $(result);
            const contentList: string[] = [];
            const isStartup: string[] = [];
            const typeList: string[] = [];
            const localList: any[] = [];
            filterList.find('item').each(function () {
                if (
                    ($(this).text().indexOf('=') > -1 &&
                        $(this).text().indexOf('=') === 1 &&
                        ($(this).text()[0] === 't' || $(this).text()[0] === 'u')) ||
                    $(this).text()[0] === 'r' ||
                    $(this).text()[0] === 'c'
                ) {
                    typeList.push($(this).text().split('=')[0]);
                    contentList.push($(this).text().substr(2));
                } else {
                    typeList.push('t');
                    contentList.push($(this).text());
                }
                isStartup.push($(this).attr('enabled')!);
            });
            for (let i = 0, len = filterList.find('item').length; i < len; i++) {
                let type: string;
                switch (typeList[i]) {
                    case 't':
                        type = 'keyword';
                        break;
                    case 'u':
                        type = 'user';
                        break;
                    case 'r':
                        type = 'regexp';
                        break;
                    case 'c':
                        type = 'color';
                        break;
                    default:
                        type = 'keyword';
                }
                const o = {
                    t: type,
                    v: contentList[i],
                    s: isStartup[i],
                };
                localList.push(o);
            }
            callback(localList);
        });
    }
    private escape(str: string): string {
        let reStr: string = str;
        reStr = reStr.replace(/&/g, '&amp;');
        reStr = reStr.replace(/</g, '&lt;');
        reStr = reStr.replace(/>/g, '&gt;');
        return reStr;
    }
}

export default BlocklistIO;
