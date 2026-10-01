---
dsl: 2.0
lang: en
constraints:
  error-recovery-message: true
---
<!-- expect: W5308 -->
::: REGION r :::
::: STATE default :::
ok
--- END STATE ---
::: STATE error :::
Something broke
--- END STATE ---
--- END REGION ---
