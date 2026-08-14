# Sunny Phase99：工作区状态写入边界

- 状态：ready_for_release
- 任务边界：把 App 中重复的 scope-sensitive React state writer 收敛到一个 app-shell helper，保持现有授权范围、请求代际、页面状态和业务接口完全不变。
- 用户验收目标：已有仓库/业务/财务/客服工作区在异步请求完成后仍只写入发起请求的当前 scope；切换账号、团队、站点或请求代际时，旧 promise 继续 fail-closed。

## 重新评估与选择

Phase98 已解决 A→B→A 的请求代际隔离并完成 47 发布。复评后，App 仍重复声明 25 个几乎相同的 scope writer，后续任意模块迁移都可能遗漏其中一个。先抽取唯一 writer helper，比继续移动业务 handler 更小、更容易逐项审查，也为后续按领域拆分 App 状态提供稳定边界。

## GitHub 参考与取舍

- [Nx affected CI features](https://nx.dev/docs/features/ci-features/affected)：借鉴把变更边界显式化；本切片把 scope 校验作为唯一可复用写入入口，不引入 Nx。
- [Twenty CLAUDE.md](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：借鉴按 app-shell/模块边界组织可审查职责；本切片只移动前端状态写入辅助逻辑，不复制其数据模型或状态库。

## 实施

- 在 `modules/appShell/workspaceScope.ts` 新增 `useWorkspaceScopeWriter`，统一读取当前 scope ref、比较期望 scope，并调用原 React setter。
- `App.tsx` 的 25 个 `set*AtCurrentScope` 回调全部改为该 helper；直接清空、登出、登录、业务状态和接口调用保持原路径。
- 增加 hook characterization，验证当前 scope 接受写入、scope 变化后拒绝旧 updater、重新绑定新 scope 后恢复写入。
- 不修改 API、权限定义、数据范围算法、数据库、迁移、金额、状态、审计或持久化数据。

## 本地验证

- Web safe 定向测试 20/20（workspace scope、writer、workspace refresh、characterization、WarehousePage loading）。
- Web typecheck、`architecture:check:fast`（434 route contracts）和 `git diff --check` 通过。
- 独立高风险审查：未发现 P0/P1；确认 25 个 Hook 固定顺序、普通值/functional updater 原样传递、旧 scope fail-closed，且权限、数据裁剪、fallback 与业务处理链未改。P2 仅为未来新增 writer 缺少静态规则，本切片已用 characterization 覆盖旧 functional updater 不执行。
- 仅发布 Web；不运行迁移，不触碰业务或系统数据。

## 发布边界

- 目标服务：`web`；候选文件仅 `apps/web/src/App.tsx`、`apps/web/src/modules/appShell/workspaceScope.ts`、对应测试与本状态文件。
- 47 发布前重新捕获当前运行基线；发布后核对 Web provenance、镜像、health、锁/recovery。视觉和真实角色切换由用户人工验收。
