---
dsl: 2.0
lang: en
constraints:
  destructive-needs-confirm: true
---
<!-- expect: none -->
[ Delete account ](#confirm-del){: destructive }
::: MODAL :::{: #confirm-del }
## Really delete?
[ Delete ](#do){: primary }
[ Cancel ](#no)
--- END ---
