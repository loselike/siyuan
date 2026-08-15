# Sunny Phase104：价格规则查询边界收口

- 状态：completed
- 目标：把 `DataController` 中价格规则列表和报价预览两条只读路由收口到 `PricingRuleQueryController`，保持请求、权限、结果和仓储调用完全等价。
- worktree：`/Users/j1ng/Tools/sunny-phase104-pricing-rule-query`
- branch：`codex/sunny-phase104-pricing-rule-query`
- 禁止：不修改价格规则写入、价格计算、权限定义、schema/migration、业务数据、财务金额或状态流转。

## GitHub/成熟实践参考

- [Medusa Modules](https://github.com/medusajs/medusa)：借鉴按定价领域拆分 query/application 入口，继续复用 Sunny 现有 Repository facade。
- [Twenty](https://github.com/twentyhq/twenty)：借鉴 feature query controller 的窄边界；不复制其 ORM 或工作流。
- [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只验证价格规则控制器、API 类型和路由架构。

## 行为保持清单

- 保留 `GET /pricing/rules` 与 `POST /pricing/rules/quote`。
- 保留原 `RequireAllPermissions` 全量权限数组、请求体类型、管理员/角色裁剪由 Repository 执行的调用顺序和响应。
- 不触碰 `POST /pricing/rules`、`PUT /pricing/rules/:id/enabled` 等写入路由。

## 验收与发布

- 新增 Controller characterization 覆盖列表/报价委托；既有 pricing E2E 代表报价用例继续复用。
- API typecheck、定向 safe test、`architecture:check:fast`、`git diff --check` 必须通过。
- 本轮无 schema/migration；发布前仍受 context governance 归档门禁约束。

## 验证结果与重审

- `npm run test:api:safe -- --run src/modules/pricing/pricing-rule-query.controller.test.ts`：1/1 通过。
- `npm run test:api:safe -- --run src/modules/app.pricing.e2e.test.ts -t "maintains channel pricing rules and generates shipment fees from rule quotes"`：1/1 通过。
- API typecheck、`architecture:check:fast`（434 route contracts）和 `git diff --check` 通过。
- `DataController` 从 Phase103 的 1,859 行降至 1,846 行；仅新增查询控制器与委托 characterization，未修改规则写入、报价算法、权限集合或持久化。
- 复审未发现业务数据、系统数据、schema/migration 或权限逻辑变化；下一步应先合并/发布前述小切片，或单独建立 pricing E2E 基线失败治理卡，不把两类工作混在一起。
