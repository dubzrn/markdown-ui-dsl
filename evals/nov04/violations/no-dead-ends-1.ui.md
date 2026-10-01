---
dsl: 2.0
lang: en
type: flow
start: a
constraints:
  no-dead-ends: true
---
<!-- expect: W5306 -->
## Screens
| id | file | terminal |
| --- | --- | --- |
| a | ./a.ui.md |  |
| b | ./b.ui.md |  |
| c | ./c.ui.md | yes |
## Transitions
- a #x -> b
- a #y -> c
