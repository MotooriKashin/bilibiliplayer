import ApiSendModify, { ApiSendModifyInData, ApiSendModifyOutData } from '../io/api-dm-post';
import ApiSaDMState, { ApiSaDMStateInData, ApiSaDMStateOutData } from '../io/api-sa-dm-state';
import BasDanmaku from '@jsc/bas-danmaku/js';
import Player, { IReceivedInterface } from '../player';
import PathPicker from '../adv-danmaku/path-picker';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';

class BasPanel {
    private pathPicker!: PathPicker;

    constructor(private player: Player, private danmaku: BasDanmaku) {
        this.registerListener();
    }

    private registerListener() {
        // 显示面板
        this.player.directiveManager.on(WD.BDM_DISPLAY_PANEL.toString(), (e, received: IReceivedInterface) => {
            const rect = this.player.config.element.getBoundingClientRect();
            this.player.directiveManager.responder(received, {
                w: rect.width,
                h: rect.height,
            });
        });

        // 坐标拾取
        this.player.directiveManager.on(WD.BDM_START_POS_PICKUP.toString(), (e, received: IReceivedInterface) => {
            if (!this.pathPicker) {
                if (!this.danmaku.inited) {
                    this.danmaku.init();
                }
                this.pathPicker = new PathPicker(this.danmaku.container.parentElement!, {
                    isPercent: true,
                    isPath: false,
                    width: this.player.template.basDanmaku.find('.bas-danmaku')[0].clientWidth,
                    height: this.player.template.basDanmaku.find('.bas-danmaku')[0].clientHeight,
                    onChange: (val: { x: number; y: number }) => {
                        let x = val.x;
                        x = Math.max(x, 0);
                        x = Math.min(x, 1);
                        let y = val.y;
                        y = Math.max(y, 0);
                        y = Math.min(y, 1);
                        this.player.directiveManager.sender(PD.BDM_MOUSE_POS_CHANGE, {
                            x: x,
                            y: y,
                        });
                    },
                });
            }
            if (!this.pathPicker.status) {
                this.pathPicker.update(null, true);
            } else {
                this.pathPicker.hide();
            }
        });

        // 清屏
        this.player.directiveManager.on(WD.BDM_CLEAR_CANVAS.toString(), (e, received: IReceivedInterface) => {
            this.pathPicker && this.pathPicker.hide();
            this.player.danmaku && this.player.danmaku.clear();
            this.player.directiveManager.responder(received, null);
        });

        // 测试弹幕
        this.player.directiveManager.on(WD.BDM_PREVIEW_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this.danmaku.parse({
                danmaku: received['data']['dm'],
                success: (parsed) => {
                    this.danmaku.add({
                        dm: parsed,
                        parsed: true,
                        test: received['data']['test'],
                    });
                    this.player.directiveManager.responder(received, {
                        code: 0,
                    });
                },
                error: (message) => {
                    this.player.directiveManager.responder(received, {
                        code: 1,
                        message: '弹幕格式错误: ' + message,
                    });
                },
            });
        });

        // 发送弹幕
        this.player.directiveManager.on(WD.BDM_SEND_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            const dm = received['data']['dm'];
            const data = received['data']['data'];
            this.danmaku.parse({
                danmaku: dm,
                success: (parsed) => {
                    if (received['data']['isNew']) {
                        if (this.player.config.bvid) {
                            delete data['aid'];
                        } else {
                            delete data['bvid'];
                        }
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
                                    dm.dmid = result['data']['dmid_str'];
                                    dm.uid = Number(userStatus.hash_id);
                                    dm.mid = userStatus.uid;
                                    dm.uname = userStatus.name ? userStatus.name.split(' ')[0] : '';
                                    dm.class = data['pool'];
                                    dm.mode = data['mode'];
                                    this.danmaku.add({
                                        dm: dm,
                                    });
                                    this.player.danmaku.add(dm);
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
                    } else {
                        const dmids = received['data']['dmids'];
                        new ApiSaDMState(<ApiSaDMStateInData>{
                            type: 1,
                            oid: this.player.config.cid,
                            state: 1,
                            dmids,
                        }).getData({
                            success: (json: ApiSaDMStateOutData) => {
                                if (json && json.code === 0) {
                                    // 删除成功
                                    this.player.basDanmaku && this.player.basDanmaku.remove(<string>dmids);
                                    if (this.player.config.bvid) {
                                        delete data['aid'];
                                    } else {
                                        delete data['bvid'];
                                    }
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
                                                dm.dmid = result['data']['dmid_str'];
                                                dm.uid = Number(userStatus.hash_id);
                                                dm.mid = userStatus.uid;
                                                dm.uname = userStatus.name ? userStatus.name.split(' ')[0] : '';
                                                dm.class = data['pool'];
                                                dm.mode = data['mode'];
                                                this.danmaku.add({
                                                    dm: dm,
                                                });
                                                this.player.danmaku.add(dm);
                                            } else {
                                                this.player.directiveManager.responder(received, {
                                                    code: 1,
                                                    message: `修改失败：弹幕被删除，请重新发送，${result && result['message'] ? result['message'] : ''
                                                        }`,
                                                    status: 1,
                                                });
                                            }
                                        },
                                        error: (error: JQuery.jqXHR<any>) => {
                                            this.player.directiveManager.responder(received, {
                                                code: 1,
                                                message: '修改失败：接口请求失败',
                                            });
                                        },
                                    });
                                } else {
                                    // 删除失败
                                    this.player.directiveManager.responder(received, {
                                        code: 1,
                                        message: '修改失败：无权限或其他未知原因',
                                    });
                                }
                            },
                            error: () => {
                                this.player.directiveManager.responder(received, {
                                    code: 1,
                                    message: '修改失败：接口请求失败',
                                });
                            },
                        });
                    }
                },
            });
        });

        // 解析弹幕
        this.player.directiveManager.on(WD.BDM_PARSE_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this.danmaku.parse({
                danmaku: received['data']['dm'],
                success: (parsed) => {
                    this.player.directiveManager.responder(received, {
                        code: 0,
                        data: parsed,
                    });
                },
                error: (message) => {
                    this.player.directiveManager.responder(received, {
                        code: 1,
                        message: '弹幕格式错误: ' + message,
                    });
                },
            });
        });
    }
}

export default BasPanel;
