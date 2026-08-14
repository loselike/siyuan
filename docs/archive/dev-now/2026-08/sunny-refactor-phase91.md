# Sunny 快速优化 Phase 91：API 生产镜像瘦身

- 状态：`completed`
- 会话标题：`Sunny｜API制品与发布提速｜01`
- 分支：`codex/sunny-refactor-phase91-metadata`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase91-metadata`
- 基线：`34075aa611c6e05489e452c40c5966a0dc560a52`

## 用户验收目标

在不修改业务数据、数据库结构、权限、接口契约、业务状态和现有运行逻辑的前提下，减少 API 生产镜像中无关 workspace 依赖，并为镜像大小和构建制品留下可追溯指标。该切片不执行 migration，不修改 47 线上数据。

## 设计依据

1. [Docker Node.js guide](https://docs.docker.com/guides/nodejs/)：编译依赖与生产依赖分离，运行镜像只复制生产依赖和编译产物。
2. [Docker cache optimization](https://docs.docker.com/build/cache/optimize/)：保持构建上下文小、使用 npm cache mount 和 BuildKit 外部缓存。
3. [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只借鉴受影响任务和可重复指标，不在本切片引入 Nx。
4. Sunny Phase 69：已有 GHCR digest、provenance、SBOM、受影响验证和 47 只拉取制品门禁，本切片只收窄 API 依赖输入并增加元数据 artifact。

## 允许与禁止

- 允许：Dockerfile stage、npm workspace 安装范围、CI metadata artifact、构建指标文档。
- 禁止：修改 `apps/api/src`、`apps/web/src`、`packages/shared/src`、Prisma schema/migrations、数据库数据、角色权限和 API 响应。
- 若 API 构建或只读启动发现隐式依赖，立即回退到原依赖范围，不通过删包绕过。

## 实施方案

1. API/migration 的依赖安装只选择 `@siyuan/api` 与 `@siyuan/shared` workspace，继续使用 lockfile 和现有 npm 版本。
2. build 阶段仍保留 TypeScript/Prisma 编译所需 devDependencies；runner 继续使用 `npm prune --omit=dev` 后的结果。
3. runner 不再复制 Web 生产依赖；LibreOffice、Poppler、Python 和 uploads volume 保持不变。
4. GitHub Actions API image job 输出 BuildKit metadata artifact，作为 digest、镜像大小和构建追踪的补充证据；不改变 push、provenance、SBOM 或 manifest。

## 验收门

- `git diff --check`、相关 Docker/CI 静态检查和 `npm run governance:check` 通过。
- API 定向类型/测试门通过；生产 Docker 构建仍由 main workflow 执行，避免本地重复构建。
- 47 仅在 digest manifest 生成后提升 API/Web；`MIGRATION_REQUIRED=false`。
- 线上 health、首页、匿名 401 和至少一个只读 API 通过；容器日志无启动错误。
- 47 provenance、image digest、source checksum 与 release state 一致；失败可回滚到 Phase 69 digest。

## 进度

- [x] 建立独立 worktree 和任务状态。
- [x] 记录当前 Docker/npm 依赖基线：全 workspace 生产安装约 417 MB，API+Shared workspace 生产安装约 233 MB；该数值为临时安装目录观测，不代表最终镜像大小。
- [x] 修改 Dockerfile.api 的 workspace 安装范围和 npm cache mount。
- [x] 增加 API image metadata artifact（使用 action 原生 outputs，避免不支持的 `metadata-file` 输入）。
- [x] 修复 governance-only 受影响验证缺少 Prisma/Shared 生成前置的问题，并增加自测。
- [x] 本地安全门和 PR #3 主干镜像构建验证；PR #4 首次 affected 失败已定位为该前置问题并修复。
- [x] PR #4 合并到主干 `39ad86173f1e543a2f82988cdafdbdb542e50ab4`；主干 CI `31815811059` 的 affected、API/Web/migrate 镜像构建、manifest 生成全部通过。
- [x] 生成并复核 digest manifest：API `ghcr.io/loselike/siyuan-api@sha256:90abaa7ced8a8898930871420704950d03f6707e1dc4fb080d34bf360a09e261`、Web `ghcr.io/loselike/siyuan-web@sha256:946ceddbd9d5a0d6b28717cdd18a6a085936a96dd75e3c04e18e6d98d868f36b`、migration 镜像 `ghcr.io/loselike/siyuan-db-migrate@sha256:b88d54a847a291f824a1403dd4b9c8f51d748d833b591dc532a6a48ed03aea02`；API metadata 作为构建追踪 artifact 保存。
- [x] 47 发布协调 worktree 完成一次性运行时漂移收敛：先保存只读 drift manifest `docs/release-manifests/47/20260814-155837-git-3a7e1ba05c5e-runtime-drift`，再以无数据库迁移的当前基线切换修复来源/运行时不一致；切换后 `RUNTIME_PROVENANCE_STATUS=traceable`，未执行 migration、业务数据写入或权限变更。
- [x] 47 按 digest 完成 API+Web immutable promotion，`MIGRATION_REQUIRED=false`；最终 release `git-39ad86173f1e_web-c53682f249b1_api-ada73f410ccc`，`BUILD_PROVENANCE=GHCR_DIGESTS`，源代码、镜像 digest、release state 一致。
- [x] 47 线上只读验收：health 200、首页 200、匿名只读接口 401；API/Web 容器运行，Postgres/Redis 未重建；发布锁和 recovery 均已清理，API 最近 5 分钟无 fatal/panic/uncaught/unhandled 日志。
- [x] 发布后重评：主干 affected 47 秒，API image job 1 分 43 秒，Web image job 1 分 42 秒，migration image job 44 秒；47 immutable pull 受 GHCR 网络速度影响，不能把单次冷拉取时间固化为承诺。API+Shared 临时生产依赖目录约 233 MB（全 workspace 约 417 MB），仅作为依赖输入指标，不等同最终镜像大小。

## 行为与数据保护结论

- 本切片只修改 `Dockerfile.api`、`.github/workflows/ci.yml`、受影响任务判定脚本及对应静态测试；没有修改 `apps/*/src`、`packages/shared/src`、Prisma schema/migrations、数据库数据、角色权限、API 契约或业务状态流转。
- 47 本次只拉取 API/Web 不可变镜像并重启对应容器；`MIGRATION_REQUIRED=false`，Postgres/Redis 保持运行，未执行 `db-migrate`、`db push`、seed 或业务写接口。
- 47 来源漂移证据已保存，当前 `SOURCE_DRIFT_AUDIT` 为 `LOCAL_COUNT=524`、`REMOTE_COUNT=524`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`；仅有 22 个 3,586 字节的历史 AppleDouble `._*` 文件待后续治理，不影响当前发布。

## GitHub 参考与取舍

本切片落实 Docker cache optimization、Docker build-push-action 的“构建一次、按 digest 提升”、Nx affected 的受影响任务思路和 GitHub Flow 的唯一集成入口；仅借鉴 Medusa/Vendure/Twenty 的模块化与可追溯发布原则，没有复制其业务代码、数据库结构或权限模型。下一纵向切片是否进入订单查询，必须重新按行为保护门和 47 只读样本评估，不因本切片发布成功自动扩大范围。

## 后续重评

当前最高收益方向从“反复服务器现场构建”转为“按受影响范围拆分真实高频业务切片”。API runner 仍保留 LibreOffice、Poppler、Python 等现有运行时能力，不能在没有依赖证明时继续删减；API 镜像层、GHCR 冷拉取和启动耗时应持续记录，若网络拉取仍是主要瓶颈，再单独评估自托管 registry/cache。后续代码重构必须先建立 characterization/contract 保护，并继续保持业务数据、系统数据、权限和运行逻辑不变。
