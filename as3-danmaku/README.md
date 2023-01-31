### 构建
本项目`Worker`部分需要单独使用`build`方法提前构建，才能使用worker相关的改动生效并打包仅父项目中。

### 参考
本子模块的引擎移植自[CommentCoreLibrary](https://github.com/jabbany/CommentCoreLibrary/) （Licensed under the MIT license），不直接引用而进行移植原因如下：
1. 原项目使用`namespace`组织项目，使用es标准的`module`进行移植，以更好地与其他子模块耦合。
2. 原项目使用了`Worker`中的`importScripts`方法，这在本项目中完全不可用！