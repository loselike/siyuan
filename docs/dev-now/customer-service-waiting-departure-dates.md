# 客服待离港日期可见与确认离港

## 输入

- 任务卡：`2026-07-13-客服管理-待离港日期字段可见与确认离港`。

## 允许修改

- `apps/web/src/modules/customerService/CustomerServicePage.tsx`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- 客服模块相关测试。

## 不做

- 不发布 47；不新增独立日期字段；不接外部轨迹或通知。

## 完成情况

- 待离港默认列增加 `ETD/ATD`、`ETA/ATA`，日期完整与缺失状态在列表顶部区分提示。
- 修改弹窗继续回填日期，保存仅更新资料；确认离港缺日期按实际缺失项提示。
- 确认离港改为前后端都必须填写离港批注，日期变更与状态确认沿用既有审计/链路事件。
