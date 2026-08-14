# Sunny 深度重构 Phase 69：开发与发布提速五阶段

- 状态：`in_progress`
- 会话标题：`Sunny｜开发发布提速五阶段｜01`
- 续接自：`codex/sunny-refactor-phase68-release`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`sunny-refactor-phase69`
- 分支：`codex/sunny-refactor-phase69`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase69`
- 认领时间：`2026-08-14 16:20 Asia/Shanghai`

## 用户验收目标

- 在不修改业务数据、系统数据、现有权限逻辑和既有业务逻辑的前提下，完成：唯一集成/发布入口、不可变镜像流水线、受影响范围验证与缓存、一个真实纵向模块切片、对应巨型测试拆分。
- 固定样本：同一 Git 提交只构建一次 API/Web 镜像；验证结果绑定提交与镜像摘要；47 只提升已验证制品；代表业务切片重构前后保持路由、字段、权限、响应、审计和持久化语义不变。
- 明确禁止：创建或执行新的业务迁移、写入/修复线上业务数据、修改角色/权限绑定或权限归一化、改变财务/仓库/订单状态和业务口径。

## 当前事实基线

- 工作分支：`codex/sunny-refactor-phase69`，独立 worktree `/Users/j1ng/Tools/sunny-refactor-phase69`；用户已确认当前没有其他会话继续修改。
- 47 当前白名单运行基线：`whitelist-f6996ee3a16f6cfcfc94e4c0`；已在发布锁内捕获 v3 runtime manifest，并逐字节吸收 10 个变化文件与 1 个远端独有、已应用 migration 文件。
- `20260814150000_enforce_business_customer_scope` 已由其他已发布任务在 47 应用；本任务只把其源码纳入 Git 基线，不执行 migration，不修改其数据或权限结果。
- 当前热点：`DataController` 1,945 行、`PrismaRepository` 32,149 行、`App.tsx` 3,252 行、`styles.css` 13,222 行、Web `appTestHarness` 6,473 行。

## 成熟参考与取舍

1. [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)：借鉴短分支、Pull Request 自动检查、合并唯一主干后发布；Sunny 保留紧急白名单 CAS，但常规发布只接受可追溯 Git 候选。
2. [Nx](https://github.com/nrwl/nx) 与 [Twenty](https://github.com/twentyhq/twenty)：借鉴依赖图、受影响任务和 front/server/ui/shared 边界；Sunny 先增强现有 npm workspace/`validation:select`，不一次性引入 Nx。
3. [Docker Build cache](https://docs.docker.com/build/cache/optimize/) 与 [docker/build-push-action](https://github.com/docker/build-push-action)：借鉴 BuildKit 外部缓存、Git SHA 标签、digest 身份和构建一次后提升同一制品；未验证 47 拉取能力前保留现有回滚路径。
4. [Medusa](https://github.com/medusajs/medusa)：借鉴模块服务、显式 port、跨模块边界和工作流测试；Sunny 保持模块化单体，只抽取一个真实功能切片。

以上项目仅借鉴架构和验证方法，不复制代码、schema、权限或业务规则。

## 五阶段执行门

1. 当前 47 运行树吸收、审查并 current-baseline cutover，恢复 Git/镜像/release state 唯一事实来源。
2. 建立 PR 自动验证与不可变镜像影子流水线；生产入口 fail-closed，并保留锁、migration、provenance 与 recovery 门。
3. CI 按变更路径选择最小效果测试和安全门，记录阶段耗时，复用 npm/BuildKit 缓存，去掉确定的重复 typecheck。
4. 选择已证实存在的真实纵向切片，先补 characterization，再按 Controller/Application Service/Repository port/adapter 迁移；可观察契约逐项相等。
5. 把该切片对应巨型 E2E/Harness 依赖拆成模块 fixture 和最小 E2E；PR 跑受影响测试，主干/夜间保留完整回归。

每一阶段完成后重新比较安全/数据正确性、高频业务/前端数据流、后端架构/改造效率，不默认沿单一路线继续。

## 当前进度

- [x] 发布锁内捕获并吸收当前运行源码，release state 前后未变化。
- [x] 只读确认远端独有 migration 已完成。
- [ ] 审查并提交吸收基线，执行 current-baseline cutover。
- [ ] 阶段 1–5 实施与逐阶段重评。
- [ ] 本地安全门、GitHub PR 检查、47 精确发布与只读线上验收。

## 安全边界

- 检测到新的 pending migration、线上写入需求、权限/状态/金额契约变化时立即停止，将该项退出本重构任务。
- 镜像仓库或 GitHub/47 凭据缺失时只落地 fail-closed 配置；秘密不写入仓库、不输出到日志。
- 47 基线漂移时停止同步并重新捕获，不覆盖并发发布。
