const STATE = {
    // WebSocket 接受消息类型
    WS_OP_HEARTBEAT: 2, // 心跳包
    WS_OP_HEARTBEAT_REPLY: 3, // 心跳包回复
    WS_OP_DATA: 1000, // 数据包
    WS_OP_BATCH_DATA: 9, // 批量数据包
    WS_OP_DISCONNECT_REPLY: 6, // 踢下线
    WS_OP_USER_AUTHENTICATION: 7, // 信息包
    WS_OP_CONNECT_SUCCESS: 8, // 服务器响应成功
    WS_OP_CHANGEROOM: 12, // 切换房间
    WS_OP_CHANGEROOM_REPLY: 13, // 切换房间回复
    WS_OP_REGISTER: 14, // 注册指令
    WS_OP_REGISTER_REPLY: 15,
    WS_OP_UNREGISTER: 16, // 取消注册指令
    WS_OP_UNREGISTER_REPLY: 17,
    WS_OP_OGVCMD_REPLY: 1015, // OGV首播命令推送回复
    // 二进制 WebSocket
    WS_PACKAGE_HEADER_TOTAL_LENGTH: 18, // package header 总长度
    WS_PACKAGE_OFFSET: 0, // package  UInt32 (8 * 4)
    WS_HEADER_OFFSET: 4, // header UInt16 (8 * 2)
    WS_VERSION_OFFSET: 6, // version UInt16
    WS_OPERATION_OFFSET: 8, // operation UInt32
    WS_SEQUENCE_OFFSET: 12, // sequence UInt32
    WS_COMPRESS_OFFSET: 16, // sequence UInt32
    WS_CONTENTTYPE_OFFSET: 17, // sequence UInt32

    WS_BODY_PROTOCOL_VERSION: 1, // WebSocket 压缩, 1、不压缩, 2、压缩

    WS_HEADER_DEFAULT_VERSION: 1, // WebSocket 默认版本值
    WS_HEADER_DEFAULT_OPERATION: 1, // WebSocket 默认操作值
    ws_header_default_sequence: 1, // WebSocket 默认序列值
    WS_HEADER_DEFAULT_COMPRESS: 0, // WebSocket 是否压缩 0 不压缩 1 gizp
    WS_HEADER_DEFAULT_CONTENTTYPE: 0, // WebSocket 数据类型 0 application/json 1 binary 2 protobuf
};

export default STATE;
