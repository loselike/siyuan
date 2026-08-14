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
- [x] 审查并提交吸收基线，执行 current-baseline cutover；发布 `git-2c7a82d3ec22_web-085b332968cc_api-77c8a79d8257`，migration 未执行，519/519 源码一致。
- [x] 阶段 1：常规发布限制为 `main`/`codex/release/*`，普通功能分支白名单 CAS 默认拒绝。
- [x] 阶段 2（本地实现）：PR/main CI 构建 GHCR digest 镜像，标准 deploy 支持校验并提升 `images.env`，保留锁、provenance、receipt、health 与 migration fail-closed。
- [x] 阶段 3（本地实现）：受影响 workspace 验证、Vitest changed、npm/BuildKit cache、阶段耗时 artifact；根 typecheck 去除一次重复 shared noEmit。
- [ ] 阶段 2/3 GitHub Actions 真实运行证据。
- [x] 阶段 4：客户来源四条 API 从 `DataController` 迁入独立 Controller/Application Service/Repository port；现有 Prisma/InMemory 实现、权限、字段、状态码、异常、事务与审计逻辑原样保留。
- [x] 阶段 5：客户来源共享契约迁入独立 subpath，Web 页面改依赖窄客户端；新增不依赖 6,473 行全局 Harness 的模块 fixture，以及迁移前后共用 API E2E characterization。
- [ ] 本地安全门、GitHub PR 检查、47 精确发布与只读线上验收。

## 阶段重评 1–3

- 安全/数据正确性：cutover 未执行 migration；权限与业务代码只作为 47 既有基线吸收，新增内容均为工程、发布和测试工具。
- 高频业务/前端数据流：仍受 `App.tsx`/WarehousePage/Harness 巨型文件影响，但本轮不可在没有 characterization 时直接拆页面。
- 后端效率：`DataController` 与两套巨型 Repository 仍是需求改造的主要冲突源。
- 结论：阶段 4 转向一个已有真实 UI/API/Repository 的小型纵向切片，并把权限判断原样留在既有位置；不继续扩大发布脚本改造。

## 阶段重评 4–5

- 安全/数据正确性：客户来源创建、停用、删除与审计固定样本在迁移前后均通过；Controller 的四个 canonical permission 未变化，Repository 内业务员限制未移动或修改。
- 高频业务/前端数据流：页面现在可用窄客户端独立测试，新增/只读操作不再需要启动全局 App Harness；现有页面布局和交互未改变。
- 后端架构/效率：`DataController` 从 1,945 降至 1,918 行、路由从 186 降至 182；shared 根入口减少 20 行且直接根导入生产文件从 143 降至 142。
- 当前 47 基线吸收时带入的既有增量为 Prisma Repository +20 行、InMemory Repository +27 行、styles +2 行、WarehousePage +32 行和 App 一个 `no-undef`；本轮仅更新治理基线以如实冻结 47 当前事实，没有扩大这些文件。
- 结论：本轮五阶段代码目标已闭环，停止继续拆业务模块；下一原子动作只做 GitHub PR/Actions 真实运行、制品提升和 47 只读验收。

## 安全边界

- 检测到新的 pending migration、线上写入需求、权限/状态/金额契约变化时立即停止，将该项退出本重构任务。
- 镜像仓库或 GitHub/47 凭据缺失时只落地 fail-closed 配置；秘密不写入仓库、不输出到日志。
- 47 基线漂移时停止同步并重新捕获，不覆盖并发发布。
