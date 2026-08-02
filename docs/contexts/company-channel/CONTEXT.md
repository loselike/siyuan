# Company Channel

The Company Channel context defines how a carrier service converts cargo measurements into charge weight.

## Language

**业务类型**:
The transport mode represented by a company channel. The allowed company-channel meanings are exactly:

- **快递**
- **空运机场**
- **海运港口**
- **专线**

_Avoid_: Using “小包” as a company-channel business type; it is not part of this context's four transport modes.

**渠道类别**:
An optional secondary classification for a company channel, such as DHL or UPS. A company channel may remain uncategorized without inheriting a category from its carrier or business type.

_Avoid_: Treating the channel category as required or silently substituting the carrier name when it is left blank.

**渠道预警阈值**:
Optional limits maintained on a company channel for overweight and over-girth cargo. When a limit is configured, the system evaluates cargo measurements automatically and raises the corresponding warning; leaving a limit blank disables that warning for the channel.

The overweight limit is evaluated against the actual weight of each physical package. A package triggers the warning only when its actual weight is greater than the configured limit; volumetric weight and charge weight do not participate.

_Avoid_: Treating these fields as manual warning text, raising a warning when the corresponding limit is blank, or using volumetric/charge weight for the overweight warning.

**超围预警**:
An automatic per-package dimensional warning, expressed in centimetres. A channel may use either or both supported formulas:

- `长 + 宽 + 高`
- `长 + 2 ×（宽 + 高）`

The warning triggers only when a selected formula's result is greater than its configured limit. It is called “超围” rather than “超大”.

Each selected formula has its own centimetre limit. When both formulas are enabled, exceeding either formula's configured limit raises the warning.

_Avoid_: Using kilograms for this warning or silently treating “超围” as a longest-side check.

**单件最低消费**:
An optional minimum charge weight applied to each physical package. A package below the configured kilogram value is billed using that minimum; leaving it blank disables the rule.

**单票最低消费**:
An optional minimum billing quantity applied to the whole shipment. Its configured unit is either `KG` or `CBM`; leaving it blank disables the rule.

When the unit is `KG`, the configured quantity is the shipment's minimum charge weight. When the unit is `CBM`, the configured quantity is converted to kilograms using the channel ratio `1:n`; for example, `0.5 CBM` at `1:167` becomes `83.5 KG`. A ratio is therefore required whenever the shipment minimum unit is `CBM`.

**比重**:
A freely maintained channel ratio displayed in the form `1:n`, such as `1:167` or `1:200`.

**大货起始重量**:
The existing threshold used by settlement-weight rounding. It is independent from the overweight warning and must not be renamed or reused as an overweight limit.

**除材积**:
The divisor used to convert package dimensions in cubic centimetres into volumetric weight. A company channel may use only `5000` or `6000`.

_Avoid_: Allowing arbitrary divisors or free-text divisor input.

**单件重量进位规则**:
The rounding rule applied to the weight of one package at the single-package stage. It has three business meanings:

- **按实际**: Keep the calculated weight unchanged; for example, `15.51 → 15.51`.
- **0.5以下进0.5；0.5以上进1**: Round upward to the next half-kilogram boundary. A value already ending in exactly `.50` remains unchanged; for example, `15.01 → 15.50`, `15.50 → 15.50`, and `15.51 → 16.00`.
- **超0进1**: Round any non-integer value upward to the next whole kilogram; for example, `15.01 → 16.00` and `15.50 → 16.00`.

_Avoid_: Describing an exact `.50` value as needing another increase under the half-kilogram rule.

**结算重量计算规则**:
The rule that decides whether volumetric weight participates when deriving charge weight. It has two business meanings:

- **取实重材积大值**: Compare actual weight with volumetric weight and use the larger value.
- **取实重不计材积**: Use actual weight and completely exclude volumetric weight from the comparison.

The configured multi-package weight rule determines whether this comparison occurs for each package or after weights are accumulated.

**先累加再比较**:
A multi-package charge-weight rule with no intermediate rounding:

1. Accumulate actual weight for the whole ticket.
2. Accumulate volumetric weight for the whole ticket.
3. Apply the configured settlement-weight calculation rule to the two totals.
4. Apply the ticket-level settlement rounding rule.

_Avoid_: Applying the single-package rounding rule; this mode does not use an intermediate rounding step.

**先比较再累加**:
A multi-package charge-weight rule in which every physical package is compared independently, but its compared weight is not rounded before accumulation:

1. For each package, compare actual weight with volumetric weight according to the configured settlement-weight rule.
2. Preserve each package's compared weight as-is and accumulate those values.
3. Apply the ticket-level settlement rounding rule to the accumulated result.

Example with a `21 kg` large-cargo threshold: `max(6, 15.51) = 15.51`, `max(26.1, 15.51) = 26.1`, accumulated charge weight `41.61`, and final whole-kilogram settlement weight `42`.

_Avoid_: Applying the single-package rounding rule before accumulation; that is “先比较进位再累加”.

**先比较进位再累加**:
A multi-package charge-weight rule in which every physical package is compared and rounded independently before accumulation:

1. For each package, compare actual weight with volumetric weight according to the configured settlement-weight rule.
2. Apply the configured single-package rounding rule to that package. The single-package rule applies even when that package weighs more than the ticket's large-cargo threshold.
3. Accumulate the rounded charge weights of all packages.
4. Apply the ticket-level settlement rounding rule to the accumulated result, using the large-cargo threshold against the ticket total rather than against each package.

Example with a `21 kg` large-cargo threshold and half-kilogram single-package rounding: `max(6, 15.51) → 16`, `max(26.1, 15.51) → 26.5`, accumulated charge weight `42.5`, and final whole-kilogram settlement weight `43`.

_Avoid_: Applying the large-cargo whole-kilogram rule separately to a package inside a multi-package ticket.

**先累加再比较进位**:
A multi-package charge-weight rule with a ticket-level intermediate rounding step:

1. Accumulate actual weight for the whole ticket.
2. Accumulate volumetric weight for the whole ticket.
3. Apply the configured settlement-weight calculation rule to the two totals.
4. Apply the configured intermediate rounding rule to the comparison result.
5. Apply the ticket-level settlement rounding rule.

In the Company Channel form, the same stored rule field is labeled **比较后进位规则** for this mode because it applies to the compared ticket result, not to each package.

_Avoid_: Describing this as single-package rounding; no package is independently rounded in this mode.

**空运到机场整票累加取大后进1**:
An airport-airfreight charge-weight rule that first totals all packages before any comparison or rounding:

1. Calculate volumetric weight with the channel's configured divisor and accumulate the volumetric weights of all packages.
2. Accumulate the actual weights of all packages.
3. Use the larger of total actual weight and total volumetric weight.
4. Round any non-integer ticket total upward to the next whole kilogram.

Example with divisor `6000`: total actual weight `58.8`, total volumetric weight `49.632`, comparison result `58.8`, and final charge weight `59`.

_Avoid_: Comparing or rounding each package before the ticket-level totals are calculated.
