export const EVENTS = {
    B_INITED: 'b_inited', // inited
    B_OPEN: 'b_open', // socket open
    B_CLOSE: 'b_close', // socket close
    B_MSG: 'b_msg', // socket message
    B_ROOM: 'b_room', // room enter

    B_AUTH: 'b_audth', // 鉴权回调(鉴权之后才可以订阅)
    B_SUB: 'b_sub', // 订阅回调
    B_UN_SUB: 'b_un_sub', // 取消订阅回调
    B_HEARTBEAT: 'b_heartbeat', // socket HeartBeat
    B_ERROR: 'b_error', // socket error
};
const PACKAGE = '/bilibili.broadcast.v1';
const BROADCAST = '.Broadcast';
export const PATH = {
    AUTH: `${PACKAGE + BROADCAST}/Auth`, // 进行鉴权
    HEARTBEAT: `${PACKAGE + BROADCAST}/Heartbeat`, // 心跳发送和发送（如果有上行消息可不进行发心跳）
    SUBSCRIBE: `${PACKAGE + BROADCAST}/Subscribe`, // 订阅target_paths，可以订阅到对应的消息
    UNSUBSCRIBE: `${PACKAGE + BROADCAST}/Unsubscribe`, // 取消订阅target_paths
    MSG_ACK: `${PACKAGE + BROADCAST}/MessageAck`, // 如果消息is_ack=true，sdk收到后进行ack

    ENTER: `${PACKAGE}.BroadcastRoom/Enter`,

    ROOMREQ: `${PACKAGE}.RoomReq`,
    ROOMRES: `${PACKAGE}.RoomResp`,

    AUTHREQ: `${PACKAGE}.AuthReq`, // 进行鉴权响应
    TARGETPATH: `${PACKAGE}.TargetPath`, // 订阅target_paths，响应
    HEARTBEATRES: `${PACKAGE}.HeartbeatResp`, //心跳，响应
    MSG_ACK_REQ: `${PACKAGE}.MessageAckReq`, //心跳，响应
};
export const ROOM = {
    JOIN: 'join', // 进入房间
    LEAVE: 'leave', // 离开房间
    ONLINE: 'online', //
};
