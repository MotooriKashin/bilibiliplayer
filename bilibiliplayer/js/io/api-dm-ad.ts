/**
 * User relation opt api
 *
 * @description http://bpre-api.bilibili.co/project/1531/interface/api/141143
 *
 * 透传调用： https://info.bilibili.co/pages/viewpage.action?pageId=90137944
 * @extends {Api}
 */

import { strLength } from '@shared/utils';
import Interface from './urls';

// module -> api-in
interface IInData {
    oid: number; // cid
    aid: number; //
    mobi_app: string;
    build: number;
    type: number;
    // ip?: string;
}

// api-out -> module
export interface IDmAd {
    /**寻宝球id */
    ballId: number;
    /**选择 图片地址 */
    imgUrl: string;
    /**选择 问题 */
    title: string;
    /**浮层出现时间, 单位ms */
    from: number;
    /**浮层结束时间, 单位ms */
    to: number;
    /**浮层出现时间, 单位ms */
    duration: number;
    /**碎片领取状态, 0-未领取, 1-已领取 */
    state: number;
    /**背景颜色 */
    bg: string;
    /**跳转链接 */
    btnSrc: string;
    /**拓展 文案 有的时候才展示*/
    tagImg: string;
    tagText: string;
    /**失败 文案*/
    errText: string;
    /**是否已选择*/
    selected?: boolean;
    select?: {
        a: string;
        b: string;
    };
    right?: IBtn;
    receive?: IBtn;
    received?: IBtn;
}
interface IBtn {
    img: string;
    title: string;
    btn: string;
}
export interface IOutDmAd {
    code: number; // 返回码 0 成功 非0 失败
    message: string;
    data: IDmAd[];
}
export function dmAd(data: IInData) {
    return new Promise((resolve) => {
        $.ajax({
            url: Interface.DM_AD,
            type: 'get',
            data,
            xhrFields: {
                withCredentials: true,
            },
            success: (res: any) => {
                resolve(convertResult(res));
            },
            error: (err: JQuery.jqXHR<any>) => {
                resolve(err);
            },
        });
    });
}

function convertResult(res: any): IOutDmAd {
    let activities = res?.data?.activities;
    const ad: any = [];
    // activities = [
    //     {
    //         ad_info: {
    //             extra: {
    //                 card: {
    //                     card_type: 76,
    //                     treasure_hunt_ball: {
    //                         "ball_id":123,  //寻宝球id
    //                         "achieve_status":0, //碎片领取状态, 0-未领取, 1-已领取
    //                         "appearance_time":5000, //浮层出现时间, 单位ms
    //                         "appearance_duration":10000, //浮层持续时间， 单位毫秒
    //                         "text":"直接领取文案/答题问题",
    //                         image_url:'https://pre-s1.hdslb.com/bfs/static/jinkela/international-home/assets/icon_slide_selected.png',
    //                         "options":[
    //                             "选项1",
    //                             "选项2"
    //                         ],
    //                         "button_text": "解锁", //领取浮层用到
    //                         success_text:"恭喜您，回答正确！获得了一个碎片～",
    //                         "success_image_url":"https://i0.hdslb.com/bfs/archive/0bda7134893d4484efbfaefbd6e23184ad99f67e.png@36w_36h_1c_100q.webp",
    //                         "success_button_text":"继续探索",
    //                         "failure_text":"失败文案",
    //                         "achieve_text":"已领取文案",
    //                         "achieve_image_url":"https://i0.hdslb.com/bfs/archive/0bda7134893d4484efbfaefbd6e23184ad99f67e.png@36w_36h_1c_100q.webp",
    //                         "achieve_button_text":"继续探索",
    //                         "jump_url":"https://pre-www.bilibili.com/blackboard/activity-MwlPARhS4U.html",  //跳转链接
    //                         "ad_tag_image_url":"https://pre-s1.hdslb.com/bfs/static/jinkela/international-home/assets/icon_slide_selected.png",
    //                         "ad_tag_text":"极致寻宝球 X 天猫"
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // ]
    if (activities?.length) {
        activities.forEach((ac: any) => {
            const info = ac.ad_info?.extra?.card?.treasure_hunt_ball;

            // 领取浮层和答题浮层是通过card_type字段区分，76-答题浮层,77-领取浮层
            const type = ac.ad_info?.extra?.card?.card_type;
            if (info) {
                const card: IDmAd = {
                    ballId: info.ball_id,
                    imgUrl: info.image_url,
                    title: strLength(info.text, 20).str,
                    from: info.appearance_time / 1000,
                    to: info.appearance_time / 1000 + (info.appearance_duration / 1000 || 10),
                    duration: info.appearance_duration,
                    state: info.achieve_status,
                    bg: 'rgba(33，33，33，0.8)',
                    btnSrc: info.jump_url,
                    tagImg: info.ad_tag_image_url,
                    tagText: strLength(info.ad_tag_text, 10).str,
                    errText: strLength(info.failure_text, 20).str,
                    right: {
                        img: info.success_image_url,
                        title: strLength(info.success_text, 28).str,
                        btn: strLength(info.success_button_text, 4).str,
                    },
                };
                if (info.achieve_status) {
                    card.to = card.from + 5;
                    card.duration = 5;
                    card.received = {
                        img: info.achieve_image_url,
                        title: strLength(info.achieve_text, 28).str,
                        btn: strLength(info.achieve_button_text, 4).str,
                    };
                }
                if (type === 76) {
                    card.select = {
                        a: info.options[0],
                        b: info.options[1],
                    };
                } else if (type === 77) {
                    card.receive = {
                        img: info.image_url,
                        title: strLength(info.text, 20).str,
                        btn: strLength(info.button_text, 4).str,
                    };
                }
                ad.push(card);
            }
        });
    }
    return {
        code: res.code,
        message: res.message,
        data: ad,
    };
}
