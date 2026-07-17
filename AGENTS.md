# 思远物流项目 Codex 开发规则

`AGENTS.md` 只放每次会话必须加载的硬规则和索引。详细工程规则按任务需要读取 `docs/dev-thread-rules.md`；A-F 第一阶段开发入口读取 `docs/sunny-dev-index.md`。

## Project

- 项目名称：思远物流 / Siyuan Logistics
- 项目路径：`/Users/j1ng/Tools/sunny`
- 项目类型：跨境物流 TMS/OMS 系统
- 代码结构：monorepo，主要包含 `apps/web`、`apps/api`、`packages/shared`

## Default Context

- 默认只读取本文件、`.codex-state.md`、`git status --short` 和相关代码。
- `docs/dev-now.md` 只读说明多会话状态规则，不再承载唯一“当前任务”，代码会话不得自动修改它。
- 代码会话以用户当前明确请求或用户指定的 `docs/tasks/*.md` 为真实输入，并只读写自己认领的 `docs/dev-now/<session-slug>.md`；不得仅凭其他会话状态文件猜测任务。
- 不主动加载额外流程说明或通用指南；除非用户明确要求、当前任务需要，或系统规则强制要求。
- 所有判断以当前仓库文件、命令输出、类型和测试为准，不依赖旧聊天历史。
- 默认不调用 custom agents；命中任务场景时按 `Agent Auto Routing` 选择最小必要 agent。

## Mandatory Start Protocol

每次开发任务开始时先做这些事，不要依赖旧聊天历史：

1. 读取 `.codex-state.md`
2. 执行 `git status --short`
3. 用 `rg`、`rg --files`、`ls` 和 focused read 查看相关代码
4. 根据当前文件状态继续最近的未完成任务

如果 `.codex-state.md` 和实际代码冲突，以实际代码和命令输出为准。需要更新状态时，只改与本轮任务直接相关的状态内容。

## Execution Rules

- 不重复确认旧目标，不反复规划。
- 普通实现细节自行决策，选择与现有代码风格一致的保守方案。
- 每轮必须推进实际闭环：读代码、改文件、跑测试、启动服务、接口验证、浏览器验证或更新状态。
- 后续需求优先走业务视角任务卡，但不强制。用户在当前会话明确要求实施，且目标、范围、边界和最小验证足够清楚时，代码会话可直接执行非任务卡需求。
- 非任务卡需求若存在关键业务决策、财务/权限/状态流转风险或多个明显不同方向，必须先补充确认；不能因为允许非任务卡就自行猜需求。
- 每个代码会话只维护自己的 `docs/dev-now/<session-slug>.md`，不得删除、覆盖或重写其他会话的状态文件；根目录 `docs/dev-now.md` 是只读索引。
- `.codex-state.md` 不作为并发任务锁；代码会话完成后先把结果写入自己的状态文件，只由当前主推进会话或用户明确授权的会话追加高信号完成记录。
- 多个代码会话并发时优先使用独立 worktree，并为每个 worktree 使用独立 `codex/<session-slug>` 分支；仅切分支但共享同一工作目录不能形成文件隔离。
- `codex/agent-master-data` 这类大集成分支只作为基线；后续新功能优先从基线切小分支，单分支只处理一个模块或一个 bug。
- 不要为了节省时间跳过验证；优先运行最小相关测试，再按风险扩大验证范围。
- 先复用现有模块、类型、API、样式和测试，再考虑新增文件或新抽象。
- 禁止顺手重构无关代码、批量格式化无关文件或改动无关业务流程。
- 遇到“所有、全局、全部模块、统一改造”类需求时，必须先拆成阶段：先做通用能力，再接入一个代表页面并完成验证，通过后再逐模块推广；禁止一轮横跨全系统落地。

## Test Process Safety

- Codex 会话禁止直接运行裸 `npm test`、`npm test -w ...`、`npx vitest`、`npm exec vitest` 或 `vitest`。所有 Vitest/Jest/Playwright/前端测试必须通过安全 runner 启动，避免会话结束后遗留 `node (vitest)` 高 CPU 进程。
- 默认使用 `npm run test:safe -- <真实测试命令>` 包裹测试命令；Web 定向单测优先使用 `npm run test:web:safe -- --run <测试文件或模式> -t <用例名>`。
- Web/Vitest 测试必须限制 worker 与超时：保留或追加 `--poolOptions.threads.maxThreads=1 --testTimeout=30000 --hookTimeout=30000`；除非用户明确要求压力/并发验证，不得开启多 worker 长跑。
- 若历史命令、文档或脚本示例仍写 `npm test -w @siyuan/web -- ...`，Codex 执行时必须改写为安全 runner 等价命令，不得照抄裸跑。
- 若测试超过 30 分钟仍未完成，默认视为异常长跑；超过 1 小时必须停止对应进程组并在最终回复说明。清理时优先按 `CODEX_THREAD_ID`、`PGID` 和运行时长确认归属，避免误杀用户正在保留的进程。

## Reasoning And Review Gates

- 复杂 bug、跨模块数据流、财务/仓库/权限/发布问题，必须先做第一性原理检查：基于当前代码、数据流、权限和业务事实找根因，不只补表层现象。
- 高风险改动、状态流转、权限裁剪、财务口径和 47 发布前，必须做对抗式审查：主动寻找越权、脏数据、重复提交、异常时间、兼容和发布失败风险。
- 小型文案、局部样式、字段显隐、测试断言修正不强制展开完整审查；需要详细执行方法时再读取 `docs/dev-thread-rules.md`。

## Agent Auto Routing

- 用户不需要显式点名 agent；Codex 根据任务内容自动选择最小必要 agent 思路。
- 默认最多选择 1 个主 agent；涉及验证、审查、上线或安全风险时，最多追加 1 个辅助 agent。
- 禁止因为安装了多个 agents 就全量调用；只有用户明确要求“全局对抗式审查 / 多 Agent 审查 / 并发审查”才扩大范围。
- 小型文案、局部样式、字段显隐、测试断言修正不调用 custom agents。
- 新 UI、表格、弹窗、前端交互：先按 `Frontend Design Rule` 确定 sunny 本地 UI/UX 约束；只有需要 React/AntD/状态/性能/可访问性实现判断时，才调用 Frontend Developer。
- API、Prisma、状态流转、权限裁剪：Backend Architect。
- 非生产原型或快速验证想法：Rapid Prototyper；不得用于财务正式逻辑、权限、数据库迁移或 47 发布。
- 新会话理解陌生模块：Codebase Onboarding Engineer，只读不改。
- 功能完成后的对抗式审查：Code Reviewer。
- 慢查询、索引、复杂数据量：Database Optimizer。
- API 权限、状态流转和接口验收：API Tester。
- UI 截图、字段落地和视觉证据：Evidence Collector；只做截图验收或视觉证据时，不调用 Frontend Developer。
- 47 线上故障、发布失败、服务异常：Incident Response Commander。
- 越权、敏感字段、客户/财务/订单数据风险：Application Security Engineer。

## Frontend Design Rule

- 每次新建前端模块、二级功能、工作台、表单、详情、看板或明显重塑已有页面时，默认先按 `.agents/skills/frontend-design/SKILL.md` 做设计判断，再落代码。
- sunny 本地 `frontend-design` 是 UI/UX 设计准则最高优先级；Agency Frontend Developer 只作为 React/AntD/状态/性能/可访问性实现辅助，不替代 sunny 后台工作台规范。
- 禁止同一轮完整展开 `frontend-design` 和 Frontend Developer 两套 UI 规则；只读取和应用当前任务必要部分。
- 若两者冲突，以 sunny 现有设计系统、AntD 用法、业务字段完整性、权限裁剪和可扫读效率为准。
- `frontend-design` 覆盖所有用户可见、可点击、可提交或会影响业务状态的界面，不只覆盖一级页面；新增/编辑/详情弹窗，审核/反审/作废/删除/付款/确认弹窗，抽屉详情，表格行操作，批量操作面板，上传/预览，字段或列设置，二级/三级入口，空态、错误态、加载态、无权限态和禁用态都在范围内。
- Sunny 是跨境物流内部运营系统，使用 `frontend-design` 时必须服务业务效率：字段清楚、表格可扫读、操作路径短、权限状态明确；不得把后台页面做成营销页、装饰页或只追求视觉冲击。
- 设计落地前要先明确该页面的单一业务任务、目标岗位、核心字段、主要操作和一处可解释的视觉/交互记忆点；视觉特色不能覆盖财务、仓库、订单、权限和审计的一致性。
- 小型纯确认框可按比例处理，但必须检查动作文案、业务后果、权限裁剪和提交后状态；不能只完成主页面，把弹窗、抽屉和隐藏入口留成默认组件堆叠。
- 现有已落地模块允许做 UI 重构，但默认先只落本地，不自动发布 47；发布到 47 必须等用户检查确认。
- UI 重构默认不得改业务口径、数据库结构、线上数据、权限模型或接口契约；若发现必须补接口、字段或后端逻辑，必须单独列为后端改动。
- UI 重构不得移除、替换或弱化已有业务操作链路；涉及弹窗、抽屉、行操作、批量操作、筛选、优先级、状态流转时，必须先回溯旧逻辑并保留原功能，除非用户明确要求改变业务逻辑。
- 新增或改造后台业务表格默认使用 `ManagedTable`；涉及批量操作、批量审核、批量出库、批量删除、批量付款等选择列表时，默认使用 AntD/`ManagedTable` 的 `rowSelection`，选择列必须固定在第一列并带表头全选框。不要手写插在中间的 checkbox 列；确因复杂表格无法使用 `rowSelection` 时，自定义选择列 key 必须使用 `select`/`selection`/`checkbox`/`rowSelection` 这类标准命名，并同样固定第一列、支持全选、不可被列设置隐藏或移到中间。
- 若只是小型 bugfix、文案修正、字段补显隐或测试修复，可复用现有设计，不强制重新做完整设计方案。

## Minimum Change Rule

- 开发前先检查现有页面、弹窗、抽屉、详情面板、API、DTO、查询参数、数据库字段、权限判断、字段裁剪、操作日志和测试样本是否可复用。
- 默认优先复用现有接口、功能、组件、权限、日志和状态流转；能补齐现有组件或接口参数时，不新增重复接口、重复组件或重复后端查询。
- 只有现有能力无法承载真实需求字段、无法保证敏感字段后端裁剪、缺少必要状态流转、缺少关键审计日志，或复用会造成越权、财务口径错误、重复提交、追溯断裂时，才新增接口、字段、组件或后端逻辑。

## Output Discipline

- DO NOT send optional commentary.
- 不要输出非必要说明、过程旁白或显而易见的下一步描述。
- 优先采取具体行动：查看文件、修改代码、运行命令、验证结果。
- 只有在任务有歧义、存在风险、遇到阻塞、需要用户决策时，才解释中间过程。
- 最终回复只总结：改了什么、验证了什么、还有什么风险或后续动作。

## 47 Deployment Rules

- 47 云服务器按纯 Docker Compose 发布处理；宿主机不要求安装或调用 `node`、`npm`、`npx`。
- 同步/发布到 47 时，按 `docs/47-cloud-docker-release.md` 自动判定发布范围：只构建/重启受影响服务；只有 Prisma schema/migrations 变化才运行 `db-migrate`；再做对应健康检查。
- 线上数据库只允许执行 `prisma migrate deploy`；禁止 `prisma db push`、`prisma migrate reset`、`prisma:seed`、`demo:seed`。
- 线上密钥和 `.env` 只保存在服务器，不随代码同步、不写入日志、不提交 Git。
- 47 线上登录接口可能启用图片验证码；接口验收、角色验收或数据验证时，不要反复用普通 `/api/auth/login` 碰验证码。优先使用已登录浏览器会话、容器内短期 JWT、服务端本地接口或只读数据库查询完成验证；生成临时 JWT 时只在 47 容器内读取 `JWT_SECRET`，禁止输出密钥或写入日志。

## Security Requirements

所有开发默认考虑：

- 鉴权和 RBAC 权限控制。
- 输入校验和输出转义。
- 防止越权访问、SQL 注入、XSS、SSRF、危险文件上传。
- 错误处理不泄露敏感信息。
- 审计日志覆盖关键业务动作。
- 敏感信息不进入日志、前端包、Git 历史。
- 财务、客户、订单、用户相关接口必须校验租户、角色和对象归属。
- 菜单权限只决定是否能进入模块；数据范围和字段可见性必须以后端查询裁剪和序列化裁剪为准。开启仓库、财务或其他模块入口，不等于开放全量数据。
- 业务员、仓库、财务等内部角色默认只能看到自己职责范围内的数据；例如业务员只能看自己的单及自己单关联的业务成本，仓库不能看到财务敏感字段、利润、应付或付款信息。

## Ask User Only When

只有这些情况需要暂停询问用户：

- 破坏性或不可逆操作，例如删除数据、重置数据库、覆盖大量文件。
- 涉及密钥、付款、线上发布、外部通知。
- 需求会明显改变业务流程、数据库结构或权限模型。
- 安全、合规或授权边界不清。
- 多个方案会造成明显不同的产品方向或迁移成本。

## Documentation Index

- `docs/dev-thread-rules.md`：详细工程规则、多会话分工、Ponytail 细则、长需求拆卡、模块交付、前端布局和验证矩阵。
- `docs/sunny-dev-index.md`：A-F 第一阶段开发入口、固定样本、任务卡队列、开工检查门和完工销账格式。
- `docs/tasks/_template.md`：业务视角任务卡模板；规划会话按此输出正式任务卡。
- `docs/tasks/_acceptance.md`：正式任务卡进入代码会话前的通过标准，以及非任务卡直接执行的准入边界。
- `docs/dev-now.md`：多会话状态规则的只读索引；代码会话不得自动修改。
- `docs/dev-now/`：每个代码会话独立的任务状态文件和模板。
- `.codex-state.md`：最近 7 天内的高信号完成记录和归档索引，不作为并发任务锁；只由当前主推进会话或用户明确授权的会话追加或归档。
- `docs/47-cloud-docker-release.md`：47 Docker 发布流程。

## Final Response Format

最终回复保持简短，只汇报：

1. 完成了什么
2. 修改了哪些文件
3. 验证结果
4. 剩余风险或下一步
