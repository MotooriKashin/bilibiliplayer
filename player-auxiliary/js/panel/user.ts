import STATE from './state';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';

export interface IUserLoginInfos {
    login?: boolean;
    uid?: number;
    uname?: string; // user name
    role?: number; // user role
    uhash?: string; // user hash
    level?: number; // user level
    is_system_admin?: boolean; // is system admin
    isadmin?: boolean; // is admin
    p_role?: number; // 协管身份,1是协管
    chatid?: string; // cid
    levelInfo?: string;
    permission?: string;
}
class User {
    private auxiliary: Auxiliary;
    private userStatus: IUserLoginInfos = {};
    private initialized = false; // 只有为true才会执行所有回调

    constructor(auxiliary: any) {
        this.auxiliary = auxiliary;
        this.registerListener();
    }

    private registerListener() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, () => {
            this.destroy();
        });
        // 125001
        this.auxiliary.directiveManager.on(PD.AI_STATUS_CHANGE.toString(), (e, received: IReceived) => {
            if (
                this.userStatus.login !== received['data']['login'] ||
                this.userStatus.chatid !== received['data']['chatid']
            ) {
                this.loadUser(received['data']);
                this.initialized = true;
                this.loadCallback();
            }
        });
        // 126001
        this.auxiliary.directiveManager.on(PD.VI_DATA_INIT.toString(), (e, received: IReceived) => {
            if (received['_origin'] === 'html5') {
                this.auxiliary.defaultHTML5 = true;
            } else {
                this.auxiliary.defaultHTML5 = false;
            }
            if (this.initialized || this.auxiliary.config.playlistId) {
                // 播单音频不会触发 STATUS_CHANGE
                this.auxiliary.reload(received['data']);
            }
            this.auxiliary.directiveManager.complete();
            this.getUserInfo();
        });
    }
    addCallback(callback: Function) {
        if (typeof callback === 'function') {
            this.auxiliary.userLoadedCallbacks.push(callback);
            if (this.initialized) {
                callback(this.userStatus);
            }
        }
    }
    status() {
        return this.userStatus;
    }
    // 获取用户信息
    getUserInfo() {
        // 获取user信息总方法
        // 225001
        this.auxiliary.directiveManager.sender(WD.AI_RETRIEVE_DATA, null, (received?: IReceived) => {
            if (
                this.userStatus.login !== received!['data']['login'] ||
                this.userStatus.chatid !== received!['data']['chatid']
            ) {
                this.loadUser(received!['data']);
                this.initialized = true;
                this.loadCallback();
            }
        });
    }

    private loadUser(data: IUserLoginInfos) {
        this.userStatus = {
            login: data['login'],
            uid: data['uid'],
            uname: data['uname'],
            uhash: data['uhash'],
            isadmin: data['isadmin'],
            p_role: data['p_role'],
            chatid: data['chatid'],
            level: data['level'],
        };
        this.userStatus.is_system_admin = false;
        this.userStatus.role = this.userStatus.login ? this._role(data['permission']!) : STATE.USER_UNLOGIN;
    }
    private loadCallback() {
        for (let i = 0, len = this.auxiliary.userLoadedCallbacks.length; i < len; i++) {
            this.auxiliary.userLoadedCallbacks[i](this.userStatus);
        }
    }
    private _role(role: string) {
        if (role) {
            const permissions = role.split(',');
            if (permissions.length === 0 || permissions.indexOf('9999') !== -1) {
                return STATE.USER_LIMITED;
            } else if (permissions.indexOf('5000') !== -1) {
                return STATE.USER_REGISTERED;
            } else if (
                permissions.indexOf('20000') !== -1 ||
                permissions.indexOf('32000') !== -1 ||
                permissions.indexOf('31300') !== -1
            ) {
                this.userStatus.is_system_admin = permissions.indexOf('32000') !== -1 || permissions.indexOf('31300') !== -1;
                return STATE.USER_ADVANCED;
            } else if (permissions.indexOf('30000') !== -1 || permissions.indexOf('25000') !== -1) {
                return STATE.USER_VIP;
            } else {
                return STATE.USER_NORMAL;
            }
        } else {
            return STATE.USER_UNLOGIN;
        }
    }
    private destroy() {
        this.userStatus = {
            login: false,
        };
        this.initialized = false;
    }
}

export default User;
