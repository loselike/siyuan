# 47 统一可追溯发布基线

- 状态：`completed`
- 会话标题：`Sunny｜47 发布基线修复｜01`
- 输入来源：`当前会话明确请求`
- 会话 slug：`47-unified-release-baseline-20260810`
- 分支：`codex/47-unified-release-baseline-20260810`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/47-unified-release-baseline-20260810`
- 认领时间：`2026-08-10 Asia/Shanghai`

## 用户验收目标

- 47 当前实际源码、运行镜像和发布状态先形成不可变证据，不覆盖、不迁移、不重启。
- 从独立干净 worktree 建立唯一 Git 候选，统一依赖、Shared 和 Prisma 契约。
- 全树同步不再删除远端 staging、临时目录、发布清单或回滚证据。
- 只有 Shared/API/Web 的干净 Docker 构建全绿，且迁移集合已明确审查，才允许发布 47。
- 发布完成后，每次运行版本都能对应唯一 commit、release ID、指纹和回执。

## 已确认阻断

- 47 `/opt/siyuan` 不是 Git checkout，源码无法直接追溯到 commit。
- 47 `.siyuan-release-state`、`.codex-state.md`、当前源码和现有容器属于不同时间点。
- 47 当前混合源码在干净 Web 构建中产生大量运行时类型错误，不能作为可发布候选。
- 根工作树包含其他会话的未提交运行时代码与迁移，本任务禁止修改、提交或发布这些文件。
- 当前 `sync:47` 基线若来自旧分支会把远端 `.codex-release-staging` 纳入删除候选；必须从已加固的架构集成基线继续。

## 允许修改

- `scripts/*47*`、`scripts/lib/47-release-lock.sh`、发布治理检查。
- `.dockerignore`、`package.json`、`docs/47-cloud-docker-release.md`。
- 本状态文件和本轮生成的脱敏 47 manifest/receipt。
- 为统一候选所必需的 package manifests、lockfile、Shared、Prisma、API/Web 契约文件；必须逐批审查并验证。

## 禁止范围

- 不清理或覆盖根工作树及其他 worktree 的修改。
- 不删除 47 staging、备份、上传、数据文件或生产卷。
- 不运行 `rsync --delete` apply、不执行 Prisma migration、不重启生产容器，直到候选全绿并完成风险审查。
- 不把 `.env`、密钥、token、数据库数据或用户上传内容写入 manifest、日志或 Git。

## 当前进度

- 已在全局发布锁内重新审计并冻结当前 47；实际 release ID 仍为 `runtime-stage-view-20260810020229`，来源状态为 `legacy-untraceable`。批准的 v2 manifest 为 `docs/release-manifests/47/20260810-042420-runtime-stage-view-20260810020229`，覆盖 423 个真实构建输入及 Prisma、release state、容器、镜像和运行产物。
- 已确认根因：当前运行镜像来自“旧镜像 + 编译后 JavaScript 覆盖”和“恢复的 Web source map + 预构建 Shared dist”，不是由 47 当前宿主机完整源码构建；因此容器健康与源码可构建性互不证明。
- 已按 manifest 精确导入 47 源码并提交快照 `02df09a`；随后用已审查的完整 union 源补齐 Shared、Prisma、API、Web 契约，提交 `1ed328c`。两个未在生产应用的迁移及其功能切片未纳入 bootstrap。
- 候选与生产 `_prisma_migrations` 均为 141 个已完成名称；138 个 checksum 一致，3 个历史 checksum 差异由 `config/release/47-legacy-migration-checksums.tsv` 精确绑定候选 hash 与生产记录 hash。bootstrap 不执行 migration。
- 已实现一次性 fail-closed bootstrap：只接受上述 v2 manifest 及固定 bundle SHA；锁内从当前 Git commit 重新落只读副本，复核 HEAD/origin、线上源码、状态、容器、镜像、运行产物和严格 migration 行，再强制重建 Web/API；成功后写首个 `GIT_SOURCE_BUILD` receipt，失败则进入 recovery-required。
- 对抗式审查发现并修复待审核业务成本越权：只读录单权限不再可写；定向验证覆盖只读 403、本人 201、直属主管 201、非直属主管 404。业务员默认不再继承水单匹配写权限。
- 已完成 `prisma generate -> Shared/API/Web build`；业务成本权限、RBAC、角色权限页面定向测试通过；治理与 429 条路由契约检查通过。architecture baseline 仅在逐项审查新增/迁移路由后刷新，并保留现有债务计数。

## 发布状态

- 用户明确不使用 GitHub；候选改用锁内不可变 Git bundle 作为耐久来源证据。发布提交为 `767f408ed0c5c7ebd1c68861479ed8d393772fa1`，未推送远端仓库。
- 2026-08-10 已完成一次性 bootstrap cutover；release ID 为 `git-767f408ed0c5_web-71cebb1f292f_api-530ee27d274d`，Web/API 均由统一源码重新构建并重启，数据库 migration 未执行。
- 线上 provenance audit 为 `traceable/ok`，bundle 为只读 `0444` 且 SHA-256、exact HEAD、receipt、运行镜像和 API `RELEASE_ID` 全部匹配；公网 API health 与 Web 均为 200。
- 发布完成后发现原发布主进程异常退出遗留同 owner 的孤儿心跳；已核对 state/receipt/health 后按原 token 精确停止心跳并释放锁。最终 release lock 为 `free`，recovery 为 `clear`。
