# 代码瘦身治理第六十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜61`
- 续接自：`docs/dev-now/codebase-slimming-phase-60.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-61`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：把 Prisma 与 InMemory 两套巨型 Repository 中重复的大件货物画像和欧洲运输方式判断收敛到单一 pricing 共享实现。
- 固定样本：亚马逊、欧洲超大件综合查询、欧洲空海运铁路快递查询的亮崽大件路由 E2E。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、字段裁剪、报价金额、渠道过滤、数据库、写入、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/legacy-cargo-profile.shared.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-61.md`
- `.codex-state.md`

## 当前进度

- TypeScript AST 逐项校验确认 `LegacyCargoProfileInput`、`LargeCargoProfile`、`numericInput`、`createLargeCargoProfile`、`largeCargoRedirectMessage`、`isEuropeTransportMode` 在本地两仓和 47 两仓四份源码中哈希完全一致。
- 新增 `pricing/legacy-cargo-profile.shared.ts` 作为单一实现；两套 Repository 只改为导入共享函数和类型，下游大件渠道承接判断、查询构造、报价计算与字段裁剪全部保持原位。
- 共享实现中五个函数体（包括消息数字取整依赖）与变更前两仓对应函数体 SHA-256 逐项一致，阈值、关键词、原因顺序、数字格式和拒绝文案没有改写。
- 两套 Repository 各增加 1 行、删除 41 行；新增共享运行时 46 行，生产源码净减少 34 行，没有新增兼容包装或测试代码。

## 验证

- InMemory 完整亮崽大件路由固定样本 1/1 通过，覆盖 181cm 拒绝原文案、180cm 边界普通渠道过滤、欧洲超大件卡派筛选和亚马逊海卡筛选。
- `git diff --check` 通过；两仓旧定义清零，共享模块保持单一定义。
- 已基于 47 当前两份 Repository 源码应用白名单补丁并新增共享模块，只构建/重启 API，无 Prisma schema 或 migrations 变化。
- 47 production build 通过；上传后三个源码 SHA-256 分别为 `a46934aab34efd43824eb9460252054e845e3715f00784236c351d2850c5ea09`、`43a3997d3c390e9920d87f6d76f198780eb4f914e2d22a3a6b356ae1e2e52812`、`eb5b7773881269d5d04aadd8c316525dffc0d72829e1eeca72309b7f5465c36d`，与候选一致。
- 47 编译产物固定探针确认 181cm 桌子仍输出“长度 181cm 超过 180cm、品名/包装包含大件关键词，应走欧洲超大件综合查询”，运输方式 `AIR` 为真、`EXPRESS` 为假。
- Web/API/Postgres/Redis 容器正常，宿主实际 18899 端口与公网 8899 的首页、API health 均为 200；目标报价接口未登录仍为 401“缺少登录凭证”，API 实际 ERROR 日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算仍为：结构治理约 `63%`；真正全仓减量约 `42%`；综合约 `53%`。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-61`。
- 剩余主项：两套 Repository 仍分别约 18k/14k 行，仍是最大臃肿源；`DataController`、`shared/index.ts`、`App`、`PricingPage`、`WarehousePage` 和全局 CSS 仍需分阶段治理。
- 下一候选：复核两仓中逐字一致的 `buildAgentMarkupDisplay`、`groupAgentMarkupRows`、`buildAgentMarkupListResponse` 三个只读加价列表响应构造器，优先扩展现有 `pricing/agent-markup-query.shared.ts`。实施前必须再次比对本地与 47，确认不会改变内部字段可见性、排序、计数、禁用规则处理和返回字段；若任一响应语义不同则继续保留原位。
