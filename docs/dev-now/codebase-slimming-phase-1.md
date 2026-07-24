# 代码瘦身治理第一阶段

- 状态：`complete`
- 会话标题：`Sunny｜代码瘦身治理｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`codebase-slimming-phase-1`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-24 16:46 Asia/Shanghai`

## 输入摘要

- 目标：建立巨型文件防回涨门槛，并把系统部门、站点两个只读接口迁移为独立 controller/service/repository 适配层，保持现有接口、权限和返回结构不变。
- 不做：不改数据库、业务规则、RBAC 权限目录、前端页面、站点写接口或其他业务模块。

## 允许修改

- `scripts/check-development-governance.mjs`
- `scripts/architecture-size-baseline.json`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/system/directory/**`
- `apps/api/src/modules/system-directory.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-1.md`

## 当前进度

- 已从可信 Git HEAD 建立独立 worktree 和分支。
- 已确认迁移前固定样本测试通过：管理员可维护并读取站点，普通运营角色读取站点返回 403。
- 已增加 9 个巨型文件的只减不增治理门槛，超过 2026-07-24 当前基线即由 `governance:check` 阻断。
- 已把 `GET /api/system/departments`、`GET /api/system/sites` 从 `DataController` 迁入独立 controller/service/repository 适配层；底层仍委托现有 Repository，未改查询和权限实现。
- 已按 47 当前源码基线应用 5 个运行时文件的白名单补丁，仅构建、重启 API，未修改 Prisma 或执行迁移。

## 验证

- 已通过：迁移前固定样本 `app.warehouse.e2e.test.ts -t "summarizes today receipts, snapshots staff site, and scopes operator rows"`。
- 已通过：新领域定向 E2E，覆盖管理员两个接口 200、未登录 401、运营角色两个接口 403。
- 已通过：迁移后同一固定样本回归、治理检查、新增模块和 `AppModule` lint、`git diff --check`。
- 未通过：基线 API 全量类型检查；错误位于既有仓库、财务返回类型和仓库编辑性测试，本轮新增文件无新增类型错误。47 当前完整源码的 Docker API production build 已通过。
- 已通过：47 容器内管理员读取部门 6 行、站点 4 行均为 200；运营角色两个接口均为 403。
- 已通过：47 API 容器运行、容器内及公网 health、最近 API 错误日志检查。

## 交接

- 阻塞：无
- 剩余风险：领域 Repository 当前仍是旧巨型 Repository 的兼容适配层；下一阶段才能逐步迁移 Prisma 实现。独立 worktree 基于 Git HEAD，而 47 包含其他已发布白名单改动，因此后续合并仍需避免覆盖主工作树。
- 用户验收目标：现有部门、站点读取功能和权限不变，后续新功能不再扩张巨型文件。
- 效果证据：47 管理员两个只读接口均返回原数据，运营角色保持 403。
- 安全证据：定向 E2E、固定样本回归、治理检查、lint、47 Docker production build、health 和错误日志检查通过。
- 未验证项：未做浏览器检查；本轮无 UI 变化。基线 API 全量类型检查仍有与本轮无关的既有错误。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260724-codebase-slimming-phase-1`。
- 稳定附件：无。
- 准确下一步：第二阶段把 `getDepartments/getSites` 的 Prisma 查询移入领域 Repository，并用 Prisma fixture 替代继续扩张 InMemoryRepository；保持旧方法为临时转发层。
- 建议新标题：`Sunny｜代码瘦身治理｜02`
- 建议新状态文件：`docs/dev-now/codebase-slimming-phase-2.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
