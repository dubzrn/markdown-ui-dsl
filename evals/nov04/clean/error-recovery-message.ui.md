---
dsl: 2.0
lang: en
constraints:
  error-recovery-message: true
---
<!-- expect: none -->
::: REGION r :::
::: STATE error :::
Something broke
[ Retry ](#retry)
--- END STATE ---
--- END REGION ---
