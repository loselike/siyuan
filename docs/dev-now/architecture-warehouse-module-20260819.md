# 全局底层优化：仓库查询代表切片

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜01`
- 会话 slug：`architecture-warehouse-module-20260819`
- 分支：`codex/architecture-warehouse-module-20260819`
- worktree：`/Users/j1ng/Tools/sunny-architecture-warehouse-module-20260819`
- 基线提交：`39ad86173f1e543a2f82988cdafdbdb542e50ab4`（`origin/main`）
- 认领时间：`2026-08-19 Asia/Shanghai`

## 目标与范围

- 目标：以不改变现有业务行为的方式，把 `GET /api/warehouse/packages` 从根 `AppModule` 手工装配迁入独立 `WarehouseInventoryModule`，并建立可复用的数据访问模块边界。
- 固定样本：管理员读取仓库包裹返回 200/数组；客户角色访问同一路由返回 403；未登录返回 401。
- 行为冻结：路由、HTTP 方法、响应、权限键、数据范围、字段裁剪、Prisma/InMemory 选择和现有审计行为不变。
- 不做：不改数据库结构、生产数据、权限模型、仓库状态机、财务口径、前端 UI；不清理或覆盖根工作树和其他 worktree。

## 并发隔离与基线调整

- 初始工作树 `/Users/j1ng/Tools/sunny-architecture-baseline-20260819` 已捕获当时 47 运行树并提交 `2daa13b`，但执行期间 `origin/main` 和 47 已被其他会话继续推进。
- 为避免把旧基线覆盖到并发成果，本切片没有重置或修改其他会话文件，而是从最新 `origin/main` 新建独立 worktree/分支；旧基线提交不参与本次发布。
- 当前根工作树与其他 worktree 均只读；本任务只写本 worktree。

## 成熟项目参考

- [Medusa](https://github.com/medusajs/medusa)：借鉴领域 Module、窄接口和显式工作流边界；MIT。Sunny 保持模块化单体，不复制电商领域模型或实现。
- [Vendure](https://github.com/vendurehq/vendure)：借鉴 NestJS 模块装配与请求边界；GPLv3。只参考架构，不复制 GPL 代码。
- [react-admin](https://github.com/marmelab/react-admin)：后续 Web 切片借鉴 Data Provider、查询缓存与去重；MIT。本切片不改 Web，也不替换 AntD。

## 已完成

- 新增 `DataAccessModule`，统一注册并导出 `PrismaRepository`，Prisma 模式同时导出 `PrismaService`；生产自动 seed 的原有生命周期和禁用规则保持不变。
- 新增 `WarehouseInventoryModule`，从根 `AppModule` 接管 Warehouse inventory query service、repository adapter 和 authorizer 的装配。
- 新增只负责 `GET /warehouse/packages` 的 `WarehousePackagesQueryController`；原 controller 保留尚未迁移的 today/in-stock/delete/group/customer 路由。
- 增加架构边界门禁，禁止代表 controller 重新直连 Prisma/总 Repository，并锁定 Service → inventory query port 依赖方向。
- 增加双模式装配测试，分别验证 InMemory 与 Prisma provider 图可以编译并解析正确 adapter。

## 验证

- 重构前 characterization：仓库 inventory E2E、Service、Prisma adapter 共 11/11 通过。
- 重构后效果：同一组仓库测试 11/11 通过；管理员允许、客户 403、未登录 401 均由 E2E 覆盖。
- 双模式 DI：InMemory 1/1、`USE_PRISMA_REPOSITORY=true` 1/1 通过。
- 类型：Shared/API/Web 全部 0；新增测试后 API typecheck 再次通过。
- 治理：`npm run governance:check` 通过，434 条路由契约保持，Mojia 安全测试 3/3 通过。
- 静态安全门：`git diff --check` 通过。

## 发布与剩余项

- 发布状态：`待提交并进入 47 全局发布队列`。
- 发布前必须重新取得 47 锁内 baseline；当前 `.codex-state.md` 记录的 release provenance 已知过期，禁止据此覆盖远端。
- 下一切片重评：安全/数据正确性优先检查 47 provenance；高频业务流候选为 Warehouse 页面查询自持；后端架构候选为继续迁移 inventory controller 的 today/in-stock 路由。必须在本切片发布证据完成后再决定。
