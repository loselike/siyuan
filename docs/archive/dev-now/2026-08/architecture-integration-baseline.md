# Sunny｜架构干净集成基线｜01

- 状态：`complete`
- 会话 slug：`architecture-integration-baseline`
- 分支：`codex/architecture-integration-baseline`
- worktree：`/private/tmp/sunny-architecture-integration`
- 日期：`2026-08-05 Asia/Shanghai`

## 目标

- 处理共享工作树长期累积的已发布代码，建立一个不删除原文件、可追溯、可继续拆分的干净基线。
- 固定样本：本地 Web、API、迁移三类运行指纹必须与47当前源码完全一致。
- 不修改47、不执行迁移、不写生产数据、不把共享工作树的未知改动直接提交。

## 结果

- 从既有仓储效率治理历史 `b5c4263` 创建独立分支与 worktree。
- 仅把47当前 `apps/api`、`apps/web`、`packages/shared`、`deploy` 和运行 manifest 同步进该 worktree；测试文件继续保留本地版本。
- 提交 `295c089 chore: capture current 47 runtime baseline`，形成当前生产源码的可追溯 Git 基线。
- Web 指纹 `e24f6aa092d8...`、API 指纹 `5d1d747f7a85...`、迁移指纹 `c62f56c4c287...` 与47逐字一致。
- Gate A 更新到当前基线并新增 10 个集中热点逐文件行数上限；巨型文件继续增长会失败。
- 原共享 worktree 未执行 reset、clean、checkout、删除或覆盖，全部历史工作仍可回查。

## 验证

- `git diff --check`：47基线提交前通过。
- 本地与47 `print-47-release-fingerprints.sh`：Web/API/Migrate 全部一致。
- `architecture:check:self-test`：13 类失败路径通过。
- `architecture:check:fast`：414 条路由契约和结构预算通过。

## 后续

- 仓库/理货垂直切片必须从本分支新建独立功能 worktree。
- 首个切片只迁移一条低风险只读查询链路，形成 Controller、Service、Repository adapter、Web API module 和测试工厂模板；不改 API 契约、权限、数据范围或返回字段。
- 共享脏 worktree 暂作为历史恢复区，不再承担新功能开发或标准发布协调。

## 发布

- 不适用。本轮只建立本地 Git 基线和治理门，未修改47运行代码。
