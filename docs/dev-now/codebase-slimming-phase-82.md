# 代码瘦身治理第八十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜82`
- 续接自：`docs/dev-now/codebase-slimming-phase-81.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续清理只写不读状态和无消费者计算，单阶段限制一个业务页面
- 会话 slug：`codebase-slimming-phase-82`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除市场管理页面退出界面后的旧“全部/待排货/待出库”阶段筛选兼容链，以及它驱动的无效全量统计和全量过滤。
- 固定样本：管理员进入市场管理后仍看到市场看板、待排货、已排货和周期排货数据；传给页面的运单集合与删除前默认“全部”结果逐项相同。
- 硬边界：API、RBAC、数据范围、字段裁剪、金额、数据库、写入、状态流转、审计、页面入口、按钮、筛选和表格字段不变。

## 修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/routing/RoutingPage.tsx`
- `apps/web/src/modules/appShell/config.tsx`
- `docs/dev-now/codebase-slimming-phase-82.md`
- `.codex-state.md`

## 当前进度

- 全量生产 ESLint 证实 `RoutingPage` 的 `stageSummary/baseColumns/auditStatusColumn/selectedStage/onSelectStage` 五个 props 全部未读取；旧阶段常量、计数 helper 和相关图标/标签导入也无消费者。
- App 中 `selectedRoutingStage` 初始值恒为 `all`，唯一 setter 只通过未读取的 `onSelectStage` prop 传递，因此生产状态没有任何改变入口。
- 删除前 `routingFulfillmentShipments` 对 `businessShipments` 执行筛选，但 `selectedRoutingStage === 'all'` 使每一行恒定通过；现改为直接传递同一个 `businessShipments` 数组，元素、顺序和数据范围不变。
- 同时删除只传给死 prop 的 `summarizeFulfillmentStages(localShipments, 'ALL')`。该调用原本在每次 App 渲染时全量扫描运单；恒真筛选则在运单集合变化时再次全量扫描并复制数组。
- 删除 RoutingPage 与 appShell/config 两套重复且无消费者的阶段定义和计数 helper。三个本地生产文件增加5行、删除64行，净减少59行；47保留线上独有路由、费用和矩阵表格能力后的候选增加5行、删除57行，净减少52行和2,651 bytes。
- 47运行主 index 从896,056 bytes / gzip 256,198 bytes降至894,823 / gzip 255,805 bytes，减少1,233 bytes / gzip 393 bytes。

## 验证

- 三个本地目标文件 TypeScript 独立转译、目标 ESLint（关闭文件既有 `no-undef` 环境误报）和 `git diff --check` 通过；全部目标符号与死 prop 搜索为0。
- Web全量typecheck仍只被既有财务响应夹具和仓库理货测试夹具6个错误阻断，三个目标文件没有错误。
- 市场看板单用例经安全runner运行30秒仍无结果，已按规则停止，不记为通过且无残留进程。
- 已从47当前源码生成独立候选，而非覆盖为本地版本；因此保留线上独有 `initialSection`、费用目录、周期筛选、历史矩阵等现行能力。候选转译通过，相对远端备份精确为净删52行。
- 新 Web production镜像已生成并成为运行容器镜像；运行镜像与 `siyuan-web:latest` ID一致，活动静态产物中六个目标符号文件数为0。构建SSH输出通道在镜像已创建并运行后没有自行关闭，人工关闭该空闲通道；镜像ID、启动时间和活动产物提供了独立完成证据。
- Web/API/Postgres/Redis均为running，公网首页和 `/api/health` 均为200，最近实际 ERROR/FATAL/Unhandled 日志为0；无API构建、无迁移。
- 漂移保持 `55 changed + 45 remote-only`，远端遗留物数量和字节数均为0。备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-82/`。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；Web新镜像已运行，无迁移。
- 准确下一步：继续选择一个页面清理生产 unused 集群。优先比较 Pricing 的死派生链与 Warehouse 的死状态，只有能消除真实 Form 订阅、数组派生或请求时才实施；纯单个图标导入留到同页面高密度批次一起处理。
