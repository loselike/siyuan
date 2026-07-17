# 代理删除引用检查与提示修复

- 状态：`published_47`
- 输入来源：用户明确要求
- 会话 slug：`agent-delete-reference-check`
- 范围：代理删除引用查询、中文 400、失败提示状态、删除确认文案及相关测试
- 不做：数据库迁移、历史数据清理、其他删除入口改造、47 发布

## 完成内容

- 运单引用只按 `Shipment.agentId` 查询，其他财务、价格表等真实名称字段继续兼容代理名称。
- 任一所选代理存在业务引用时整批返回中文 `400`，不进行部分删除。
- 删除失败提示增加明确失败前缀并显示红色错误状态。
- 删除确认统一为 `是否确认删除？`，确认按钮统一为 `确认删除`。

## 验证

- 已通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "physically deletes unreferenced master data agents"`
- 已通过：`npm test -w @siyuan/web -- --run src/modules/masterData/masterData.test.tsx -t "代理资料.*删除|删除失败"`
- 已通过：`npm run typecheck -w @siyuan/api`
- 已通过：`npm run typecheck -w @siyuan/web`
- 已通过：`git diff --check`

## 47 发布

- 仅从 47 当前稳定源码制作并发布本任务补丁，未携带财务、员工、加价规则等其他并发删除改动。
- 未发现 Prisma schema/migration 差异，未运行数据库迁移。
- 47 `api web` 镜像构建并重启成功；容器和公网健康检查通过。
- 线上 Prisma `Shipment.agentId` 引用查询通过，API 日志未再出现 `Unknown argument agentName`。
- 线上 Web 构建已包含 `是否确认删除？`。
