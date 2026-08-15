# 市场管理正向权限重构｜2026-08-15

## 目标

将市场管理从旧的技术型权限、反向 block 和跨模块隐式组合，收敛为 17 个可观察的正向 `resource:action` 权限。查看控制入口和数据存在，动作按功能点独立授权；后端与 Repository 继续执行站点、状态和对象归属校验。不得删除或改写订单、客户、费用、排货记录等业务数据。

## 权限边界

- 市场看板：`market:dashboard:view`
- 待排货：`view`、`route`、`edit`、`approve`、`operation-log:view`、`business-cost:view/create/edit/delete`、`return-review`
- 已排货：`view`、`edit`、`reroute`、`routing-log:view`
- 排货数据：`view`、`export`
- 动作权限由运行时自动补齐必要的父级 `view`；撤销 `view` 同步撤销依赖动作，避免死权限。
- “审核后业务成本不可修改/删除、只允许新增”是状态机约束，不通过额外权限绕过。
- 全局字段屏蔽仍是 deny-first，总规则优先于市场正向授权。

## 例外权限清理规则

本次迁移只清理由 `20260714150000_backfill_function_permissions` 明确建立、且已被本次 17 个 canonical 权限替代的显式旧 code（包括旧 `weekly-routing`、旧详情/列设置/成本查看和已知 `*-block`）。不使用 `market:%` 前缀做通配删除；未知、额外或业务例外权限及其关系保持不变。内置 `UG_MARKET` 的三个已确认会绕过市场站点决策点的遗留继承 grant 另行显式移除，其余跨模块授权保留。

市场站点解析约定：账号或对象归属用户的 `site` 为空时按“深圳思远”处理；迁移不回写账号或业务对象，也不因空站点阻断权限迁移。存在站点值时按该站点隔离。

## 设计依据

- [Apache Casbin](https://github.com/casbin/casbin)：主体—资源—动作、deny-overrides 与策略决策点。
- [Keycloak](https://github.com/keycloak/keycloak)：资源与 scope 的细粒度授权、角色归一化。
- [Cerbos](https://github.com/cerbos/cerbos)：动作授权与资源状态/属性在后端共同决策。

只借鉴上述 Apache-2.0 项目的架构原则，不复制代码、策略语法或数据库结构；Sunny 仍以自身站点、岗位、财务和订单状态模型为准。

## 本轮验证与发布状态

- 站点规则已落地：启用账号或对象 owner 的空 `site` 按“深圳思远”解析；仍要求市场对象能够解析到有效 owner，避免无归属数据被放大可见。迁移不修改这些业务记录。
- 本候选修改包含 API、Web、shared 与 Prisma migration；业务表仅做行数保护快照，迁移不写业务表。
- 候选仍需通过精确的 API/Web 安全门和 47 Docker 构建后再执行 `prisma migrate deploy`；不得把其他并发脏文件带入发布。
- 已知候选基线存在若干非市场模块的未落地依赖，若构建仍失败，应生成只含本任务白名单的可构建候选，不得绕过安全门发布。

## 继续验证｜2026-08-15 12:57

- `market-positive-permission.test.ts`：3/3 通过。
- `marketPermissionUi.test.tsx`：4/4 通过。
- `app.orders.e2e.test.ts -t "scopes operator shipment data"`：1/1 通过，空站点按深圳思远、显式站点隔离。
- `rbac.test.ts -t "keeps market, warehouse, finance"`：1/1 通过。
- `git diff --check`：通过。
- `npm run deploy:47 -- --dry-run`：按规则拒绝 apply，候选仍有 18 个运行时文件未提交，范围为 `web+api+migrate`。
- 未执行线上迁移、重启或业务数据写入。当前候选的 Shared 模块依赖 `packages/shared/src/contract-gaps.ts`，该文件不在此候选分支；API/Web 类型检查还受此依赖及其他基线模块漂移阻断。长订单 E2E 另在固定的“业务供应商”代理基础资料匹配处返回 400，未改动市场权限代码，暂不以改生产逻辑规避。

发布门结论：市场权限逻辑和定向验收已闭环，但当前候选不是可发布的干净协调工作树。下一步必须由发布协调会话基于最新 47 基线生成只包含本任务白名单的可构建提交，解决 Shared 契约依赖后，再走标准/白名单发布入口；不得用全量脏树同步或跳过安全门。

## 发布复核｜2026-08-15 当前会话

- 再次执行 `npm run deploy:47 -- --dry-run`：仍为 `web+api+migrate`，`DIRTY_RUNTIME_COUNT=18`，apply 继续被发布门阻断；未执行线上迁移、重启或业务数据写入。
- 临时补齐候选 Shared 契约文件后，`npm run build -w @siyuan/shared` 可通过；API 类型检查仍有 9 个仓库/Shared 基线契约漂移错误（master-data、warehouse summary/query、tally lifecycle），不是市场权限定向改动可安全修补的范围。临时文件已移出候选，避免误纳入发布。
- 结论保持：不能把当前混合候选直接发布；需要发布协调会话从同一可构建基线重建白名单，再执行 API/Web Docker 构建、迁移和线上验证。

## 干净发布候选复核｜2026-08-15

本次发布协调分支从可构建的 `f65e53a` 基线重建，仅纳入本任务的 API、Web、Shared、迁移、定向测试和状态记录；未纳入其他会话的运行时修改。空站点按深圳思远处理，不回写账号或业务数据。

- Shared build：通过。
- API typecheck：通过。
- Web typecheck：通过。
- 市场权限 API 定向测试：3/3 通过。
- 市场权限 Web 定向测试：4/4 通过。
- RBAC 定向测试：15/15 通过。
- `git diff --check`：通过。
- 待执行：推送干净 release 分支、执行标准 47 baseline/deploy，运行唯一迁移并完成 API、容器及公网 health 验证。
