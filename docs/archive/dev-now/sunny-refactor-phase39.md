# Sunny 深度重构 Phase 39

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase39`
- 基线提交：`983fc07`
- 47 基线发布：`whitelist-b1fa31f8526c608da58bb0cd`
- 用户验收目标：每一步完成后重新审查全局优先级，参照优秀 GitHub 项目选择新的最高价值优化，不沿单一方向惯性扩改，且不改变现有业务逻辑。
- Phase 38 完成后重评：财务业务成本默认候选已由 69 降至 49、接口 202ms，继续聚合分页边际收益下降；密码 scrypt 迁移和受保护文件访问已在当前代码实现，不再按历史扫描重复处理；前端登录会同时触发显式工作区刷新与 session effect 刷新，并且菜单跳转可刷新多个无关模块，直接对应用户反馈的数据流脆弱和页面慢。
- GitHub 参考：Medusa 后台用 TanStack Query 管理服务端状态，通过 stale time、失败重试和聚合查询避免导航时全量重拉；Vendure 后台按路由/领域组织数据边界。Sunny 本阶段只借鉴“并发请求去重与渐进式模块边界”，不一次性引入全站 React Query 或重写路由。
- 固定样本：管理员登录后，由 session effect 作为唯一自动工作区刷新所有者，运单、业务成本和基础资料等每组 API 只请求一次；原书写顺序、失败回退、权限和页面结果不变。
- 本轮范围：移除登录/首次改密后与 session effect 重复的显式刷新；新增一个最小工作区刷新协调边界，只合并权限/路由作用域等价且正在进行的刷新；不缓存已完成结果，不改变请求数据、顺序、失败回退、业务状态、权限、接口和 UI。
- 完成后重评要求：对比路由感知刷新、运行时输入校验、审计可靠性、JWT 撤销和 UI 数据层演进，明确下一步继续/转向/停止。
- 实现：登录和首次改密只更新 session，不再额外显式刷新；session effect 仅在 access token、用户身份/角色、改密门禁、权限签名、刷新版本或客服确认路由发生语义变化时触发，不再因 session 对象重建重拉。`WorkspaceRefreshCoordinator` 仅共用作用域等价的进行中 Promise，settle 后清理且拒绝跨作用域合并。
- 本地效果：新增 App 登录链路保护，实施前运单/业务成本/基础资料各发起 2 次，实施后各 1 次；两个调用者等待同一进行中刷新，已完成和已失败刷新都不被缓存。
- 验证：定向 Web 测试 9/9，Web typecheck、`git diff --check`、`governance:check`、context 治理、432 路由契约、lint no-new-debt 和 API 安全契约 3/3 通过。全 Web ESLint 仍有 149 条旧错误，本轮直接修改的新模块/测试无新错误；`App.tsx` 仍为既有 3 条未使用导入/函数错误。
- 提交：`8bbb5be` (`perf(web): coordinate workspace refreshes`)，已推送 `origin/codex/sunny-refactor-phase39`。
- 47 发布：`whitelist-a0cc94a4964b48d95b107961`；Web 指纹 `f61be11288aba67845bd8b971540d63cdcabf55d0220b5b88a4e762af3514a5d`，镜像 `sha256:7feaba1aeb850a6eac5c65eac9befc2f6d4ad37999cc1118050b604fb2af9b80`，Web 版本 `web-dad7efe286a84e3782609918`。线上两文件 checksum、生产构建、Web 容器、公网 API health/version、关键错误、发布锁和 recovery 均通过。
- 完成后重评：①路由刷新仍可在报价/市场等页面重拉财务和基础资料，频率高、可以用固定路由样本证明；②全局运行时输入校验安全收益高，但 432 路由没有统一 DTO 基线，直接开启全局 pipe 的契约回归风险过高；③审计仍是 fire-and-forget，但不能用同步 await 简单修复，需要 outbox/任务队列设计以避免改变主交易可用性；④ JWT 撤销会改变会话策略，不属于行为保持重构；⑤本轮没有新的 UI 视觉证据。
- 重评决定：“继续前端数据流，但转向路由感知计划”。下一切片以不消费 App 全局数据的 `PricingPage` 为代表路由，建立导航刷新计划、独立的“最后全局刷新”时钟和 legacy 全量回退；必须证明进入报价不拉无关工作区 API，随后进入依赖全局数据的业务/财务仍会刷新，未建模路由仍保持原行为。
