# Sunny 深度重构 Phase 38

- 状态：completed
- 分支：`codex/sunny-refactor-phase38`
- 基线提交：`16049b6`
- 47 基线发布：`whitelist-a94cd9e2411ad11bdce6d36c`
- 用户验收目标：开始下一步最有价值的优化，优先降低财务列表全量加载成本，同时确保整个系统和财务业务逻辑不改变。
- 固定样本：管理员读取业务成本审核第一页，响应仍包含原 `rows/totals/pagination` 契约；无权限角色仍由既有 RBAC 拒绝；默认查询不得加载未业务审核和已作废的无关记录。
- 本轮范围：只优化 `GET /api/finance/business-cost-audits` 的 Prisma 候选集；不改数据库、权限、金额、币种、汇率、状态、接口、排序、分页、导出或前端。
- 重构准则：数据库条件只允许做原谓词的等价翻译或安全超集；原内存响应构建器继续作为最终权威，数据库候选可以多留记录，但不得提前排除旧逻辑会返回的记录。
- 完成：新增 `buildBusinessCostAuditCandidateWhere`，把业务审核、默认非作废、销售数据范围、显式状态、单号、客户编号、转单号、业务员、费用字段和北京时间范围下推到 Prisma；复用既有 `businessCostAuditInclude()`，Repository 净减少 8 行。
- 行为保护：定向测试 6/6，覆盖默认状态、销售范围、文本字段、北京时间闭区间、无效审核日期、拼接客户名保留内存处理，以及 Prisma 候选多留记录时最终响应仍由旧构建器裁定。
- 安全门：API typecheck、`git diff --check`、新文件 ESLint、432 路由治理、lint no-new-debt 和 API 安全契约 3/3 通过。
- 已知测试债务：历史 `app.finance.e2e.test.ts` 的该宽场景仍在进入业务成本查询前失败于“应收 createdAt 必须等于 businessReviewedAt”的旧断言；本轮只改 Prisma 查询路径，该测试运行使用 InMemoryRepository，未为通过测试改动现有时间语义。
- 提交：`dfa105b`（`perf(api): narrow business cost audit queries`），已推送 `origin/codex/sunny-refactor-phase38`。
- 47 发布：`whitelist-b1fa31f8526c608da58bb0cd`；API 指纹 `dd1b2267e9fb343cd572f2f7a1f0a188e65098d5513c72c84257557df4419e6f`，镜像 `sha256:4a4be8738f5d6fc0ea046019eade4002b4780e7acdcab29bc611953b7148c435`。线上两文件 checksum、管理员只读接口 200（202ms）、响应形状、API 容器、公网 health、最近关键错误、发布锁和 recovery 均通过。
- 线上效果：47 当前 `BUSINESS_COST` 基线 69 条，默认候选 49 条，数据库在重型关联加载前少取 20 条（28.99%）；附加检索条件会继续收窄。
- 未改：原内存最终筛选、合计、RMB 换算、利润、排序、分页、导出、权限和线上业务数据均未改变。
- 既有风险：客户拼接名称和利润等计算字段仍需内存处理；默认页仍要为合计和计算字段读取全部 49 条候选，尚未实现真正的数据库聚合分页。47 仍为 `SOURCE_MODE=WHITELIST_CAS`，API health release ID 仍为 `unknown`。
- 后续：在同一业务成本列表上建立数据库聚合与轻量分页双查询，先覆盖默认 `createdAt` 排序，再为计算字段排序保留兼容回退；通过等价测试后再推广到应付审核列表。
