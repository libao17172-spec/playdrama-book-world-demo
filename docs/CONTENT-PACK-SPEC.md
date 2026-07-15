# 书境内容包规范 v1.0

书境把运行能力和内容分成两层。`src/core` 与 `src/components` 负责移动、镜头、碰撞、触发、旁白、图谱、地点指引和本地进度。`src/content` 只描述一本书或一个故事的世界。增加已经整理好的新内容时，只新增内容包文件并在 `src/content/index.js` 注册，不需要修改3D引擎。

## 顶层结构

| 字段 | 类型 | 作用 |
| --- | --- | --- |
| id | 字符串 | 内容包唯一标识，同时作为本地进度隔离键 |
| contentType | knowledge、story、script | 内容类型 |
| graphMode | knowledge、character | 关系图展示方式 |
| title、worldName、subtitle、summary | 字符串 | 入口和世界界面文案 |
| theme | 对象 | 天空、雾、地面、正文、纸张和强调色 |
| spawn | 三维坐标 | 玩家出生位置 |
| zones | 数组 | 主题区域或剧情区域 |
| entities | 数组 | 知识、人物、地点、事件和物品 |
| relations | 数组 | 实体之间的通用关系 |
| world | 对象 | 世界风格、边界和大型碰撞物 |

## 区域结构

每个区域包含 `id`、`name`、`center`、`radius`、`color`、`accent`、`landmark`、`narration` 和 `audio`。进入区域只触发区域介绍，不会自动发现区域内全部实体。

## 实体结构

每个实体包含 `id`、`type`、`title`、`zoneId`、`position`、`propType`、`summary`、`detail`、`source`、`narration`、`audio`、`discover` 和 `interaction`。实体类型支持 knowledge、character、location、event 和 item。`interaction.enabled` 决定节点能否打开深入详情。

## 关系结构

每条关系包含 `from`、`to` 和 `type`。关系类型支持 supports、influences、contrasts、extends、knows、conflicts、belongs_to、happens_at、owns 和 causes。

## 新内容接入步骤

内容团队先整理世界信息、区域、实体、出处和关系，再为实体选择引擎已支持的 `propType`。开发者新增一个内容包文件并注册，运行 `npm test` 完成格式校验，随后在浏览器中验证出生点、道路、碰撞与节点位置。如果新内容需要现有模板没有的特殊道具，只新增一个通用 `propType` 表现组件，不在业务流程中写书名判断。

## 当前限制

v1.0 需要人工整理内容和坐标，尚未提供原始文件上传、自动抽取、自动布局、内容审核后台、事件时间线、分支剧情和运行时问答。下一阶段可以让上传流水线输出同一份内容包结构，现有运行引擎保持不变。
