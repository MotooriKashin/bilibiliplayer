import * as WD from '../const/webpage-directive';
import Player, { IReceivedInterface } from '../player';
import { As3Danmaku } from '@jsc/as3-danmaku';
import ApiSendModify, { ApiSendModifyInData, ApiSendModifyOutData } from '../io/api-dm-post';

export class CodePanel {
    constructor(private player: Player, private danmaku: As3Danmaku) {
        this.registerListener();
    }
    private registerListener() {
        // 测试弹幕
        this.player.directiveManager.on(WD.CDM_PREVIEW_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this.danmaku.test(received.data.msg);
        });
        // 发送弹幕
        this.player.directiveManager.on(WD.CDM_SEND_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            const data = received.data;
            new ApiSendModify(<ApiSendModifyInData>data).getData({
                success: (result: ApiSendModifyOutData) => {
                    if (result && result.code === 0 && result['data']['dmid_str']) {
                        this.player.directiveManager.responder(received, {
                            code: 0,
                            dmid: result['data']['dmid_str'],
                            status: 2,
                        });
                        const userStatus = this.player.user.status();
                        // 展示发送的弹幕
                        data.dmid = result['data']['dmid_str'];
                        data.uid = Number(userStatus.hash_id);
                        data.mid = userStatus.uid;
                        data.uname = userStatus.name ? userStatus.name.split(' ')[0] : '';
                        data.class = data['pool'];
                        data.mode = data['mode'];
                        this.danmaku.add(data);
                        this.player.danmaku.add(data);
                    } else {
                        this.player.directiveManager.responder(received, {
                            code: 1,
                            message: `发送失败：${result && result['message'] ? result['message'] : '未知原因'
                                }`,
                        });
                    }
                },
                error: (error: JQuery.jqXHR<any>) => {
                    this.player.directiveManager.responder(received, {
                        code: 1,
                        message: '发送失败：接口请求失败',
                    });
                },
            });
        });
    }
} 