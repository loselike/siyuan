# 代码瘦身治理第七阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜07`
- 续接自：`docs/dev-now/codebase-slimming-phase-6.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求扫描仓库剩余只读查询并继续选择窄切片）`
- 会话 slug：`codebase-slimming-phase-7`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：扫描仓库剩余只读查询，并把手工收货客户候选项 GET 查询迁入既有 `WarehouseQueryClient`。
- 固定样本：仓库手工收货抽屉打开时，继续按原权限读取启用客户的 `code/name` 候选项；路径、返回值和错误处理不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不改后端、共享契约、财务、账号、理货/出库/合票状态流转、审计实现、页面结构或视觉；本提交只做一个客户候选项只读查询重构。

## 扫描结论

- 本阶段选择：`GET /warehouse/manual-receipt/customers`。仅返回启用客户的 `code/name`，无查询参数、无生产写入、Repository 不写审计日志，生产调用仅位于手工收货抽屉。
- 暂缓：理货任务、历史链和结果包裹查询，与理货状态链紧邻，且历史链存在财务页面调用。
- 暂缓：待出库运单和交接单查询，与运单状态/出库流程紧邻。
- 暂缓：包裹组和合票明细当前无生产调用，不在兼容期内为了拆分而扩大抽象。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/api/warehouseQueryClient.test.ts`
- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `docs/dev-now/codebase-slimming-phase-6.md`
- `docs/dev-now/codebase-slimming-phase-7.md`

## 当前进度

- 已完成只读查询与真实调用方扫描，范围已收敛到一个无参数 GET 查询和一个页面调用方。
- 已把手工收货客户候选查询迁入既有 `WarehouseQueryClient`。
- 仓库手工收货抽屉的生产调用已迁入领域客户端；旧 `ApiClient` 方法继续按原签名兼容转发。
- 本轮未修改 API、后端、共享契约、数据库、权限、数据范围、字段裁剪、审计实现、页面结构、交互或任何写接口。
- 本阶段没有减少 `apiClient.ts` 行数，效果是补齐仓库只读查询的领域归属；兼容入口待统一窗口删除。

## 验证

- 已通过：客户候选查询路径、返回值透传和旧方法兼容转发测试，连同既有仓库查询测试共 10/10。
- 已通过：`git diff --check` 和仓库查询客户端 lint。
- 已通过：47 当前完整源码 Docker Web production build；仅有既有 AntD vendor 大 chunk 警告。
- 已通过：47 三个运行时文件 checksum 与发布候选一致，容器静态产物包含 `warehouseManualReceiptCustomers` 标记。
- 已通过：47 Web/API/Postgres/Redis 容器状态、容器内首页和 API health、公网 8899 首页与 API health；本次 Web 启动后的实际错误日志为 0。
- 已通过：47 管理员客户候选查询为 200，响应仍为数组且字段仅为 `code/name`；客户角色仍为 403“没有访问权限”，未登录仍为 401“缺少登录凭证”。

## 交接

- 阻塞：无。
- 剩余风险：47 没有启用的 WAREHOUSE 探针账号，允许路径使用 ADMIN 验证；兼容方法仍保留在巨型 `ApiClient`。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-7`。
- 准确下一步：停止继续拆与状态链紧邻的仓库查询，转而扫描另一个纯只读领域；兼容窗口结束前先建立旧入口生产调用清单，再集中删除零调用转发。
- 已交接至：`docs/dev-now/codebase-slimming-phase-8.md`
