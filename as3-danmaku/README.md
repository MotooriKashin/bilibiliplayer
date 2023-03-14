代码弹幕（mode8）兼容模块，分为两个部分，Web Worker提供沙箱环境进行弹幕解码，然后通过消息传递给代理主机进行DOM操作。

### 参考
本子模块的引擎移植自[CommentCoreLibrary](https://github.com/jabbany/CommentCoreLibrary/) （Licensed under the MIT license），不直接引用而进行移植原因如下：
1. 原项目使用`namespace`组织项目，使用es标准的`module`进行移植，以更好地与其他子模块耦合。
2. 原项目使用了`Worker`中的`importScripts`方法，这在本项目中完全不可用！

移植过程还参考了[弹幕艺术联合文档](http://biliscript-syndicate.github.io/reference.html)进行校正。

`VirtualMachine`沙箱移植自[旧版flash播放器](https://static.hdslb.com/play.swf)，感谢[JPEXS Free Flash Decompiler](https://github.com/jindrapetrik/jpexs-decompiler)提供技术支持！

### 已知问题
1. 卡顿：
   - 短时间内大量效果，沙箱之间通信开销巨大。
   - 弹幕作者恶作剧，频繁暂停/播放。
   - 弹幕代码出现死循环！
   - 网络连接状况不好→_→
2. 弹幕效果丢失：
   - 弹幕代码文本已不完整。
   - 代码使用的特性未完全支持，以弹幕游戏为甚。
   - **浏览器处于后台时不会渲染弹幕。**
   - 弹幕池里已获取不到代码弹幕，悲……
3. 弹幕样式错乱
   - 弹幕用到的一些功能仍在想办法支持中。。。

### 测试用例
- [【黑屏字幕】花火空](https://www.bilibili.com/video/av71938)
- [【弹幕PV】里表一体](https://www.bilibili.com/video/av201763)
- [哔哩哔哩2012拜年祭](https://www.bilibili.com/video/av203614)
- [【BILIBILI合作】2012夜神月圣诞祭](https://www.bilibili.com/video/av222938)
- [[例大祭⑨応援]lonely dreaming girl[敏敏翻唱]](https://www.bilibili.com/video/av280613)
- [[高级弹幕]Rolling Girl](https://www.bilibili.com/video/av379138)
- [弹幕字符画BadApple](https://www.bilibili.com/video/av383598)
- [【弹幕】Crazy ∞ nighT](https://www.bilibili.com/video/av392859)
- [【黑屏弹幕】TSUBASA（海猫鸣泣之时）](https://www.bilibili.com/video/av393948?p=2)
- [【黑屏弹幕】我们的报复政策](https://www.bilibili.com/video/av397395)
- [[弹幕大赛]Q&A リサイタル! ~TV ver~](https://www.bilibili.com/video/av399127)
- [Psy Phone short ver](https://www.bilibili.com/video/av402034)
- [【黑屏弹幕】魔法少女小圆OP-完整版](https://www.bilibili.com/video/av409835)：结尾处同时注册了3万以上的计时器，性能开销巨大！
- [【弹幕】乾杯 - ( ゜- ゜)つロ](https://www.bilibili.com/video/av411358)
- [【东方】『Lunatic Heavens』星夜万華鏡PV 完整曲](https://www.bilibili.com/video/av464038)
- [【佐藤莎莎拉】不断被替换的渺小存在](https://www.bilibili.com/video/av606355)
- [【CLANNAD】谢谢 一直以来都最喜欢你~](https://www.bilibili.com/video/av856822)
- [「无可救药」神明治疗 (洛天依)](https://www.bilibili.com/video/av945882)
- [【黑屏弹幕】人造ENE](https://www.bilibili.com/video/av980264)
- [【黑屏弹幕】旅（完成）](https://www.bilibili.com/video/av2735163)
- [【弹幕PV】世界终结舞厅](https://www.bilibili.com/video/av2775802)