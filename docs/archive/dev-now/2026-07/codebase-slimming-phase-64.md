# 代码瘦身治理第六十四阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜64`
- 续接自：`docs/dev-now/codebase-slimming-phase-63.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-64`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：继续收敛 Prisma 与 InMemory 两套巨型 Repository 中重复的报价规则选择和价格行加价解析实现。
- 固定样本：代理加价混合档位、KG 阶梯报价、EPS 价格表行与 ONT8 60KG 报价。
- 硬边界：API、RBAC、数据范围、字段裁剪、规则优先级、报价金额、数据库、写入、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/agent-markup-query.shared.ts`
- `apps/api/src/modules/pricing/agent-markup-query.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-64.md`
- `.codex-state.md`

## 当前进度

- 将 `enrichPriceBookRowMarkup`、`resolvePriceBookRowMarkup`、`findBestPriceBookRouteMarkupRule`、`findBestMarkupRule`、`safeTime` 五个纯函数迁入现有 `agent-markup-query.shared.ts`，两套 Repository 改为导入共享实现。
- 本地与 47 两仓的价格表线路规则选择、加价来源分类、时间排序和价格行补充函数体逐项同哈希；`findBestMarkupRule` 的 InMemory 与共享函数体同哈希，Prisma 唯一源码差异是 `realChannel` 表达式外的一层冗余括号，执行语义一致。
- 价格表范围优先、priority、线路特异度、更新时间、KG/CBM 阶梯区间、代理回退、默认 0.5 加价以及 `LINE_CUSTOM` / `AGENT_DEFAULT` / `VIRTUAL_DEFAULT` 分类顺序保持不变。
- 两套 Repository 各增加 1 行、删除 68 行，共享运行时增加 67 行，生产源码净减少 67 行；计入测试净增加 18 行后，生产源码与测试合计净减少 49 行。
- 本轮没有修改 Controller、DTO、Prisma schema、权限、字段裁剪、规则写入或页面，也不宣称性能提升。

## 验证

- 共享 helper 7/7、混合加价与 KG 阶梯完整 E2E 2/2、治理检查和 `git diff --check` 通过。
- 已基于 47 当前三份源码生成白名单候选，保留远端迪拜海运加价校验和其他远端分支；只构建/重启 API，无 Prisma schema 或 migrations 变化，production build 通过。
- 47 上传后的 Prisma、InMemory、共享源码 SHA-256 分别为 `6f01d1868da45d263993984dc954451796195a04f80c01bd9ef204d412cab202`、`053327d2a07be5d072d40fd54215ce39c53821c4208b5e3ab23077bec7deda6c`、`9c08b0727182bd029e67a037b89a3f55f876b499308d74e410bde4b0f83ca192`；两仓旧定义为 0，共享模块为 5 个单一定义。
- 47 管理员加价列表、EPS 价格表行、ONT8 60KG 报价发布前后响应逐字一致，状态码分别保持 200、200、201，SHA-256 分别保持 `c0c3f188d509b2a9a5e2ebc587d7786fb3f01fa69197fa455c4a8a8cec638731`、`429a4805b6863805b306de3650cf0d59c577e89185405dddc289569be49bf5e1`、`8733a074f321ab05d15f81bc6365862e2104740887f650107f2080ff5f141275`。
- 47 编译产物探针确认 KG 阶梯命中、价格表线路规则优先、线路自定义加价 `1.5/LINE_CUSTOM` 和无效时间归零；客户加价查询仍为 403“没有访问权限”。
- Web/API/Postgres/Redis 容器正常，宿主 18899 与公网 8899 首页和 API health 均为 200，API 实际 ERROR 日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算调整为：结构治理约 `64%`；真正全仓减量约 `43%`；综合约 `54%`。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-64`。
- 明确保留：审计、状态流转、字段裁剪、财务和所有写入归一化/校验函数不进入下一批；代理名称清理函数因参与生产写入继续保留原位。
- 下一候选：离开当前已接近低密度的代理加价簇，扫描其他领域的高密度纯只读重复实现或本地/47 双零调用遗留；不为合并两个三行函数单独增加抽象。
