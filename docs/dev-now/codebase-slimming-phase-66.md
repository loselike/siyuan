# 代码瘦身治理第六十六阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜66`
- 续接自：`docs/dev-now/codebase-slimming-phase-65.md`
- 上下文状态：`green`
- 输入来源：持续目标要求按低风险只读领域回补 47/Git 源码漂移
- 会话 slug：`codebase-slimming-phase-66`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：回补已经运行在 47、但尚未进入当前 Git 的“出货单号”术语和轨迹 Excel 表头兼容窄切片。
- 固定样本：分别使用“出货单号”和旧“运单号”表头导入一条轨迹；缺少单号表头时保持 47 当前错误文案。
- 硬边界：不改 API、提交载荷、轨迹数据结构、匹配逻辑、RBAC、数据库、状态流转或审计。

## 修改

- `apps/web/src/modules/appShell/config.tsx`
- `apps/web/src/modules/tracking/bulkImport.ts`
- `apps/web/src/modules/tracking/bulkImport.test.ts`
- `docs/dev-now/codebase-slimming-phase-66.md`
- `.codex-state.md`

## 当前进度

- 将票件公共列名从旧“运单号”回补为 47 当前使用的“出货单号”。
- 轨迹 Excel 导入优先接受“出货单号”，同时继续接受“运单号”“系统单号”等全部旧别名；缺表头错误文案与 47 保持一致。
- 两个生产文件逐字回补后与 47 SHA-256 一致，漂移硬指标从 `60 changed + 46 remote-only` 降至 `58 changed + 46 remote-only`。

## 验证

- Web 安全 runner 定向测试 3/3 通过，覆盖新旧两个单号表头及缺表头错误文案。
- `git diff --check` 通过。
- 本地 `config.tsx` 与 47 SHA-256 均为 `9e6da0a38168c0367e0dbf98fc9ec87808ad4de288b16e9c236d390a608b98c6`；本地 `bulkImport.ts` 与 47 均为 `5f5530c655861052560b7ee77a49898545b70ec99cf78b136128922c9c2ec297`。
- 47 Web 静态产物包含“出货单号（兼容运单号）”指纹；Web/API/Postgres/Redis 正常，宿主和公网 health 为 200。

## 交接

- 阻塞：无。
- 发布状态：`无需重复发布`；本阶段是把当前 47 已构建运行的两份源码回补到 Git，远端源码和运行产物没有变化。
- 准确下一步：继续选择一个能让完整生产文件与 47 同哈希的低风险窄切片；优先处理仓库打印临时窗口自动关闭，或独立的纯展示格式化差异，继续避开财务、权限、状态和 migrations。
