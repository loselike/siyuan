# 代码瘦身治理第十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜12`
- 续接自：`docs/dev-now/codebase-slimming-phase-11.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确确认下一阶段方向）`
- 会话 slug：`codebase-slimming-phase-12`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：不新增微型客户端，扩展现有 `WarehouseQueryClient`，承接包裹分组、合并单明细、理货任务列表和理货结果包裹四个纯 GET 查询。
- 固定样本：仓库理货任务刷新和理货完成后读取结果包裹继续生成完全相同的路径、参数并原样返回响应。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不迁移理货任务创建、修改、完成、标签生成/打印/下载或合并单写入；不触碰财务页面使用的理货历史链；不改后端、共享契约、页面结构和视觉；兼容窗口内保留旧 `ApiClient` 方法转发。

## 兼容零调用清单

| 领域 | 旧兼容方法 | 本地生产直接调用 | 47 生产直接调用 |
| --- | --- | ---: | ---: |
| Price Book Query | `priceBooks`、`priceBookRows`、`pricingSyncHealth`、`priceBookRuleRefreshProgress`、`priceBookImportJob` | 0 | 0 |
| Markup Query | `agentMarkupRules`、`previewAgentMarkupRule`、`exportAgentMarkupRules` | 0 | 0 |

## 扫描结论

- 本阶段选择：`warehousePackageGroups`、`warehouseConsolidationItems`、`warehouseTallyTasks`、`warehouseTallyTaskOutputPackages`。
- 四个入口均为 GET，继续使用原后端权限与 Repository 数据范围；只移动前端请求封装。
- 生产调用集中在 `WarehousePage.tsx` 的理货任务与结果包裹；包裹分组和合并单明细当前没有生产直接调用，但属于现有 Warehouse 查询边界。
- `warehouseTallyTaskHistoryChain` 同时被财务录单页面使用，本阶段按边界保留在旧客户端。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/api/warehouseQueryClient.test.ts`
- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `docs/dev-now/codebase-slimming-phase-11.md`
- `docs/dev-now/codebase-slimming-phase-12.md`

## 当前进度

- 已完成现有领域客户端扩展扫描并收敛到四个仓库纯 GET 查询。
- 已扩展现有 `WarehouseQueryClient`，承接包裹分组、合并单明细、理货任务列表和理货结果包裹四个 GET 查询，没有新增客户端。
- `WarehousePage.tsx` 的理货任务与结果包裹生产调用已迁移；四个旧 `ApiClient` 方法保留原签名兼容转发，生产直接调用复扫为 0。
- 本地 `apiClient.ts` 从 1840 行降至 1833 行，减少 7 行；47 当前版本从 2057 行降至 2050 行。
- 理货历史链、重复理货统计和所有仓库写方法均保持不动；本轮未修改后端、共享契约、权限、数据范围、状态流转、审计、页面结构或业务交互。

## 验证

- 已通过：扩展后的 `WarehouseQueryClient` 路径、查询参数、空查询、返回值测试与旧方法兼容转发测试，2 个文件共 11/11。
- 已通过：领域客户端及其测试 ESLint；`git diff --check`。
- 已通过：完整 Web typecheck 未出现本阶段错误，仍只受既有 `ReceivableAudit.filterOptions` 和仓库测试桩 `tallyStatus` 类型错误阻塞。
- 已通过：本地与 47 生产源码四个旧方法生产直接调用均为 0；47 三个运行时文件 checksum 与远端当前文件基线候选一致。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物包含四个新增查询方法标记，启动后错误日志计数为 0。
- 已通过：47 管理员包裹分组、已完成理货任务和真实任务结果包裹查询均为 200 且返回数组；未登录理货任务查询仍为 401“缺少登录凭证”。
- 已通过：47 Web 容器、容器内 API health、公网 8899 首页和 API health。

## 交接

- 阻塞：无。
- 剩余风险：价格表五个、加价规则三个和本阶段仓库四个旧方法仍处于兼容窗口；仓库外未纳管消费者无法由本仓与 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-12`。
- 准确下一步：下一轮复扫这 12 个兼容入口；继续优先扩展现有领域客户端。兼容窗口结束后统一删除 12 个转发和三组兼容测试。
