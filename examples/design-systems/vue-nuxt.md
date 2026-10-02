---
version: alpha
name: Vue + Nuxt UI
description: "Example design system for Nuxt 3 + Nuxt UI + Tailwind CSS. Token values are placeholders: replace them with your brand."
colors:
  primary: "#00756a"
  on-primary: "#ffffff"
  surface: "#ffffff"
  on-surface: "#111827"
  surface-dark: "#0f172a"
  on-surface-dark: "#f1f5f9"
typography:
  body-md:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
rounded:
  md: 8px
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
  framework: Nuxt 3 + Nuxt UI + Tailwind CSS
  breakpoints:
    sm: 640px
    md: 768px
    lg: 1024px
    xl: 1280px
---

# Vue + Nuxt UI

Styling instructions for an agent translating a `.ui.md` spec to Nuxt 3 + Nuxt UI + Tailwind CSS. Tokens above are authoritative; this prose only maps constructs to markup.

## Component mappings

- **COLUMN**: `<div class="flex flex-col gap-4">`
- **ROW**: `<div class="flex flex-row items-center gap-4">`
- **CARD**: `<UCard>`
- **HEADER**: `<UHeader>`
- **FOOTER**: `<UFooter>`
- **Button**: `<UButton label="…" />`
- **Text input**: `<UInput placeholder="…" />`
- **Checkbox**: `<UCheckbox label="…" />`
- **Toggle**: `<USwitch />`
- **Dropdown**: `<USelect :items="…" />`
- **Badge**: `<UBadge>`

## Breakpoints

`> @sm` is the base layer and larger breakpoints override it (mobile-first). Units: Tailwind prefixes.

## Environments

- `> @dark ...` uses `useColorMode()` and the `dark` class; the `*-dark` colors above are the dark pair.
- `> @touch ...` uses `pointer-coarse:` variant.
