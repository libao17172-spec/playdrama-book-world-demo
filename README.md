# 书境：可插接内容的3D互动世界引擎

这个目录可以独立运行，不会影响上一级目录中使用4173端口的影视改写Demo。当前包含《纳瓦尔宝典》完整演示内容包和《雾灯镇来信》最小故事内容包，两者共用同一套第三人称3D引擎。

## 本地启动

首次运行需要安装依赖，后续直接启动即可。

```bash
cd "/Users/startrail/Documents/Lee/0我的工作台/星际互动/PlayDrama/apps/book-world-demo"
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:4174/`。正式演示前可以使用 `npm run build && npm run preview` 运行构建版本。核心资源都在本目录内，页面加载完成后断网仍可行走、互动、查看关系图和读取本地进度。

## 操作

W、A、S、D和方向键控制角色移动。拖动鼠标调整镜头，滚轮调整远近。靠近发光节点后按E或点击提示打开详情。G打开关系图，R回到最近安全位置，Esc关闭详情、图谱或帮助。

## 目录结构

| 目录 | 作用 |
| --- | --- |
| `src/core` | 内容校验、进度、旁白、区域规则和地点指引 |
| `src/components` | 入口、3D世界、第三人称玩家、详情和关系图 |
| `src/content` | 可插接内容包，目前有知识与故事两种 |
| `src/core/narration-controller.js` | 语音提供方预留层，当前使用文字，后续接豆包 |
| `public/licenses` | 依赖与音频许可副本 |
| `tests` | 通用规则自动测试 |
| `e2e` | Chrome真实浏览器验收 |
| `acceptance/screenshots` | 验收截图 |

内容包字段和接入方法见 [CONTENT-PACK-SPEC.md](docs/CONTENT-PACK-SPEC.md)，资产授权见 [ASSET-LICENSES.md](docs/ASSET-LICENSES.md)。

## 验证命令

```bash
npm test
npm run build
npm run test:e2e
```

上一级影视Demo回归测试需要在项目根目录运行 `npm test`。
