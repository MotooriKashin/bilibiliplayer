const esbuild = require('esbuild');
const fs = require('fs');

const banner = `import worker from '@jsc/danmaku/worker-loader/inline';

// 运行在work中的弹幕解析器，须提前构建
export default function () {
  return worker(\``;
const footer = `\`, "Worker", undefined, undefined);
}
`;
const plugin = {
    name: 'example',
    setup(build) {
        build.onEnd(result => {
            result.outputFiles.forEach(d => {
                fs.promises.writeFile(d.path, banner + d.text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace('"use strict";', '') + footer);
            })
        })
    },
};
esbuild.build({
    entryPoints: [
        'worker/Worker.ts'
    ],
    bundle: true,
    format: 'iife',
    minify: true,
    treeShaking: true,
    charset: 'utf8',
    plugins: [
        plugin
    ],
    keepNames: true,
    write: false,
    outfile: 'host/worker.js'
}).catch(e => {
    console.error('脚本编译出错！', e);
    process.exit(1);
}).finally(() => {
    console.log('脚本编译完成！');
});