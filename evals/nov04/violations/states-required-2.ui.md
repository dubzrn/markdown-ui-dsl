---
dsl: 2.0
lang: en
constraints:
  states-required: [loading, empty]
---
<!-- expect: W5307 -->
::: REGION feed :::
::: STATE default :::
{{ feed.title }}
--- END STATE ---
::: STATE loading :::
Loading
--- END STATE ---
--- END REGION ---
