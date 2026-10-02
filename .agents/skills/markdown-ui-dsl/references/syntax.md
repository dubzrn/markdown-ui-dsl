# Markdown-UI DSL

# DSL 1.x reference
When asked to parse or generate a UI spec, use the following strict syntax:

## Layouts
- **Containers:** Wrap vertical layouts in `||| COLUMN |||` and horizontal layouts in `=== ROW ===`.
- **Cards/Elevated Surfaces:** Wrap card containers in `::: CARD :::`.
- **Modals/Dialogs:** Wrap modal surfaces in `::: MODAL :::`.
- **Structural Regions:** Wrap global app bars or top navs in `::: HEADER :::` and bottom navs or page footers in `::: FOOTER :::`. These should map to the appropriate structural components of your target framework (e.g., `<header>` in HTML, `AppBar` in Flutter, or `Header` in React Native).
- **Chat Bubbles:** Wrap conversational messages in `::: BUBBLE USER :::` or `::: BUBBLE AGENT :::`.
- **Agent Directives (Alignment & Spacing):** Standard Markdown blockquotes (`> text`) act as natural language layout hints. Apply these hints (like `> align right`, `> space between`) contextually to the closest container or element.
- **Boundaries:** End a layout block with `--- END ---`.
- **Dividers:** Use standard markdown horizontal rules `***` to indicate visual separation (avoid `---` to prevent collision with layout boundaries).

## Components
- **Text/Headings:** Standard Markdown (`#`, `##`, `**text**`)
- **Buttons:** `[ Button Text ](action)` -> e.g., `[ Submit ](#submit)`
- **Tabs:** `|[ Active Tab ]| Tab 2 | Tab 3 |`
- **Text Inputs:** `[ text: placeholder ]` -> e.g., `[ text: Enter email... ]`
- **Checkboxes:** `[ ] Label` (unchecked) or `[x] Label` (checked)
- **Radio Buttons:** `( ) Label` or `(x) Label`
- **Toggles/Switches:** `[on] Label` or `[off] Label`
- **Dropdowns:** `[v] Selected Option` -> Use braces for options or dynamic data: `[v] Selected Option {Option 1, Option 2}` or `[v] Selected Option {dynamic: users}`
- **Badges/Tags:** `(( Tag Name ))` -> e.g., `(( Admin ))`, `(( Pending ))`
- **Images/Placeholders:** `[ IMG: Description ]` -> e.g., `[ IMG: User Avatar ]`
- **Lists:** Standard Markdown bulleted (`-`, `*`) or numbered (`1.`, `2.`) lists. For lists of complex UI elements (like mobile cards), nest layout blocks inside a list item or loop:
  `- ::: CARD :::`
  `  **Item Name**`
  `  [ View Details ]`
  `  --- END ---`
- **Tables:** Standard Markdown tables with pipes (`|`) and hyphens (`-`). Example:
  `| Column 1 | Column 2 |`
  `| -------- | -------- |`
  `| Value 1  | Value 2  |`

## Frontmatter & Theming (Optional)
Use YAML frontmatter at the top of a `.ui.md` spec to specify styling rules, target frameworks, code component linking, or reference a separate design system markdown document.

```yaml
---
framework: Next.js + TailwindCSS + Shadcn UI
theme: ./design-system.md
component: src/components/LoginForm.tsx
---
```

## Rules of thumb
- Every opener has exactly one `--- END ---`; nested blocks need one each.
- `---` alone is a boundary or frontmatter fence, so use `***` for dividers.
- Escape literal syntax characters with a backslash: `\\[ \\]`.
- Hints and responsive directives (`> @<breakpoint> token: value, ...`) are layout-only. Mobile-first: `@sm` is the base, larger breakpoints override. Plain `> hints` are alignment/spacing guidance and nothing else.
