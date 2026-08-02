# 代码瘦身治理第八十四阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜84`
- 续接自：`docs/dev-now/codebase-slimming-phase-83.md`
- 上下文状态：`green`
- 输入来源：持续目标要求清理 Warehouse 恒空状态过滤链及无消费者包裹过滤
- 会话 slug：`codebase-slimming-phase-84`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除 WarehousePage 中能消除真实数组扫描、恒空状态判断和 unused 噪音的单页面窄切片。
- 固定样本：管理员选择至少两个任务内原始包裹完成合并理货，或创建 `MERGE_AND_SHIP` 合票后，结果载荷与待出库队列保持不变。
- 硬边界：API路径、HTTP方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段和提交载荷不变。

## 修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `docs/dev-now/codebase-slimming-phase-84.md`
- `.codex-state.md`

## 当前进度

- `setDispatchedConsolidationIds` 在全部生产源码中零调用，使 `dispatchedConsolidationIds` 永远保持初始空数组；删除状态后把 `mode === 'MERGE_AND_SHIP' && ![].includes(id)` 等价简化为模式判断。
- 理货合并分支曾对 `sourcePackages` 执行一次过滤并赋给 `selected`，但结果没有读取者；删除该扫描，继续原样提交 `selectedIds` 和 `tallyCompleteDraft.packageCount`。
- 删除忽略 `record` 参数且恒回退“待确认代理”的包装函数，调用点直接使用原内部实现。
- 清理 `ShipmentStatus`、`WarehouseTodayResponse`、`StatusTag`、`WarehouseQueueColumnKey` 四个零引用导入/类型。
- 47候选另删除线上独有且零引用的 `warehousePackageStatusLabels` 与 `WarehousePackageStatus`；Git基线本来就不存在这段代码。
- 本地生产源码增加5行、删除14行，净减少9行；47候选增加5行、删除20行，净减少15行。Warehouse chunk减少123 bytes/gzip 21 bytes。

## 验证

- 本地 `WarehousePage.tsx` TypeScript独立转译、生产ESLint和 `git diff --check` 通过，原7个unused问题清零。
- 47候选使用本地生产ESLint、TypeScript独立转译和空白检查通过；全部目标符号清零，`createWarehouseConsolidation`、`completeWarehouseTallyTask`、`dispatchWarehouseShipment` 调用保留。
- 从47当前源码生成单文件候选，远端原文件哈希在同步前复核一致；相对备份精确为净删15行。
- 47 Web production build通过，只构建/重启Web，无API构建和数据库迁移。运行镜像与 `siyuan-web:latest` ID一致，活动 Warehouse chunk 目标符号为0。
- Web/API/Postgres/Redis均为running，容器内首页与API health、公网首页与API health均为200，Web最近实际ERROR/FATAL/Unhandled日志为0。
- 漂移保持 `55 changed + 45 remote-only`，远端遗留物数量和字节数均为0。备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-84/`。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；Web新镜像已运行，无迁移。
- 准确下一步：停止继续做个位数 unused 零碎清理，重新运行全量生产 ESLint 并按“可消除请求、整页渲染、全量数组扫描或至少30行生产代码”排序下一批高密度候选。
