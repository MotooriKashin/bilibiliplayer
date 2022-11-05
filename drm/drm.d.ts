/**
 * TODO: 完善声明
 * @file drmsdk
 */
class DRM {
    biliDRMGenSPC(streamKid: string, uniqueId: string, cer: ArrayBuffer): {
        spc: string;
        osStatus: number;
    }
    biliDRMParseCKC(ckc: ArrayBuffer, uniqueId: string): {
        iv: string;
        key: string;
        osStatus: number;
    }
}
declare namespace Drmsdk {
    type SDK = SDK;
}
function DrmSDK(): Promise<DRM>;
export default DrmSDK;