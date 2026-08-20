# Sunny Phase100：发布重启阶段禁止重复构建

- 状态：published_47
- 任务边界：修复标准 Docker Compose 发布在已完成受影响服务构建后，重启阶段再次尝试 registry pull/build 的耗时问题；不改变统一 release ID、镜像 fencing、health、state、权限或业务数据。
- 用户验收目标：Web-only 或 Web+API 发布只在显式 build/pull 阶段准备镜像，重启阶段直接使用已验证镜像；发布失败仍 fail-closed，API/Web 运行版本仍与 state 一致。

## 重新评估与选择

Phase99 47 发布实测范围为 `web`，但 `docker compose up` 在重启阶段仍尝试解析未推送的 API release tag，随后命中缓存构建 API。该 30 秒 registry 超时和重复构建正是发布慢的可观测证据。不能简单改成 `--no-deps`：Sunny 的统一 release ID 同时绑定 API health、容器镜像和 state，API 仍需以本次 release tag 重启。最小安全修复是 Web-only 时显式准备一个同 release tag 的 API 镜像（通常完全命中缓存），然后让 Compose 只使用前一步已构建/拉取的镜像。

## GitHub 参考与取舍

- [Docker Compose](https://github.com/docker/compose)：借鉴 Compose 的显式 build/pull 与启动阶段分离；Sunny 在 image fence 校验后统一使用 `--no-build`，不复制 Compose 实现。
- [Nx affected CI features](https://nx.dev/docs/features/ci-features/affected)：继续按受影响服务构建；本切片只修复重启阶段重复工作，不引入 Nx。

## 实施

- `scripts/deploy-47.sh` 在 Web 或 API 运行时变更时设置 `API_IMAGE_REFRESH_REQUIRED`，显式把 API 加入 build/pull、image fence 和 restart；Web-only 仍保持 `Release scope: web=true api=false`。
- `scripts/lib/47-release-service-plan.sh` 提供可执行的 build/restart planner，Web-only、API-only、Web+API、migration-only 和 docs-only 分支由同一组函数决定。
- restart 阶段统一执行 `docker compose up -d --no-build --pull never --remove-orphans`，不再让 Compose 隐式 pull/build；API 新 tag 已在前置阶段准备并经过 fence。
- 保留前置的 `docker compose build/pull`、release image ID capture/verify、API health、Web served checksum、state/recovery 和统一 release ID。
- `scripts/release-service-plan.test.sh` 执行服务规划矩阵；`scripts/release-image-fence.test.sh` 增加 `--no-build/--pull never` 发布策略门禁。
- 不修改 API/Web 业务代码、权限、数据库、迁移或线上数据。

## 本地验证

- `bash -n scripts/deploy-47.sh scripts/lib/47-release-service-plan.sh scripts/release-service-plan.test.sh scripts/release-image-fence.test.sh` 通过。
- `bash scripts/release-service-plan.test.sh`、`bash scripts/release-image-fence.test.sh` 通过。
- `git diff --check` 通过。
- 独立发布风险审查：未发现 P0/P1/P2；8 组合 planner 矩阵和 image-fence 门禁通过。治理状态归档后，development/context/architecture 三层治理门禁全部通过；本次未运行数据库迁移。
- 47 只读能力探针：远端 Docker Compose 为 `2.40.3+ds1-0ubuntu1`，支持重启阶段使用 `--pull never`；本机未安装 Docker，因此未做本地 Compose 实执行。

## 发布结果

- 发布前已归档有明确完成/47 证据的历史状态文件；当前 `npm run governance:check` 通过，活动状态 6 个、归档 238 个。
- Phase100–104 累计候选已按标准 Git source build 发布到 47：`git-55b8bfdd5c02_web-c4459d996b26_api-31e97a08a648`，提交 `55b8bfdd5c02c49648f843f0cf7ce28c8bbc8a79`，分支 `codex/release/phase104-integrate-v2`。
- 发布范围为 `web+api`，`MIGRATION_REQUIRED=false`；API/Web 构建、重启、内外 health、运行镜像 fence、provenance、锁与 recovery 均通过。

## 发布边界

- 目标服务：发布治理脚本；运行时服务范围由候选内容判定为 `scripts-only`，不重启 API/Web。
- 发布前重新捕获 47 当前基线；发布后检查脚本来源 checksum、provenance、锁/recovery 与公网 health。该治理切片不改变运行镜像或业务数据。
