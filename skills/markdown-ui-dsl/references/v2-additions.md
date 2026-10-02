# DSL 2.0 additions

Enabled only by frontmatter `dsl: 2.0`. Everything in 1.x stays valid.

- **Attributes:** `[ Save ]{: #save .primary disabled }`, `key=value` and bare flags, after any construct or block opener.
- **Typed closers:** `--- END CARD ---` must match the open block (mismatch is `E1004`).
- **Widgets (inline):** `[ SLIDER: Volume, min=0, max=10 ]`, also `DATE`, `FILE`, `PROGRESS`, `CHART`, `STAT`, `SKELETON`, `AVATAR`, `ICON`, `CRUMBS`, `PAGER`, `STEPPER`, `MENUBAR`.
- **Named containers:** `::: GRID :::`, `ACCORDION`, `PANEL`, `DRAWER`, `TOAST`, `TOOLTIP`, `CALLOUT`, `EMPTY`, `TREE`, `GROUP`, `REGION`, `STATE`, `EACH`, `IF`; close with `--- END ---`.
- **Bindings:** `{{ user.name }}` - dotted paths only; expressions are an error (`E2102`).
- **Includes:** `[[ USE: ./partials/nav.ui.md ]]` - inside the project root only, depth 8, no cycles.
- **Environment directives:** `> @dark ...`, `> @touch ...` besides breakpoints.
- **Flows:** `type: flow` files describe screens and transitions.
- **Labelled divider:** `*** Section title ***`.
- **Custom components:** an unknown upper-case `[ KIND: ... ]` is an error (`E1302`) unless the project's component catalog defines it.
