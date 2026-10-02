---
dsl: 2.0
lang: en
constraints:
  error-recovery-message: true
---
<!-- expect: W5308 -->
::: REGION r :::
::: STATE error :::
## Failed
Try later
--- END STATE ---
--- END REGION ---
