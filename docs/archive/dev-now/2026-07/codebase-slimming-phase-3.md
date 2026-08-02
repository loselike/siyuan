# 代码瘦身治理第三阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜03`
- 续接自：`docs/dev-now/codebase-slimming-phase-2.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续）`
- 会话 slug：`codebase-slimming-phase-3`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-24 Asia/Shanghai`

## 输入摘要

- 目标：拆分前端 `ApiClient` 的 system-directory 客户端，旧方法保留兼容转发，并先迁移 Settings 页面调用方。
- 固定样本：系统管理站点页加载站点、停用深圳思远；接口路径、方法、参数和页面结果保持不变。
- 不做：不改页面布局、业务流程、权限、API 契约、数据库、后端实现或其他模块调用方。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/systemDirectoryClient.ts`
- `apps/web/src/api/systemDirectoryClient.test.ts`
- `apps/web/src/modules/settings/SettingsPage.tsx`
- `docs/dev-now/codebase-slimming-phase-2.md`
- `docs/dev-now/codebase-slimming-phase-3.md`

## 当前进度

- 已接管第二阶段完整提交和 47 发布状态。
- 已确认 Settings 是部门、站点客户端方法的唯一页面调用方。
- 已新增 `SystemDirectoryClient`，承接部门、站点读取和站点新增、修改、启停请求。
- `ApiClient` 公开旧方法继续兼容转发；Settings 的 5 处生产调用已全部迁入领域客户端。
- 分支 `apiClient.ts` 从 1963 行降至 1958 行；47 当前版本从 2150 行降至 2145 行。

## 验证

- 已通过：领域客户端请求契约和旧方法兼容转发定向测试，2 个文件共 4/4。
- 已通过：`git diff --check`、治理检查；新增领域文件无 lint 错误。
- 未通过：Settings 既有整页固定样本 30 秒未产生测试结果，已按安全规则终止，不计通过。
- 未通过：全量 Web typecheck 仍有既有应收 `filterOptions` 和仓库理货测试桩类型错误；本轮文件错误已清零。
- 已通过：47 当前完整源码 Docker Web production build。
- 已通过：47 三个运行时文件 checksum 与发布候选一致，静态产物包含 `systemDirectory` 标记。
- 已通过：47 Web/API/数据库/Redis 容器状态、容器内首页、Settings 路由、API health、公网 8899 首页与 API health、最近错误日志检查。
- 已通过：47 管理员读取部门 6 行、站点 4 行均为 200；运营角色两个接口均为 403。

## 交接

- 阻塞：无。
- 剩余风险：兼容方法仍留在巨型 `ApiClient` 中；Settings 整页测试仍有既有长跑问题，本阶段只由客户端契约测试、生产构建和 47 线上服务端证据闭环。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260724-codebase-slimming-phase-3`。
- 准确下一步：选择下一个高频前端领域切片迁出 `ApiClient`；待兼容窗口结束后删除已无生产调用的部门/站点旧转发方法。
