# Sunny 深度重构 Phase 56

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`dffdb73`
- 47 基线：`git-96a01be61dfb_web-7fd6e14600c5_api-e2a4d26250b5`
- 用户验收目标：每个切片完成后重新审查并参考成熟 GitHub 项目；整个系统业务逻辑不得改变。

## 本轮重评

- P0/P1 安全：全局 DTO 校验仍缺失，但直接开启会改变残留 204 条路由的拒绝响应，不适合作为行为保持切片。
- P1 后端边界：`DataController` 2,382 行/204 条路由，身份管理 17 条路由与订单、财务、报价混杂；账号更新还有 4 个字段级二次权限决策。
- P1 Repository：Prisma/InMemory 分别 31,997/19,416 行；直接拆实现的回归面更大。
- P2 前端：Phase 55 已形成领域客户端模板，继续机械拆分的边际收益下降。
- 选择：转向身份管理，把用户组、账号、站点的 17 条管理路由迁入独立 Controller/Application Service/Repository port；审计查询继续留在原控制器，不扩大切片。
- 固定样本：账号资料更新只带普通资料时不增加权限检查；带 `role/site/enabled/password` 时仍逐项要求原 canonical permission，拒绝审计 payload 和错误文案保持不变。

## 成熟参考与取舍

- Keycloak：https://github.com/keycloak/keycloak （Apache-2.0）。借鉴 Admin REST 把 users/groups/roles 管理能力集中在身份域，并保留细粒度管理授权；不引入 Realm、联邦身份或其数据模型。
- Cerbos：https://github.com/cerbos/cerbos （Apache-2.0）。借鉴 principal/resource/action 与后端 policy decision point 分层；Sunny 继续使用既有 canonical permissions 和 Repository 授权，不引入外部 PDP。

## 风险与行为保护

- 风险：路由装饰器、HTTP 方法、外层权限、账号字段级二次权限、Repository 参数和拒绝审计漂移。
- 保护：Controller 保留原路径/装饰器；Service 只委托既有 Repository；动态权限判断逐字保留，先用服务契约测试覆盖允许与拒绝顺序，再执行路由治理与定向 E2E。

## 本地实施与审查

- 已迁移 17 条身份管理路由到 `SystemIdentityAdminController` / `SystemIdentityAdminService` / 窄 `Repository port`；原 Prisma/InMemory 方法、参数和返回值均未修改。
- `DataController` 从 204 条降到 187 条路由、2,382 行降到 2,256 行；全系统仍为 434 条路由。
- Characterization：迁移前后同一“8 位员工密码可创建并登录、7 位密码以原文案拒绝、创建写审计”E2E 均通过。
- Contract：17 条路径、HTTP 方法和外层 canonical permission 逐项锁定；普通资料更新不增加权限，`role/site/enabled/password` 的二次权限顺序、拒绝审计 payload、错误文案与 best-effort 审计逐项锁定。
- 架构治理基线只审查并接受 Controller/handler 所有权迁移及本轮实际下降的 `DataController` 债务；未吸收无关 Web/Shared 指标变化。
- 本地证据：身份 service/controller 测试 6/6、定向 E2E 1/1、API typecheck、434 路由治理、安全契约 3/3、`git diff --check` 全部通过。

## 47 发布

- 状态：待标准 Git 源码发布与线上允许/拒绝路径验证。
