<div align="center">

<img width="90" src="bilibiliplayer/images/ploading.gif" alt="logo">

# bilibiliplayer
[B站](//www.bilibili.com)在2019 年 12 月 09 日弃用的经典播放器。年旧失修，残破不堪。为了便于长期维护，使用`TypeScript`进行重构。

</div>

### 重构说明  
基于[`video.min.js`](//static.hdslb.com/js/video.min.js)、[`bilibiliPlayer.min.js`](//static.hdslb.com/player/js/bilibiliPlayer.min.js)等原文件，参考[`jsc-player(2.x)`](//s1.hdslb.com/bfs/static/player/main/video.js)和[`bpx-player(3.x)`](https://s1.hdslb.com/bfs/static/player/main/core.js)系列，擅自揣测了各被混淆的类、方法、属性名……改写为了ts代码并补充了类型声明，还移植了一些新功能。

### TODO
- [x] protobuf弹幕
- [x] 实时弹幕
- [x] 杜比视界
- [x] 杜比全景声
- [x] HiRes
- [x] AV1
- [x] 互动视频
- [x] 全景视频
- [x] 普权弹幕换行
- [x] 高能进度条
- [x] 智能防挡弹幕
- [x] 互动弹幕
- [x] 弹幕等级屏蔽
- [x] 硬核会员模式
- [x] 视频音效调节
- [x] 视频色彩调整
- [x] CC字幕
- [ ] DRM
- [ ] 视频看点
- [ ] 将css打包进js

### 使用方法
1. 将dist目录下生成的文件(包括css)导入页面。  
2. 添加一个id为`bofqi`的div节点作为播放器容器。
3. 通过全局的`EmbedPlayer`方法启动播放器。

### 特别鸣谢
- [Bilibili](//www.bilibili.com)：感谢曾经开发了这个播放器，虽然后来狠心抛弃了，但至少还保留着[`video.min.js`](//static.hdslb.com/js/video.min.js)、[`bilibiliPlayer.min.js`](//static.hdslb.com/player/js/bilibiliPlayer.min.js)等静态文件。
- [esbuild](//esbuild.github.io/)：人生苦短，何苦webpack！要是能支持打包css样式进js文件就更完美了！
- [Tampermonkey](//www.tampermonkey.net)：感谢用户脚本的存在让找回曾经的感动不再是奢望！

### License
[MIT](LICENSE)