# Warehouse

The Warehouse context manages goods while they are stored at a site, including the rules that determine when and how warehouse rent accrues.

## Language

**免租时长**:
The configured rent-free duration for each package, expressed in either days or fixed 30-day months.
_Avoid_: 免租天数 when the configured unit may be a month

**计费基数**:
The physical quantity used to calculate warehouse rent, either cubic metres (CBM) or kilograms (KG).
_Avoid_: 计费单位 when referring to a combined quantity-and-period expression

**计费周期**:
The time unit attached to the configured warehouse-rent price, either a day or a fixed 30-day month.
_Avoid_: 日租 when the configured period may be a month

**固定月**:
A warehouse-rent period equal to exactly 30 days, independent of calendar-month boundaries.
_Avoid_: 自然月

**仓租单价**:
The RMB price for one unit of the selected billing basis over one selected billing period.
_Avoid_: 日租单价 when the selected billing period is a month

**货物比重**:
The weight-to-volume ratio written as `1:N`, meaning one CBM corresponds to N kilograms. Warehouse-rent rules use it as an editable threshold: the applicable rule is the highest threshold that does not exceed the cargo's actual ratio. New rules default to `1:167`.
_Avoid_: 比重区间, 比重上限

**在仓数据修改权**:
The authority to change an unentered package while it remains valid in-stock inventory. It belongs to administrators, warehouse general staff, warehouse receiving staff, and warehouse tally staff. Warehouse outbound staff and all non-warehouse roles do not have this authority.
_Avoid_: 仓库写权限 when the intended scope is specifically editing in-stock package data
