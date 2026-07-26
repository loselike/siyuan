# 代码瘦身治理第四十四阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜44`
- 续接自：`docs/dev-now/codebase-slimming-phase-43.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-44`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：扫描两套巨型 Repository 的零引用私有类方法；若安全候选均落入禁区，则收敛下一个完全等价、无副作用的窄函数簇。
- 固定样本：亚马逊出货仓归一化、来源去重排序、业务员报价元数据和按出货仓过滤继续保持现行结果。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/amazon-origin.shared.ts`
- `apps/api/src/modules/pricing/amazon-origin.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/pricing-excel.ts`
- `docs/dev-now/codebase-slimming-phase-44.md`
- `.codex-state.md`

## 当前进度

- 使用 TypeScript AST 扫描两套 Repository 的 367 个显式私有方法及 28 个私有属性，并检查 `this.method`、常量字符串下标访问和全 API 运行时词边界引用。
- 本地零引用私有方法只落在财务付款查询和业务员数据范围判断；47 另有两个仓库理货编号旧方法。扩展扫描还发现内存财务旧入口。以上均命中财务、数据范围或状态流转禁区，本阶段全部保留不动。
- 将 Prisma、InMemory 和 Excel 解析器中的三份亚马逊出货仓归一化规则收敛到 `amazon-origin.shared.ts`；两套 Repository 同时复用唯一的来源去重和业务顺序排序实现。
- 两套 Repository 的数组、归一化和去重函数与 47 当前源码逐项哈希一致；Excel 版本只有 `cellToText` 与等价的 `String(value ?? '').trim()` 入口差异，后续替换、空白归一化和返回规则相同，并由固定样本验证。
- 本地两套 Repository 各减少 51 行，`pricing-excel.ts` 减少 39 行，新增 51 行共享运行时后，生产源码净减少 90 行；新增 21 行测试后，生产源码与测试合计净减少 69 行。
- 47 同样净减少 90 行，并完整保留远端已有上传路径、迪拜加价、理货生命周期等差异。
- 本阶段只统一纯字符串归一化和列表排序，不改变价格、重量档、仓库代码匹配、数据库查询或权限裁剪，不宣称性能提升。

## 验证

- 安全测试通过 3/3：共享 helper 归一化/拒绝规则、去重排序，以及业务员隐藏内部渠道并按亚马逊出货仓过滤的完整固定样本。
- `npm run governance:check` 与 `git diff --check` 通过。
- 已从 47 当前源码应用四文件白名单补丁，仅构建并重启 API，无 Prisma 变更或迁移；production build 通过。
- 47 四个运行时文件与上传候选 SHA-256 完全一致；三处旧定义收敛为共享模块中的一份常量、两个导出函数和三个调用方导入。
- 47 构建产物直接验证：`深圳／广州仓 -> 深圳/广州仓`、欧洲海运路由被拒绝、`华东/华南/深圳广州` 去重后保持既定顺序。
- 47 业务员 `quote-meta` 保持 200、来源数组无重复或路由污染；当前生产数据返回 0 个来源，因此只证明接口和空集行为，非空排序由构建产物固定样本证明。未登录仍为 401“缺少登录凭证”。
- API/Web/Postgres/Redis 容器正常；API 容器内 health、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且本次窗口实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `55%`；真正全仓减量约 `32%`。本阶段同时完成单一职责收敛和真实减量。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-44`。
- 准确下一步：继续扩展现有 `amazon-origin.shared.ts` 所在定价共享边界，优先收敛两套实现逐字等价的亚马逊重量档/CBM 标签纯解析函数；继续避开财务、账号、数据范围、状态流转和审计。
