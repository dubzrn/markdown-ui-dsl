import { describe, expect, it } from "vitest";
import { analyzeFlow, extractFlow, parse } from "../src/index.js";

const SRC = `---
dsl: 2.0
type: flow
start: login
---
## Screens
| id | file | terminal |
| --- | --- | --- |
| login | ./login.ui.md | |
| home | ./home.ui.md | |
| done | ./done.ui.md | yes |
| orphan | ./o.ui.md | |
| stuck | ./s.ui.md | |
## Transitions
- login #login -> home
- home #back -> login
- home #finish -> done
- login #oops -> stuck
`;

describe("flow graph (T-025)", () => {
  const flow = extractFlow(parse(SRC));
  const a = analyzeFlow(flow);
  it("extracts screens and transitions", () => {
    expect(flow.start).toBe("login");
    expect(flow.screens.map((s) => s.id)).toEqual(["login", "home", "done", "orphan", "stuck"]);
    expect(flow.screens.find((s) => s.id === "done")?.terminal).toBe(true);
    expect(flow.transitions).toHaveLength(4);
  });
  it("computes depth", () => {
    expect(Object.fromEntries(a.depth)).toEqual({ login: 0, home: 1, stuck: 1, done: 2 });
  });
  it("finds unreachable screens", () => expect(a.unreachable).toEqual(["orphan"]));
  it("finds dead ends (non-terminal, no outgoing)", () =>
    expect(a.deadEnds).toEqual(["orphan", "stuck"]));
  it("finds cycles", () => expect(a.cyclic.sort()).toEqual(["home", "login"]));
});
