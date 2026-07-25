# 代码瘦身治理第五阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜05`
- 续接自：`docs/dev-now/codebase-slimming-phase-4.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求优先拆只读审计查询客户端）`
- 会话 slug：`codebase-slimming-phase-5`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把登录日志、账号事件和系统审计日志三个只读查询迁入独立前端客户端，旧 `ApiClient` 方法保留兼容转发，并迁移现有审计日志调用方。
- 固定样本：系统管理审计页按分页和筛选条件读取审计日志；查询路径、参数序列化、返回字段和错误文案保持不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不改后端、共享契约、财务、账号写接口、状态流转、页面结构或视觉；本提交只做只读客户端重构。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/auditQueryClient.ts`
- `apps/web/src/api/auditQueryClient.test.ts`
- `apps/web/src/modules/settings/SettingsPage.tsx`
- `apps/web/src/modules/masterData/MasterDataPage.tsx`
- `apps/web/src/modules/customerService/CustomerServicePage.tsx`
- `docs/dev-now/codebase-slimming-phase-4.md`
- `docs/dev-now/codebase-slimming-phase-5.md`

## 当前进度

- 已确认 `auditLogs` 由系统管理、基础资料和客服三个模块只读调用；`loginLogs/accountEvents` 当前无生产调用，但属于同一只读审计查询边界。
- 已新增 `AuditQueryClient`，承接登录日志、账号事件和系统审计日志三个 GET 查询。
- 系统管理 2 处、基础资料 1 处、客服 12 处审计日志调用已全部迁入领域客户端；旧 `ApiClient` 方法继续按原签名兼容转发。
- 分支 `apiClient.ts` 从 1956 行降至 1945 行；47 当前版本从 2172 行降至 2161 行。
- 本轮未修改 API、后端、共享契约、数据库、权限、页面结构、筛选、字段、交互或任何写接口。

## 验证

- 已通过：三个只读路径、审计筛选参数序列化、返回值和错误原文透传、旧方法兼容转发测试，2 个文件共 7/7。
- 已通过：`git diff --check`、治理检查和新增领域文件 lint。
- 未通过：本地全量 Web typecheck 仍只有既有应收 `filterOptions` 和仓库理货测试桩类型错误，本轮文件无新增错误。
- 已通过：47 当前完整源码 Docker Web production build。
- 已通过：47 五个运行时文件 checksum 与发布候选一致，静态产物包含 `auditQuery` 标记。
- 已通过：47 Web/API/Postgres/Redis 容器状态、容器内首页、审计页面路由、API health、公网 8899 首页与 API health；最近实际错误日志为 0。
- 已通过：47 管理员登录日志、账号事件、系统审计日志均为 200；系统审计返回字段仍为 `dashboard/pagination/rows/suspiciousDeleteWarnings`。
- 已通过：47 客户角色登录日志和账号事件仍为 200，系统审计仍为 403 且错误文案“没有访问权限”；三个接口未登录均为 401。

## 交接

- 阻塞：无。
- 剩余风险：兼容方法仍保留在巨型 `ApiClient`；本轮没有性能收益，也未改变业务表现。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-5`。
- 准确下一步：继续扫描下一个只读高频查询切片，优先避开财务、账号写入、状态流转和审计写入；兼容窗口结束后集中删除无生产调用的旧转发。
- 已交接至：`docs/dev-now/codebase-slimming-phase-6.md`
