# 全局底层优化：可信基线与仓库代表切片（已完成）

- 状态：`complete`
- 会话标题：`Sunny｜底层架构优化｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（用户已批准分阶段目标）`
- 会话 slug：`architecture-baseline-warehouse-slice-20260819`
- 分支：`codex/architecture-baseline-20260819`
- worktree：`/Users/j1ng/Tools/sunny-architecture-baseline-20260819`
- 原始基线提交：`cbbd83ad5d63a68305674c6b302dec1d2f5b5b62`
- 47 运行树基线提交：`2daa13baafe98e95115330ce56f2ca9a2ea57d98`
- 当前运行时提交：`7c890e08e647c82c7172131b26d6ce95f317fd32`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 输入摘要

- 目标：先把 47 当前白名单组合运行树恢复为唯一可追溯 Git 基线并清零 Shared/API/Web 类型错误，再迁移 `/api/warehouse/packages` 只读查询到独立 Warehouse Module，保持路由、响应、权限、数据范围和字段裁剪不变。
- 固定样本：47 当前一个真实在仓包裹；管理员允许读取，同一接口使用无仓库权限角色必须拒绝。
- 不做：本切片不改变业务状态、数据库结构、权限模型、财务口径、页面布局；不删除根工作树或其他 worktree 的任何文件；不迁移仓库之外的领域。

## 允许修改

- 基线恢复阶段：47 运行时清单包含的 `apps/api/**`、`apps/web/**`、`packages/shared/**`、根运行时构建文件，仅允许逐字节吸收远端已运行内容。
- 代表切片阶段：`apps/api/src/modules/app.module.ts`、现有仓库查询 Controller/Service/Repository port 及其定向测试；如契约确需拆分，仅修改仓库相关 Shared 子路径。
- `docs/release-manifests/47/**`
- `docs/dev-now/architecture-baseline-warehouse-slice-20260819.md`

## 47 基线事实

- 当前 release：`whitelist-f22a31bcc68bbdef8a478842`，`SOURCE_MODE=WHITELIST_CAS`，发布于 `2026-08-19T15:20:35+08:00`。
- 指纹：Web `f22a31bcc68bbdef8a478842e1cd72c618e413df5be480683ad242925ac060f8`；API `c4c04ab0cb69189e38788f1c0460c287aabe253601d6f9d221d5837c256469e0`；migration `8f2229f05edb997c56b4ab053ffe9849400a88e8553b5ad9b549cbf464faefe0`。
- 初始源码审计：本地 531、远端 539；458 相同、73 内容不同、8 远端独有；远端 22 个 AppleDouble 文件为非运行时历史垃圾，不吸收、不删除。
- 远端 Prisma migration 目录 173 个；API/Web/Shared 源文件合计 544 个。

## 成熟项目参考

- [Medusa](https://github.com/medusajs/medusa)：借鉴领域 Module、窄接口和跨模块可补偿 Workflow；MIT。Sunny 保持模块化单体，不复制电商领域模型或工作流代码。
- [Vendure](https://github.com/vendurehq/vendure)：借鉴 NestJS 模块边界、请求上下文和状态转换保护；GPLv3，仅阅读设计和测试方式，不复制受 GPL 约束实现。
- [react-admin](https://github.com/marmelab/react-admin)：借鉴 Data Provider、查询去重、缓存和 headless controller；MIT。Sunny 保留 AntD 与现有业务页面，不整体替换框架。

## 当前进度

- 已从最近可追溯发布提交建立独立分支和 worktree，根工作树 445 项内容未被修改或清理。
- 已采集 47 runtime manifest：`docs/release-manifests/47/20260819-080525-whitelist-f22a31bcc68bbdef8a478842/`。
- 已把 73 个生产差异文件与 8 个远端独有文件逐字节吸收到本分支；复核为本地 539、远端 539、539 全部一致、运行时漂移 0。
- 已提交唯一 47 运行树基线 `2daa13b`，并修复三个只影响测试类型的过期 stub；Shared/API/Web 类型错误全部清零。
- 执行期间 `origin/main` 继续推进，但其运行树相对当前 47 有 85 个内容差异、3 个本地独有和 15 个远端独有。为避免覆盖并发会话，本切片没有发布该分支，而是把仓库模块提交移植回精确 47 基线。
- 新增 `DataAccessModule`，统一注册/导出 Prisma 或 InMemory 根 adapter；新增 `WarehouseInventoryModule` 接管 inventory controller、query service、repository adapter 和 authorizer 装配。
- `GET /api/warehouse/packages` 保留原 controller/handler 与权限元数据，但其 controller 已由独立 Warehouse Module 注册；根 `AppModule` 不再手工装配该代表查询的 controller/service/repository/authorizer。
- 其他 today/in-stock/delete/group/customer 路由仍保留在旧 controller，未越界迁移。
- 开发期间检测到另一会话把 12 个 Web 文件推进 47；已再次采集 v3 manifest `20260819-084348-whitelist-f22a31bcc68bbdef8a478842` 并逐字节吸收这些文件，没有覆盖或改写其内容。
- 当前候选相对 47 运行树精确为：538 个运行时文件一致、1 个预期修改（`app.module.ts`）、2 个预期新增（两个 Module）、0 个远端缺失；22 个 AppleDouble 历史文件仍排除且未删除。
- 已在远端全链路发布锁内完成 current-baseline cutover，发布为 `git-7c890e08e647_web-1b702969afa5_api-948db2f7c98a`；源码模式恢复为 `GIT_SOURCE_BUILD/GIT_BUNDLE`，Web/API 镜像和 API release ID 均与 release state 一致。
- 发布后本地与 47 运行时源码 541/541 逐字节一致，运行时漂移 0；根工作树和其他 worktree 未被修改或清理。

## 验证

- 基线已通过：`bash scripts/audit-47-source-drift.sh --summary --fail-on-drift`，539/539 一致、漂移 0。
- 重构后：warehouse inventory E2E、Service、Prisma adapter、Module wiring 共 18/18 通过；管理员允许、客户 403、未登录 401 均由 E2E 覆盖。
- 双模式 DI：InMemory 1/1、`USE_PRISMA_REPOSITORY=true` 1/1 通过。
- 类型：Shared/API/Web 全部 0；新增测试后 API typecheck 再次通过。
- 治理：本切片没有改变 route/handler/permission；当前 47 基线自带的 `governance-baseline.json` 与运行源码存在大量既有权限/路由债务，且另一会话状态文件缺 canonical status，完整 `governance:check` 不能作为本轮通过项，未擅自替其他会话重写基线。
- 静态安全门：`git diff --check` 通过。
- 47 provenance：`RUNTIME_PROVENANCE_STATUS=traceable`，release commit、分支、Git bundle、Web/API 镜像和 API release ID 全部匹配。
- 47 在线固定样本：真实管理员调用 `GET /api/warehouse/packages` 返回 200 与数组，共 3,668 条且存在真实样本；真实无仓库权限角色返回 403；未登录返回 401。
- 47 运行状态：API/Web/Postgres/Redis 容器正常，公网 API health 与首页均为 200，最近 10 分钟 API/Web 日志未检出目标错误模式，发布锁 free、recovery clear。

## 切片后重评

- 安全/数据正确性：`docker-compose.yml` 的 `SEED_ON_EMPTY` 仍默认 true，`configure-app.ts` 仍是无 allowlist 的 `enableCors()`；价值最高但改变生产接入边界，下一切片需先核对 47 实际环境和合法来源，不能在本轮结构重构中顺带修改。
- 高频业务流/前端数据流：`App.tsx` 仍集中持有运单、财务、主数据和弹窗状态，并保留全局 `refreshWorkspace`；后续应按 react-admin 的 Data Provider、查询去重和资源自持状态思路选一个页面做代表切片，不整体替换 AntD 或业务页面。
- 后端架构效率：`DataController` 仍有大量路由，但本轮仓库只读查询已经完成独立 Module 装配；继续迁移仓库写动作会同时触及事务、幂等和审计，风险高于当前边际收益。
- 结论：本切片选择“停止并完成”；下一独立切片转向 P0 安全控制面，先处理生产 seed 默认值与 CORS allowlist，再回到 Web 数据边界。参考仍采用 Medusa 模块增量拆分、Vendure 的 NestJS 模块/RequestContext 边界和 react-admin 的 Data Provider/查询去重；不复制其领域模型、GPL 实现或 UI 框架。

## 终态

- 用户验收目标：以不改变现有业务行为的方式，获得干净可追溯基线，并让仓库在仓查询通过独立 Warehouse Module 装配。
- 效果证据：本地 inventory 契约 18/18；47 同一路由管理员 200、无权限角色 403、未登录 401，真实列表非空。
- 安全证据：目标 route/handler/permission 源码未改；InMemory/Prisma 两种装配均可解析；线上源码 541/541 一致且 provenance traceable。
- 发布状态：`complete`，release `git-7c890e08e647_web-1b702969afa5_api-948db2f7c98a`。
- 剩余风险：当前 47 基线自带的治理清单债务仍使完整 `governance:check` 失败；生产 seed 默认值和 CORS allowlist 尚未处理，必须作为下一独立安全切片验证后发布。
