# Merengue — Components

## 1. BUTTONS

### Variants

| Variant | Background | Text | Border | Radius | Height |
|---------|-----------|------|--------|--------|--------|
| Primary | `var(--accent)` | `#FFFFFF` | none | 8px | 36px |
| Secondary | transparent | `var(--text1)` | `1px solid var(--border-visible)` | 8px | 36px |
| Ghost | transparent | `var(--text2)` | none | 8px | 32px |
| Destructive | `var(--error)` | `#FFFFFF` | none | 8px | 36px |

### Specs

| Property | Value |
|----------|-------|
| Height (large) | 36px |
| Height (small) | 28px |
| Padding (large) | 10px 20px |
| Padding (small) | 6px 12px |
| Font | `"Nunito Sans"` 600, 14px |
| Min touch target | 44px |

### States

| State | Change |
|-------|--------|
| **Hover** | Primary: `brand.600`, `transform: scale(1.03)`; Secondary: bg `neutral.800`, border `neutral.600`; Ghost: bg `neutral.800`, text `--text1` |
| **Active / Pressed** | `transform: scale(0.97)` + 更深背景色 |
| **Disabled** | `opacity: 0.4; cursor: not-allowed;` 无 hover/active |
| **Focus** | `box-shadow: 0 0 0 3px var(--accent-subtle)` |

---

## 2. CARDS / SURFACES

### Standard Card
- Background: `var(--surface1)`
- Border: `1px solid var(--border)`
- Radius: 12px
- Padding: 20px
- Shadow: `var(--shadow-1)`

### Featured Card
- Background: `var(--surface1)` + subtle gradient toward `--accent-subtle`
- Radius: 12px
- Shadow: `var(--shadow-2)`

### Compact Card
- Radius: 12px
- Padding: 16px
- Same background and border as standard

### Content Layout
- Title: font `--h3`, color `--text1`
- Description: font `--body-sm`, color `--text2`
- Metadata: font `--caption`, color `--text3`
- Internal spacing between elements: `--space-sm`
- Press state: `transform: scale(0.985)`, transition 150ms spring

---

## 3. INPUTS

### Text Field

| Property | Value |
|----------|-------|
| Height | 36px |
| Background | `var(--surface3)` |
| Border (default) | `1px solid var(--border-visible)` |
| Border (focus) | `1px solid var(--accent)` |
| Border (error) | `1px solid var(--error)` |
| Radius | 8px |
| Padding | 8px 12px |
| Font | `"Nunito Sans"`, 14px |
| Placeholder color | `var(--text3)` |

### Label
- Position: above field, 6px gap
- Font: `"Nunito Sans"`, `--body-sm`, `--text2`

### States

| State | Treatment |
|-------|-----------|
| **Default** | `1px solid var(--border-visible)` |
| **Focus** | `1px solid var(--accent)`. `box-shadow: 0 0 0 2px var(--accent-subtle)` |
| **Error** | `1px solid var(--error)`. Error text below in `--error`, `--caption` |
| **Disabled** | Opacity 0.4, no interaction |

### Multiline
- Same styling as text field, min-height 100px, auto-grows

---

## 4. LISTS / DATA ROWS

### Standard Row

| Property | Value |
|----------|-------|
| Min height | 40px |
| Padding | 8px 16px |
| Divider | `1px solid var(--border)` bottom edge |
| Label font | `"Nunito Sans"`, 14px, `--text1` |
| Value font | `"JetBrains Mono"` 12px, `--text2` |
| Accessory | Phosphor duotone chevron, 16px, `--text3` |

### Interaction States

| State | Treatment |
|-------|-----------|
| **Default** | Transparent background |
| **Pressed** | Background `var(--surface2)` |
| **Selected** | Background `var(--accent-subtle)`, left border `2px solid var(--accent)` |

### Data Row (Label + Value)
- Left: label in `--text2`, `"Nunito Sans"` 14px
- Right: value in `--text1`, `"JetBrains Mono"` 12px
- Unit/suffix: `--caption`, `--text3`, adjacent to value

---

## 5. NAVIGATION / TAB BAR

### Tab Bar

| Property | Value |
|----------|-------|
| Height | 44px |
| Background | `var(--surface1)` |
| Border | `1px solid var(--border)` bottom |
| Font | `"Nunito Sans"`, 12px, 600 |

### Tab States

| State | Treatment |
|-------|-----------|
| **Active** | `--text1`, bottom indicator `2px solid var(--accent)` |
| **Inactive** | `--text3` |
| **Hover** | `--text2` |

### Navigation Bar
- Title: `--h3`, `--text1`
- Back button: Phosphor duotone arrow-left, `--text2`
- Background: `var(--surface1)`

---

## 6. TAGS / CHIPS

| Property | Value |
|----------|-------|
| Height | 24px |
| Padding | 2px 10px |
| Radius | 999px (pill) |
| Font | `"Nunito Sans"`, 11px, 600 |
| Background | `var(--surface2)` |
| Text color | `var(--text3)` |
| Border | none |

### Selected State
- Background: `var(--accent-subtle)`
- Text: `var(--accent)`

### Status Variants
Use status colors for semantic tags: `--success-bg` + `--success`, `--warning-bg` + `--warning`, `--error-bg` + `--error`.

---

## 7. OVERLAYS

### Modal / Dialog

| Property | Value |
|----------|-------|
| Background | `var(--surface1)` |
| Radius | 16px |
| Shadow | `var(--shadow-3)` |
| Backdrop | `rgba(0, 0, 0, 0.6)` + `backdrop-filter: blur(4px)` |
| Max width | 520px |
| Padding | 24px |
| Close button | Phosphor duotone X, top-right corner, 16px |

### Bottom Sheet

| Property | Value |
|----------|-------|
| Background | `var(--surface1)` |
| Top radius | 16px |
| Handle | 32px × 4px, `var(--border-visible)`, radius 2px, centered |
| Backdrop | `rgba(0, 0, 0, 0.6)` |
| Dismiss | drag-to-dismiss |

### Dropdown / Popover

| Property | Value |
|----------|-------|
| Background | `var(--surface1)` |
| Radius | 12px |
| Shadow | `var(--shadow-2)` |
| Border | `1px solid var(--border)` |
| Item height | 36px |
| Selected indicator | `--accent` checkmark + `--accent-subtle` background |

---

## 8. STATE PATTERNS

### Empty State
- Layout: centered, top padding 120px+
- Icon/Illustration: Large Phosphor duotone icon (48px), `--text3`
- Headline: `--h3`, `--text2`
- Description: `--body`, `--text3`, max 2 lines
- CTA: primary button, 24px below description

### Loading
- Inline: Spinner (24px, `--accent`, 2px stroke) centered
- Full screen: Spinner (40px) + `--text3` caption
- Content appearance: subtle fade-in (200ms, opacity 0→1), no skeleton for simple content

### Error
- Inline (field): `--error` text in `--caption` below element
- Screen-level: Centered card with warning icon + description + retry button
- Tone: helpful, not alarmist

### Disabled
- Opacity 0.4, no interaction, maintains layout
- Borders fade to `--border` default
- No hover/focus states

---

## 9. TOGGLE / SWITCH

### Specs

| Property | Value |
|----------|-------|
| Track width | 40px |
| Track height | 22px |
| Track radius | 999px |
| Thumb size | 16px |
| Thumb radius | 999px |
| Thumb offset (from edge) | 3px |
| Label position | Right of track |
| Label gap | 8px |
| Label font | `"Nunito Sans"`, 14px, `--text1` |

### States

| State | Track Background | Thumb |
|-------|-----------------|-------|
| **Off (default)** | `var(--surface3)` | `#FFFFFF` |
| **On** | `var(--accent)` | `#FFFFFF` |
| **Hover** | Track opacity shifts 0.9 | — |
| **Disabled** | Opacity 0.4, no interaction | — |
| **Focus** | `box-shadow: 0 0 0 2px var(--accent-subtle)` | — |

---

## 10. CHECKBOX

### Specs

| Property | Value |
|----------|-------|
| Size | 18px |
| Border (unchecked) | `1.5px solid var(--border-visible)` |
| Radius | 4px |
| Checked fill | `var(--accent)` |
| Checkmark color | `#FFFFFF` |
| Checkmark stroke | 2px |
| Label gap | 8px |
| Label font | `"Nunito Sans"`, 14px, `--text1` |

### States

| State | Treatment |
|-------|-----------|
| **Default** | `1.5px solid var(--border-visible)`, transparent fill |
| **Hover** | Border shifts to `--text3` |
| **Active** | `transform: scale(0.95)` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | `box-shadow: 0 0 0 2px var(--accent-subtle)` |

---

## 11. RADIO

### Specs

| Property | Value |
|----------|-------|
| Size | 18px |
| Border | `1.5px solid var(--border-visible)` |
| Radius | 50% (circle) |
| Selected indicator | 8px dot in `var(--accent)` |
| Selected border | `1.5px solid var(--accent)` |
| Label gap | 8px |
| Label font | `"Nunito Sans"`, 14px, `--text1` |

### States

| State | Treatment |
|-------|-----------|
| **Default** | `1.5px solid var(--border-visible)`, transparent fill |
| **Selected** | `1.5px solid var(--accent)`, inner dot `var(--accent)` |
| **Hover** | Border shifts to `--text3` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | `box-shadow: 0 0 0 2px var(--accent-subtle)` |

---

## 12. SLIDER / RANGE

### Specs

| Property | Value |
|----------|-------|
| Track height | 4px |
| Track radius | 999px |
| Track background (unfilled) | `var(--surface3)` |
| Track background (filled) | `var(--accent)` |
| Thumb width | 16px |
| Thumb height | 16px |
| Thumb radius | 999px |
| Thumb background | `#FFFFFF` |
| Thumb border | `2px solid var(--accent)` |
| Step marks | None (continuous by default) |
| Value label | Above thumb, `--caption`, `--text1` |

### States

| State | Treatment |
|-------|-----------|
| **Default** | As specced |
| **Hover** | Thumb `transform: scale(1.15)` |
| **Active / Dragging** | Thumb `transform: scale(1.25)`, track height 6px |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | `box-shadow: 0 0 0 2px var(--accent-subtle)` on thumb |

---

## 13. SELECT / DROPDOWN TRIGGER

### Specs

| Property | Value |
|----------|-------|
| Height | 36px (inherits from Inputs) |
| Background | `var(--surface3)` |
| Border | `1px solid var(--border-visible)` |
| Radius | 8px |
| Padding | 8px 12px |
| Font | `"Nunito Sans"`, 14px, `--text1` |
| Placeholder color | `var(--text3)` |
| Chevron icon | Phosphor duotone `caret-down` |
| Chevron color | `var(--text3)` |
| Chevron size | 14px |

### States

| State | Treatment |
|-------|-----------|
| **Default** | `1px solid var(--border-visible)`, chevron pointing down |
| **Hover** | Border shifts to `--text2` |
| **Open** | `1px solid var(--accent)`, chevron rotated 180deg. Dropdown menu per Overlays > Dropdown |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | `1px solid var(--accent)`. `box-shadow: 0 0 0 2px var(--accent-subtle)` |
| **Error** | `1px solid var(--error)` |

---

## 14. TEXTAREA

Inherits all styling from **Inputs > Text Field** with these overrides:

| Property | Value |
|----------|-------|
| Min height | 100px |
| Resize behavior | vertical only |
| Line height | 1.5 |
| Padding | 12px |
| Character count position | Below textarea, right-aligned |
| Character count font | `"Nunito Sans"`, 11px, `--text3` |

---

## 15. DATA TABLE

### Header Row

| Property | Value |
|----------|-------|
| Height | 36px |
| Background | `var(--surface2)` |
| Font | `"Nunito Sans"`, 11px, 700, `--text2` |
| Text transform | uppercase, `letter-spacing: 0.03em` |
| Cell padding | 8px 16px |
| Sort indicator | Phosphor duotone caret, 12px |
| Border bottom | `1px solid var(--border-visible)` |

### Body Row

| Property | Value |
|----------|-------|
| Height | 40px |
| Font | `"Nunito Sans"`, 14px, `--text1` |
| Cell padding | 8px 16px |
| Row divider | `1px solid var(--border)` |
| Column alignment | Text left, numbers right, mono font for numbers |

### Row States

| State | Treatment |
|-------|-----------|
| **Default** | Transparent background |
| **Hover** | Background `var(--surface2)` |
| **Selected** | Background `var(--accent-subtle)` |
| **Striped (optional)** | Even rows `var(--surface1)` |

---

## 16. TABS

### Specs

| Property | Value |
|----------|-------|
| Bar height | 40px |
| Tab padding | 8px 16px |
| Font | `"Nunito Sans"`, 12px, 600 |
| Gap between tabs | 2px |
| Active indicator | Bottom border `2px solid var(--accent)` |
| Bar border | `1px solid var(--border)` bottom |
| Transition | 150ms spring |

### States

| State | Treatment |
|-------|-----------|
| **Active** | `--text1`, bottom border `2px solid var(--accent)` |
| **Inactive** | `--text3` |
| **Hover** | `--text2` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | `box-shadow: inset 0 0 0 2px var(--accent-subtle)` |

---

## 17. BREADCRUMB

### Specs

| Property | Value |
|----------|-------|
| Font | `"Nunito Sans"`, 12px |
| Link color | `var(--text2)` |
| Link hover | `var(--text1)` |
| Separator glyph | `/` |
| Separator color | `var(--text3)` |
| Separator spacing | 6px each side |
| Current page | `--text1`, 600 weight |

---

## 18. AVATAR

### Sizes

| Size | Dimensions | Font (initials) |
|------|-----------|-----------------|
| Small | 24px | 10px caption |
| Medium | 32px | 12px body-sm |
| Large | 40px | 14px body |

### Specs

| Property | Value |
|----------|-------|
| Border radius | 999px (circle) |
| Fallback background | `var(--accent-subtle)` |
| Fallback text color | `var(--accent)` |
| Fallback font weight | 600 |
| Border | none |
| Status dot size | 8px |
| Status dot position | Bottom-right, 1px inset from edge |
| Status dot border | `2px solid var(--background)` |

---

## 19. BADGE / STATUS DOT

### Specs

| Property | Value |
|----------|-------|
| Height | 20px |
| Min width | 20px |
| Padding | 2px 8px |
| Radius | 999px |
| Font | `"Nunito Sans"`, 11px, 600 |
| Position relative to parent | Inline, middle-aligned |

### Semantic Variants

| Variant | Background | Text |
|---------|-----------|------|
| Neutral | `var(--surface2)` | `var(--text3)` |
| Success | `var(--success-bg)` | `var(--success)` |
| Warning | `var(--warning-bg)` | `var(--warning)` |
| Error | `var(--error-bg)` | `var(--error)` |
| Info | `var(--accent-subtle)` | `var(--accent)` |

### Status Dot (icon-only)
- Size: 8px
- Same semantic color mapping, no text
- Border: `2px solid var(--background)`

---

## 20. TOOLTIP

### Specs

| Property | Value |
|----------|-------|
| Background | `var(--surface2)` |
| Text color | `var(--text1)` |
| Font | `"Nunito Sans"`, 11px |
| Radius | 4px |
| Padding | 6px 12px |
| Max width | 240px |
| Arrow | CSS triangle, 5px, matches tooltip bg |
| Delay (show) | 300ms |
| Delay (hide) | 100ms |
| Shadow | `var(--shadow-2)` |

---

## 21. ALERT / BANNER

### Specs

| Property | Value |
|----------|-------|
| Radius | 12px |
| Padding | 16px |
| Icon size | 20px |
| Icon gap | 12px |
| Font (title) | `"Nunito Sans"`, 14px, 600 |
| Font (description) | `"Nunito Sans"`, 12px, `--text2` |
| Dismiss button | Phosphor duotone X, 16px, `--text3` |
| Layout | Horizontal: icon | content | dismiss |

### Semantic Variants

| Variant | Background | Border | Icon color |
|---------|-----------|--------|------------|
| Info | `var(--accent-subtle)` | `1px solid var(--accent)` transparent at 0.3 | `var(--accent)` |
| Success | `var(--success-bg)` | `1px solid var(--success)` transparent at 0.3 | `var(--success)` |
| Warning | `var(--warning-bg)` | `1px solid var(--warning)` transparent at 0.3 | `var(--warning)` |
| Error | `var(--error-bg)` | `1px solid var(--error)` transparent at 0.3 | `var(--error)` |

---

## 22. TOAST / NOTIFICATION

### Specs

| Property | Value |
|----------|-------|
| Position | Top-right, 16px from edges |
| Max width | 360px |
| Background | `var(--surface1)` |
| Text color | `var(--text1)` |
| Radius | 12px |
| Padding | 16px |
| Shadow | `var(--shadow-2)` |
| Font | `"Nunito Sans"`, 14px |
| Auto-dismiss | 4000ms |
| Animation | Slide in from right + fade, spring easing |
| Dismiss button | Phosphor duotone X, top-right |
| Max stack | 5 visible |

---

## 23. PROGRESS BAR

### Specs

| Property | Value |
|----------|-------|
| Height | 6px |
| Track radius | 999px |
| Track background | `var(--surface3)` |
| Fill color | `var(--accent)` |
| Fill radius | 999px |
| Label position | Right or below bar |
| Label font | `"Nunito Sans"`, 11px, `--text2` |
| Indeterminate animation | Shimmer sweep left→right, 1.5s infinite |

### Semantic Fill Colors

| Variant | Fill |
|---------|------|
| Default | `var(--accent)` |
| Success | `var(--success)` |
| Warning | `var(--warning)` |
| Error | `var(--error)` |

---

## 24. SPINNER

### Specs

| Property | Value |
|----------|-------|
| Size (small) | 16px |
| Size (medium) | 24px |
| Size (large) | 40px |
| Stroke width | 2px |
| Color | `var(--accent)` |
| Track color | `var(--surface3)` |
| Animation | 0.8s rotate infinite, linear (not spring — spinners are continuous) |

---

## 25. SKELETON

### Specs

| Property | Value |
|----------|-------|
| Background | `var(--surface2)` |
| Shimmer color | `var(--surface3)` |
| Radius | Match target component radius |
| Animation | Shimmer sweep, 1.5s infinite, `ease-in-out` |
| Animation duration | 1500ms |

### Common Shapes

| Shape | Dimensions | Radius |
|-------|-----------|--------|
| Text line | 100% x 12px | 4px |
| Heading | 60% x 18px | 4px |
| Circle (avatar) | 32px | 50% |
| Rectangle (card) | 100% x 120px | 12px |
| Thumbnail | 48px | 8px |

---

## 26. ACCORDION

### Specs

| Property | Value |
|----------|-------|
| Header height | 40px |
| Header padding | 12px 16px |
| Header font | `"Nunito Sans"`, 14px, 600, `--text1` |
| Chevron size | 16px |
| Chevron color | `var(--text3)` |
| Chevron rotation (open) | 180deg |
| Content padding | 16px |
| Content font | `"Nunito Sans"`, 14px, `--text2` |
| Divider | `1px solid var(--border)` |
| Background | transparent (closed) → `var(--surface1)` (open) |
| Radius | 12px |

### States

| State | Treatment |
|-------|-----------|
| **Closed** | Chevron pointing down, content hidden |
| **Open** | Chevron rotated 180deg, content visible, bg `--surface1` |
| **Hover** | Header bg `var(--surface2)` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | `box-shadow: inset 0 0 0 2px var(--accent-subtle)` |

---

## 27. MIDI NOTE BLOCKS

MIDI 编辑器的核心视觉元素——音符矩形块有自己的色彩系统。

### Note Color Palette (8-track)

| Index | Color | Name | Hex |
|-------|-------|------|-----|
| 0 | Coral | `--note-coral` | `#FF5C72` |
| 1 | Tangerine | `--note-tangerine` | `#FFB347` |
| 2 | Sky | `--note-sky` | `#7EC8E3` |
| 3 | Lavender | `--note-lavender` | `#C3A6F4` |
| 4 | Mint | `--note-mint` | `#4BC0A0` |
| 5 | Peach | `--note-peach` | `#FF8A80` |
| 6 | Lemon | `--note-lemon` | `#FFE566` |
| 7 | Lilac | `--note-lilac` | `#D4A5F6` |

### Note Block Specs

| Property | Value |
|----------|-------|
| Height | 14px (at default zoom, noteHeight=14) |
| Radius | 3px |
| Border | `1px solid rgba(0,0,0,0.15)` (top + sides for depth) |
| Shadow (default) | None (flat) |
| Shadow (selected) | `0 0 0 2px var(--accent)`, white overlay `rgba(255,255,255,0.2)` |
| Shadow (dragging) | `0 4px 12px rgba(0,0,0,0.3)` |
| Velocity opacity | 0.55–1.0 mapped from velocity 1–127 |
| Min visible width | 3px (narrower notes render as 1px lines) |
