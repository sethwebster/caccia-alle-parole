# Caccia Design System (CDS)

> A lightweight, Apple HIG-inspired design system for Italian word games

## Philosophy

CDS follows Apple's Human Interface Guidelines principles:
- **Clarity**: Text is legible, icons are precise, functionality is obvious
- **Deference**: Content is paramount, subtle UI guides without competing
- **Depth**: Visual layers and motion convey hierarchy and vitality

## Structure

```
cds/
├── tokens/           # Design tokens (colors, typography, spacing)
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   └── elevation.css
├── components/       # UI components
│   ├── buttons.css
│   ├── cards.css
│   ├── modals.css
│   ├── toasts.css
│   ├── inputs.css
│   └── grid.css
├── utilities/        # Helper classes
│   ├── layout.css
│   └── helpers.css
├── documentation/    # Usage guides
└── cds.css          # Main entry point
```

## Usage

### Import All
```html
<link rel="stylesheet" href="/cds/cds.css">
```

### Import Selectively
```html
<link rel="stylesheet" href="/cds/tokens/colors.css">
<link rel="stylesheet" href="/cds/components/buttons.css">
```

## Quick Start

### Button
```html
<button class="cds-button cds-button--primary">
  Primary Action
</button>
```

### Card
```html
<div class="cds-card">
  <h3 class="cds-card__title">Card Title</h3>
  <p class="cds-card__body">Card content goes here.</p>
</div>
```

### Toast
```html
<div class="cds-toast cds-toast--success">
  Operation successful!
</div>
```

## Design Tokens

### Colors
- Semantic colors (primary, secondary, accent)
- State colors (success, error, warning, info)
- Neutral grays (50-950)

### Typography
- Scale: 12px - 48px (6 levels)
- Weights: regular (400), medium (500), semibold (600), bold (700)
- Line heights optimized for readability

### Spacing
- 8-point grid system (0.5rem base)
- Scale: 4px - 128px

### Elevation
- 5 shadow levels for depth hierarchy

## Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- CSS Custom Properties required
- No IE11 support

## License

MIT
