# 仓库效率与可理解性治理

- 状态：`in_progress`
- 会话标题：`Sunny｜仓库效率治理｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`repository-efficiency-roadmap`
- 分支：`codex/repository-efficiency-roadmap`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/repository-efficiency-roadmap`
- 认领时间：`2026-08-02 Asia/Shanghai`

## 输入摘要

- 目标：按“47/Git 唯一基线、上下文压缩、垂直切片、最小验证映射”的顺序完成治理，以不改变现有业务逻辑、权限、金额、状态流转、数据和审计为第一约束。
- 固定样本：当前 47 运行源码 manifest、公开 Web/API health、357 条路由鉴权契约，以及问题件既有允许/拒绝路径和页面入口。
- 不做：不删除原脏工作树、不覆盖其他会话文件、不通过全仓同步覆盖 47、不执行破坏性迁移或生产业务写入、不做大爆炸式重构。

## 允许修改

- 当前独立 worktree 内的 Git/47 基线治理、上下文索引与检查脚本、架构模板、问题件垂直切片及其定向测试。
- 根脏工作树仅允许只读核对，不写入、不清理、不提交。

## 当前进度

- 已创建独立 clean worktree，继承已发布的代码瘦身分支历史。
- 47 发布锁空闲、recovery 状态为 clear。
- 已提交 47 当前生产源码只读快照 `2b87dcd`；运行文件 manifest 为 321/321，同哈希 321、内容差异 0、本地/远端独有均为 0、远端遗留物为 0。
- 独立 worktree 完成 `npm ci` 和 Prisma Client 生成；确认首次 Shared 大量缺失报错由 worktree 误解析根工作树依赖造成，不是 47 Shared 源码缺失。
- 47 当前生产源码中有 6 个已过期测试夹具；已仅更新测试输入/类型，不修改运行时代码。API/Web/Shared 生产构建已恢复可重复通过。

## 验证

- 47 源码漂移审计：`LOCAL_COUNT=321`、`REMOTE_COUNT=321`、`SAME=321`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`、遗留物 0。
- API typecheck 通过；Web typecheck 通过；`npm run build` 的 Shared/API/Web 全部通过。
- API 过期夹具定向 3/3 通过；Web 类型夹具定向 8/8 通过；`git diff --check` 通过。

## 交接

- 阻塞：无。
- 剩余风险：当前快照仍携带历史状态文档和旧治理入口；下一步必须先压缩上下文并补 clean-candidate/47 基线门禁，再开始业务垂直切片。
- 用户验收目标：新任务能从唯一代码基线快速定位；上下文不重复加载历史；首个旧链路完成等价垂直切片；业务行为、权限、数据、金额、状态和审计不变。
- 效果证据：生产源码已从 237/321 漂移恢复为可独立构建的 321/321 精确快照。
- 安全证据：远端锁 clear/free；只读拉取未写 47；本轮修正仅测试文件；完整生产构建通过。
- 未验证项：clean-candidate 发布 receipt、状态历史归档、问题件领域所有权与双 Repository 等价性。
- 发布状态：`未发布`。
- 稳定附件：无。
- 准确下一步：提交测试夹具修复，移植最新 clean-candidate/47 baseline 治理脚本和精简后的状态索引，新增 context:check 并完成 governance 验证。
- 建议新标题：`Sunny｜仓库效率治理｜02`
- 建议新状态文件：`docs/dev-now/repository-efficiency-roadmap-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
