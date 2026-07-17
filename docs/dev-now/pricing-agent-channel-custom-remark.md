# 2026-07-14 报价查价代理渠道自定义备注自动带出

- 状态：completed
- 输入来源：用户任务卡 `2026-07-14-报价查价-代理渠道自定义备注自动带出`。
- 会话 slug：pricing-agent-channel-custom-remark

## 输入摘要

- 目标：管理员按查价模块、代理和真实渠道维护独立备注，业务员查询命中时仅看到可展示文本，且与原表渠道要求分开。
- 不做：不改原表渠道要求、价格、加价、成本、毛利和迪拜图片模块，不发布 47。

## 允许修改

- `apps/web/src/modules/pricing/`、`apps/web/src/apiClient.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/modules/data.controller.ts`、两套仓储、Prisma schema 与最小迁移、报价测试。

## 当前进度

- 已补齐代理渠道自定义备注的 Shared DTO、Prisma 迁移、管理接口、内存/Prisma 仓储、报价批量匹配与前端维护、展示入口。
- 备注按 `查价模块 + 代理简称 + 真实渠道` 唯一隔离；迪拜图片模块拒绝维护和输出备注。
- 查价在已有结果数据集合中构建备注映射，不增加逐条接口请求；业务员仅收到可展示的文本。

## 验证

- 通过：`npm run typecheck -w @siyuan/api`。
- 通过：`npm run typecheck -w @siyuan/web`。
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "keeps agent channel custom remarks"`（1/1）。
- 通过：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "自定义备注|渠道要求|代理|渠道|业务员"`（10/10）。
- 通过：`git diff --check`。
- 任务卡给出的宽泛 API 筛选命令另命中既有用例 `keeps standalone legacy sources out of current pricing markup and book-rows management`，其断言期望拓普达导入行数为 4，当前夹具实际为 1；新增自定义备注用例通过，未修改该无关断言。

## 交接

- 阻塞：无；未发布 47（任务卡明确不发布）。
