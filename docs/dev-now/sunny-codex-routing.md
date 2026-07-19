# Sunny Codex GPT-5.6 路由优化

- 状态：`completed`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`sunny-codex-routing`
- 分支：`codex/agent-settlement-cycle`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-19 10:17 Asia/Shanghai`

## 输入摘要

- 目标：将 Sunny 的 Codex 工作流固定在 GPT-5.6 系列内，由 Sol High 主线程按风险和边界自动选择固定子代理，并支持不委派、执行中升级和独立审查。
- 不做：不修改业务代码、数据库、权限、线上 47，不覆盖其他会话改动，不为极小任务配置 Luna Low/Terra Low。

## 允许修改

- `.codex/config.toml`
- `.codex/agents/*.toml`
- `AGENTS.md`
- `docs/dev-thread-rules.md`
- `docs/dev-now/sunny-codex-routing.md`

## 当前进度

- 项目主线程固定为 `gpt-5.6-sol` High，最大 3 线程、1 层子代理。
- 新增 Luna Medium、Terra Medium/High、Sol High/XHigh 六个固定角色。
- 泛化 Agency 路由已替换为基于变更面、风险、验证成本与并行收益的 Sunny 专用路由。
- 保留 Mandatory Start、测试安全、第一性原理、对抗式审查、Frontend Design、Minimum Change、权限安全和 47 发布治理。
- 已加入 `NO_DELEGATION`、写任务分配包、`ESCALATE_TO_SOL`、单写者并发约束和 2 周/10 任务收益评估。

## 验证

- 通过：Codex `doctor --json` 显示项目配置加载成功，当前有效主模型为 `gpt-5.6-sol`；strict-config app server 可正常启动解析。
- 通过：7 个 TOML 文件均可解析，6 个 agent 名称唯一，模型全部属于 `gpt-5.6-sol/terra/luna` 白名单，固定推理等级和 sandbox 与路由表一致。
- 通过：旧 Agency 泛化角色已从强制路由段移除，`NO_DELEGATION`、六个固定角色与 `ESCALATE_TO_SOL` 在硬规则和详细规则中一致。
- 通过：`git diff --check`；本轮新增/修改只包含 `.codex/`、`AGENTS.md`、`docs/dev-thread-rules.md` 和本状态文件。

## 交接

- 阻塞：无。
- 剩余风险：Codex 产品未来可能调整项目级 agent 配置字段；需以实际 CLI strict config 与后续 10 个任务数据复核。
- 接手要求：按 `docs/dev-thread-rules.md` 的 Routing Evaluation 记录真实任务收益，不因代理已存在而强制委派。
