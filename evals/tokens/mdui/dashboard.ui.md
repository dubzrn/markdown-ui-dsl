---
dsl: 2.0
lang: en
title: Product Analytics Dashboard
data:
  mau:
    labels: [Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar]
    series:
      MAU: [84500, 87200, 90100, 93800, 96500, 100200, 104800, 109600, 114300, 119900, 123700, 128400]
  acquisition:
    slices:
      Organic Search: 34
      Paid Search: 22
      Referrals: 16
      Social: 12
      Direct / Other: 16
  revenue:
    labels: [Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar]
    series:
      MRR ($): [332000, 341000, 349000, 356000, 364000, 372000, 381000, 389000, 397000, 404000, 408000, 412000]
      ARR ($): [3984000, 4092000, 4188000, 4272000, 4368000, 4464000, 4572000, 4668000, 4764000, 4848000, 4896000, 4944000]
---

::: CARD :::
# Product Analytics Dashboard
Usage, acquisition, feature adoption, and revenue trends
--- END ---

=== ROW ===
::: CARD :::
## Monthly Active Users (MAU)
**128,400**
+6.2% vs last month
--- END ---
::: CARD :::
## New Users (30d)
**24,950**
+3.1% vs last 30d
--- END ---
::: CARD :::
## MRR
**$412,000**
+4.4% MoM
--- END ---
::: CARD :::
## ARR
**$4.94M**
+18.7% YoY
--- END ---
--- END ---

=== ROW ===
::: CARD :::
## Monthly Active Users
Last 12 months
[ CHART: bar "Users by Month" data=mau ]
--- END ---
::: CARD :::
## User Acquisition
Share of new users (last 30 days)
[ CHART: pie "Acquisition channels" data=acquisition ]
Tip: Track CAC and conversion rate by channel to explain mix shifts.
--- END ---
--- END ---

::: CARD :::
## Top Features
Adoption and engagement (last 30 days)

| Feature | Weekly Active Users | Adoption Rate (%) | Avg. Uses / User |
|---|--:|--:|--:|
| Dashboards | 48200 | 62.5 | 5.8 |
| Automations | 31750 | 41.2 | 3.1 |
| Integrations | 28900 | 37.5 | 2.4 |
| Team Collaboration | 27100 | 35.2 | 4.6 |
| Exports | 19850 | 25.8 | 1.7 |
| Alerts | 17600 | 22.9 | 2.0 |
| API Access | 12150 | 15.8 | 6.3 |
--- END ---

::: CARD :::
## Revenue Trend
MRR and ARR (last 12 months)
[ CHART: line "MRR and ARR (USD) by Month" data=revenue ]
ARR shown as 12×MRR for directional tracking; replace with contracted ARR if you track annual commitments.
--- END ---
