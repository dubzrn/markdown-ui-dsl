---
dsl: 2.0
lang: en
constraints:
  states-required: [loading, empty]
---
<!-- expect: none -->
::: REGION feed :::
::: STATE default :::
{{ feed.title }}
--- END STATE ---
::: STATE loading :::
Loading
--- END STATE ---
::: STATE empty :::
Nothing yet
--- END STATE ---
--- END REGION ---
