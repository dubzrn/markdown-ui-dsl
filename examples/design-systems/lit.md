---
version: alpha
name: Lit + Material Web
description: "Example design system for Lit web components + @material/web. Token values are placeholders: replace them with your brand."
colors:
  primary: "#005ac1"
  on-primary: "#ffffff"
  surface: "#fefbff"
  on-surface: "#1b1b1f"
  surface-dark: "#1b1b1f"
  on-surface-dark: "#e3e2e6"
typography:
  body-md:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
rounded:
  md: 12px
spacing:
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  page-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-surface-dark}"
mdui:
  framework: Lit web components + @material/web
  breakpoints:
    sm: 480px
    md: 768px
    lg: 1024px
    xl: 1280px
---

# Lit + Material Web

Styling instructions for an agent translating a `.ui.md` spec to Lit web components + @material/web. Tokens above are authoritative; this prose only maps constructs to markup.

## Component mappings

- **COLUMN**: `<div class="column">` styled with `display: flex; flex-direction: column; gap: var(--space-md)`
- **ROW**: `<div class="row">` styled with `display: flex; gap: var(--space-md)`
- **CARD**: `<md-elevated-card>`
- **HEADER**: `<header part="header">`
- **Button**: `<md-filled-button>`
- **Text input**: `<md-outlined-text-field label="…">`
- **Checkbox**: `<md-checkbox>`
- **Toggle**: `<md-switch>`
- **Dropdown**: `<md-outlined-select>` with `<md-select-option>`
- **Badge**: `<span class="badge">`

## Breakpoints

`> @sm` is the base layer and larger breakpoints override it (mobile-first). Units: CSS `@media (min-width: …)` inside the component's `static styles`.

## Environments

- `> @dark ...` uses `@media (prefers-color-scheme: dark)` swapping the custom properties; the `*-dark` colors above are the dark pair.
- `> @touch ...` uses `@media (pointer: coarse)`.
