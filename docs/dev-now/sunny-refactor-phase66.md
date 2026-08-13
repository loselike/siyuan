# Sunny 深度重构 Phase 66

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`d138e7b`
- 47 基线：`git-5424c2eb4664_web-dc928f06c904_api-5e1c513e1d3d`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与选择

- 安全/数据正确性：上传目录已默认拒绝，认证动态账号/权限逐请求复核已落地；未发现新的已证实 P0。墨家设备入口是生产仓库写链，设备 token、输入解析、幂等、理货覆盖、采样和失败审计仍集中在巨型 `DataController`，形成 P1 变更风险。
- 高频业务流/前端数据流：仓库页面 4,856 行、杂费页面 4,042 行、App 3,229 行仍是候选；当前仓库双视图保护刚恢复，继续拆 UI 的行为保护收益低于隔离有完整 E2E 的设备写链。
- 后端架构：`prisma.repository.ts` 31,983 行、`in-memory.repository.ts` 19,416 行、`DataController` 2,256 行；墨家路由具有独立 token 契约和完整固定样本，是当前风险/收益比最好的模块边界切片。
- 测试基础设施：Harness 6,473 行、同角色多账号 token 映射仍是 P2；Phase65 已修复直接失真，不再把它误列为本轮最高优先级。
- 发布链路：当前 Git provenance、不可变镜像、全链路锁、恢复状态和超时保护均已落地，本轮不继续单一路径优化。
- 选择：转向仓库外部设备集成边界；只移动现有实现，不新增工作流、队列框架、数据库结构或业务规则。
- 固定样本：墨家设备同一组报文在迁移前后保持 201、`result/message`、仓库包裹字段、重复接收、异常时间/缺失快递号、采样与失败审计结果一致；无/错 token 必须在任何写入前 401。

## 成熟参考与取舍

- [Vendure](https://github.com/vendurehq/vendure) 及其 [OrderService](https://github.com/vendurehq/vendure/blob/master/packages/core/src/service/services/order.service.ts)：借鉴 NestJS 领域服务边界、稳定注入契约和 Controller 薄适配层；当前仓库为 GPL-3.0，只参考设计原则，不复制代码、模型或插件协议。
- [Medusa](https://github.com/medusajs/medusa) 及其仓库内模块/工作流开发约定：借鉴模块内 Service 与 adapter port 的组织、明确错误边界；不引入其工作流引擎、队列、事件总线或交易语义，避免改变 Sunny 已运行的同步接收、后台采样和返回口径。
- Sunny 适配：设备 token 继续由路由第一条有效语句校验；系统身份、Prisma/InMemory adapter、库存重复查询和审计沿用现有实现。

## 实施与行为保护

- 新增 `warehouse/integration/MojiaMeasurementController`、`MojiaMeasurementService` 和五方法 Repository port，AppModule 继续以 `PrismaRepository` token 注入，因此生产 Prisma 与测试 InMemory 选择规则不变。
- 路由、POST/201、header/query token 兼容、错误文案、正数/整数解析、时间归一化、条码拆分、重复检测、理货复测覆盖、系统身份、采样脱敏/16KB/72 小时/100 队列/2 并发、失败审计和 `result/message` 均按原实现迁移。
- `DataController` 删除相同实现和不再需要的依赖，路由数 187 降至 186、文件从 2,256 行降至 1,945 行；总 Repository 的持久化实现未改。
- 架构门的设备 token AST 证据改指向专用 Controller；治理基线只记录本轮真实下降和 Phase65 已存在的基线漂移，不放宽运行时业务规则。
- 完整架构门暴露 Phase65 两份组件测试缺 React 类型导入、WarehousePage 既有未使用变量和 DOM 类型 lint；只做类型/未使用代码清理，无运行时行为变化。
- 主推进会话按治理 dry-run 精确归档已完成 Phase59–65 状态，未修改其内容。

## 当前验证与审查

- 迁移前：墨家入口固定样本 1/1，设备 token 契约 3/3 通过。
- 迁移后：墨家入口固定样本 1/1，设备 token 契约 3/3，master-data 构造 characterization 2/2，Web 抽屉/弹窗 4/4，API/Web typecheck、434 路由完整治理、context governance、lint no-new-debt、`git diff --check` 通过。
- 额外理货复测宽 E2E 在迁移后与干净发布基线均在创建理货任务处同样返回既有 400；它在进入墨家路由前失败，未作为本轮回归归因，也未修改预期掩盖旧问题。
- Open Code Review 确定性预览纳入 8 个运行时/治理文件；LLM 端点未配置，未读取或请求凭据，最终结论以人工对抗式审查与独立专项审查为准。

## 待完成

- 收口独立审查结论与必要修复。
- 提交并推送功能分支；从干净发布协调 worktree 获取 47 baseline receipt 后合并、发布 API/Web、执行无生产写入线上探针。
- 发布后重新扫描安全/数据正确性、前端数据 owner、后端巨型边界、测试基础设施和发布链，选出 Phase67，而不是自动继续拆 `DataController`。
