---
dsl: 2.0
lang: en
type: flow
start: a
constraints:
  back-path-exists: true
---
<!-- expect: none -->
## Screens
| id | file | terminal |
| --- | --- | --- |
| a | ./a.ui.md |  |
| b | ./b.ui.md |  |
| c | ./c.ui.md | yes |
## Transitions
- a #x -> b
- b #y -> c
- b #back -> a
