# Sunny 深度重构 Phase 28

- 状态：completed
- 分支：`codex/sunny-refactor-phase28`
- 基线：`956965c` / 47 `whitelist-0b29d7092fd3c8b4a2050def`

## 用户可见目标

在不改变报价加价规则列表、聚合、筛选、排序、命中统计和混合加价展示的前提下，把 Prisma/InMemory 中完全重复的查询展示算法迁入既有 `agent-markup-query.shared.ts`，让生产与测试适配器共用同一实现。

## 固定契约

- 详细/聚合两种返回模式、分页和 `pageSize < 0` 行为不变。
- 代理、渠道、真实线路、国家、状态、排序筛选不变。
- 启用/停用、命中数、路线命中数、系统默认范围和最近更新时间统计不变。
- `UNIFORM`、`MIXED`、`RETAINED_ONLY` 展示、默认 0.5 加价和金额舍入口径不变。
- 不改变路由、权限、数据库、规则写入、报价计算、事务或审计。

## 基线证据

- `prisma.repository.ts`：32,107 行；SHA-256 `d90fef7661668f53c66514d33439b2d15ccde955b7dfd66bf4ab9c96e5736db7`
- `in-memory.repository.ts`：19,573 行；SHA-256 `65ea41bb8517a8c930194effd313ee52d908936c422e65e261c408f978704ca0`
- `agent-markup-query.shared.ts`：277 行；SHA-256 `6e227dafa4525de253ba464d5b11f1723603b1ca7595369f2cf6b2db2cfcf241`
- 两套 Repository 的 9 个加价列表/展示函数函数体完全相同；现有 API E2E 覆盖混合加价桶、行级来源和列表返回。
- 迁移前运行发现该 E2E 仍期待旧文本 `+¥0.10-0.50/kg`，但当前 47 同 checksum 运行源码实际输出为 `+¥0.10-0.50/KG`；本阶段只把测试更新为当前生产基线，不改运行时文案。

## 验收

- 迁移前后同一混合加价 API E2E 结果一致。
- Shared helper 单测覆盖聚合、详细模式、筛选、排序、分页和展示状态。
- 两个 Repository 不再定义这 9 个重复函数，继续复用导出的统一实现。
- API 类型检查、432 路由契约、治理门禁通过。
- 仅对白名单 API 文件发布 47；线上仅做只读加价列表与权限/health 验证。

## 完成结果

- 运行提交：`386b1ff`，已推送 `origin/codex/sunny-refactor-phase28`。
- 9 个加价列表/展示函数已从 Prisma/InMemory 原样迁入既有 `agent-markup-query.shared.ts`；AST 函数体对比 9/9 完全一致。
- 两个巨型 Repository 各减少 178 行，统一 helper 增加 187 行，净减少 169 行重复实现；治理上限收紧为 31,929 / 19,395。
- 迁移前混合加价 API E2E 1/1；迁移后 helper 9/9 与同一 E2E 1/1；API typecheck、432 路由契约、lint no-new-debt、治理与安全契约均通过。
- 47 发布：`whitelist-7271b86f2966403643cfbd47`；API 指纹 `7e23fa14bd0a1e30975ef6c250c7aecdbfe0e265fdbf705f1e6656d2edfc3d0a`。
- 三份运行文件 checksum 与候选一致；真实启用角色验证未登录 401、业务 403、市场聚合/详细 200、管理员不限分页 200，均为只读请求。
- API 容器、内外 health、最近 10 分钟关键错误、发布锁和 recovery 均正常；未改 Prisma、规则数据、报价公式、权限或审计。

## 后续

- 下一候选为 Prisma/InMemory 完全重复的客服数据确认快照、审核周期和字段裁剪策略。该切片涉及敏感字段可见性，必须先补角色字段负例与周期 E2E，再迁移函数体。
