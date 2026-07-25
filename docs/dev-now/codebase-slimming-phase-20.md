# 代码瘦身治理第二十阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜20`
- 续接自：`docs/dev-now/codebase-slimming-phase-19.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`Annotation 1 明确要求继续，视为 warehouseTallyTaskHistoryChain 兼容窗口结束`
- 会话 slug：`codebase-slimming-phase-20`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：复扫并删除零生产调用的 `ApiClient.warehouseTallyTaskHistoryChain` 转发及兼容测试；继续扫描现有领域客户端可承接的纯 GET。
- 固定样本：仓库页和财务录单页继续通过 `WarehouseQueryClient` 请求 `/warehouse/tally-task-history-chain?packageId=...`。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改领域客户端、页面生产调用、后端、共享契约、财务或仓库业务逻辑、页面结构或视觉。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-19.md`
- `docs/dev-now/codebase-slimming-phase-20.md`
- `.codex-state.md`

## 当前进度

- 本地和 47 生产源码复扫确认旧入口直接调用均为 0。
- 已删除旧兼容转发和对应兼容测试。
- `WarehouseQueryClient` 领域方法、路径测试和页面生产调用保持不动。

## 验证

- 已通过：`git diff --check`。
- 已通过：Web 定向测试 `warehouseQueryClient.test.ts` 和 `apiClient.test.ts`，2 个文件共 9/9。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；未修改 Prisma，未运行迁移。
- 已通过：47 旧 `ApiClient` 方法和旧生产调用均为 0，领域方法为 1、领域调用为 3；构建产物继续包含目标 GET 路径。
- 已通过：47 管理员理货历史链查询为 200 且返回数组；客户角色为 403“没有访问权限”；未登录为 401“缺少登录凭证”。
- 已通过：47 Web/API 容器正常，容器内与公网首页/API health 均为 200，Web 错误日志计数为 0。

## 下一纯 GET 扫描

- 暂未发现同时满足“有生产调用、可扩展现有领域客户端、避开财务/账号/状态流转/审计实现”的新候选。
- `warehouseDispatchShipments` 与 `warehouseHandover` 可归入 `WarehouseQueryClient`，但当前生产调用为 0，不为凑数量迁移。
- `rolePermissions`、`staffAccounts` 虽可归入 `SystemDirectoryClient`，但触及 RBAC/账号读取，本阶段继续避开。
- `customerServiceTransferShipments` 涉及状态流转领域且没有现有客户服务查询客户端；`shipmentLabels` 与现有 `CarrierTaskQueryClient` 领域边界不一致，均不强行迁移。

## 交接

- 阻塞：无。
- 剩余风险：仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-20`。
- 准确下一步：若继续坚持现有安全边界，应暂停新增客户端拆分，转向扫描已迁移领域中的其他零调用兼容入口，或等待出现两个以上同领域纯 GET 后再扩展现有客户端。
