# Sunny 深度重构 Phase 68

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase68-release`
- 基线提交：`9ca60ca`
- 用户验收目标：恢复业务经理基础资料页面可用性；不弱化全局敏感字段屏蔽，不改变其他业务逻辑。

## 本轮重评

- 当前发现：47 发布后客户端错误遥测在 `/app/master`、费用目录和客户页重复记录 `Cannot read properties of undefined (reading 'filter')`。生产 bundle 的 `VN` 映射到 `summarizeMasterDataSnapshot`，直接对 `snapshot.agents.filter(...)` 求值。
- 真实角色证据：业务经理 `UG_BUSINESS_MANAGER` 的 `/api/master-data` 返回 200，但全局 `agent-data` 屏蔽使响应缺失 `agents` 与 `agentChannels` 两个 `MasterDataSnapshot` 必填数组；其余 10 个数组字段存在。页面因此在权限正确拒绝数据后仍因结构契约破坏而崩溃。
- 优先级：P0 页面不可用，高于继续 Repository 拆分、敏感字段覆盖扩展和 UI 美化。
- 固定样本：同一业务经理角色请求 `/api/master-data`，`agents` 与 `agentChannels` 必须存在且为空；任何非空代理/代理渠道记录仍不得出现在屏蔽后的响应中。

## 成熟参考与取舍

- [NestJS `ClassSerializerInterceptor`](https://github.com/nestjs/nest/blob/master/packages/common/serializer/class-serializer.interceptor.ts)：采用响应转换保持对象/数组结构的原则，数组逐项序列化而不是无意改变容器类型。NestJS 为 MIT；仅参考变换边界，不引入 `class-transformer` 或重写现有全局规则。
- [Vendure `RequestContext`](https://github.com/vendurehq/vendure/blob/master/packages/core/src/api/common/request-context.ts)：继续采用服务端请求上下文做权限决策的原则。Vendure 为 GPL-3.0；Sunny 保留当前 Nest Guard/Interceptor，不复制实现。
- Sunny 差异：`MasterDataSnapshot` 是现有 REST 必填字段契约；屏蔽后的安全表达是空数组，不是删除字段。最小修复仅允许 `/api/master-data` 顶层、原值已经为空的 `agents`/`agentChannels` 保留空容器；非空敏感集合仍整体删除，其他路径和字段规则不变。

## 行为保护

- 后端 Controller 在缺少代理读取权限时原本已明确返回 `agents: []`、`agentChannels: []`；本轮只阻止后置 Interceptor 再次删除这两个安全空容器。
- 不向前端增加兜底掩盖后端错误；共享 `MasterDataSnapshot` 契约继续作为唯一结构定义。
- 不放宽正向权限，不返回代理数据，不修改数据库、角色配置、屏蔽规则含义或页面业务操作。

## 当前证据

- 生产 API：受影响角色 200；`agents.present=false`、`agentChannels.present=false`。
- 生产遥测：同一角色连续在基础资料路由触发 `undefined.filter`。
- 候选保护：空集合契约保留；非空代理和渠道集合仍被移除。定向测试 4/4、Shared/API/Web 类型检查、434 路由治理和完整 `governance:check` 已通过。

## Review 结论

- OCR CLI 可用但本机未配置 LLM；确定性预览只选择本轮运行时代码，随后按数据泄露、路径匹配、递归边界和跨接口漂移逐项人工审查。
- 保留条件同时要求：精确 `/api/master-data` 路径、顶层字段、字段名仅 `agents`/`agentChannels`、值已经是空数组。任一条件不满足仍沿原逻辑删除；非空敏感集合测试明确得到 `{}`。
- 未发现 P0/P1/P2 阻断。没有改权限判定、数据库查询、前端兜底或其他响应路径；复杂度增量局限于一个小型谓词和显式对象遍历。

## 下一步

1. 执行全局字段规则定向测试、API/Web 类型检查与治理门。
2. 对安全泄露、其他路由漂移和前端契约做 Review。
3. 精确发布 API；用同一业务经理角色复核 200、两个空数组及新 release 的错误遥测。
4. 发布后重新扫描全局候选并重新排序。
