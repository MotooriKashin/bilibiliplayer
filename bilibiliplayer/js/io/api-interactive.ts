/**
 *
 * @class ApiInteractive
 * @extends {Api}
 */
import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number;
    bvid: string;
    edge_id?: string;
    graph_version: number;
    delay?: number;
    platform: string;
    portal: number;
    screen: number;
    preview?: boolean;
    manager?: boolean;
    buvid?: string;
    choices?: string;
}

// api-in -> server-request
interface IRequestData {
    aid: number;
    bvid: string;
    edge_id: string;
    graph_version: number;
    delay?: number;
    platform: string;
    portal: number;
    screen: number;
    buvid?: string;
    choices?: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    data: IOutData;
    buvid?: string;
}
// api-out -> module
interface IOutData {
    code: number;
    is_leaf?: number;
    story_list?: IStoryData[];
    edge_id?: string;
    title?: string;
    edges?: IEdgesData;
    buvid?: string;
    hidden_vars?: IHiddenVars[];
    hidden_vars_preview?: IHiddenVars[];
    no_tutorial?: number; // 不出新手引导
    no_evaluation?: number; // 不出进度回溯
    no_backtracking?: number; // 不出结束页
}

export interface IHiddenVars {
    name: string;
    id: string;
    id_v2: string;
    value: number;
    type: number;
    is_show?: number;
}

export interface IFrameAnimation {
    colums: number;
    fps: number;
    item_count: number;
    item_height: number;
    item_width: number;
    position: {
        height: number;
        width: number;
        x: number;
        y: number;
    };
    source_pic: string;
}

export interface IQuestions {
    id: number;
    type: number;
    start_time?: number;
    start_time_r?: number;
    duration: number;
    pause_video: number;
    title?: string;
    title_font_size?: number;
    title_color?: string;
    choices: IChoices[];

    fade_in_time?: number; // ms
    fade_out_time?: number; // ms
}

export interface IChoices {
    id: string;
    condition?: string;
    native_action?: string;
    option: string;
    cid?: number;
    is_default?: number;
    x?: number;
    y?: number;
    text_align?: number;
    platform_action?: string;
    custom_image_url?: string;
    custom_image_width?: number;
    custom_image_height?: number;
    custom_image_rotate?: number;

    is_hidden?: number;
    selected?: IFrameAnimation;
    submited?: IFrameAnimation;
    width?: number;
    height?: number;
}

interface IStoryChoicesSkin {
    choice_image?: string;
    title_text_color?: string;
    title_shadow_color?: string;
    title_shadow_offset_x?: number;
    title_shadow_offset_y?: number;
    title_shadow_radius?: number;
    progressbar_color?: string;
    progressbar_shadow_color?: string;
}

export interface IStoryData {
    edge_id: string;
    title: string;
    cid: number;
    cover: string;
    start_pos: number;
    is_current?: number;
    cursor: number;
}
export interface IEdgesData {
    dimension: {
        width: number;
        height: number;
        rotate: number;
    };
    skin: IStoryChoicesSkin;
    questions: IQuestions[];
}

class ApiInteractive extends Api {
    private retry: number;

    constructor(data: IInData) {
        super(data);
        this.retry = 3;
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: this.data.preview
                ? URLS.NODE_INFO_PREVIEW_V2
                : this.data.manager
                    ? URLS.NODE_INFO_MANAGER_V2
                    : URLS.NODE_INFO_V2,
            type: 'get',
            data: data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            beforeSend: (xhr: JQuery.jqXHR<any>) => {
                if (typeof config.beforeSend === 'function') {
                    config.beforeSend(xhr);
                }
            },
            success: (result: IResponseData) => {
                if (result && (result['code'] === 0 || result['code'] === 99003)) {
                    config.success?.(this.convertResult(result));
                } else if (this.retry > 0) {
                    setTimeout(() => {
                        this.retry--;
                        this.getData(config);
                    }, 1000);
                } else if (typeof config.error === 'function') {
                    config.error(result);
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                if (this.retry > 0) {
                    setTimeout(() => {
                        this.retry--;
                        this.getData(config);
                    }, 1000);
                } else if (typeof config.error === 'function') {
                    config.error(err);
                }
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            aid: data.aid,
            bvid: data.bvid,
            edge_id: data.edge_id!,
            graph_version: data.graph_version,
            delay: data.delay,
            platform: data.platform,
            portal: data.portal,
            screen: data.screen,
            buvid: data.buvid,
            choices: data.choices,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        if (result) {
            if (result['code'] === 0 && result['data']) {
                let story_list: IStoryData[] = [];
                if (result['data']['story_list']) {
                    for (let i = 0; i < result['data']['story_list'].length; i++) {
                        const cover = result['data']['story_list'][i]['cover'].replace('http:', '');
                        story_list.push({
                            edge_id: String(result['data']['story_list'][i]['edge_id']),
                            title: result['data']['story_list'][i]['title'],
                            cid: result['data']['story_list'][i]['cid'],
                            cover: cover,
                            start_pos: result['data']['story_list'][i]['start_pos'],
                            is_current: result['data']['story_list'][i]['is_current'],
                            cursor: result['data']['story_list'][i]['cursor'],
                        });
                    }
                }
                let questions: Array<IQuestions> = [];
                let edges: IEdgesData;
                let choicesSkin: IStoryChoicesSkin;
                // bnj test
                if (window['EDGEINFO']) {
                    edges = window['EDGEINFO'];
                } else if (result['data']['edges']) {
                    if (result['data']['edges']['skin']) {
                        choicesSkin = {
                            choice_image: result['data']['edges']['skin']['choice_image']!.replace(
                                /^(http:)?\/\//,
                                'https://',
                            ),
                            title_text_color: result['data']['edges']['skin']['title_text_color'],
                            title_shadow_color: result['data']['edges']['skin']['title_shadow_color'],
                            title_shadow_offset_x: result['data']['edges']['skin']['title_shadow_offset_x'],
                            title_shadow_offset_y: result['data']['edges']['skin']['title_shadow_offset_y'],
                            title_shadow_radius: result['data']['edges']['skin']['title_shadow_radius'],
                            progressbar_color: result['data']['edges']['skin']['progressbar_color'],
                            progressbar_shadow_color: result['data']['edges']['skin']['progressbar_shadow_color'],
                        };
                    } else {
                        choicesSkin = {
                            choice_image: 'https://s1.hdslb.com/bfs/static/player/img/default.png',
                            title_text_color: 'fff',
                            title_shadow_color: '222',
                            title_shadow_offset_x: 0,
                            title_shadow_offset_y: 0,
                            title_shadow_radius: 0,
                            progressbar_color: '00a1d6',
                            progressbar_shadow_color: '00a1d6',
                        };
                    }
                    if (result['data']['edges']['questions']) {
                        for (let i = 0; i < result['data']['edges']['questions'].length; i++) {
                            let choices: Array<IChoices> = [];
                            if (result['data']['edges']['questions'][i]['choices']) {
                                for (let v = 0; v < result['data']['edges']['questions'][i]['choices'].length; v++) {
                                    choices.push({
                                        id: result['data']['edges']['questions'][i]['choices'][v]['id'],
                                        condition: result['data']['edges']['questions'][i]['choices'][v]['condition'],
                                        native_action:
                                            result['data']['edges']['questions'][i]['choices'][v]['native_action'],
                                        option: result['data']['edges']['questions'][i]['choices'][v]['option'],
                                        cid: result['data']['edges']['questions'][i]['choices'][v]['cid'],
                                        is_default: result['data']['edges']['questions'][i]['choices'][v]['is_default'],
                                        x: result['data']['edges']['questions'][i]['choices'][v]['x'],
                                        y: result['data']['edges']['questions'][i]['choices'][v]['y'],
                                        text_align: result['data']['edges']['questions'][i]['choices'][v]['text_align'],
                                        custom_image_url:
                                            result['data']['edges']['questions'][i]['choices'][v]['custom_image_url'],
                                        custom_image_width:
                                            result['data']['edges']['questions'][i]['choices'][v]['custom_image_width'],
                                        custom_image_height:
                                            result['data']['edges']['questions'][i]['choices'][v][
                                            'custom_image_height'
                                            ],
                                        custom_image_rotate:
                                            result['data']['edges']['questions'][i]['choices'][v][
                                            'custom_image_rotate'
                                            ],
                                        is_hidden: result['data']['edges']['questions'][i]['choices'][v]['is_hidden'],
                                        selected: result['data']['edges']['questions'][i]['choices'][v]['selected'],
                                        submited: result['data']['edges']['questions'][i]['choices'][v]['submited'],
                                        width: result['data']['edges']['questions'][i]['choices'][v]['width'],
                                        height: result['data']['edges']['questions'][i]['choices'][v]['height'],
                                    });
                                }
                            }
                            questions.push({
                                id: result['data']['edges']['questions'][i]['id'],
                                type: result['data']['edges']['questions'][i]['type'],
                                start_time: result['data']['edges']['questions'][i]['start_time'],
                                start_time_r: result['data']['edges']['questions'][i]['start_time_r'],
                                duration: result['data']['edges']['questions'][i]['duration'],
                                pause_video: result['data']['edges']['questions'][i]['pause_video'],
                                title: result['data']['edges']['questions'][i]['title'],
                                title_font_size: result['data']['edges']['questions'][i]['title_font_size'],
                                title_color: result['data']['edges']['questions'][i]['title_color'],
                                choices: choices,
                                fade_in_time: result['data']['edges']['questions'][i]['fade_in_time'],
                                fade_out_time: result['data']['edges']['questions'][i]['fade_out_time'],
                            });
                        }
                    }
                    edges = {
                        dimension: {
                            width: result['data']['edges']['dimension']['width'],
                            height: result['data']['edges']['dimension']['height'],
                            rotate: result['data']['edges']['dimension']['rotate'],
                        },
                        skin: choicesSkin,
                        questions: questions,
                    };
                }
                return {
                    code: result['code'],
                    is_leaf: result['data']['is_leaf'],
                    story_list: story_list,
                    edge_id: result['data']['edge_id'],
                    title: result['data']['title'],
                    edges: edges!,
                    buvid: result['data']['buvid'],
                    hidden_vars: result['data']['hidden_vars'],
                    hidden_vars_preview: result['data']['hidden_vars_preview'],
                    no_tutorial: result.data.no_tutorial,
                    no_evaluation: result.data.no_evaluation,
                    no_backtracking: result.data.no_backtracking,
                };
            } else {
                return {
                    code: result['code'],
                };
            }
        } else {
            return {
                code: -1,
            };
        }
    }
}

export {
    IChoices as StoryChoices,
    IInData as ApiInteractiveInData,
    IOutData as ApiInteractiveOutData,
    IResponseData as ApiOutData,
    IStoryChoicesSkin as ApiSkin,
};
export default ApiInteractive;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        EDGEINFO: IEdgesData;
    }
}