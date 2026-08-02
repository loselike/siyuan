# 仓库效率与可理解性治理

- 状态：`in_progress`
- 会话标题：`Sunny｜仓库效率治理｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
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
- 只读漂移审计：本分支 237 个运行文件、47 有 321 个；176 相同、61 内容不同、84 个仅 47 存在、远端遗留物为 0。

## 验证

- 待执行：47 完整运行时 manifest/源码快照校验、Git clean gate、`npm run governance:check`、领域定向 safe tests、受影响 workspace typecheck/build、47 线上只读验证。

## 交接

- 阻塞：无。
- 剩余风险：47 比当前干净分支多 84 个运行文件且 61 个文件内容不同，必须先建立只读快照和可回退 commit，不能直接发布或重构。
- 用户验收目标：新任务能从唯一代码基线快速定位；上下文不重复加载历史；首个旧链路完成等价垂直切片；业务行为、权限、数据、金额、状态和审计不变。
- 效果证据：待补。
- 安全证据：远端锁 clear/free；漂移审计只读且远端遗留物为 0。
- 未验证项：47 与 Git 的完整文件级归属、根脏树各文件分类、问题件领域所有权与双 Repository 等价性。
- 发布状态：`未发布`。
- 稳定附件：无。
- 准确下一步：从 47 只读拉取运行源码到临时快照，生成逐文件 checksum 与分类清单，再在本 worktree 构造不覆盖原工作树的基线候选。
- 建议新标题：`Sunny｜仓库效率治理｜02`
- 建议新状态文件：`docs/dev-now/repository-efficiency-roadmap-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
