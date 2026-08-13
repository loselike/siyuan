# Sunny 深度重构 Phase 54

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase54`
- 基线提交：`3b23fa6`
- 用户验收目标：每个切片后重新审查和排序；系统业务逻辑不得改变。

## 本轮重评

- 候选：标准 Git 发布恢复、前端数据流、巨型 Repository；先只读量化，不预设方向。
- 固定样本：比较当前分支、47 完整运行时 manifest、当前运行镜像/state 与其他活跃分支的归属证据，输出可执行且不覆盖有效改动的结论。
- 结论：47 仅有 4 个已完成仓库能力文件和 3 个已应用迁移未进入 Git；先逐字节吸收并恢复统一 Git 发布基线，价值高于继续拆前端或 Repository。
- 固定样本结果：本地与 47 运行时清单 `502/502` 完全一致，`CHANGED/LOCAL_ONLY/REMOTE_ONLY=0`；22 个历史 AppleDouble 仍只告警、不删除。
- 行为保护：保留 47 当前仓库权限、待理货统计、日期选项和已应用 migration 原文；只修复一处落后的测试 authorizer fixture，不修改生产业务口径。
- 禁止：不清理根工作树、不覆盖未归属改动、不改线上业务数据。

## 成熟参考与取舍

- Git atomic refs / worktree：https://github.com/git/git （GPL-2.0）。借鉴“单一可追溯 commit 是发布基线”的原则；不直接操作或覆盖并发工作树。
- Vendure monorepo：https://github.com/vendure-ecommerce/vendure （GPL-3.0）。借鉴模块边界与 typed client 分层，作为前后端候选评价基准；不复制业务模型。
- Nx affected：https://github.com/nrwl/nx （MIT）。借鉴基于真实依赖图判断影响范围；不引入 Nx。

## 本地验证

- 仓库定向测试：7/7。
- API/Web typecheck：通过。
- `git diff --check`：通过。
- `governance:check`：通过，434 条路由契约与安全契约 3/3。
- 说明：仓库不存在 `security:contract` npm script；对应安全契约已由 `governance:check -> architecture:check:security` 实际执行并通过。
- 47 只读源码审计：502/502 完全一致。
- v3 冻结清单：`docs/release-manifests/47/20260813-190021-whitelist-fb432e227bb8e14a64e02d68`。

## 发布与复审

- 状态：`completed`
- 提交：`729a72a65dc2c0051fe581ef6efa6a4bd562fae5`，已推送 `origin/codex/sunny-refactor-phase54`。
- 47 发布：`git-729a72a65dc2_web-1739a7265128_api-e2a4d26250b5`；`SOURCE_MODE=GIT_SOURCE_BUILD`、`SOURCE_PROVENANCE=GIT_BUNDLE`。
- 发布后：provenance `traceable/ok`，Web/API image 与 API release ID 全部匹配；源码 502/502 一致；容器运行，内网与公网 Web/API health 均 200；锁 free，recovery clear。
- 副作用审查：本次重建 Web/API，但三类运行时 fingerprint 均保持不变；未运行 migration、未写业务数据，用户可观察逻辑不变。
- 新的最高优先级：转向前端数据层。`App.tsx`、`apiClient.ts` 与页面级请求所有权仍耦合，下一阶段应先量化 API client 的模块扇入和重复刷新，再选一个高频页面做行为保持切片；巨型 Repository 继续作为并列候选，不预设持续走前端路线。
