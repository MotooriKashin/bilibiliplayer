/**
 *
 * @class ApiRecommendOrigin
 * @extends {Api}
 */

import URLS from "./urls";

// api-out -> module
interface IOutData {
    aid: number;
    click: number;
    cover: string;
    favorites: number;
    review: number;
    title: string;
    video_review: string;
}

export { IOutData as ApiRecommendOriginOutData };

export async function apiRecommendOrigin(aid: number) {
    const response = await fetch(URLS.RECOMMEND_ORIGIN + aid + '.json?html5=1');
    return <IOutData[]>await response.json()
}