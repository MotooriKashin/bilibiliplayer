export function detectGPU() {
    let canvas = document.createElement('canvas');
    let gl: WebGL2RenderingContext | WebGLRenderingContext | null;
    let debugInfo: WEBGL_debug_renderer_info | null;
    let vendor = '';
    let renderer = '';

    try {
        gl =
            canvas.getContext('webgl2') ||
            canvas.getContext('webgl') ||
            <WebGLRenderingContext | null>canvas.getContext('experimental-webgl');

        if (gl) {
            debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        console.warn(e);
    }

    return { vendor, renderer };
}

export const GPU_INFO = detectGPU();
