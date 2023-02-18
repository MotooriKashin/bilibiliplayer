import esbuild from 'esbuild';
import fs from 'fs-extra';

esbuild.build({
    entryPoints: [ // 入口脚本
        'src/video.ts'
    ],
    // target: "chrome76", // 目标标准
    bundle: true, // 是否打包
    sourcemap: true, // map文件
    minify: true, // 是否压缩
    outdir: 'dist', // 输出目录
    outbase: "src", // 输入目录
    format: 'iife', // 输出格式
    treeShaking: true, // 清除无效代码
    charset: 'utf8', // 文件编码
    loader: { // 文件对应的解析方式
        '.html': 'text',
        '.svg': 'text',
        '.art': 'text',
        '.png': 'dataurl',
        '.gif': "dataurl",
        '.less': 'css',
        '.ttf': 'dataurl',
        '.woff': 'dataurl',
        '.eot': 'dataurl',
        '.xml': 'dataurl'
    }
}).then(d => fs.promises.rm('as3-danmaku/host/worker.js'))