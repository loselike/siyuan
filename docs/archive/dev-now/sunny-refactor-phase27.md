# Sunny 深度重构 Phase 27

- 状态：completed
- 分支：`codex/sunny-refactor-phase27`
- 基线：`bd2e867` / 47 `whitelist-59208403aa9168c5acce03a4`

## 用户可见目标

在不改变任何问题件标签业务逻辑的前提下，让生产 Prisma 与测试 InMemory 适配器共用同一套标签名称、快照规范化和校验策略，减少双份巨型 Repository 的规则漂移风险。

## 固定样本与契约

- 标签名称继续执行：去首尾空白、连续空白折叠、必填、最多 20 字符、禁用中英文逗号。
- 问题件标签快照继续执行：`undefined` 保持缺省、必须为数组、最多 10 项、规范化后按首次出现顺序去重、空数组转为 `undefined`。
- 未知或停用标签仍由各 Repository 按原持久化实现拒绝，错误文案不变。
- 路由、权限、响应、排序、事务、审计和写入逻辑均不调整。

## 基线证据

- `prisma.repository.ts`：32,122 行；SHA-256 `5a46be1b5039f824cd53b396e4c6a90cd7d2d9bd94d2dfad43137653033d3ae9`
- `in-memory.repository.ts`：19,588 行；SHA-256 `29b9445af7acdd6d0e96dc3b3e8106ab4a9d59f0beea71e11bb82e3f9e0c7ba7`
- 两个适配器分别存在完全重复的名称和快照规范化函数；调用点各 3 处。

## 验收

- 迁移前后同一组 API 错误状态码与文案一致。
- 新领域策略覆盖所有边界与去重顺序。
- 两个适配器只调用同一策略，不再保留本地重复函数。
- API 类型检查、路由治理、架构治理通过。
- 仅精确发布 API 目标文件到 47；无 schema/migration，无真实问题件或标签写入。

## 完成结果

- 运行提交：`cd15312`，已推送 `origin/codex/sunny-refactor-phase27`。
- 新增单一 `problem-ticket-tag.policy.ts`；Prisma/InMemory 各 3 个调用点已统一接入，并删除两套重复名称/快照函数。
- 两个巨型 Repository 各减少 15 行；治理上限同步收紧为 32,107 / 19,573。
- 迁移前 E2E 2/2；迁移后策略与 E2E 14/14；API typecheck、432 路由契约、lint no-new-debt、治理与安全契约均通过。
- 47 发布：`whitelist-0b29d7092fd3c8b4a2050def`；API 指纹 `75a7126247719745a2435bc9b531b88bdf2d06b06791393678fb7231f8d9d3df`。
- 47 三个运行文件 checksum 与候选一致；真实启用角色验证 401/403/200，标签必填/逗号与问题件快照类型/未知标签均保持原 400 文案。所有写探针均在持久化前拒绝，没有新增标签或问题件。
- API 容器、公网 health、最近 10 分钟关键错误、发布锁和 recovery 均正常。

## 后续

- 下一切片继续从双 Repository 中选择一组完全重复、可用迁移前后契约证明等价的领域规则；不混入既有 Prisma/InMemory 差异修正。
