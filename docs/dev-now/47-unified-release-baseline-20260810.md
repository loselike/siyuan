# 47 统一可追溯发布基线

- 状态：`in_progress`
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

- 已选定 `8be0a0b` 作为新的隔离候选起点：它包含 2026-08-05 的 47 运行源码捕获以及后续已发布的仓库架构切片，并已具备发布锁、CAS 白名单、baseline receipt 和同步临时目录排除能力。
- 已冻结 47 远端源码、Prisma、容器、镜像和运行产物的不可变 v1/v2 manifest；v2 纳入全部真实构建输入，419 个重叠源码 hash、release state、Prisma、容器、镜像和运行产物均与 v1 一致。远端未发生写入、迁移或重启。
- 已确认根因：当前运行镜像来自“旧镜像 + 编译后 JavaScript 覆盖”和“恢复的 Web source map + 预构建 Shared dist”，不是由 47 当前宿主机完整源码构建；因此容器健康与源码可构建性互不证明。
- `8be0a0b` 有 88 个远端侧运行时路径需要收敛（33 个远端独有、55 个内容不同），另有 2 个干净基线独有的构建支持文件。47 个远端 blob 可在本地 Git 对象库找到，但只有 2 个属于可达 commit；其余 45 个仅为 loose/index 对象，另有 41 个完全不存在，合计 86 个远端版本必须语义重放，不能直接覆盖。
- 已补充只读 provenance 审计、标准 Git 发布不可变 receipt、实际镜像 ID 绑定，以及 staging/receipt/manifest/临时证据的同步和 Docker context 排除。
- `8be0a0b` 隔离基线已完成 `npm ci -> prisma generate -> Shared/API/Web build`，三端构建通过；治理检查通过。
- 当前 47 审计固定返回 `legacy-untraceable` / exit `84`，在来源闭环前阻断标准发布。
- 专项风险复审确认当前治理代码无 P0/P1；bootstrap cutover 仍未实现，必须等 88 个源码差异完成语义收敛后单独审查。
- 已完成第一批源码收敛：恢复已提交的仓库库存汇总策略和财务已付款四等分矩阵，定向测试 2/2、1/1 及 Shared/API/Web 构建通过。
- 已按 v2 manifest 精确恢复 9 个远端 migration 文件，文件 SHA-256 全部一致。生产 `_prisma_migrations` 只读核对显示前 7 个已完成且 checksum 一致；`20260809143000_add_shipment_transport_time` 与 `20260810121500_add_warehouse_tally_completed_mask_permissions` 仍为 pending，禁止在 bootstrap 前隐式执行。
- 第一批后候选与 v2 仍有 81 个文件差异：23 个远端独有、56 个内容不同、2 个候选独有；该数字是源码差异，不等同于 81 个独立业务功能。
- 待完成：按真实 Git 源码逐批重放 b983 权限切片和后续本地权限遮罩，统一 Shared/Prisma/API/Web 契约；每批构建、审查并形成唯一 commit 后，才能进入 47 候选发布。

## 发布状态

- 未发布；47 未被写入、未迁移、未重启。
- 阻断原因不是“构建工具报错”，而是当前运行镜像、宿主机源码与 Git 三者没有可证明的同源关系；此时覆盖 47 会删除未纳入候选的迁移和已上线模块。
