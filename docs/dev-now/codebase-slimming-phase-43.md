# 代码瘦身治理第四十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜43`
- 续接自：`docs/dev-now/codebase-slimming-phase-42.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续真实减量
- 会话 slug：`codebase-slimming-phase-43`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：复扫上一阶段删除后新暴露的级联零调用函数，并扩展到 API 运行时源码的顶层私有声明；只删除本地和 47 均不可达的实现。
- 固定样本：现行价格表时效裁剪、代理公司名称脱敏和加拿大仓库编码分组解析继续使用当前共享实现。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/pricing-excel.ts`
- `docs/dev-now/codebase-slimming-phase-43.md`
- `.codex-state.md`

## 当前进度

- 删除两套 Repository 中各一份 `combinePricingDisplayRemarks`，以及 `pricing-excel.ts` 中 `legacySanitizePricingTransitLabel`、`legacySanitizePricingChannelRequirement`、`looksLikeWarehouseCodeList`，共五个零调用定义。
- 五个定义在本地和 47 均只有定义本身，没有调用、导出或测试直接引用；47 对应函数块与本地变更前逐项哈希一致。
- 现行 `sanitizePricingTransitLabel`、`sanitizePricingChannelRequirement` 共享规则导出继续保留，仓库编码解析的生产调用继续使用现行路径。
- 本地 `PrismaRepository` 由 18,939 行降至 18,933 行，`InMemoryRepository` 由 14,572 行降至 14,566 行，`pricing-excel.ts` 减少 135 行；本阶段生产源码净减少 147 行，没有新增包装或测试代码。
- 47 三个文件分别减少 6、6、135 行，远端已有功能和差异均通过“47 当前文件为基线”的白名单补丁保留。
- 删除后已复扫 API 非测试运行时 TypeScript 的顶层未导出函数、变量、类型、接口、类和枚举，未再发现仅出现一次的声明；该结论不覆盖类私有方法或动态字符串引用。
- 删除的是不可达实现，不改变现行解析、查询、匹配、裁剪或数据库访问，也不宣称性能提升。

## 验证

- 安全测试通过 3/3：自然日时效只保留有效承诺、代理公司身份从渠道要求中脱敏、TPD 路由/加拿大区域/仓库编码保持分离。
- `npm run governance:check` 与 `git diff --check` 通过；全阶段差异为 147 行纯删除。
- 已从 47 当前源码应用三文件白名单删除补丁，仅构建并重启 API，无 Prisma 变更或迁移；production build 通过。
- 47 源码与上传候选的三个 SHA-256 完全一致；四个被删函数名在生产源码和构建产物中均为 0，现行两个共享裁剪入口在生产源码继续存在。
- 47 管理员加价规则 200/20、南非规则 200/19、按有效代理读取价格行 200/20 且分页字段完整；未登录仍为 401“缺少登录凭证”。
- API/Web/Postgres/Redis 容器正常；API 容器内 health、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且本次窗口实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `54%`；真正全仓减量约 `31%`。本阶段是无新增抽象的纯删除。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-43`。
- 准确下一步：扫描两套巨型 Repository 的零调用私有类方法，并以调用图排除动态访问；若没有安全纯删除，再选择两套实现中完全等价、无副作用且不涉及财务、账号、状态流转或审计的函数簇做共享收敛。
