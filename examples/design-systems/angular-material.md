---
version: alpha
name: Angular Material
description: "Example design system for Angular + Angular Material. Token values are placeholders: replace them with your brand."
colors:
  primary: "#3f51b5"
  on-primary: "#ffffff"
  surface: "#fafafa"
  on-surface: "#212121"
  surface-dark: "#303030"
  on-surface-dark: "#ffffff"
typography:
  body-md:
    fontFamily: "Roboto, Helvetica Neue, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
rounded:
  md: 4px
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
  framework: Angular + Angular Material
  breakpoints:
    sm: 0px
    md: 600px
    lg: 960px
    xl: 1280px
---

# Angular Material

Styling instructions for an agent translating a `.ui.md` spec to Angular + Angular Material. Tokens above are authoritative; this prose only maps constructs to markup.

## Component mappings

- **COLUMN**: `<div class="column">` with `display: flex; flex-direction: column; gap: 16px`
- **ROW**: `<div class="row">` with `display: flex; gap: 16px`
- **CARD**: `<mat-card><mat-card-content>`
- **HEADER**: `<mat-toolbar color="primary">`
- **Button**: `<button mat-flat-button>`
- **Text input**: `<mat-form-field><input matInput placeholder="…"></mat-form-field>`
- **Checkbox**: `<mat-checkbox>`
- **Toggle**: `<mat-slide-toggle>`
- **Dropdown**: `<mat-select>` with `<mat-option>`
- **Badge**: `<span matBadge="…">`

## Breakpoints

`> @sm` is the base layer and larger breakpoints override it (mobile-first). Units: px; CDK `BreakpointObserver` (`Breakpoints.Handset`, `Tablet`, `Web`).

## Environments

- `> @dark ...` uses a dark theme class applied to `body`; the `*-dark` colors above are the dark pair.
- `> @touch ...` uses `Breakpoints.Handset` for touch-first layouts.
