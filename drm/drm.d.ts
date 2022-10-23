/**
 * TODO: 完善声明
 * @file drmsdk
 */
class Drmsdk {
    static biliDRMGenSPC(streamKid: string, uniqueId: string, cer: ArrayBuffer): { spc: string }
}
declare namespace Drmsdk {
    type SDK = Drmsdk;
}
export default Drmsdk;