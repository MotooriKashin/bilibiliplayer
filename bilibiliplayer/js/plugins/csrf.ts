import { getCookie } from "@shared/utils";

const csrf = () => {
    const $ = jQuery;
    const ajaxHandle = $.ajax;
    $.ajax = function (url?: any, option?: any) {
        if (typeof url === 'object') {
            option = url;
            url = undefined;
        }
        if (
            !option.offcsrf &&
            (option.type === 'post' || option.type === 'POST') &&
            option.data &&
            !option.data['csrf']
        ) {
            $.extend(option.data, {
                csrf: getCookie('bili_jct'),
            });
        }
        return ajaxHandle(url, option);
    };
};

export default csrf;
