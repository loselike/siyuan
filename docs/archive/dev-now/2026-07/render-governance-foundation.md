# render-governance-foundation

- 状态：`complete`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`render-governance-foundation`
- 分支：`当前共享工作区（未切换，保留既有未提交改动）`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-17 Asia/Shanghai`

## 输入摘要

- 目标：建立全局渲染错误定位、受控表格防反馈环和路由一致性底座，并以报价价格表与仓库为代表验证。
- 不做：本轮不发布 47、不迁移数据库、不一次性重构其余业务模块。

## 允许修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/shared/ui.tsx`
- `apps/web/src/modules/{pricing,warehouse}/**`
- 对应 Web 测试、Docker/Web 发布脚本和本文件

## 当前进度

- 已接入全局错误上下文：发布版本、URL、一级菜单和二级页会随错误编号上传；错误恢复键按菜单/二级页切分。
- `ManagedTable` 不再在 `useEffect` 中回写受控选择；报价价格表与仓库待出库已改为稳定的选择/列输入。
- 根应用以浏览器 URL 纠正失配的内存菜单；发布脚本写入可追踪 release id，Web 构建保留非公开 source map。
- 安全测试 runner 已强制 Vitest 单线程、关闭文件并发，并在超时/中断/异常退出时持续清理进程组后才退出。

## 验证

- 通过：共享表格定向安全测试（13 项）、URL 二级导航定向安全测试、Shared/Web/API 类型检查、Web production build、`git diff --check`、47 发布脚本 dry-run。
- 通过：安全 runner 语法检查；共享表格安全测试 13 项并明确输出 `PASS`；故意超时用例明确输出 `FAIL exit=124` 且无本会话遗留进程；故意无测试文件明确输出 `FAIL exit=1`。
- 注意：仓库/报价大页面定向 Vitest 仍可能因既有用例本身卡住，但现在只有单 worker，且可由 runner 自动清理；未将其业务用例计为通过。

## 交接

- 阻塞：无
- 剩余风险：当前工作树包含其他会话的大量未提交改动；其余 20 个 `ManagedTable` 页面尚未进入推广阶段。
