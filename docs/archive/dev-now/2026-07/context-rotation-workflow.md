# Sunny 会话上下文轮换机制

- 状态：`complete`
- 会话标题：`Sunny｜会话上下文轮换｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`context-rotation-workflow`
- 分支：`当前工作树（未新建分支）`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-19 12:00 Asia/Shanghai`

## 输入摘要

- 目标：在 Sunny 项目中落地宽松的长会话轮换、连续命名、交接确认和成功接管后归档规则。
- 不做：本轮不创建或归档真实会话，不修改业务代码，不发布 47。

## 允许修改

- `AGENTS.md`
- `docs/session-context-rotation.md`
- `docs/dev-now/_README.md`
- `docs/dev-now/_template.md`
- `docs/dev-now/_handoff-template.md`
- `docs/dev-now/context-rotation-workflow.md`

## 当前进度

- 已增加 Context Rotation Gate，采用第 2 次压缩检查点、第 3 次压缩轮换的宽松门槛。
- 已落地 `Sunny｜<业务主题>｜NN` 连续命名和新会话确认后归档旧会话的事务顺序。
- 已增加状态模板字段、独立交接模板、失败恢复和首次真实切换验收标准。

## 验证

- 效果演练：本状态文件能够独立表达目标、范围、完成项、证据、发布状态和准确下一步；首次真实跨会话接管留到用户发出“切换新会话”。
- 安全检查：文档结构契约检查和 `git diff --check` 均已通过。

## 交接

- 阻塞：无
- 剩余风险：Codex 是否稳定暴露压缩次数不可保证，规则已使用记忆偏差和响应体感兜底。
- 用户验收目标：可以多聊一段再轮换；同主题新会话连续编号；接管成功后自动归档旧会话。
- 效果证据：交接字段和新会话五项接管确认已写入项目规则与模板。
- 安全证据：规则入口、宽松门槛、连续命名、接管确认和状态模板字段均通过定向 `rg` 检查；目标文件无空白错误。
- 未验证项：尚未执行一次真实的新会话创建、连续命名、接管确认和旧会话归档。
- 发布状态：未发布，不涉及 47 运行时代码。
- 稳定附件：无。
- 准确下一步：用户首次说“切换新会话”时，按 `docs/session-context-rotation.md` 完成真实轮换并记录效果。
- 建议新标题：`Sunny｜会话上下文轮换｜02`
- 建议新状态文件：`docs/dev-now/context-rotation-workflow-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
