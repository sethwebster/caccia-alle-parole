# Component Reference

Complete reference for all CDS components with variants and modifiers.

## Buttons

**File:** `components/buttons.css`

### Base Class
```html
<button class="cds-button">Button</button>
```

### Variants
- `cds-button--primary` - Primary action (brand color)
- `cds-button--secondary` - Secondary action
- `cds-button--outline` - Outlined style
- `cds-button--ghost` - Transparent with hover
- `cds-button--danger` - Destructive action
- `cds-button--success` - Positive action

### Sizes
- `cds-button--sm` - Small (32px height)
- Default - Medium (40px height)
- `cds-button--lg` - Large (48px height)

### States
- `cds-button--loading` - Shows spinner
- `disabled` - Disabled state
- `cds-button--icon-only` - Square button for icons

### Button Group
```html
<div class="cds-button-group">
    <button class="cds-button">Left</button>
    <button class="cds-button">Right</button>
</div>
```

---

## Cards

**File:** `components/cards.css`

### Base Class
```html
<div class="cds-card">
    <div class="cds-card__header">
        <h3 class="cds-card__title">Title</h3>
        <p class="cds-card__subtitle">Subtitle</p>
    </div>
    <div class="cds-card__body">Content</div>
    <div class="cds-card__footer">Footer</div>
</div>
```

### Variants
- `cds-card--elevated` - Higher elevation
- `cds-card--outline` - Border instead of shadow
- `cds-card--flat` - No shadow
- `cds-card--interactive` - Hover effect for clickable cards

### Sizes
- `cds-card--compact` - Reduced padding
- Default - Standard padding

### Elements
- `cds-card__header` - Card header section
- `cds-card__title` - Title text
- `cds-card__subtitle` - Subtitle text
- `cds-card__body` - Main content area
- `cds-card__footer` - Footer section
- `cds-card__media` - Media container (images, etc.)

---

## Inputs

**File:** `components/inputs.css`

### Text Input
```html
<div class="cds-form-group">
    <label class="cds-label">Label</label>
    <input type="text" class="cds-input" placeholder="Placeholder">
    <p class="cds-helper-text">Helper text</p>
</div>
```

### Input Variants
- `cds-input--sm` - Small input
- `cds-input--lg` - Large input
- `cds-input--error` - Error state
- `cds-input--success` - Success state

### Textarea
```html
<textarea class="cds-input cds-textarea"></textarea>
```

### Select
```html
<select class="cds-input cds-select">
    <option>Option 1</option>
</select>
```

### Checkbox
```html
<label class="cds-checkbox">
    <input type="checkbox" class="cds-checkbox__input">
    <span class="cds-checkbox__box"></span>
    <span>Label text</span>
</label>
```

### Radio
```html
<label class="cds-radio">
    <input type="radio" class="cds-radio__input" name="group">
    <span class="cds-radio__circle"></span>
    <span>Label text</span>
</label>
```

### Switch/Toggle
```html
<label class="cds-switch">
    <input type="checkbox" class="cds-switch__input">
    <span class="cds-switch__track">
        <span class="cds-switch__thumb"></span>
    </span>
    <span>Label text</span>
</label>
```

### Label Modifiers
- `cds-label--required` - Adds red asterisk

### Helper Text
- `cds-helper-text--error` - Red error text
- `cds-helper-text--success` - Green success text

### Input Group
```html
<div class="cds-input-group">
    <span class="cds-input-group__addon">$</span>
    <input type="text" class="cds-input">
    <span class="cds-input-group__addon">.00</span>
</div>
```

---

## Modals

**File:** `components/modals.css`

### Structure
```html
<div class="cds-modal">
    <div class="cds-modal__backdrop"></div>
    <div class="cds-modal__content">
        <div class="cds-modal__header">
            <h3 class="cds-modal__title">Title</h3>
            <button class="cds-modal__close">&times;</button>
        </div>
        <div class="cds-modal__body">
            Content
        </div>
        <div class="cds-modal__footer">
            Footer
        </div>
    </div>
</div>
```

### Sizes
- `cds-modal__content--sm` - Small (400px)
- Default - Medium (500px)
- `cds-modal__content--lg` - Large (700px)
- `cds-modal__content--xl` - Extra large (900px)
- `cds-modal__content--fullscreen` - Fullscreen on mobile

### States
- `cds-hidden` - Hidden state
- `cds-modal--open` - Open state (add with delay for animation)

### JavaScript Pattern
```javascript
function openModal() {
    modal.classList.remove('cds-hidden');
    setTimeout(() => modal.classList.add('cds-modal--open'), 10);
}

function closeModal() {
    modal.classList.remove('cds-modal--open');
    setTimeout(() => modal.classList.add('cds-hidden'), 200);
}
```

---

## Toasts

**File:** `components/toasts.css`

### Container Positions
```html
<div class="cds-toast-container cds-toast-container--top-right">
    <!-- Toasts appear here -->
</div>
```

### Positions
- `cds-toast-container--top`
- `cds-toast-container--top-right`
- `cds-toast-container--top-left`
- `cds-toast-container--bottom`
- `cds-toast-container--bottom-right`
- `cds-toast-container--bottom-left`

### Toast Structure
```html
<div class="cds-toast cds-toast--success">
    <div class="cds-toast__icon">✓</div>
    <div class="cds-toast__content">
        <div class="cds-toast__title">Title</div>
        <div class="cds-toast__message">Message</div>
    </div>
    <button class="cds-toast__close">&times;</button>
</div>
```

### Variants
- `cds-toast--success` - Green success toast
- `cds-toast--error` - Red error toast
- `cds-toast--warning` - Yellow warning toast
- `cds-toast--info` - Blue info toast

### Modifiers
- `cds-toast--compact` - Smaller padding
- `cds-toast--exiting` - Exit animation

### With Actions
```html
<div class="cds-toast">
    <div class="cds-toast__content">Message</div>
    <div class="cds-toast__actions">
        <button class="cds-toast__action">Undo</button>
    </div>
</div>
```

### Progress Bar
```html
<div class="cds-toast">
    <div class="cds-toast__content">Message</div>
    <div class="cds-toast__progress" style="animation-duration: 3s;"></div>
</div>
```

---

## Grid System

**File:** `components/grid.css`

### Container
```html
<div class="cds-container">Content</div>
```

### Container Sizes
- `cds-container--sm` - Max 640px
- `cds-container--md` - Max 768px
- `cds-container--lg` - Max 1024px
- `cds-container--xl` - Max 1280px
- `cds-container--fluid` - No max width

### Grid
```html
<div class="cds-grid cds-grid--cols-4">
    <div>Item 1</div>
    <div>Item 2</div>
</div>
```

### Column Counts
- `cds-grid--cols-1` through `cds-grid--cols-12`
- `cds-grid--auto` - Auto-fit columns (280px min)

### Gap Sizes
- `cds-grid--gap-1` through `cds-grid--gap-8`

### Column Spans
- `cds-col-span-1` through `cds-col-span-12`
- `cds-col-span-full` - Full width

### Responsive Grids
- `cds-grid--sm-cols-1`, `cds-grid--sm-cols-2`
- `cds-grid--md-cols-1`, `cds-grid--md-cols-2`, `cds-grid--md-cols-3`
- `cds-grid--lg-cols-2`, `cds-grid--lg-cols-3`, `cds-grid--lg-cols-4`, `cds-grid--lg-cols-6`

### Flex Layouts
```html
<div class="cds-flex cds-justify-center cds-items-center">
    Centered content
</div>
```

### Flex Direction
- `cds-flex--row` - Horizontal (default)
- `cds-flex--col` - Vertical
- `cds-flex--wrap` - Allow wrapping
- `cds-flex--nowrap` - Prevent wrapping

### Justify Content
- `cds-justify-start`
- `cds-justify-center`
- `cds-justify-end`
- `cds-justify-between`
- `cds-justify-around`
- `cds-justify-evenly`

### Align Items
- `cds-items-start`
- `cds-items-center`
- `cds-items-end`
- `cds-items-stretch`
- `cds-items-baseline`

### Flex Grow/Shrink
- `cds-flex-1` - Flex: 1 1 0%
- `cds-flex-auto` - Flex: 1 1 auto
- `cds-flex-none` - No flex
- `cds-grow` - Grow only
- `cds-shrink` - Shrink only

### Stack Layouts
```html
<!-- Vertical stack -->
<div class="cds-stack cds-stack--md">
    <div>Item 1</div>
    <div>Item 2</div>
</div>

<!-- Horizontal stack -->
<div class="cds-hstack cds-hstack--lg">
    <div>Item 1</div>
    <div>Item 2</div>
</div>
```

### Stack Sizes
- `cds-stack--sm`, `cds-hstack--sm` - Small gap
- `cds-stack--md`, `cds-hstack--md` - Medium gap
- `cds-stack--lg`, `cds-hstack--lg` - Large gap
- `cds-stack--xl`, `cds-hstack--xl` - Extra large gap

---

## Design Tokens

### Colors

**File:** `tokens/colors.css`

#### Brand Colors
- `--cds-color-primary` - Primary brand color
- `--cds-color-secondary` - Secondary brand color
- `--cds-color-accent` - Accent color
- `--cds-color-dark` - Dark brand color

#### Semantic Colors
- `--cds-color-success` - Success/positive
- `--cds-color-error` - Error/danger
- `--cds-color-warning` - Warning/caution
- `--cds-color-info` - Information

#### Neutral Grays
- `--cds-color-gray-50` through `--cds-color-gray-950` (50-step increments)

#### UI Colors
- `--cds-color-background` - Page background
- `--cds-color-surface` - Card/container surface
- `--cds-color-border` - Default borders
- `--cds-color-text-primary` - Main text
- `--cds-color-text-secondary` - Secondary text
- `--cds-color-text-tertiary` - Tertiary text

### Typography

**File:** `tokens/typography.css`

#### Font Families
- `--cds-font-family-base` - System fonts
- `--cds-font-family-display` - Poppins for headings

#### Font Sizes
- `--cds-font-size-xs` - 12px
- `--cds-font-size-sm` - 14px
- `--cds-font-size-base` - 16px
- `--cds-font-size-lg` - 18px
- `--cds-font-size-xl` - 20px
- `--cds-font-size-2xl` - 24px
- `--cds-font-size-3xl` - 30px
- `--cds-font-size-4xl` - 36px
- `--cds-font-size-5xl` - 48px

#### Font Weights
- `--cds-font-weight-regular` - 400
- `--cds-font-weight-medium` - 500
- `--cds-font-weight-semibold` - 600
- `--cds-font-weight-bold` - 700

#### Line Heights
- `--cds-line-height-tight` - 1.25
- `--cds-line-height-snug` - 1.375
- `--cds-line-height-normal` - 1.5
- `--cds-line-height-relaxed` - 1.625

### Spacing

**File:** `tokens/spacing.css`

#### Space Scale (8-point grid)
- `--cds-space-1` - 4px
- `--cds-space-2` - 8px
- `--cds-space-3` - 12px
- `--cds-space-4` - 16px
- `--cds-space-5` - 20px
- `--cds-space-6` - 24px
- `--cds-space-8` - 32px
- `--cds-space-10` - 40px
- `--cds-space-12` - 48px
- `--cds-space-16` - 64px
- `--cds-space-20` - 80px
- `--cds-space-24` - 96px
- `--cds-space-32` - 128px

#### Border Radius
- `--cds-radius-none` - 0
- `--cds-radius-sm` - 4px
- `--cds-radius-base` - 8px
- `--cds-radius-md` - 12px
- `--cds-radius-lg` - 16px
- `--cds-radius-xl` - 24px
- `--cds-radius-full` - 9999px

#### Component-Specific Spacing
- `--cds-space-button-padding-x` - Button horizontal padding
- `--cds-space-button-padding-y` - Button vertical padding
- `--cds-space-input-padding-x` - Input horizontal padding
- `--cds-space-input-padding-y` - Input vertical padding
- `--cds-space-card-padding` - Card padding
- `--cds-space-container-padding` - Container padding

### Elevation

**File:** `tokens/elevation.css`

#### Shadows
- `--cds-shadow-sm` - Subtle shadow
- `--cds-shadow-base` - Default shadow
- `--cds-shadow-md` - Medium shadow
- `--cds-shadow-lg` - Large shadow
- `--cds-shadow-xl` - Extra large shadow
- `--cds-shadow-2xl` - Maximum shadow

#### Component Shadows
- `--cds-shadow-button` - Button shadow
- `--cds-shadow-card` - Card shadow
- `--cds-shadow-modal` - Modal shadow
- `--cds-shadow-toast` - Toast shadow

#### Focus Shadows
- `--cds-shadow-focus` - Default focus ring
- `--cds-shadow-focus-error` - Error focus ring
- `--cds-shadow-focus-success` - Success focus ring

#### Z-Index
- `--cds-z-dropdown` - 1000
- `--cds-z-sticky` - 1020
- `--cds-z-modal-backdrop` - 1040
- `--cds-z-modal` - 1050
- `--cds-z-toast` - 1060

---

## Utility Classes

### Layout (`utilities/layout.css`)

#### Display
- `cds-block`, `cds-inline-block`, `cds-inline`
- `cds-flex`, `cds-inline-flex`
- `cds-grid`, `cds-inline-grid`
- `cds-hidden`

#### Position
- `cds-relative`, `cds-absolute`, `cds-fixed`, `cds-sticky`

#### Overflow
- `cds-overflow-auto`, `cds-overflow-hidden`, `cds-overflow-scroll`
- `cds-overflow-x-auto`, `cds-overflow-y-auto`

#### Width/Height
- `cds-w-full`, `cds-w-screen`, `cds-w-auto`, `cds-w-fit`
- `cds-h-full`, `cds-h-screen`, `cds-h-auto`, `cds-h-fit`

#### Opacity
- `cds-opacity-0`, `cds-opacity-25`, `cds-opacity-50`, `cds-opacity-75`, `cds-opacity-100`

#### Cursor
- `cds-cursor-pointer`, `cds-cursor-default`, `cds-cursor-not-allowed`

#### Text
- `cds-text-left`, `cds-text-center`, `cds-text-right`
- `cds-uppercase`, `cds-lowercase`, `cds-capitalize`
- `cds-underline`, `cds-no-underline`, `cds-line-through`
- `cds-truncate` - Ellipsis overflow
- `cds-line-clamp-2`, `cds-line-clamp-3` - Multi-line truncate

### Helpers (`utilities/helpers.css`)

#### Borders
- `cds-border`, `cds-border-2`, `cds-border-none`
- `cds-border-t`, `cds-border-b`, `cds-border-l`, `cds-border-r`

#### Border Radius
- `cds-rounded-none` through `cds-rounded-full`

#### Backgrounds
- `cds-bg-primary`, `cds-bg-secondary`, `cds-bg-accent`
- `cds-bg-success`, `cds-bg-error`, `cds-bg-warning`, `cds-bg-info`
- `cds-bg-surface`, `cds-bg-background`

#### Text Colors
- `cds-text-primary-color`, `cds-text-secondary-color`
- `cds-text-success`, `cds-text-error`, `cds-text-warning`, `cds-text-info`

#### Transitions
- `cds-transition-all`
- `cds-transition-colors`
- `cds-transition-transform`
- `cds-transition-opacity`

#### Animations
- `cds-animate-spin` - Rotation
- `cds-animate-pulse` - Opacity pulse
- `cds-animate-bounce` - Bounce effect
- `cds-animate-fade-in` - Fade in
- `cds-animate-slide-up` - Slide up

#### Transforms
- `cds-scale-95`, `cds-scale-100`, `cds-scale-105`, `cds-scale-110`
- `cds-rotate-45`, `cds-rotate-90`, `cds-rotate-180`

#### States
- `cds-interactive` - Pointer + opacity on hover
- `cds-disabled` - Disabled appearance
- `cds-loading` - Loading overlay
- `cds-sr-only` - Screen reader only

#### Scrollbar
- `cds-scrollbar-thin` - Thin custom scrollbar
- `cds-scrollbar-none` - Hide scrollbar

#### Gradients
- `cds-gradient-primary` - Primary brand gradient
- `cds-gradient-sunset` - Sunset gradient
- `cds-gradient-ocean` - Ocean gradient

#### Dividers
- `cds-divider` - Horizontal divider
- `cds-divider-vertical` - Vertical divider

---

## Responsive Classes

### Breakpoints
- **sm**: < 640px (mobile)
- **md**: 641px - 768px (tablet)
- **lg**: > 769px (desktop)

### Visibility
- `cds-hidden-sm` - Hide on mobile
- `cds-hidden-md` - Hide on tablet
- `cds-hidden-lg` - Hide on desktop
- `cds-block-md` - Show as block on tablet+
- `cds-block-lg` - Show as block on desktop

### Flex Direction
- `cds-flex--sm-col` - Column on mobile
- `cds-flex--sm-row` - Row on mobile

### Grid Columns (responsive)
- `cds-grid--sm-cols-1`, `cds-grid--sm-cols-2`
- `cds-grid--md-cols-1`, `cds-grid--md-cols-2`, `cds-grid--md-cols-3`
- `cds-grid--lg-cols-2`, `cds-grid--lg-cols-3`, `cds-grid--lg-cols-4`, `cds-grid--lg-cols-6`
