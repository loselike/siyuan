# Sunny 快速优化 Phase 91：API 生产镜像瘦身

- 状态：`in_progress`
- 会话标题：`Sunny｜API制品与发布提速｜01`
- 分支：`codex/sunny-refactor-phase91`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase91`
- 基线：`3a7e1ba05c5e78617072e876da1f98cacdb34802`

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
- [ ] 修改 Dockerfile.api 的 workspace 安装范围和 npm cache mount。
- [ ] 增加 API image metadata artifact。
- [ ] 本地安全门、GitHub Actions、47 digest 发布和线上只读验收。
- [ ] 发布后重评镜像层、冷拉取和启动耗时，决定是否进入订单查询纵向切片。
