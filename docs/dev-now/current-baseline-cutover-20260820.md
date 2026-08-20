# 47 当前运行基线归并与 digest cutover

- 状态：`blocked`
- 会话 slug：`current-baseline-cutover-20260820`
- 分支：`codex/release/current-baseline-20260820`
- worktree：`/private/tmp/sunny-47-current-baseline-20260820`
- 上游：`codex/release/resilience-20260820` / `3001e4db`

## 目标与边界

- 目标：把 47 当前实际运行源码冻结成可审查 Git 候选，随后由 CI 构建三个 digest 镜像，再通过 v3 manifest 执行无生产构建的 current-baseline cutover。
- 固定样本：候选除新增的 release-resilience 文件与 package script 外，运行时 `source-files.tsv` 必须与锁内捕获的 47 manifest 逐字节一致。
- 禁止：未取得 CI digest 和完整安全门前不重启/覆盖生产容器；不在本步骤写数据库；不从旧 main 镜像回退当前业务。

## 已完成

- 在全局发布锁内捕获 v3 manifest：`docs/release-manifests/47/20260820-033756-whitelist-e8e96a8b463a84403672003b`，source tree SHA `fbfeca2f99f749c9af5d731734f644c11847d0b17a811f610853e164f9507fd6`。
- 同一把锁内按 manifest 文件清单从 `/opt/siyuan` 单次 tar 流拉取当前运行源码；本地复算只多出 P0 新增的两个 `deploy/47` 恢复文件，远端清单内 550 个运行时文件的路径、大小和 SHA-256 全部一致。
- 相对 `3001e4db`，当前线上基线包含数十个已跟踪运行文件修改及 8 个新增运行文件/迁移；另含本任务测试修正、任务记录和 1 份 manifest。生产组合版本中有多个关键文件未在任何其他本地 worktree 找到完全相同副本，证明不能靠挑选旧分支重建，必须以锁内线上快照为基准审查。
- Shared build、Prisma generate、API typecheck、Web typecheck 均通过。API 定向 9/9、Web 定向 10/10 通过；旧测试夹具已按当前生产 API 与页面契约补齐。
- 四个 2026-08-18 至 2026-08-20 迁移均已在 47 完成且未回滚，数据库 `_prisma_migrations.checksum` 与本地 `migration.sql` SHA-256 四项逐项一致。
- 基线拉取后只保留三类可解释差异：P0 的 `package.json` 发布命令、仅测试使用的 `appTestHarness.tsx` 契约修正，以及 `RoutingPage.tsx` 恢复“业务成本/应付成本”各自独立权限入口；后者已有正向权限 UI 测试覆盖。

## 当前门槛

- `node scripts/check-development-governance.mjs` 通过；完整 `governance:check` 被既有 `docs/dev-now/market-positive-permission-rebuild-20260815.md` 缺 canonical status 阻断。当前会话按所有权规则不修改其他会话状态文件。
- `architecture:check` 仍被当前生产组合版本相对旧 baseline 的路由权限契约、重复路由和规模债务阻断；不得通过机械更新 baseline 数字或删除检查来绕过，必须逐项审查后形成独立治理变更。
- 候选可以提交并推送到 release 分支用于保存与 PR 审查，但在上述 CI 阻断关闭前不得合并 main、生成生产 digest 或执行 cutover。只有 `images.env` 的 `GIT_COMMIT` 与最终候选完全一致，且锁内重新捕获的 v3 manifest 未漂移，才允许 cutover。
