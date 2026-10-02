---
dsl: 2.0
lang: en
constraints:
  states-required: true
---
<!-- expect: W5307 -->
::: REGION orders :::
::: STATE default :::
{{ orders.count }}
--- END STATE ---
--- END REGION ---
