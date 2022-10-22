import STATE from './state';

const HEADER_LIST = [
    {
        name: 'Header Length',
        key: 'headerLen',
        bytes: 2,
        offset: STATE.WS_HEADER_OFFSET,
        value: STATE.WS_PACKAGE_HEADER_TOTAL_LENGTH,
    },
    {
        name: 'Protocol Version',
        key: 'ver',
        bytes: 2,
        offset: STATE.WS_VERSION_OFFSET,
        value: STATE.WS_HEADER_DEFAULT_VERSION,
    },
    {
        name: 'Operation',
        key: 'op',
        bytes: 4,
        offset: STATE.WS_OPERATION_OFFSET,
        value: STATE.WS_HEADER_DEFAULT_OPERATION,
    },
    {
        name: 'Sequence Id',
        key: 'seq',
        bytes: 4,
        offset: STATE.WS_SEQUENCE_OFFSET,
        value: STATE.ws_header_default_sequence,
    },
    {
        name: 'Compress',
        key: 'compress',
        bytes: 1,
        offset: STATE.WS_COMPRESS_OFFSET,
        value: STATE.WS_HEADER_DEFAULT_COMPRESS,
    },
    {
        name: 'ContentType',
        key: 'contentType',
        bytes: 1,
        offset: STATE.WS_CONTENTTYPE_OFFSET,
        value: STATE.WS_HEADER_DEFAULT_CONTENTTYPE,
    },
];

export default HEADER_LIST;
