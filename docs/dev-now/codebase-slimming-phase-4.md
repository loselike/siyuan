# 代码瘦身治理第四阶段

- 状态：`complete`
- 会话标题：`Sunny｜代码瘦身治理｜04`
- 续接自：`docs/dev-now/codebase-slimming-phase-3.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续）`
- 会话 slug：`codebase-slimming-phase-4`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-24 Asia/Shanghai`

## 输入摘要

- 目标：把高频应用壳导航角标、已读标记和页面渲染错误上报迁入独立前端客户端，旧 `ApiClient` 方法保留兼容转发，并迁移 App 调用方。
- 固定样本：员工进入应用后读取导航角标并标记当前二级入口已读；请求路径、HTTP 方法、载荷和返回值保持不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不改后端、共享契约、业务逻辑、视觉样式或其他领域调用方；本提交只做重构。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/appShellClient.ts`
- `apps/web/src/api/appShellClient.test.ts`
- `apps/web/src/App.tsx`
- `docs/dev-now/codebase-slimming-phase-3.md`
- `docs/dev-now/codebase-slimming-phase-4.md`

## 当前进度

- 已确认应用壳 3 个方法仅由 `App.tsx` 使用，适合作为单一领域切片。
- 已新增 `AppShellClient`，承接导航角标读取、已读标记和页面渲染错误上报。
- `App.tsx` 的类型引用与 3 处生产调用已迁入领域客户端；旧 `ApiClient` 方法继续按原签名兼容转发。
- 分支 `apiClient.ts` 从 1958 行降至 1956 行；47 当前版本从 2174 行降至 2172 行。
- 本轮未修改 API、后端、共享契约、数据库、权限、页面结构、交互或业务字段。

## 验证

- 已通过：应用壳请求契约、错误原文透传和旧方法兼容转发测试，2 个文件共 6/6。
- 已通过：`git diff --check`、治理检查和新增领域文件 lint。
- 未通过：本地全量 Web typecheck 仍只有既有应收 `filterOptions` 和仓库理货测试桩类型错误，本轮文件无新增错误。
- 已通过：47 当前完整源码 Docker Web production build。
- 已通过：47 三个运行时文件 checksum 与发布候选一致，静态产物包含 `appShell` 标记。
- 已通过：47 Web/API/Postgres/Redis 容器状态、容器内首页、应用路由、API health、公网 8899 首页与 API health；最近实际错误日志为 0。
- 已通过：47 导航角标接口管理员 200、21 个角标项；客户角色 403 且原错误文案为“客户不使用员工端导航角标”；未登录 401。
- 生产写接口未做线上调用，避免改变真实用户已读状态或新增错误日志；POST 路径、方法、完整载荷和返回透传由定向契约测试覆盖。

## 交接

- 阻塞：无。
- 剩余风险：兼容方法仍保留在巨型 `ApiClient`；本轮没有性能收益，也未改变业务表现。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260724-codebase-slimming-phase-4`。
- 准确下一步：继续选择单一高频领域迁出 `ApiClient`，保持同样的契约快照和白名单发布方式；兼容窗口结束后集中删除无生产调用的旧转发。
