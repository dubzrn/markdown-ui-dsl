---
dsl: 2.0
lang: en
type: flow
start: a
constraints:
  flow-depth: 2
---
<!-- expect: W5303 -->
## Screens
| id | file | terminal |
| --- | --- | --- |
| a | ./a.ui.md |  |
| b | ./b.ui.md |  |
| c | ./c.ui.md |  |
| d | ./d.ui.md | yes |
## Transitions
- a #x -> b
- b #y -> c
- c #z -> d
