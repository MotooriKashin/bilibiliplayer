class Utils {
    static query(arg: string): HTMLElement {
        return <HTMLElement>document.querySelector(arg)!;
    }
    static getDryLevel(t: number) {
        return 1 < t || t < 0 ? 0 : t <= 0.5 ? 1 : 1 - 2 * (t - 0.5);
    }
    static getWetLevel(t: number) {
        return 1 < t || t < 0 ? 0 : 0.5 <= t ? 1 : 1 - 2 * (0.5 - t);
    }
    static getArrayBufferFromBase64String(t: string) {
        const n = window.atob(t);
        const i = new Uint8Array(n.length);
        i.forEach((t, e) => {
            i[e] = n.charCodeAt(e);
        });
        return i.buffer;
    }
    static gain2db(t: number) {
        return 20 * (Math.log(t) / Math.LN10);
    }
    static db2gain(t: number) {
        return Math.pow(10, t / 20);
    }
}

export default Utils;
