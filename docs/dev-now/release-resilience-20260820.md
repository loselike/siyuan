# 47 发布韧性与不可变制品切换

- 状态：`in_progress`
- 会话 slug：`release-resilience-20260820`
- 分支：`codex/release/resilience-20260820`
- worktree：`/private/tmp/sunny-release-resilience-20260820`
- 认领时间：`2026-08-20 Asia/Shanghai`

## 用户目标与固定样本

- 目标：避免 47 在应用发布构建时因 Docker/BuildKit 故障拖垮全站，并把常规发布收敛为 CI 构建不可变镜像、47 只拉取 digest 后迁移/重启/健康检查。
- 固定样本：启用 `live-restore` 前后，`siyuan-postgres-1`、`siyuan-redis-1`、`siyuan-api-1`、`siyuan-web-1` 的容器 ID 与启动时间不变，API/Web 健康；恢复单元只允许启动现有容器，不允许 build、pull、create 或 compose up。
- 禁止：不在生产直接升级 Docker；不重启 Docker 做故障演练；不修改业务数据、数据库 schema、密钥或卷；不执行 `docker volume prune`。

## 第一性原理结论

- 2026-08-20 故障由 47 上 Docker 29.1.3 内置 BuildKit v0.26.2 在构建阶段 panic 引起；Docker daemon 退出时 `liveRestore=false`，同一 daemon 承载的 Web/API/Postgres/Redis 随之不可用。
- 第一层保护是让 daemon 故障不再等价于业务容器停机；第二层是把高风险 build 从生产 daemon 移到 CI；第三层才是版本升级与更完整的蓝绿发布。

## 成熟参考与取舍

| 参考 | 采用点 | Sunny 差异与取舍 | 许可证/风险 |
| --- | --- | --- | --- |
| [Docker live restore](https://docs.docker.com/engine/daemon/live-restore/) | daemon 不可用时保留 Linux 容器；通过 `systemctl reload docker` 无停机启用 | 47 仍是单机 Compose；只启用官方开关并增加“仅启动现有容器”的恢复单元，不在生产做 daemon kill 演练 | Docker 官方文档；需注意跨大版本升级和日志 FIFO 限制 |
| [docker/build-push-action](https://github.com/docker/build-push-action) | CI Buildx、GHA cache、digest、provenance、SBOM | 仓库现有 CI 已具备三镜像并行构建；本轮补发布端 fail-closed，不复制项目代码 | Apache-2.0；GHCR 可用性和凭据是外部依赖 |
| [Kamal deploy](https://github.com/basecamp/kamal-site/blob/main/docs/commands/deploy.md) | 新制品先准备/健康后切换、保留可回滚版本 | 当前 Compose 不直接引入 Kamal；先采用 digest fencing、健康门和有限备份 | MIT；直接引入会扩大运维栈与迁移成本 |
| [Argo Rollouts](https://github.com/argoproj/argo-rollouts) | 蓝绿/金丝雀与自动回退的状态模型 | Sunny 非 Kubernetes，当前不引入；仅作为后续双实例切换设计参考 | Apache-2.0；现阶段引入 K8s 成本过高 |

## 分阶段实施

- P0：可回滚启用 Docker live restore；安装 root-owned systemd 恢复单元；本地脚本与状态验证。
- P1：标准发布运行时代码强制 `--image-manifest`；白名单服务器构建降级为显式 break-glass；把 47 当前运行源码归并到 Git 后再完成 digest cutover。
- P2：独立 build 节点、批量 CAS、蓝绿切换、镜像/备份保留策略与受限 deploy 身份。

## 当前进度

- 已确认 47 发布锁 free、recovery clear、Docker 29.1.3、`liveRestore=false`、四个 Sunny 容器运行。
- 已确认主干 CI 已并行构建 API/Web/migration digest 镜像并生成 `images.env`；无需重复新增 CI 流程。
- P0 已于 2026-08-20 11:29 (+08:00) 在全局发布锁内完成：`/etc/docker/daemon.json` 保留 `data-root=/data/docker` 并启用 `live-restore=true`；安装并启用 `siyuan-compose-recovery.service`。仅执行 `systemctl reload docker`，Docker `ActiveEnterTimestamp` 仍为 09:32:04、`NRestarts=1`，四个容器 ID/启动时间未变化。
- P0 线上效果：恢复 unit `enabled/active/result=success`；Postgres/Redis/API/Web 均 running；公网 Web 与 `/api/health` 均 200；发布锁 free、recovery clear。安装备份仅 1 份，脚本最多保留最近 3 份。
- P1 代码已实现：标准 runtime apply 没有 `docker compose build` 路径，必须传 CI `images.env`；远端再设防；白名单服务器构建必须显式 `--emergency-server-build --reason` 并记录 reason SHA/provenance；current-baseline cutover 可组合完全匹配 commit 的 digest manifest。

## 验证

- 通过：`bash -n` 覆盖新增/修改 Shell 脚本。
- 通过：`scripts/runtime-resilience.test.sh`，固定样本只启动已有 API 容器，未出现 create/pull/build/compose up。
- 通过：`scripts/release-build-policy.test.sh`、`scripts/release-image-fence.test.sh`、`git diff --check`。
- 通过：`node scripts/check-development-governance.mjs`。
- 未全绿：`npm run governance:check` 被基线已有 `docs/dev-now/market-positive-permission-rebuild-20260815.md` 缺 canonical status 阻断；`architecture:check` 被该基线已有的路由/权限契约与规模债务阻断。本任务未修改这些业务文件或其他任务状态。

## 剩余门槛

- 47 仍是 `WHITELIST_CAS`，当前线上源码包含 2026-08-20 权限/业务发布，尚未全部归并为一个与主干 CI digest 完全一致的 Git commit；因此 P1 的生产 digest cutover 不能冒险执行。
- 在完成“冻结角色权限写入（若有迁移）→ 捕获当前 47 v3 manifest → 逐文件归并当前线上源码 → 推送/合并 main → CI digest 成功 → 锁内再次对比 manifest”前，禁止用旧 main 镜像覆盖当前业务。
- Docker 29.7.x 升级只保留为测试机复现/daemon restart 验证项；47 的 apt candidate 当前仍为 29.1.3，不在生产直接升级。
- root 仍可绕过脚本直接操作 Docker；专用 deploy 身份/受限 SSH command 涉及现有运维授权切换，作为 P2 单独实施，不在本次无停机变更中贸然收紧。
