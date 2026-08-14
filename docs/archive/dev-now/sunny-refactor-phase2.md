# Sunny 深度重构第二阶段

- 状态：`completed`
- 会话标题：`Sunny｜深度重构第二阶段｜02`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase1.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（用户要求继续推进优化）`
- 会话 slug：`sunny-refactor-phase2`
- 分支：`codex/sunny-refactor-phase2`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase2`
- 认领时间：`2026-08-11 23:00 Asia/Shanghai`

## 输入摘要

- 目标：恢复水单待审核匹配队列的可靠 E2E 保护，并在不改变路由、权限、schema、金额口径和审核流程的前提下建立 Repository port 与 application service 边界。
- 不做：不迁移数据库，不改生产财务数据，不调整前端 UI，不把整个 FinanceReceivableService 一次性重写。

## 允许修改

- `apps/api/src/modules/app.finance.e2e.test.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.service.ts`
- `apps/api/src/modules/finance/water-receipt/**`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase2.md`

## 当前进度

- 已从第一阶段已发布分支建立独立 phase2 worktree。
- 固定样本：财务对已到账水单提交一笔系统应收分配，提交后应保持待审核且不落账；财务审核后才形成 match、更新应收与余额；撤销匹配后允许反审核应收。
- 已把两条旧 Finance E2E 更新为当前审核队列语义：提交只生成 `PENDING` allocation，审核后才落账；已审核匹配通过反审核请求撤销，业务员只能读取自己创建的水单。
- 已新增 `WaterReceiptAllocationRepository` port 与 `WaterReceiptAllocationService`，五个水单分配入口从综合 `FinanceReceivableService` 迁出；当前 Prisma/InMemory 巨型 Repository 仅作为 adapter，事务、权限、金额和审计实现未移动。

## 验证

- `water-receipt-allocation.service.test.ts`：2/2 通过。
- 两个目标 Finance E2E：2/2 通过。
- API typecheck 通过；`git diff --check` 通过。
- 47 白名单发布完成：`whitelist-0466d01a72519618eb8b06d3`。
- 线上源码 416/416 一致；API 镜像与 release state 一致，公网 health 200，五条目标路由全部完成映射，未登录访问返回 401，发布锁与 recovery 状态正常。

## 交接

- 阻塞：无
- 剩余风险：财务匹配涉及权限、待审核占用、并发锁、应收与水单余额；本阶段只迁移调用边界，不移动事务实现。
- 用户验收目标：水单匹配流程有符合当前审核队列的自动化保护，Controller 不再直接通过综合 Finance service 访问巨型 Repository 的匹配方法。
- 效果证据：目标 E2E 证明待审核不落账、审核后落账、反审核后解除应收反审核阻断；应用服务单测证明五个入口参数与返回值原样穿过 port。
- 安全证据：Controller 的原权限装饰器未改，Repository adapter 与事务实现未改；API typecheck、`git diff --check` 通过。
- 未验证项：未对生产财务数据执行写入探针；由本地固定样本 E2E 覆盖写路径，避免污染线上水单与应收。
- 发布状态：`已发布 whitelist-0466d01a72519618eb8b06d3`
- 稳定附件：无
- 准确下一步：修复并跑通两个过期 Finance E2E，再抽取水单分配 port/service。
- 建议新标题：`Sunny｜深度重构第二阶段｜03`
- 建议新状态文件：`docs/dev-now/sunny-refactor-phase3.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
