# 阶段 0：架构治理债务清单

## 1. 评分说明

- 优先级表示“治理顺序”，不是线上事故等级。
- 风险、耦合、收益使用高/中/低相对分级。
- “已证实”只引用当前工作树代码或本轮命令结果。
- “待验证”不能当成缺陷结论。
- 任何权限、财务、migration 或生产变更仍需专项审查。

## 2. 债务矩阵

| ID | 优先级 | 治理项 | 风险 | 耦合 | 收益 | 已证实证据 | 最小治理动作 | 完成判据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AG-01 | P0 | 跨域 `DataController` | 高 | 高 | 高 | 3,008 行、292/357 个路由，覆盖多数业务域 | 先建立 endpoint ownership；新端点不得继续进入总 Controller；逐垂直切片抽取 | 每个迁移路由由领域 Controller + application service 承接，API/权限兼容测试通过 |
| AG-02 | P0 | 巨型双 Repository | 高 | 高 | 高 | Prisma 24,544 行/541 方法；Memory 17,568 行/523 方法；462 个同名方法 | 建立按领域 Repository port 与 adapter contract tests；禁止大爆炸拆分 | 首个旧领域双 adapter 同套契约通过；总 Repository 不再增长 |
| AG-03 | P0 | 路由鉴权依赖可选元数据 | 高 | 中 | 高 | Guard 无 metadata 返回 true；357 路由中 322 permission、31 auth、4 none | 先增加完整 route metadata contract；人工分类 public/device/auth/permission | 新路由必须声明策略；4 个 none 路由均有显式测试/说明；未授权拒绝路径有证据 |
| AG-04 | P0 | Shared 根桶高扇出 | 高 | 高 | 高 | `index.ts` 5,622 行；75 个生产文件直接根导入 | 先建立领域 subpath exports 和 no-new-root-import 规则，不急于拆 npm package | 首个领域改为 subpath；新代码无根桶新增依赖；现有 API 契约不变 |
| AG-05 | P1 | `App.tsx` 全局编排过载 | 中高 | 高 | 高 | 3,694 行，集中跨域 state、API load、modal、route | 提取 app providers/route composition；业务状态下沉 feature model | 首个 feature 不再由 App 保存内部请求状态；现有入口行为测试通过 |
| AG-06 | P1 | 单一 `ApiClient` | 中 | 高 | 高 | 2,341 行、332 方法、321 直接请求 | 保留底层 request transport，按领域导出 client facade | 首个 feature 仅依赖领域 client；认证/错误语义保持一致 |
| AG-07 | P1 | Web 超大页面 | 中 | 高 | 中高 | Pricing/Warehouse 各约 4,800 行，MasterData 3,168 行 | 按查询模型、编辑器、表格/弹窗拆分；禁止纯按行数切文件 | 拆后业务入口、权限、状态和测试不变；页面容器只做组合 |
| AG-08 | P1 | 未声明的跨 feature imports | 中 | 高 | 中高 | 130 节点/436 边静态图；Pricing→Finance、Orders→Routing、Operations→CustomerService 等 | 先建立允许边清单，再把配置/类型上移或由 App 组合 | 新增跨 feature deep import 为 0；已有边逐条归类 |
| AG-09 | P1 | Prisma/InMemory 语义漂移风险 | 高 | 高 | 高 | 方法数和实现规模不同；未发现总 contract suite | 每次抽取一个领域时先写同一组 adapter contract tests | 目标领域读写、异常、权限、事务结果在两 adapter 一致 |
| AG-10 | P1 | Lint 质量门不可用 | 中 | 全局 | 高 | API 96 errors；Web 270 errors | 分离 ESLint 环境配置错误与真实源码错误；建立 baseline/no-new | lint 可作为增量阻断门；现存债务有基线文件和下降趋势 |
| AG-11 | P1 | Shared 行为测试已有失败 | 中高 | 高 | 高 | Shared 59 tests 中 2 fail，分别涉及邮编标签与 DATA_CONFIRM 计数 | 由对应领域任务确认实现或期望，禁止架构治理顺手改口径 | 两项均有业务证据并通过；不改变未授权业务语义 |
| AG-12 | P1 | 财务模型与写链路跨域 | 高 | 高 | 高 | Finance 模型连接 Shipment/Customer/Agent；主财务路由仍部分位于 DataController | Finance 最后分批迁移；先记录事务与不变量，不先重排文件 | 每个用例明确事务、金额/币种、权限、审计、拒绝路径 |
| AG-13 | P1 | Shipment 成为关系与流程中心 | 高 | 高 | 高 | Shipment 直接关联多个订单、仓库、轨迹、问题、财务模型 | 区分 Shipment 主状态与各领域局部事实所有权 | 状态 owner/allowed writer 矩阵确认；跨域写入口唯一 |
| AG-14 | P2 | Prisma schema/migration 所有权不清晰 | 高 | 高 | 中 | schema 1,610 行、82 models、114 migration dirs | 先建立 model/migration owner 与审查标签；后续再评估 multi-file schema | 新 migration 有 owner、影响模型、回滚/兼容说明；线上 pending 集合受控 |
| AG-15 | P2 | 配置读取分散 | 中高 | 中 | 中高 | 生产源码 33 次 `process.env`，分散于 Guard/Controller/Service/watcher | 新增 typed config adapter，先只包裹读取，不改变量名/默认语义 | 启动时验证必需配置；业务模块不直接读取 env |
| AG-16 | P2 | 上传/外部集成混入业务总入口 | 中高 | 中 | 中 | Mojia、标签、发票、价格表、lineage 路径分散 | 明确 file storage、device integration、AI provider adapter 边界 | 文件策略/大小/MIME/鉴权在统一 adapter；业务 service 只拿业务结果 |
| AG-17 | P2 | 可观测性缺少统一关联 | 中 | 中 | 中高 | 有 health/release/audit/lineage/client error；未发现统一 traces/metrics SDK | 先定义 requestId/releaseId/businessId 日志契约，再选实现 | 一个代表用例可从 HTTP 追踪到 DB/审计；不记录秘密和敏感字段 |
| AG-18 | P2 | 测试套件过度集中 | 中 | 中 | 中 | 多个 API E2E 文件 2,600～6,000 行；Web test harness 6,815 行 | 按领域 fixture 和 contract layer 拆测试，不改变 safe runner | changed-path 测试可独立运行；固定样本不依赖全局巨型 harness |
| AG-19 | P2 | 缺少可见 CI 配置与历史稳定性数据 | 中 | 全局 | 中 | 当前工作树未发现 `.github` workflows；只有单次本地结果 | 先确认真实 CI 平台，再记录每次 gate 时长/结果 | 有连续样本可计算通过率和 flaky rate；不能只靠单次运行 |
| AG-20 | P2 | 工作树基线不可复现 | 高 | 全局 | 高 | 当前 93 tracked + 363 untracked，不等于干净 commit 或 47 | 后续代码治理必须使用独立 clean worktree；阶段 0 文档明确快照指纹 | 每个迁移切片有唯一 commit、文件白名单、测试和发布指纹 |
| AG-21 | P2 | 孤儿与重复契约候选 | 中 | 低 | 中 | 4 个静态孤儿候选；API/Web notification types 内容完全相同 | 逐项查运行时/测试引用；确认 owner 后再删除或合并 | 无误删；共享通知契约有单一来源；依赖测试通过 |

## 3. 推荐治理顺序

### Gate A：先让架构可测量

1. 固化本扫描器和基线文档。
2. 建立 route metadata contract、依赖图、no-new-debt 规则。
3. 修复或基线化 lint gate；确认 Shared 两项失败归属。
4. 从干净 worktree 开始后续代码治理。

当前状态：前 3 项已由 [`phase-1-gate-a.md`](./phase-1-gate-a.md) 落地；第 4 项是后续运行时代码迁移的硬前置条件。

### Gate B：建立模板但不搬核心业务

1. 用 Finance Catalog 整理 Controller/Service/Repository port 模板。
2. 建立领域 client facade、Shared subpath export、adapter contract test 模板。
3. 禁止 DataController、总 Repository、App、ApiClient、Shared root 新增普通业务能力。

### Gate C：一个旧链路垂直迁移

候选为问题件与常用标签。开始前必须：

- 明确 Problem Ticket 是否属于 Customer Service context。
- 明确业务、运营、客服、客户账号的读写权限和对象范围。
- 明确真实操作入口，不以低频 `ProblemTicketsPage` 的禁用按钮作为验收。
- 固化 Prisma/InMemory parity、API 允许/拒绝路径、审计和前端入口测试。

### Gate D：按风险逐域推进

低风险资料/展示 → Tracking/Customer Service → Orders/Routing → Pricing/Imports → Warehouse → Finance。每个领域独立任务卡、独立 worktree、独立验证与发布白名单。

## 4. 不作为治理 KPI 的指标

- 不能把“文件数量增加/减少”单独当作成功。
- 不能为了达到行数阈值制造无业务意义的 wrapper。
- 不能把 Prisma relation 数量下降当作目标。
- 不能把所有共享代码都拆成独立 package。
- 不能仅以 typecheck/build 通过宣称业务迁移完成。
- 不能为了统一架构改动既有财务口径、权限或状态流转。

真正 KPI 是：边界可自动检查、修改影响面下降、同一业务事实只有一个 owner、固定样本结果不变、允许与拒绝路径均有证据。
