# Sunny 深度重构第四阶段

- 状态：`completed`
- 会话标题：`Sunny｜深度重构第四阶段｜04`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase3.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：持续按全量扫描、GitHub 对标和业务逻辑不变准则推进
- 会话 slug：`sunny-refactor-phase4`
- 分支：`codex/sunny-refactor-phase4`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase4`
- 认领时间：`2026-08-11 Asia/Shanghai`

## 输入摘要

- 当前 47 核对：AppModule、FinanceReceivableService、FinanceReceivableController 与 phase3 候选校验和一致，可作为本阶段精确基线。
- 本阶段目标：参考 Vendure 的领域模块和稳定 port，把水单查询、创建、修改、到账、归档、作废、凭证删除和导出从综合 FinanceReceivableService 移入独立 lifecycle application service。
- 固定样本：财务新增水单后手工修改付款编号，结算方式校验、响应、审计与持久化结果保持一致；到账/归档/作废/凭证删除/导出仅切换依赖边界。
- 不做：不改 Controller 路由或权限，不改 Repository、Prisma、金额、状态机、事务、审计和错误文案，不新增输入限制。

## 允许修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.service.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-lifecycle.repository.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-lifecycle.service.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-lifecycle.service.test.ts`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase4.md`

## 验证

- Lifecycle service 单测 4/4 通过：九个 port 方法的委托关系、结算方式校验顺序与错误文案均受保护。
- 三条既有财务 E2E 3/3 通过：严格水单编号与作废、付款编号创建/修改与审计、到账/匹配/列表/归档/导出及权限链路保持现状。
- API typecheck 与 `git diff --check` 通过。
- 架构 fast check 成功执行；输出的权限基线、巨型文件计数漂移均为当前分支既有债务，本阶段没有修改所列 DataController、Repository、Shared、Web 文件或权限装饰器。
- 行为等价审查：Controller 路由、HTTP 方法、权限装饰器和输入/返回类型未变；Prisma/InMemory Repository、金额、状态机、事务、审计和错误文案未修改；原 settlement-method 代码按原顺序原样迁入 lifecycle service。
- 47 白名单发布 `whitelist-62fb932c54798be6f35a933f` 成功；五个运行目标文件校验和与候选完全一致，API 生产构建和重启成功，编译产物包含 lifecycle service 与 port token。
- 47 九条水单生命周期路由均只映射一次；公网 `/api/health` 200，未登录水单列表返回 401；API/Postgres/Redis 正常，发布锁 free、recovery clear。

## 交接

- 阻塞：无。
- 风险：新 port 当前仍由两套巨型 Repository 直接适配；本阶段只建立边界，尚未迁移底层事务实现。
- 发布状态：已发布并完成非浏览器线上验证。
