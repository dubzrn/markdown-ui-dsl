---
version: alpha
name: React + shadcn/ui
description: "Example design system for React + shadcn/ui + Tailwind CSS. Token values are placeholders: replace them with your brand."
colors:
  primary: "#18181b"
  on-primary: "#fafafa"
  surface: "#ffffff"
  on-surface: "#09090b"
  surface-dark: "#09090b"
  on-surface-dark: "#fafafa"
typography:
  body-md:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
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
  framework: React + shadcn/ui + Tailwind CSS
  breakpoints:
    sm: 640px
    md: 768px
    lg: 1024px
    xl: 1280px
---

# React + shadcn/ui

Styling instructions for an agent translating a `.ui.md` spec to React + shadcn/ui + Tailwind CSS. Tokens above are authoritative; this prose only maps constructs to markup.

## Component mappings

- **COLUMN**: `<div className="flex flex-col gap-4">`
- **ROW**: `<div className="flex flex-row items-center gap-4">`
- **CARD**: `<Card><CardContent className="p-6">` from `@/components/ui/card`
- **HEADER**: `<header className="sticky top-0 border-b bg-background">`
- **Button**: `<Button>` from `@/components/ui/button`
- **Text input**: `<Input placeholder="…" />`
- **Checkbox**: `<Checkbox />` with `<Label>`
- **Toggle**: `<Switch />`
- **Dropdown**: `<Select>` family
- **Badge**: `<Badge>`

## Breakpoints

`> @sm` is the base layer and larger breakpoints override it (mobile-first). Units: Tailwind prefixes `sm:` `md:` `lg:` `xl:`.

## Environments

- `> @dark ...` uses the `dark` class on the root element (`dark:` variants); the `*-dark` colors above are the dark pair.
- `> @touch ...` uses `pointer-coarse:` variant for larger hit areas.
