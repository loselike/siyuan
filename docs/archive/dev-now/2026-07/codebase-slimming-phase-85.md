# 代码瘦身治理第八十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜85`
- 续接自：`docs/dev-now/codebase-slimming-phase-84.md`
- 上下文状态：`green`
- 输入来源：持续目标要求按真实运行成本排序清理高密度退场链
- 会话 slug：`codebase-slimming-phase-85`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除 App 与 OperationsPage 之间已经没有消费者、但仍造成整组数组遍历、列映射和不可达弹窗构造的旧兼容链。
- 固定样本：管理员进入运营工作台的现行专线运单池，原 `lineShipmentPool` 查询、状态按钮、关键字搜索、表格字段和自有列设置保持；订单与渠道排货继续读取既有本地列偏好。
- 硬边界：API路径、HTTP方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段和提交载荷不变。

## 修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/operations/OperationsPage.tsx`
- `apps/web/src/modules/appShell/config.tsx`
- `docs/dev-now/codebase-slimming-phase-85.md`
- `.codex-state.md`

## 当前进度

- 删除 `OperationsPage` 未解构或未读取的10个旧兼容 props，以及只解构但未使用的 `onOpenColumnSettings`。
- 删除 App 只为这些死 props 执行的 `visibleShipments` 全量过滤、`summarizeStatusCounts` 全量汇总和 `workspaceColumns` 映射。
- 删除没有任何生产开启入口的旧全局“运单列设置”弹窗，以及其 open state、移动/重置/显隐函数和零引用 options。
- 保留当前 Operations 自有的 `linePoolColumnSettings`、`ManagedTable`、`lineShipmentPool` API 和页面内状态筛选/搜索。
- 保留 `shipmentColumnOrderMode`、`customShipmentColumnOrder`、`hiddenShipmentColumns` 的读取和持久化列偏好链，以及由此生成的 `fulfillmentColumns`；只删除已经没有写入口的 setter。
- 三个生产文件增加4行、删除164行，净减少160行；相对47当前源码的候选保持相同净减量。
- App 每次相关渲染不再对全部 `localShipments` 做一次过滤和一次状态汇总，也不再构造不可达弹窗的列映射、列表 JSX 和操作闭包。

## 验证

- 本地三个目标文件的 TypeScript 独立转译、生产 ESLint 和 `git diff --check` 通过。
- 目标死标记在本地与47候选中均为0；`linePoolColumnSettings`、`lineShipmentPool`、`fulfillmentColumns` 和三组列偏好读取指纹保留。
- 专线运单池整页固定样本通过安全 runner 启动，30秒没有有效结果后按项目规则停止，退出130，不记为测试通过且未重试。
- 从47当前源码生成三文件候选；同步前原哈希再次一致，候选转译、ESLint、空白检查和死/现行标记检查通过。
- 47仅构建/重启Web，无API构建和数据库迁移；production build通过，运行镜像与 latest 镜像ID一致。
- 活动主资产由895,332 bytes/gzip 255,829降至892,422/gzip 254,951，减少2,910 bytes/gzip 878 bytes。
- Web/API/Postgres/Redis均为running，容器内首页与API health、公网首页与API health均为200，Web最近实际ERROR/FATAL/Unhandled日志为0。
- 漂移保持 `55 changed + 45 remote-only`，远端遗留物数量和字节数均为0。备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-85/`。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；Web新镜像已运行，无迁移。
- 未验证项：Operations 整页测试未能在30秒门限内产生结果；当前效果证据来自引用闭环、目标转译/ESLint、47生产构建、活动产物指纹和健康检查。
- 准确下一步：复扫 CustomerService 的 `actionColumns` 及其依赖，只在能一次删除至少30行生产代码或消除真实请求/数组扫描时实施；否则转向 Repository 查询扇出、重复映射或 App/API 高频路径，避免回到微型 unused 清理。
