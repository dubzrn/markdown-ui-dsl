---
dsl: 2.0
lang: en
type: flow
start: a
constraints:
  flow-depth: { max: 1 }
---
<!-- expect: W5303 -->
## Screens
| id | file | terminal |
| --- | --- | --- |
| a | ./a.ui.md |  |
| b | ./b.ui.md |  |
| c | ./c.ui.md | yes |
## Transitions
- a #x -> b
- b #y -> c
