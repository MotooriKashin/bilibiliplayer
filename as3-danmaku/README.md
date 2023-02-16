### 构建
本项目`Worker`部分需要单独使用`build`方法提前构建，才能使用worker相关的改动生效并打包仅父项目中。

### 参考
本子模块的引擎移植自[CommentCoreLibrary](https://github.com/jabbany/CommentCoreLibrary/) （Licensed under the MIT license），不直接引用而进行移植原因如下：
1. 原项目使用`namespace`组织项目，使用es标准的`module`进行移植，以更好地与其他子模块耦合。
2. 原项目使用了`Worker`中的`importScripts`方法，这在本项目中完全不可用！

移植过程还参考了[弹幕艺术联合文档](http://biliscript-syndicate.github.io/reference.html)进行校正。

### 测试用例
- [【弹幕PV】里表一体](https://www.bilibili.com/video/av201763)
- [哔哩哔哩2012拜年祭](https://www.bilibili.com/video/av203614)
- [【BILIBILI合作】2012夜神月圣诞祭](https://www.bilibili.com/video/av222938)
- [[高级弹幕]Rolling Girl](https://www.bilibili.com/video/av379138)
- [弹幕字符画BadApple](https://www.bilibili.com/video/av383598)
- [【弹幕】Crazy ∞ nighT](https://www.bilibili.com/video/av392859)
- [【黑屏弹幕】我们的报复政策](https://www.bilibili.com/video/av397395)
- [[弹幕大赛]Q&A リサイタル! ~TV ver~](https://www.bilibili.com/video/av399127)
- [【黑屏弹幕】魔法少女小圆OP-完整版](https://www.bilibili.com/video/av409835)
   - 结尾处同时注册了3万以上的计时器，性能开销巨大！
- [【弹幕】乾杯 - ( ゜- ゜)つロ](https://www.bilibili.com/video/av411358)
- [「无可救药」神明治疗 (洛天依)](https://www.bilibili.com/video/av945882)
- [【黑屏弹幕】旅（完成）](https://www.bilibili.com/video/av2735163)
   - 弹幕君好像误将`if`写成了`If`？
- [【弹幕PV】世界终结舞厅](https://www.bilibili.com/video/av2775802)