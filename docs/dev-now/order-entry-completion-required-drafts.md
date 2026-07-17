# 录单异常自动进入草稿箱

## 本轮完成

- 提交审核增加公司渠道适用费率、汇率换算与计费重校验；校验失败时保持草稿状态并写入待完善原因。
- 待完善草稿不会出现在待审核运单接口；重新提交校验通过后进入待审核并清除原因。
- 草稿箱展示“待完善”状态与具体原因，录单页以提示框说明已自动保存。

## 验证

- `USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.finance.e2e.test.ts -t "completion-required draft|auto-matches a later"`
- `npm run typecheck -w @siyuan/api`
- `npm run typecheck -w @siyuan/web`

## 未执行

- 未发布到 47。
