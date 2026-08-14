# Sunny 深度重构 Phase 40

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase40`
- 基线提交：`2ddfe50`
- 47 基线发布：`whitelist-a0cc94a4964b48d95b107961`
- 用户验收目标：每轮从最新全局状态选择 ROI 最高的一项，本轮减少进入报价页时与当前任务无关的工作区 API 请求，同时保证随后进入业务/财务仍获得最新全局数据。
- 全局重评：P0 未发现新的已证实数据错误/越权；P1 候选为导航全量刷新、审计 fire-and-forget、统一运行时输入校验、JWT 撤销、巨型 Repository/App/API 拆分。路由刷新发生频率最高、改动可局部化且可直接计数验收，因此本轮优先。
- GitHub 参考：Medusa 后台用 QueryClient 的 `staleTime=90000`、关闭 focus 自动重拉和单次重试保持服务端状态新鲜度；Vendure 后台按订单、商品、客户等 authenticated 路由领域组织数据边界。Sunny 只借鉴“新鲜度时钟和路由数据所有权”，不引入新框架。
- 已证实边界：`PricingPage` 仅接收 `apiClient/initialSection/role/permissions/notice/onNotice`，不消费 App 的运单、财务、承运商任务或基础资料状态；查价/加价/价格表数据由页面按权限自行请求，加价/价格表所需代理也由页面调用 `masterData()` 获取。
- 固定样本：管理员登录完成一次全局刷新，15 秒后进入“报价查价”不新增 `/api/shipments`、`/api/finance/business-cost-audits`、`/api/master-data` 等 App 工作区请求；立即再进入“业务管理”仍新增一轮全局请求。
- 行为保护：只把 `pricing` 标记为路由自持数据；所有未建模路由默认保持 legacy 全局刷新。跳过报价时不得更新“最后全局刷新”时钟，进入业务/财务时仍按原 15 秒门限触发。权限、路由、页面自有请求、5 分钟刷新、异常回退和 UI 不改。
- 实现：新增 `workspaceRefreshPolicy`，导航仅在目标路由属于 `legacy-global` 且超过 15 秒时推进全局刷新版本；全局 ref 更名后仍与原 5 分钟 focus/visibility 刷新共用。
- 效果证据：固定样本中进入报价后 `/api/shipments`、`/api/finance/business-cost-audits`、`/api/master-data` 请求数保持不变；紧接进入业务后各增加 1 次。定向测试 9/9 通过。
- 安全证据：Web typecheck、`git diff --check`、工程治理、432 路由契约和安全契约 3/3 通过；无 API、Prisma、权限、状态或 UI 改动。
- 发布：提交 `5cb7324`，47 白名单发布 `whitelist-b451c554dbd946c6d76e8bd9`；三份运行时文件 checksum、Web 生产构建/容器、公网首页/API health 200、最近 Web 日志、全局锁和 recovery 全部通过。
- 完成后重评：安全/数据候选是 263 个 Controller 输入入口缺少统一运行时校验与 JWT 无撤销；审计候选是写/导入/导出请求仍 `void this.record(...)`；后端效率候选是 31,831/19,305 行双 Repository 与 2,372 行 DataController；运维候选是 47 仍 `WHITELIST_CAS` 且 API release ID unknown；前端候选是其他路由仍 legacy 全量刷新。结论为“转向”审计可靠性：下轮先做契约和失败边界扫描，参考 Vendure 对 blocking handler 的等待、事务和耗时约束；不机械扩展路由试点，也不直接全局 await 或一次性引入 outbox。
