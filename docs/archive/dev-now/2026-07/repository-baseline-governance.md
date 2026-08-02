# 仓库基线与开发治理收口

- 状态：`complete`
- 会话标题：`Sunny｜仓库基线治理｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`repository-baseline-governance`
- 分支：`codex/repository-baseline-governance`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-20 00:17 Asia/Shanghai`

## 输入摘要

- 目标：收口 Agent 配置、安全测试入口、47 迁移范围和已执行 migration 的源码追踪，并建立脏工作树后续分类基线。
- 不做：不发布 47、不执行线上迁移、不提交或重写无关业务改动、不清理其他会话文件。

## 允许修改

- `AGENTS.md`
- `.gitignore`
- `.codex/config.toml`
- `.codex/agents/*.toml`
- `package.json`
- `scripts/run-test-safe.mjs`
- `scripts/check-development-governance.mjs`
- `scripts/deploy-47.sh`
- `scripts/sync-47.sh`
- `docs/dev-thread-rules.md`
- `docs/47-cloud-docker-release.md`
- `docs/dev-now/repository-baseline-governance.md`
- 三个已核实 migration 及对应 `apps/api/prisma/schema.prisma`

## Migration 账本

| Migration | 47 状态 | 47 DB checksum | 47 文件 checksum | 本地 checksum | 结论 |
| --- | --- | --- | --- | --- | --- |
| `20260717160000_water_receipt_match_receivable_sources` | 2026-07-17 已完成，active | `033a446bd50fa2d919d39ae4ec6707c8101649c520471e958e67f6ce6f1437e1` | 同左 | 同左 | 线上、本地完全一致，必须纳入 Git |
| `20260719090000_markup_route_lookup_indexes` | 2026-07-19 已完成，active | `144ad79430f447353aac4d86a627384854b8b40823f0c87778e3fbd533b7a71b` | 同左 | 同左 | 线上、本地完全一致，必须纳入 Git |
| `20260719143000_normalize_warehouse_package_received_status` | 2026-07-19 已完成，active | `307c39f54f813fff6ec58f719e0009d9d37a15beaf2964e2cf02a95818254f0f` | 同左 | 同左 | 线上、本地完全一致，必须纳入 Git |

核对只读取 47 `_prisma_migrations` 和远端文件 SHA-256，未执行 migration、SQL 写入、构建或重启。

## 当前进度

- 已完成 47 三个 migration 的数据库记录、远端文件和本地文件三方 checksum 核对。
- 已完成版本化 Agent 配置候选、测试安全入口、发布范围模板和自动治理检查。
- 首次 47 dry-run 发现 `.release-backups/` 会被 `rsync --delete` 删除，已加入同步排除项与治理检查；全程未执行真实同步。
- `deploy:47` 已增加脏运行时工作树 fail-closed 守卫：dry-run 输出 `DIRTY_RUNTIME_COUNT` 和文件清单，apply 直接拒绝，脏树只能走 47 基线白名单补丁流程。
- 业务脏文件只做清单分类，不在本任务中重写或提交。
- 三个已上线 migration 与对应 Prisma schema 已提交为 `e52a2ba`，可从 Git 恢复并与 47 checksum 对账。

## 脏树分类原则

- A：已发布 47 且 checksum 一致，后续重建对应功能提交。
- B：本地完成且验证通过但未发布，保留在对应任务分支。
- C：未完成或验证受阻，继续由原状态文件认领。
- D：截图、运行时和临时产物，进入忽略目录。

## 验证

- 通过：`npm run governance:check`
- 通过：`bash -n scripts/deploy-47.sh scripts/sync-47.sh`
- 通过：`npm run deploy:47 -- --dry-run`，输出 `RELEASE_SCOPE=web+api`、`MIGRATION_REQUIRED=false`、`DIRTY_RUNTIME_COUNT=48`。
- 通过：`npm run deploy:47 -- --dry-run --full`，确认 `--full` 不再强制迁移。
- 通过：真实 apply 的 fail-closed 守卫在同步、构建和重启前以 exit 3 拒绝脏运行时工作树；47 未发生写入。
- 通过：Shared/API/Web 三个安全测试别名以 `--help` 启动，均由安全 runner 注入单 worker 和超时参数。
- 通过：Prisma schema 在占位 `DATABASE_URL` 下完成 `prisma validate`，未连接或修改数据库。
- 通过：本任务文件 `git diff --check`；`.codex` TOML 可解析，且 artifact/runtime/tmp 目录被 Git 忽略。
- 通过：同步 dry-run 不再包含 `.release-backups/` 删除项。

## 交接

- 阻塞：无
- 剩余风险：大量业务文件仍混有多个历史任务；全量发布继续被 fail-closed 守卫阻断，必须逐任务重建白名单提交或用 47 基线补丁发布。
- 用户验收目标：开发规则无冲突、Agent 配置可版本化、迁移只按真实 Prisma 差异触发、已上线 migration 可从 Git 恢复。
- 效果证据：治理检查通过；`--full` dry-run 明确显示 `MIGRATION_REQUIRED=false`；脏运行时 apply 在任何远端写入前被拒绝。
- 安全证据：47 migration checksum 三方一致；`.release-backups/` 不再被 `rsync --delete` 纳入删除候选。
- 未验证项：未对大量无关业务改动做功能验收，也未发布 47。
- 发布状态：未发布。
- 稳定附件：无。
- 准确下一步：按各自 `docs/dev-now/*.md` 归属，把剩余业务改动拆成可审查、可验证、可发布的小提交。
- 建议新标题：`Sunny｜仓库基线治理｜02`
- 建议新状态文件：`docs/dev-now/repository-baseline-governance-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
