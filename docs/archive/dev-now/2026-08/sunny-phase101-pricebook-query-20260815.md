# Sunny Phase101：价格表只读查询边界收口

- 状态：completed
- 目标：把仍位于 `DataController` 的价格表只读查询/导出路由收口到既有 `PriceBookQueryController`，保持 URL、权限、查询参数、返回体、下载响应和仓储调用完全不变。
- 禁止：不修改价格计算、价格表写入、加价规则、数据库 schema/migration、线上数据、角色权限或业务状态。
- worktree：`/Users/j1ng/Tools/sunny-phase101-pricebook-query`
- branch：`codex/sunny-phase101-pricebook-query`

## 全局重评与优先级

- P0：当前 47 provenance traceable，health/home 正常；未发现新增数据或权限事故。
- P1：`DataController` 仍约 1,918 行、182 条路由；其中价格表查询边界已有 `PriceBookQueryController`，但分页线路、加价线路、规则刷新和下载仍留在巨型入口，继续扩大耦合。
- P2：`PrismaRepository`/`InMemoryRepository` 仍很大，但本轮不复制仓储逻辑；先把已有查询边界补齐，避免一次性拆高风险报价写入流程。

## GitHub 参考与取舍

- [Medusa Modules](https://github.com/medusajs/medusa)：借鉴按领域把查询服务/Controller 与旧仓储适配器分开；Sunny 保留 `PrismaRepository` facade，不复制 Medusa 的模块运行时。
- [Twenty](https://github.com/twentyhq/twenty)：借鉴按 feature package 组织 query controller 和窄接口；本轮只扩展现有 pricing/price-book 边界，不引入 monorepo 或 ORM 改造。
- [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只运行价格表相关 API 定向测试、类型检查和架构路由门，不启动无关全量回归。

## 预期行为保持证据

- 保留原路由：`pricing/books/rule-refresh-progress`、`pricing/book-rows`、`pricing/books/:id/rows`、`pricing/books/:id/markup-routes`、`pricing/books/:id/download`。
- 保留原 `@RequirePermission` 集合、仓储方法、参数顺序、分页查询对象和下载 MIME/Content-Disposition 头。
- 新增 Controller characterization，覆盖仓储委托和下载响应头；既有 pricing E2E 继续覆盖真实路由。

## 验证与发布

- 本地门禁：API 定向 Controller/price-book E2E、API typecheck、architecture fast、`git diff --check`。
- 已通过：`npm run test:api:safe -- --run src/modules/pricing/price-book/price-book-query.controller.test.ts src/modules/price-book-query.e2e.test.ts`（4/4）、`npm run typecheck -w @siyuan/api`、`npm run architecture:check:fast`（434 route contracts）、`git diff --check`。
- 为本 worktree 生成 Prisma Client 后再执行定向测试和 API typecheck；未修改 schema、migration 或业务数据。
- 发布前须重新捕获 47 基线；本轮无 migration，候选只扩大 API；Phase100 已记录的 context governance 门禁（活动状态文件超限且历史终态未归档）仍需先由主推进会话处理，不能绕过发布。

## 本轮重审结论

- 5 条路由只更换 Controller 归属，URL、HTTP 方法、参数、权限数组、仓储调用和下载响应头逐项保持一致；架构基线同步记录新归属，未新增或删除公开路由。
- `DataController` 从 1,918 行降至 1,878 行；`PriceBookQueryController` 承接既有价格表只读边界。Prisma/InMemory、前端、schema、migration、权限定义和持久化流程未改。
- 下一最高收益不再是继续搬运价格表路由，而是先解决干净基线的 Prisma Client 生成/依赖可重复性，再选择下一条已有领域边界；不能在类型基线不稳定时继续扩大拆分。
