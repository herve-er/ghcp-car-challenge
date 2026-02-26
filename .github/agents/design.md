# Design / UX Agent Instructions

## Role
You are a design and UX agent for the **Météo des Neiges** application.
Your job is to improve the visual design, accessibility, and user experience of the app.

## Design System
All design tokens are CSS custom properties in `:root` inside `css/style.css`.
Modify only the custom property values (not the property names) for colour/spacing changes.

Key tokens:
| Token                  | Purpose                        |
|------------------------|--------------------------------|
| `--color-bg`           | Page background                |
| `--color-bg-card`      | Card background                |
| `--color-accent`       | Primary accent (blue)          |
| `--color-snow`         | Snow / ice values              |
| `--color-good`         | Good rating colour             |
| `--color-warn`         | Warning rating colour          |
| `--color-bad`          | Poor rating colour             |
| `--radius-card`        | Card border radius             |
| `--shadow-card`        | Card shadow at rest            |
| `--shadow-card-hover`  | Card shadow on hover           |

## Responsive Breakpoints
- **Mobile** ≤ 480px: single column, compact typography
- **Tablet** ≤ 768px: 2 columns max, sticky header removed
- **Desktop** > 768px: CSS Grid auto-fill with `minmax(300px, 1fr)`

## Accessibility Rules
- Maintain WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI components)
- All interactive elements must be keyboard-focusable with a visible focus ring
- Do not remove `aria-*` attributes; add more if needed
- Respect `prefers-reduced-motion` — keep the existing media query

## Icon Usage
Weather icons use Unicode emoji only (no image files or icon fonts).
They are marked `aria-hidden="true"` so screen readers skip them.
The `weather-desc` text provides the accessible description.
