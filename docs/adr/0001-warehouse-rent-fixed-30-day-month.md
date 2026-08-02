# Warehouse-rent month means a fixed 30 days

Warehouse-rent rules may express both the rent-free duration and the billing period in days or months. A month is defined as exactly 30 days: one rent-free month equals 30 rent-free days, and a monthly unit price accrues daily as `monthly price ÷ 30 × actual charge days`. This keeps charges stable across calendar months and preserves the existing daily accrual and historical rule behaviour; natural-month boundaries and whole-month rounding are deliberately not used.
