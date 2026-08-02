# 拓普达亚马逊仓库与美国邮编分支

- 状态：completed
- 输入：`2026-07-15-报价查价-拓普达代理解析体系与亚马逊美国双分支匹配`

## 已完成

- 拓普达改由一个代理解析档案统一识别仓库代码分支与美国邮编分支；导入目标模块只选择写入 `amazon` 或 `usaAirSea` 独立价格池。
- 亚马逊分支保留供应商原始重量档和仓库范围/组合/前缀；美国分支支持五位区间、`8-9`、`8-96`、`8-9-10` 与逗号分组邮编规则。
- 无法解析的仓库片段保留为不可匹配行，供数据体检定位；不会成为业务报价。时效清洗补齐“交付/签收”与“个自然日”表述。
- 增加解析回归，验证同一工作簿按模块导入不会串入另一分支。
- 美国邮编体检改为只在同一渠道、价格组和重量段内检查重叠；同一线路的 `12KG+ / 45KG+ / 101KG+` 复用邮编范围不再误报。
- 价格表替换改为精确限定在“同一代理 + 同一查价模块 + 同一文件名”的既有 `priceBookId`；导入亚马逊不会停用同名的美国空海运来源，重导亚马逊也只归档旧亚马逊版本。
- 价格表列表、查价来源、线路筛选、同步体检、导入任务回显和删除操作均改为按 `priceBookId` 关联来源，消除同名文件造成的跨模块显示、体检和删除串池。
- 派格 `7-9派格.xls` 只解析入 `usaAirSea`：空运页保留原始 `10KG+ / 21KG+ / 71KG+ / 101KG+` 阶梯与邮编规则；派格空运渠道显示为 `空运快递派 - 大陆直飞 UPS/FedEx派送`，并从原表提取 `8个自然日` 时效。并列的 FBA 卡派汇总不再误写入美国空海运池。
- 振韵 `7.3振韵.xls` 增加独立三分支解析：`德国海运直送和卡派` 仅进入亚马逊池并保留 DTM1/DTM2 等仓库码、CBM/KG 阶梯及 `40-48天（开船-提取）`；`欧洲海运普货超大件专线` 仅进入询盘池，按目的国和两位邮编前缀匹配，`全境`不限制邮编；`欧洲空派快递派` 仅进入欧洲空海运快递池，保留大陆直飞/转飞/香港飞、原始重量段，以及意大利 `10000-50999` 与“其他”分区。
- 欧洲邮编匹配统一支持两位前缀、完整数值区间、`全境`和“其他区间”排除规则；意大利欧洲空派查询在页面要求填写邮编，避免两个意大利价格区同时参与报价。
- 驰汉 `7.8-驰汉.xlsx` 增加独立解析档案，且强制只允许导入 `europeExpress`：英国/非英 UPS 海运双清按国家、原始 KG 阶梯和“包税/不包税”分别写入；英国/欧洲卡车海运双清按 `0/10/20CBM+` 写入同模块，并明确标为“头程参考价”，不把派送、托盘和整车明细误写成总价。
- 欧洲空海运铁路快递查询新增“税务口径：全部 / 包税 / 不包税”筛选。内存和 Prisma 查询都按线路税务标签过滤；驰汉卡车线路仍留在本模块，超大件画像优先匹配该卡车线路，普通货也可查询。
- 代理加价规则的“渠道线路详情”改用与查价相同的解析后渠道字段；旧价格行若把 `A:头程…` 等备注误存为目的地，会从工作表/渠道文本回推可识别国家，否则显示“待确认”，不再把备注当目的地展示。
- 渠道线路详情中的“工作表（Sheet）”明确对应原始价格表中的一个 sheet；筛选、表格列名、详情字段和批量加价提示统一使用该术语。

## 验证

- 通过：`npm run build -w @siyuan/shared`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "TPD US|Topuda profile|warehouse codes separate"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "overlapping US ZIP|TPD US|Topuda profile"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "same-named price books|feeds price book imports into the selected legacy module only"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "Paige|派格"`
- 通过：`npm run typecheck -w @siyuan/api`
- 通过：实际读取 `/Users/j1ng/Downloads/7.3振韵.xls`，解析结果为 Amazon 324 行、欧洲海运超大件 430 行、欧洲空派快递 276 行；三个模块来源互相隔离。
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "keeps Zhenyun Amazon"`
- 通过：`npm run typecheck -w @siyuan/web`
- 通过：实际读取 `/Users/j1ng/Downloads/7.8-驰汉.xlsx`，解析 456 行，覆盖英国/非英 KG 双清与英国/欧洲 CBM 卡车头程共 8 条税务分线路。
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "Chihan|驰汉|uses the sheet and price-group"`
- 通过：`npm run build -w @siyuan/api`、`npm run typecheck -w @siyuan/api`、`npm run typecheck -w @siyuan/web`、`git diff --check`
- 通过：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "uses the same parsed route"`

## 未做

- 未发布 47。
