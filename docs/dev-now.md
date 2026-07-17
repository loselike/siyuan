# Dev Now 多会话索引

本文件是只读规则索引，不再保存唯一“当前任务”，代码会话不得自动修改。

## 真实输入

- 需求可以来自用户当前会话中的明确实施请求，或用户明确指定的 `docs/tasks/*.md`。
- 正式任务卡必须通过 `docs/tasks/_acceptance.md`；范围清楚的非任务卡需求可直接执行。
- 不得根据其他会话的状态文件猜测或扩展需求。

## 会话状态

- 每个代码会话只维护一个独立文件：`docs/dev-now/<session-slug>.md`。
- 命名使用稳定且唯一的业务 slug，例如：
  - `docs/dev-now/quote-pricing-oversize.md`
  - `docs/dev-now/master-data-agent.md`
  - `docs/dev-now/finance-water-receipt.md`
- 新状态文件从 `docs/dev-now/_template.md` 创建。
- 会话不得删除、覆盖或改写其他会话的状态文件。
- 同一任务卡或同一非任务卡需求只能存在一个 `in_progress` 会话；接手时先把原会话状态改为 `handed_off`。
- 已经运行中的代码会话在下一次继续前先创建自己的状态文件；旧的根文件任务内容不再回填，也不得恢复成全局当前任务。

## 并发隔离

- 优先为每个代码会话使用独立 worktree 和独立 `codex/<session-slug>` 分支。
- 仅切换分支但共享同一工作目录，仍会共享未提交文件，不算隔离。
- 无法使用 worktree 时，多个会话必须分配互不重叠的文件范围。

## 全局状态

- `.codex-state.md` 只追加高信号完成记录和验证结论，不作为任务锁或当前任务指针。
- 代码会话先更新自己的会话状态文件；只有主推进会话或用户明确授权的会话才更新 `.codex-state.md`。

活动状态文件可通过以下只读命令查看：

```bash
find docs/dev-now -maxdepth 1 -type f -name '*.md' ! -name '_*' -print | sort
```
