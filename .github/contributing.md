### 开发环境
- [Visual Studio Code](https://code.visualstudio.com/).
- [Node.js](https://nodejs.org/).
- [Google Chrome](https://www.google.com/chrome/).

### 开发流程
1. `git clone`项目到本地
2. `npm update`更新依赖
3. `npm run tsc`进行语义检查
4. `npm run build`打包生成到dist目录

### 源码说明
源码主要来自基于[`video.min.js`](//static.hdslb.com/js/video.min.js)、[`bilibiliPlayer.min.js`](//static.hdslb.com/player/js/bilibiliPlayer.min.js)等原文件的重构，项目结构参考了[`jsc-player(2.x)`](//s1.hdslb.com/bfs/static/player/main/video.js)和[`bpx-player(3.x)`](https://s1.hdslb.com/bfs/static/player/main/core.js)系列。  
不同功能组件拆分进不同目录并初始化为本地包，包名统一使用`@jsc`的名义。  
项目主体使用typescript作为开发语言，而诸如`dash-player`等组件，因为B站自己也是单独打包好才引入播放器中，与播放器其他组件高度解耦，所以是直接移植的2.x/3.x的js代码，尝试性地添加了声明文件以方便使用，这样也方便以后实时跟进更新。*从webpack打包的文件中提取相应的代码需要一点技巧*  
