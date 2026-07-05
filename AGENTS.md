# 思远物流项目 Codex 开发规则

`AGENTS.md` 只放每次会话必须加载的硬规则和索引。详细工程规则按任务需要读取 `docs/dev-thread-rules.md`；A-F 第一阶段开发入口读取 `docs/sunny-dev-index.md`。

## Project

- 项目名称：思远物流 / Siyuan Logistics
- 项目路径：`/Users/j1ng/Tools/sunny`
- 项目类型：跨境物流 TMS/OMS 系统
- 代码结构：monorepo，主要包含 `apps/web`、`apps/api`、`packages/shared`

## Default Context

- 默认只读取本文件、`.codex-state.md`、`git status --short` 和相关代码。
- 不主动加载额外流程说明或通用指南；除非用户明确要求、当前任务需要，或系统规则强制要求。
- 所有判断以当前仓库文件、命令输出、类型和测试为准，不依赖旧聊天历史。

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
- 不要为了节省时间跳过验证；优先运行最小相关测试，再按风险扩大验证范围。
- 先复用现有模块、类型、API、样式和测试，再考虑新增文件或新抽象。
- 禁止顺手重构无关代码、批量格式化无关文件或改动无关业务流程。

## Output Discipline

- DO NOT send optional commentary.
- 不要输出非必要说明、过程旁白或显而易见的下一步描述。
- 优先采取具体行动：查看文件、修改代码、运行命令、验证结果。
- 只有在任务有歧义、存在风险、遇到阻塞、需要用户决策时，才解释中间过程。
- 最终回复只总结：改了什么、验证了什么、还有什么风险或后续动作。

## 47 Deployment Rules

- 47 云服务器按纯 Docker Compose 发布处理；宿主机不要求安装或调用 `node`、`npm`、`npx`。
- 同步/发布到 47 时，按 `docs/47-cloud-docker-release.md` 执行：构建镜像、运行 `db-migrate`、重启 `api`/`web`、做健康检查。
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
- `.codex-state.md`：当前开发状态和下一步指针；只由当前主推进会话或用户明确授权的会话更新。
- `docs/47-cloud-docker-release.md`：47 Docker 发布流程。

## Final Response Format

最终回复保持简短，只汇报：

1. 完成了什么
2. 修改了哪些文件
3. 验证结果
4. 剩余风险或下一步
