<div align="center">

<img width="90" src="bilibiliplayer/images/ploading.gif" alt="logo">

# bilibiliplayer
[B站](//www.bilibili.com)在2019 年 12 月 09 日弃用的经典播放器。年旧失修，残破不堪。为了便于长期维护，使用`TypeScript`进行了重构。

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
- [x] DRM
- [x] 视频看点
- [x] 反查弹幕发送者

### 使用方法
#### 一般用法
1. 将`dist`目录下生成的文件(包括css)导入页面。  
2. 添加一个id为`bofqi`的div节点作为播放器容器。
3. 通过全局的`EmbedPlayer`方法启动播放器。

#### Bilibili-Old
使用基于本项目的[Bilibili-Old](https://github.com/MotooriKashin/Bilibili-Old)扩展或用户脚本。  
开发者可将本项目`dist`目录下的生成文件复制到[Bilibili-Old](https://github.com/MotooriKashin/Bilibili-Old)项目的`chrome/player`目录下，然后执行[Bilibili-Old](https://github.com/MotooriKashin/Bilibili-Old)项目的编译命令生成对应的扩展或用户脚本即可进行测试。  
也可使用操作系统提供的符号链接功能将本项目的`dist`目录链接到[Bilibili-Old](https://github.com/MotooriKashin/Bilibili-Old)项目的`chrome/player`目录，直接将本项目编译的文件输出到[Bilibili-Old](https://github.com/MotooriKashin/Bilibili-Old)项目，免去复制步骤。  
如果使用Windows操作系统并且两个项目位于磁盘的同一级目录中，那么可以使用**管理员**命令提示符输入：
```
mklink /D dist ..\Bilibili-Old\chrome\player
```
*如果提示【当文件已存在时，无法创建该文件。】，请先删除`dist`目录后操作。*

### 特别鸣谢
- [Bilibili](//www.bilibili.com)：始乱之，终弃之。感谢曾经开发了这个播放器。
- [esbuild](//esbuild.github.io/)：人生苦短，何苦webpack！希望能支持打包css样式进js文件！

### License
[MIT](LICENSE)