# 代码瘦身治理第六十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜69`
- 续接自：`docs/dev-now/codebase-slimming-phase-68.md`
- 上下文状态：`green`
- 输入来源：持续目标要求提高治理投入产出比，优先处理可复用的纯只读基础能力
- 会话 slug：`codebase-slimming-phase-69`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：将排货页重复的本周/今日边界和五类周期统计收敛到现有北京时间与路由周期 helper，同时回补 47/Git 的同源基础文件。
- 固定样本：北京时间周一边界内的排货、出库、退回、敏感货和报关货统计保持准确；上月数据不得进入本月统计。
- 硬边界：不改页面入口、卡片、筛选、表格、按钮、API、权限、数据范围、字段裁剪、数据库、写入、状态或审计。

## 修改

- `apps/web/src/modules/shared/format.ts`
- `apps/web/src/modules/shared/format.test.ts`
- `apps/web/src/modules/routing/routingPeriod.ts`
- `apps/web/src/modules/routing/routingPeriod.test.ts`
- `apps/web/src/modules/routing/RoutingPage.tsx`
- `docs/dev-now/codebase-slimming-phase-69.md`
- `.codex-state.md`

## 当前进度

- 扩展公共时间格式化模块，统一提供北京时间日期、日期输入转换、日/周边界与周期判断。
- 新增纯函数 `getRoutingPeriodSnapshot`，集中计算排货、出库、退回、敏感货和报关货的周/月统计。
- `RoutingPage` 删除 31 行本地时间边界与重复过滤，只保留既有变量名和页面消费点；今日与本周口径改为显式北京时间。
- 本阶段是 47/Git 基线恢复和重复逻辑收敛，生产源码净增加 79 行，不计作“代码行减量”；漂移硬指标从 `56 changed + 46 remote-only` 降至 `55 changed + 45 remote-only`。

## 验证

- Web 安全 runner 的北京时间与路由周期定向测试 5/5 通过，覆盖 UTC 转北京时间、纯业务日期、datetime-local 往返、北京时间日/周边界和周/月统计。
- 扩大到排货整页测试时 16 个用例中 14 个通过；2 个失败分别为既有区域导航与应付成本弹窗定位，未落在本轮时间/统计调用链，不记为全量通过。
- Web typecheck 仍被当前分支既有的财务 `filterOptions` 和仓库理货状态测试夹具错误阻断；本轮目标文件没有新增类型错误，不记为通过。
- `git diff --check` 通过。
- 本地与 47 的 `format.ts` SHA-256 同为 `a911788fc52632ae3bee95048f1dd2fada79259ffce7dc88f15c5024d68980de`；`routingPeriod.ts` 同为 `f2596c22954310140b722188f6ec41186fedaaad8882619689cc102fcedb0bce`。
- 47 公网首页与 API health 均为 200。

## 交接

- 阻塞：无。
- 发布状态：`无需重复发布`；47 已运行相同基础 helper 和更完整的排货页，本阶段只恢复 Git 基线并在当前页面收敛重复只读计算。
- 准确下一步：停止按单文件追逐微小漂移，扫描 Prisma/InMemory 两套 Repository 或高密度页面中可一次净删至少 30 行生产代码的重复只读实现；候选必须先证明本地与 47 行为等价，再按一个领域切片提取。
