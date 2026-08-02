# 坤宇加拿大价格表导入

- 状态：`released`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`pricing-kunyun-canada-import`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-16 Asia/Shanghai`

## 输入摘要

- 目标：让 `7月16号坤宇.xlsx` 能导入加拿大空海查询模块。
- 不做：不修改报价金额、查询筛选、权限或历史价格表。

## 允许修改

- `apps/api/src/modules/pricing-excel.ts`
- `apps/api/src/modules/app.pricing.e2e.test.ts`

## 当前进度

- 已识别坤宇的“分区/重量”“分区”“FBA仓”表头，支持 KG 空派/海派及按方 FBA 海卡；渠道要求和工作日时效一并解析。
- 已于 2026-07-16 同步到 47，仅同步 `apps/api/src/modules/pricing-excel.ts` 并重建 API；未发布本地其他未同步的 Web/API 改动，未运行迁移。

## 验证

- 已通过：`npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "Kunyun Canada"`
- 已通过：`npm run typecheck -w @siyuan/api`
- 已通过：`git diff --check`
- 已通过：47 容器内与公网 `/api/health`，公网首页 HTTP 200；API 日志确认 Nest 启动完成。

## 交接

- 阻塞：无
- 剩余风险：历史失败任务不会自动重跑，需重新上传原文件。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
