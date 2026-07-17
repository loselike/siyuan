# finance-function-permissions

- 状态：`completed`
- 输入来源：`/Users/j1ng/.codex/attachments/62123e80-e11f-4ca7-8a50-3952d153e6c6/pasted-text.txt`
- 会话 slug：`finance-function-permissions`
- worktree：`/Users/j1ng/Tools/sunny`
- 完成时间：`2026-07-14 Asia/Shanghai`

## 已完成

- 增加财务看板、应收、业务成本、应付、待付款、已付款、水单到账、水单匹配和代理账单的细粒度权限，并按真实二级目录输出到角色权限矩阵。
- 财务路由、关键按钮及批量操作改为读取对应细权限；应收、水单、付款、凭证和代理账单接口改为独立后端校验。
- 修正水单创建/凭证上传不再被只读权限放行；凭证上传按业务上下文校验所需权限。

## 验证

- 通过：`npm run typecheck -w @siyuan/api`
- 通过：`npm run typecheck -w @siyuan/web`
- 通过：财务前端定向测试（7 passed）。
- 已知：财务 API 旧 E2E 有 3 项按旧粗粒度权限预期写入成功；本轮改为 403，需更新这些历史断言为新权限模型。

## 交接

- 不发布 47，不提交 Git。
- 剩余风险：部分财务底层仓储仍保留旧 key 到新 key 的兼容映射，以兼容既有服务调用；后续可在旧 key 下线后删除。
