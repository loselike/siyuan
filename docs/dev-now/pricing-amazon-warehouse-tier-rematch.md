# 亚马逊仓库前缀与原始重量档重匹配

- 状态：`completed-local`
- 输入来源：`2026-07-14-报价查价-仓库编码组合规则全局匹配` 与用户对 `YYZ4` 未命中的补充截图。
- 会话 slug：`pricing-amazon-warehouse-tier-rematch`
- worktree：`/Users/j1ng/Tools/sunny`

## 本轮修复

- 保留供应商原表重量档：`21KG+`、`45KG+` 等不再被运行时归并为旧的 `12/51/100KG+` 桶。
- 亚马逊下拉仍可维持既有标准档位；后端将其仅视为 UI 提示，实际以仓库、目的地和计费重命中的原始价格行决定档位并回显。
- 保留裸仓库前缀规则：原表 `YYZ` 能匹配查询 `YYZ4`；范围、组合、精确编码的优先级不变。
- 供应商组合单元格中的中文仓库区域标签（如 `多伦多（YYZ/YHM1/...）`）现在作为分隔文本处理，不再把首个裸前缀拼成 `多伦多YYZ` 后丢弃。
- `amazon` 解析规则版本升为 `2`，沿用现有价格表规则刷新队列：发布后仅串行重解析该模块版本落后的、保留原文件的价格表，不要求重新上传，失败不覆盖旧报价。

## 验证

- 通过：`npm run build -w @siyuan/shared`。
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "keeps explicitly imported module pricing independent|加拿大 YYZ|source workbook weight tier|highest actual KG tier"`（4 passed）。
- 通过：`npm run typecheck -w @siyuan/api`。
- 通过：`npm run typecheck -w @siyuan/web`。
- 通过：`git diff --check`。

## 风险

- 本轮未发布 47；47 上已经被旧规则归并为 `51KG+` 的历史亚马逊价格表，要在新代码发布后由规则刷新队列完成重解析，前提是该价格表保留可读取的原始文件。
- 完整 API 定向测试仍有多项既有断言漂移（加价、美国邮编、欧洲展示文案），与本轮仓库/重量档逻辑无关；本轮新增和相关回归已通过。
