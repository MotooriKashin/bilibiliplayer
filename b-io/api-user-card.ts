import { jsonCheck, objUrl } from "./api";
import { URLS } from "./urls";

interface IVip {
    avatar_subscript: number;
    avatar_subscript_url: string;
    due_date: number;
    label: {
        bg_color: string;
        bg_style: number;
        border_color: string;
        img_label_uri_hans: string;
        img_label_uri_hans_static: string;
        img_label_uri_hant: string;
        img_label_uri_hant_static: string;
        label_theme: string;
        path: string;
        text: string;
        text_color: string;
        use_img_label: boolean;
    };
    nickname_color: string;
    role: number;
    status: number;
    theme_type: number;
    tv_vip_pay_type: number;
    tv_vip_status: number;
    type: number;
    vipStatus: number;
    vipType: number;
    vip_pay_type: number;
}
interface ICard {
    DisplayRank: string;
    Official: { role: 2, title: string; desc: string; type: 0 }
    approve: false
    article: number;
    attention: number;
    attentions: unknown[];
    birthday: string;
    description: string;
    face: string;
    face_nft: number;
    face_nft_type: number;
    fans: number;
    friend: number;
    is_senior_member: number;
    level_info: { current_level: number; current_min: number; current_exp: number; next_exp: number; };
    mid: string;
    name: string;
    nameplate: { condition: string; image: string; image_small: string; level: string; name: string; nid: number };
    official_verify: { type: number; desc: string };
    pendant: { expire: number; image: string; image_enhance: string; image_enhance_frame: string; name: string; pid: number };
    place: string;
    rank: string;
    regtime: number;
    sex: string;
    sign: string;
    spacesta: number;
    vip: IVip;
}
interface IUserCard {
    archive_count: number;
    article_count: number;
    card: ICard;
    follower: number;
    following: boolean;
    like_num: number;
}
export class ApiUserCard {
    private static record: Record<number, IUserCard> = {};
    constructor(private mid: number) { }
    async getData(init?: RequestInit) {
        if (!ApiUserCard.record[this.mid]) {
            const response = await fetch(objUrl(URLS.USER_CARD, { mid: this.mid }), init);
            const json = await response.json();
            ApiUserCard.record[this.mid] = jsonCheck(json).data;
        }
        return ApiUserCard.record[this.mid];
    }
}