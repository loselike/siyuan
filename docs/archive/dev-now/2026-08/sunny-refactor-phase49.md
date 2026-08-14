# Sunny 深度重构 Phase 49

- 状态：`complete`
- 分支：`codex/sunny-release-phase49`
- 基线提交：`cab3f25`
- 用户验收目标：每个切片完成后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评

- 选择：高频 `GET /api/master-data` 权限感知数据库候选下推。当前 Controller 先读取完整 snapshot，再把无权限集合清空；生产 Prisma 因此为业务员、客服、财务执行最终不会返回的查询。
- 固定样本：管理员返回完整 snapshot；`R-sales` 只返回自己名下客户且代理/代理渠道为空；客服的渠道/渠道分类为空。改造前后响应逐字段等价，生产查询仅跳过必然被清空的集合。
- 禁止：不改路由、权限、返回字段、排序、客户归属、默认值、InMemory 行为、数据库 schema 或业务数据。

## 成熟参考与取舍

- Vendure RequestContext：https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/api/common/request-context.ts （GPL-3.0）。借鉴把当前用户、权限和数据通道作为显式请求上下文传到服务/查询层；Sunny 本轮不引入新框架，只传不可变的查询选择条件。
- Medusa API query config：https://github.com/medusajs/medusa （MIT）。借鉴 HTTP 层显式形成 filters、pagination、fields/selectors，再由查询层只取需要字段/关系；Sunny 保留固定响应 shape，未授权集合仍返回空数组，而不是让客户端自选敏感字段。
- 差异与风险：Sunny 的客户 `data-scope:sales-own` 由 username/name/nickname 三个现有值共同裁剪，必须把同一集合下推后继续保留 Controller 终检；carriers 与 roles 当前不随权限清空，继续无条件读取和返回，避免借性能优化收紧既有契约。

## 行为保护

- 先新增 Prisma read repository 选择条件测试与 API characterization，再接入 Controller。
- 下推后 Controller 保留全部原有权限判断和 `scopeMasterDataCustomers`，形成查询裁剪 + 返回终检双层保护。
- 发布后用 47 对应身份验证允许/拒绝与 response shape；不做生产数据写入。

## 完成与复审

- `GET /api/master-data` 现在把已有权限布尔值和销售归属候选显式传入 Prisma 读取层；无权集合不再查询，`channels` 仍在财务燃油映射需要时内部读取但不会越权返回。
- Controller 保留原有逐集合清空与销售归属终检；默认调用不传 selection 时仍执行原完整 snapshot，保持其他调用者与 InMemory 行为不变。
- 本地：定向 characterization/repository 5/5、API typecheck、434 路由治理、安全契约 3/3、`git diff --check` 通过。
- 47：发布前后管理员响应 SHA256 均为 `ba1c6c156230f75b9f6ec4bb61f640a44442139e160cac55fc1ea6451487eb7b`；仓库出库角色响应 SHA256 均为 `e3b37ab6d54938aa98613f36e55e3d9ad9ad0acbd10c19745330a4648726c79f`，12 个字段及各集合数量逐项不变。公网 health/Web 200，API 无新增错误，锁 free、recovery clear。
- 并发发布复审：实施期间 47 被另一仓库权限任务推进。先捕获 `whitelist-6335969146b1420b7328d0ce` 的 498 文件基线并合并，不覆盖新权限语义。白名单构建与另一发布的 Docker 构建重叠后脚本失败关闭并写 recovery marker；已核对源码、重新构建/重启 API、修复 release state、验证 health/镜像后清除 marker。当前运行发布为 `whitelist-c0af1dfb63f19bfc11b7bd2f`。
- 重新排序：本轮查询下推已闭环。新的最高优先级不是继续同一路性能拆分，而是治理 47 多会话发布并发：远端全局锁只能约束遵循脚本的任务，另一个任务仍可在锁外启动 Docker 构建/重启，导致本轮进入 recovery。下一切片应为“构建/容器级互斥与发布前运行镜像 CAS”，且必须不改业务逻辑。
