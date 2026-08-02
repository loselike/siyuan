# 查价最高重量档位全模块兜底

- 状态：`complete`
- 输入来源：用户明确要求
- 会话 slug：`pricing-highest-weight-tier-fallback-all-modules`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-10 Asia/Shanghai`

## 输入摘要

- 目标：所有查价模块在供应商原表缺少更高 KG 档时，最高有效 KG 档必须覆盖更高实际计费重；若原表存在更高档，则优先真实更高档。

## 范围

- 统一 API/Web 价格表解析与所有 KG 查价匹配的最高档范围语义。
- 覆盖亚马逊、欧洲海运超大件、欧洲空海运铁路快递、美国、加拿大和迪拜的普通价格表解析路径。

## 不做范围

- 不改变按方 CBM 档、重量计算公式、加价、排序或模块隔离。
- 不发布 47，除非用户后续明确要求。

## 完成内容

- 统一普通价格表 KG 解析：最高的 `KG+ / 以上` 档在没有更高 KG 档时为无上限；存在更高档时仍保持真实分段。
- API 运行时同步处理历史导入行：不必重新上传，旧 `maxWeightKg=99.999` 的最高开放 KG 档也可覆盖更高实际计费重。
- 覆盖通用查价、亚马逊和 Legacy 查询路径；按方 CBM 档及明确封顶区间不参与兜底。

## 验证

- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "highest.*tier"`，覆盖亚马逊与欧洲空海运铁路快递 300KG 查询。
- 通过：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "imports Yiyang|保留美国派格"`。
- 通过：`npm run typecheck -w @siyuan/api`、`npm run typecheck -w @siyuan/web`、`git diff --check`。

## 交接

- 本轮未发布 47；47 上已有亿阳的专项数据修复仍有效，其他模块将从新运行时逻辑直接受益。
