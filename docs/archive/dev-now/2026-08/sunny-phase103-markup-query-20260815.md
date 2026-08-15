# Sunny Phase103：加价规则只读查询边界收口

- 状态：completed
- 目标：把 `DataController` 中已有定价领域的加价规则列表、导出、单条预览 3 条只读路由收口到独立 `AgentMarkupQueryController`，保持业务行为完全等价。
- worktree：`/Users/j1ng/Tools/sunny-phase103-markup-query`
- branch：`codex/sunny-phase103-markup-query`
- 禁止：不修改加价计算/写入、权限定义、仓储实现、schema/migration、业务数据、审计口径或前端 API。

## GitHub/成熟实践参考

- [Medusa Modules](https://github.com/medusajs/medusa)：借鉴按领域把只读查询入口隔离于单体仓储 facade；Sunny 仍复用 `PrismaRepository`，不引入新运行时。
- [Twenty](https://github.com/twentyhq/twenty)：借鉴 feature 级 query controller 与窄边界；本轮只搬运既有 handler，不复制领域规则。
- [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只跑加价规则 API 定向测试、类型检查与路由架构门禁。

## 行为保持清单

- 保留 `GET /pricing/markup-rules`、`GET /pricing/markup-rules/export`、`GET /pricing/markup-rules/:id/preview`。
- 保留原 `@RequirePermission` 数组、`AgentMarkupListQuery`、参数顺序、仓储方法和响应对象。
- 不改变写入路由、规则计算、客户/角色裁剪或导出内容。

## 验收与发布

- 最小验收：新增 Controller characterization 覆盖列表/导出/预览委托；既有 API pricing E2E 继续覆盖真实 URL。
- 辅助验收：API typecheck、定向安全 runner、`architecture:check:fast`、`git diff --check`。
- 本轮无 schema/migration；发布前仍受 context governance 状态归档门禁约束，不绕过。

## 验证结果与重审

- `npm run test:api:safe -- --run src/modules/pricing/agent-markup-query.controller.test.ts`：1/1 通过。
- `npm run test:api:safe -- --run src/modules/app.pricing.e2e.test.ts -t "supports usa canada dubai pricing module isolation"`：1/1 通过，覆盖定价规则读写链路和权限入口。
- `npm run typecheck -w @siyuan/api`、`npm run architecture:check:fast`（434 route contracts）、`git diff --check` 通过。
- 完整 `app.pricing.e2e.test.ts` 在 Phase102 基线与本分支均为 51/68，通过逐项对照确认 17 个既有 fixture/业务断言失败未因本次路由搬迁增加；本轮不修改这些既有语义。
- `DataController` 由 1,878 行降至 1,859 行；新增控制器只复用 `PrismaRepository`，未改变 URL、权限集合、查询参数、响应或规则计算。无 schema、migration、业务数据或权限定义变更。
- 下一最高收益：继续沿已有领域边界做只读查询收口，或单独治理 pricing E2E 的 17 条基线失败；不应把基线失败混入新的结构重构。
