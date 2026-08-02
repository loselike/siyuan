# 代码瘦身治理第六阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜06`
- 续接自：`docs/dev-now/codebase-slimming-phase-5.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续下一个高频只读查询切片）`
- 会话 slug：`codebase-slimming-phase-6`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把仓库包裹基础列表、今日收货和在库列表三个高频 GET 查询迁入独立前端客户端，旧 `ApiClient` 方法保留兼容转发，并迁移仓库页面现有调用方。
- 固定样本：仓库页面按原筛选读取今日收货和在库列表；查询路径、参数序列化、返回字段、错误处理和页面回退逻辑保持不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不改后端、共享契约、财务、账号、仓库写接口、状态流转、页面结构或视觉；本提交只做仓库只读查询客户端重构。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/api/warehouseQueryClient.test.ts`
- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `docs/dev-now/codebase-slimming-phase-5.md`
- `docs/dev-now/codebase-slimming-phase-6.md`

## 当前进度

- 已确认三个方法均为 GET 查询，现有生产调用全部位于仓库页面，共 5 处。
- 已确认本阶段不触碰仓库新增、更新、理货、出库、打印等写接口。
- 已新增 `WarehouseQueryClient`，承接仓库包裹基础列表、今日收货和在库列表三个 GET 查询。
- 仓库页面 5 处生产调用已全部迁入领域客户端；旧 `ApiClient` 方法继续按原签名兼容转发。
- 分支 `apiClient.ts` 从 1945 行降至 1935 行；47 当前版本从 2161 行降至 2151 行。
- 本轮未修改 API、后端、共享契约、数据库、权限、数据范围、字段裁剪、审计实现、页面结构、筛选、字段、交互或任何写接口。

## 验证

- 已通过：三个只读路径、今日收货和在库筛选参数序列化、空参数路径、返回值和错误原文透传、旧方法兼容转发测试，2 个文件共 9/9。
- 已通过：`git diff --check`、治理检查和新增领域文件 lint。
- 未通过：本地全量 Web typecheck 仍只有既有应收 `filterOptions` 和仓库测试桩 `tallyStatus` 类型错误，本轮文件无新增错误。
- 已通过：47 当前完整源码 Docker Web production build；仅有既有 AntD vendor 大 chunk 警告。
- 已通过：47 三个运行时文件 checksum 与发布候选一致，容器静态产物包含 `warehouseQuery` 标记。
- 已通过：47 Web/API/Postgres/Redis 容器状态、容器内首页和 API health、公网 8899 首页与 API health；本次 Web 启动后的实际错误日志为 0。
- 已通过：47 管理员三个仓库查询均为 200；基础包裹返回数组，今日收货和在库返回字段仍为 `rows/totals`，汇总字段未变。
- 已通过：47 客户角色访问在库查询仍为 403 且错误文案“没有访问权限”；未登录仍为 401 且错误文案“缺少登录凭证”。

## 交接

- 阻塞：无。
- 剩余风险：兼容方法仍保留在巨型 `ApiClient`；总源码行数因领域边界和兼容层暂时增加，本轮没有性能收益，也未改变业务表现。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-6`。
- 准确下一步：扫描仓库模块剩余只读查询，选择一个不涉及财务、账号、状态流转或审计实现的窄切片；继续保留兼容转发，兼容窗口结束后再集中删除旧入口。
- 已交接至：`docs/dev-now/codebase-slimming-phase-7.md`
