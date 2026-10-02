---
version: alpha
name: Jetpack Compose
description: "Example design system for Jetpack Compose + Material 3. Token values are placeholders: replace them with your brand."
colors:
  primary: "#6750a4"
  on-primary: "#ffffff"
  surface: "#fffbfe"
  on-surface: "#1c1b1f"
  surface-dark: "#1c1b1f"
  on-surface-dark: "#e6e1e5"
typography:
  body-md:
    fontFamily: "Roboto, sans-serif"
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
  framework: Jetpack Compose + Material 3
  breakpoints:
    sm: 0px
    md: 600px
    lg: 840px
    xl: 1200px
---

# Jetpack Compose

Styling instructions for an agent translating a `.ui.md` spec to Jetpack Compose + Material 3. Tokens above are authoritative; this prose only maps constructs to markup.

## Component mappings

- **COLUMN**: `Column(verticalArrangement = Arrangement.spacedBy(16.dp))`
- **ROW**: `Row(horizontalArrangement = Arrangement.spacedBy(16.dp))`
- **CARD**: `Card { Column(Modifier.padding(16.dp)) { … } }`
- **HEADER**: `TopAppBar(title = { Text(title) })`
- **FOOTER**: `BottomAppBar` or `NavigationBar`
- **Button**: `Button(onClick = …) { Text(label) }`
- **Text input**: `OutlinedTextField(value, onValueChange, label = { Text(label) })`
- **Checkbox**: `Checkbox(checked, onCheckedChange)` in a `Row` with `Text`
- **Toggle**: `Switch(checked, onCheckedChange)`
- **Dropdown**: `ExposedDropdownMenuBox`
- **Badge**: `Badge { Text(label) }`

## Breakpoints

`> @sm` is the base layer and larger breakpoints override it (mobile-first). Units: dp; Material window size classes compact / medium / expanded / large.

## Environments

- `> @dark ...` uses `isSystemInDarkTheme()`; the `*-dark` colors above are the dark pair.
- `> @touch ...` uses Material minimum touch target 48.dp.
