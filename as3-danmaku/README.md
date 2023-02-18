### 构建
本项目`Worker`部分需要单独使用`build`方法提前构建，才能使用worker相关的改动生效并打包仅父项目中。

### 参考
本子模块的引擎移植自[CommentCoreLibrary](https://github.com/jabbany/CommentCoreLibrary/) （Licensed under the MIT license），不直接引用而进行移植原因如下：
1. 原项目使用`namespace`组织项目，使用es标准的`module`进行移植，以更好地与其他子模块耦合。
2. 原项目使用了`Worker`中的`importScripts`方法，这在本项目中完全不可用！

移植过程还参考了[弹幕艺术联合文档](http://biliscript-syndicate.github.io/reference.html)进行校正。

### 已知问题
1. `ReferenceError: *** is not defined`：
   - 之前时间轴有弹幕丢失，代码弹幕就是代码，先前定义的变量丢失了，后面访问自然出错。
   - 调戏了进度条，导致先前的有些弹幕未执行，导致环境变量依赖未定义。
   - 语法不规范，不知as3里如何，js里未定义的变量就是直接报错。
   - 编写错误，可能是大小写？见过`function`写成`Function`、`if`写成`If`的。
2. `SyntaxError: Invalid regular expression`：
   - 弹幕代码不幸被截断，比如发送时超过字数被截断，引发语法错误。
   - 语法不规范，比如各种括号未完全闭合。
   - **本项目处理弹幕代码出错，请反馈视频连接进行测试。**
3. `TypeError: Cannot read properties of undefined (reading '***')`：
   - 1,2 中相同原因。
   - 代码使用的特性未完全支持，环境依赖不存在。
4. 卡顿：
   - 短时间内大量效果，不知道flash里如何，js是单线程语言，短时间内大量读写必然卡顿。
   - 弹幕作者恶作剧，频繁暂停/播放。
   - 弹幕代码出现死循环！
   - 网络连接状况不好→_→
5. 弹幕效果丢失：
   - 上述问题引发的代码未完全执行。
   - 代码使用的特性未完全支持，以弹幕游戏未甚。
   - **浏览器处于后台时不会渲染弹幕。**
   - 弹幕池里已获取不到代码弹幕，悲……

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
- [【黑屏弹幕】DayXDay](https://www.bilibili.com/video/av2642876)
- [【黑屏弹幕】旅（完成）](https://www.bilibili.com/video/av2735163)：弹幕君好像误将`if`写成了`If`？
- [【弹幕PV】世界终结舞厅](https://www.bilibili.com/video/av2775802)