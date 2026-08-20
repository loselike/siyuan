# 根工作树未提交改动安全治理

- 状态：`complete`
- 会话 slug：`root-dirty-recovery-20260820`
- 分支：`codex/root-dirty-recovery-20260820`
- 工作 worktree：`/Users/j1ng/Tools/sunny/.worktrees/root-dirty-recovery-20260820`
- 只读目标：`/Users/j1ng/Tools/sunny`
- 稳定比较基线：`/Users/j1ng/Tools/sunny/.worktrees/current-baseline-cutover-work` / `9012a8c4`

## 用户验收目标

- 根目录不再承载新开发。
- 全部已跟踪修改和未跟踪文件都有 SHA-256、基线匹配、候选分支或恢复归档证据。
- 有归属的独有改动保留在对应分支或明确恢复包中；无人认领内容进入带校验清单的恢复归档。
- 只有确认归档完整、恢复演练通过且没有未保护内容后，才精确清理根目录。

## 当前事实

- 根目录分支为 `codex/repository-baseline-governance`，HEAD `bad6312e`，未暂存。
- 共 81 个已跟踪修改、572 个未跟踪文件；逐文件总数 653。
- 与已发布稳定基线比较：329 个内容一致、159 个路径相同但内容不同、165 个仅存在于根目录。
- 当前不执行 `git reset --hard`、`git clean -fd` 或整体 `git stash -u`。
- 本任务只治理本地 Git/文件，不修改 47 源码、镜像、容器、数据库或业务数据。

## 执行门

1. 生成逐文件归属清单。
2. 制作完整内容归档、tracked patch、staged patch 和元数据清单并验证。
3. 对独有内容建立迁移/归档结论，未保护数必须为 0。
4. 清理前再次核对根目录无新增漂移；若漂移，重新归档并停止旧清单清理。
5. 精确清理后验证根目录状态和归档恢复路径。

## 完成结果

- 归档目录：`/Users/j1ng/Tools/sunny-recovery/root-dirty-20260820-01`，总大小约 12 MB。
- 内容归档：`content.tar.gz` SHA-256 `d2a1a0a8ad32021a2a5dd11457131a43aebd3556215a7fdbae12b6432d6eb5c2`。
- 逐文件清单：`inventory.tsv` SHA-256 `254298807f2396963de14ca0ef264ba4073db1a1c79cfcb641abe7296c05ad69`。
- 归属结果：329 个文件与稳定基线一致；114 个文件在其他 worktree 找到逐字节相同副本；127 个文件只有任务文档引用；83 个文件无基线、worktree 或任务引用匹配。
- 对 114 个 worktree 匹配继续核验候选 HEAD：20 个已存在于候选分支提交，94 个只存在于候选工作副本。后者已在 `ownership-strength.tsv` 标记为 `working-copy-match`，不能据此删除候选 worktree；完整内容仍由恢复归档兜底。
- 后两类共 210 个未能证明可安全合入当前基线，因此没有猜测性迁移或合并，全部保留在校验归档；572 个未跟踪文件另保留于 `quarantine-untracked/`。
- 清理前再次核对路径集合和每个文件内容均未漂移；只对清单中的 572 个未跟踪文件执行可恢复移动，只对清单中的 81 个已跟踪文件执行 `git restore --worktree --source=HEAD`。
- 根目录 `git status --porcelain` 已为空，分支与 HEAD 仍为 `codex/repository-baseline-governance` / `bad6312e`；未 reset、未 clean、未切分支、未修改其他 worktree。
- 已从 `bad6312e` 创建一次性 detached worktree，解压完整内容归档后逐文件验证 653/653 通过，再移除测试 worktree，证明归档可恢复。
- 另以 1 个 tracked 修改和 1 个 untracked 文件执行脚本自测：归档通过、归档后内容漂移会拒绝清理并留下故障锁、人工核验后恢复原内容可精确清理、最终 Git 状态为空；755/640 原始模式可从归档恢复，归档目录和载荷权限收敛为 700/600。
- 恢复脚本已补齐 `umask 077`、分支/HEAD 门禁、原子清理锁、逐文件 SHA/模式临执行复核、失败收据、quarantine 清单和最终 checksum 链。失败时选择保留锁和证据并停止，不自动覆盖并发写入。
- 最终 `FINAL_CHECKSUMS.sha256` 已串联初始 checksum、清理收据、内容归档、逐文件清单、归属强度、quarantine 清单和根目录元数据；最终链校验通过。归档目录为 700，归档文件递归移除 group/other 权限。
- 两个失败的部分归档已移动到 `/Users/j1ng/.Trash/`，完整归档未删除；47 源码、容器、镜像、数据库和业务数据均未触碰。

## 独立风险复审

- 复审未发现 P0/P1，确认根目录清理与 653/653 可恢复证据成立。
- 原 `worktree-match` 只证明候选工作目录中存在相同内容，不等于已提交保护；已按 20 个 committed / 94 个 working-copy 拆分并保留候选 worktree。
- 治理脚本与本说明必须先提交到独立分支，之后才允许 prune 当前恢复 worktree。
- 当前流程只完成根目录治理；94 个候选工作副本和 210 个未确认可合入的文件仍需按各自业务任务认领。它们已被归档保护，不应被当作可直接合并的代码。

## 成熟参考与取舍

- [Git worktree](https://git-scm.com/docs/git-worktree.html)：采用独立 worktree 隔离恢复治理与根目录，避免分支切换覆盖未提交内容。
- [Git restore](https://git-scm.com/docs/git-restore.html)：采用 NUL 分隔的精确 pathspec 恢复 81 个已跟踪文件，不使用 `reset --hard`。
- [Git clean](https://git-scm.com/docs/git-clean.html)：官方说明 `clean` 会删除未跟踪文件；本次不执行 `git clean`，改为将精确清单内文件移动到可恢复 quarantine。
- 这些参考仅用于文件恢复边界；没有复制外部代码，也没有把历史根目录内容并入当前业务基线。
