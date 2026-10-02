---
version: alpha
name: SwiftUI
description: "Example design system for SwiftUI. Token values are placeholders: replace them with your brand."
colors:
  primary: "#0a5bd6"
  on-primary: "#ffffff"
  surface: "#f2f2f7"
  on-surface: "#1c1c1e"
  surface-dark: "#1c1c1e"
  on-surface-dark: "#f2f2f7"
typography:
  body-md:
    fontFamily: "-apple-system, SF Pro Text, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
rounded:
  md: 10px
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
  framework: SwiftUI
  breakpoints:
    sm: 0px
    md: 744px
    lg: 1024px
    xl: 1366px
---

# SwiftUI

Styling instructions for an agent translating a `.ui.md` spec to SwiftUI. Tokens above are authoritative; this prose only maps constructs to markup.

## Component mappings

- **COLUMN**: `VStack(alignment: .leading, spacing: 16)`
- **ROW**: `HStack(spacing: 16)`
- **CARD**: `GroupBox` or a rounded `VStack` with `.background(.thinMaterial)`
- **HEADER**: `.toolbar { ToolbarItem(placement: .navigationBarLeading) }`
- **Button**: `Button(action:) { Text(label) }.buttonStyle(.borderedProminent)`
- **Text input**: `TextField(placeholder, text: $value)`
- **Checkbox**: `Toggle(label, isOn:)` with the checkbox style
- **Toggle**: `Toggle(label, isOn:)`
- **Dropdown**: `Picker(label, selection:)`
- **Badge**: `Text(label).font(.caption).padding(.horizontal, 8).background(.tint, in: Capsule())`

## Breakpoints

`> @sm` is the base layer and larger breakpoints override it (mobile-first). Units: points; compact vs regular `horizontalSizeClass`.

## Environments

- `> @dark ...` uses `@Environment(\.colorScheme) == .dark`; the `*-dark` colors above are the dark pair.
- `> @touch ...` uses default on iOS; add `.pointerStyle` only for pointer devices.
