# logistics-tracking-function-permissions

- 状态：`completed`
- 输入来源：`/Users/j1ng/.codex/attachments/04a0615c-2d5a-452f-b389-ff92116bd286/pasted-text.txt`
- 会话 slug：`tracking-function-permissions`
- 分支：`当前共享工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 完成时间：`2026-07-14 Asia/Shanghai`

## 输入摘要

- 目标：将物流轨迹管理拆分为承运商任务、外部物流轨迹的细粒度功能权限，并在接口和页面分别执行。
- 不做：承运商真实接口、自动状态映射、手动轨迹独立菜单和 47 发布。

## 已完成

- 增加承运商任务和外部物流轨迹的功能权限定义，并在角色权限页按“物流轨迹管理 / 二级目录”分组展示。
- 承运商任务查询、同步、重试分别在后端校验；失败原因按独立权限裁剪。
- 外部轨迹页面按查看、最新轨迹、未更新天数、详情、上传、预览、确认覆盖、错误行、未匹配和列设置逐项显示。
- 批量导入后端要求同时具备确认导入和覆盖权限；单票添加轨迹保持独立权限。

## 验证

- 通过：`npm run typecheck -w @siyuan/api`
- 通过：`npm run typecheck -w @siyuan/web`
- 通过：`npm test -w @siyuan/web -- --run src/modules/tracking/tracking.test.tsx -t "物流轨迹|承运商任务|外部物流轨迹|导入轨迹|覆盖|权限"`
- 已知：`app.orders.e2e.test.ts` 定向运行仍有两项既有断言失败，分别是仓库权限返回和费用字段掩码，与本次轨迹权限接口无关；轨迹批量导入在该流程中已成功更新最新轨迹。

## 交接

- 阻塞：无。
- 剩余风险：导入预览仍为当前页面的本地文件解析；未新增独立服务端预览接口。
