# Getting Started with CDS

## Quick Start

### 1. Include CSS Files

Add the CDS stylesheets to your HTML in this order:

```html
<!-- Design Tokens (Required) -->
<link rel="stylesheet" href="cds/tokens/colors.css">
<link rel="stylesheet" href="cds/tokens/typography.css">
<link rel="stylesheet" href="cds/tokens/spacing.css">
<link rel="stylesheet" href="cds/tokens/elevation.css">

<!-- Components (As Needed) -->
<link rel="stylesheet" href="cds/components/buttons.css">
<link rel="stylesheet" href="cds/components/cards.css">
<link rel="stylesheet" href="cds/components/inputs.css">
<link rel="stylesheet" href="cds/components/modals.css">
<link rel="stylesheet" href="cds/components/toasts.css">
<link rel="stylesheet" href="cds/components/grid.css">

<!-- Utilities (Recommended) -->
<link rel="stylesheet" href="cds/utilities/layout.css">
<link rel="stylesheet" href="cds/utilities/helpers.css">
```

### 2. Basic Page Structure

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>

    <!-- CDS Styles -->
    <link rel="stylesheet" href="cds/tokens/colors.css">
    <link rel="stylesheet" href="cds/tokens/typography.css">
    <link rel="stylesheet" href="cds/tokens/spacing.css">
    <link rel="stylesheet" href="cds/components/buttons.css">
    <link rel="stylesheet" href="cds/components/cards.css">
    <link rel="stylesheet" href="cds/utilities/layout.css">
</head>
<body>
    <div class="cds-container">
        <h1 class="cds-heading-1">Hello, CDS!</h1>
        <button class="cds-button cds-button--primary">Get Started</button>
    </div>
</body>
</html>
```

## Common Patterns

### Card with Content

```html
<div class="cds-card">
    <div class="cds-card__header">
        <h3 class="cds-card__title">Card Title</h3>
        <p class="cds-card__subtitle">Optional subtitle</p>
    </div>
    <div class="cds-card__body">
        <p>Your content here...</p>
    </div>
    <div class="cds-card__footer">
        <button class="cds-button cds-button--primary">Action</button>
    </div>
</div>
```

### Form with Validation

```html
<form>
    <div class="cds-form-group">
        <label class="cds-label cds-label--required">Email</label>
        <input type="email" class="cds-input" placeholder="email@example.com">
        <p class="cds-helper-text">We'll never share your email</p>
    </div>

    <div class="cds-form-group">
        <label class="cds-label">Password</label>
        <input type="password" class="cds-input cds-input--error">
        <p class="cds-helper-text cds-helper-text--error">
            Password must be at least 8 characters
        </p>
    </div>

    <button type="submit" class="cds-button cds-button--primary">
        Sign Up
    </button>
</form>
```

### Responsive Grid Layout

```html
<div class="cds-container">
    <div class="cds-grid cds-grid--cols-3 cds-grid--md-cols-2 cds-grid--sm-cols-1">
        <div class="cds-card">Card 1</div>
        <div class="cds-card">Card 2</div>
        <div class="cds-card">Card 3</div>
    </div>
</div>
```

### Toast Notification

```html
<!-- Toast Container (add once to page) -->
<div class="cds-toast-container cds-toast-container--top-right" id="toast-container">
</div>

<script>
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    toast.className = `cds-toast cds-toast--${type}`;
    toast.innerHTML = `
        <div class="cds-toast__content">${message}</div>
        <button class="cds-toast__close" onclick="this.parentElement.remove()">
            &times;
        </button>
    `;

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('cds-toast--exiting');
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}

// Usage
showToast('Operation successful!', 'success');
showToast('An error occurred', 'error');
</script>
```

### Modal Dialog

```html
<!-- Modal -->
<div class="cds-modal cds-hidden" id="my-modal">
    <div class="cds-modal__backdrop" onclick="closeModal()"></div>
    <div class="cds-modal__content">
        <div class="cds-modal__header">
            <h3 class="cds-modal__title">Confirm Action</h3>
            <button class="cds-modal__close" onclick="closeModal()">&times;</button>
        </div>
        <div class="cds-modal__body">
            <p>Are you sure you want to proceed?</p>
        </div>
        <div class="cds-modal__footer">
            <button class="cds-button cds-button--ghost" onclick="closeModal()">
                Cancel
            </button>
            <button class="cds-button cds-button--primary" onclick="confirmAction()">
                Confirm
            </button>
        </div>
    </div>
</div>

<script>
function openModal() {
    const modal = document.getElementById('my-modal');
    modal.classList.remove('cds-hidden');
    setTimeout(() => modal.classList.add('cds-modal--open'), 10);
}

function closeModal() {
    const modal = document.getElementById('my-modal');
    modal.classList.remove('cds-modal--open');
    setTimeout(() => modal.classList.add('cds-hidden'), 200);
}
</script>
```

## Design Tokens

All CDS components use CSS custom properties (variables) for consistency. You can customize the design system by overriding these tokens:

```css
:root {
    /* Override brand colors */
    --cds-color-primary: #your-color;
    --cds-color-secondary: #your-color;

    /* Override spacing */
    --cds-space-base: 0.5rem; /* 8px grid */

    /* Override typography */
    --cds-font-family-base: 'Your Font', sans-serif;
}
```

## Utility Classes

CDS includes utility classes for common styling needs:

### Layout

```html
<div class="cds-flex cds-justify-center cds-items-center">
    Centered content
</div>

<div class="cds-grid cds-grid--cols-4 cds-grid--gap-4">
    Grid with 4 columns
</div>

<div class="cds-stack cds-stack--lg">
    Vertical stack with large gap
</div>
```

### Spacing

```html
<div class="cds-p-4 cds-mb-8">
    Padding: 16px, Margin-bottom: 32px
</div>
```

### Colors

```html
<div class="cds-bg-primary cds-text-white">
    Primary background with white text
</div>
```

### Typography

```html
<p class="cds-text-lg cds-font-semibold cds-text-center">
    Large, semi-bold, centered text
</p>
```

## Responsive Design

CDS includes responsive utilities with breakpoints:
- **sm**: < 640px (mobile)
- **md**: 641px - 768px (tablet)
- **lg**: > 769px (desktop)

```html
<!-- Hide on mobile, show on desktop -->
<div class="cds-hidden-sm cds-block-lg">
    Desktop content
</div>

<!-- Responsive grid -->
<div class="cds-grid
            cds-grid--sm-cols-1
            cds-grid--md-cols-2
            cds-grid--lg-cols-4">
    Responsive columns
</div>
```

## Best Practices

### 1. Container First
Always wrap content in a container for proper centering and padding:

```html
<div class="cds-container">
    <!-- Your content -->
</div>
```

### 2. Semantic HTML
Use appropriate HTML elements with CDS classes:

```html
<!-- Good -->
<button class="cds-button cds-button--primary">Submit</button>

<!-- Avoid -->
<div class="cds-button cds-button--primary" onclick="...">Submit</div>
```

### 3. Component Composition
Build complex UIs by composing simple components:

```html
<div class="cds-card">
    <div class="cds-card__header">
        <div class="cds-flex cds-justify-between cds-items-center">
            <h3 class="cds-card__title">Settings</h3>
            <button class="cds-button cds-button--sm cds-button--ghost">
                Edit
            </button>
        </div>
    </div>
    <div class="cds-card__body">
        <div class="cds-stack cds-stack--md">
            <!-- Form fields -->
        </div>
    </div>
</div>
```

### 4. Accessible Forms
Always use labels with form inputs:

```html
<div class="cds-form-group">
    <label class="cds-label" for="email">Email</label>
    <input type="email" id="email" class="cds-input">
</div>
```

### 5. Loading States
Show feedback during async operations:

```html
<button class="cds-button cds-button--primary cds-button--loading" disabled>
    <span class="cds-button__spinner"></span>
    Saving...
</button>
```

## Next Steps

- View the [Component Showcase](examples.html) for live examples
- Check the [README](../README.md) for design principles
- Explore component CSS files in `cds/components/` for advanced usage
- Customize design tokens in `cds/tokens/` for your brand

## Support

For issues or questions about CDS, consult:
- Component examples in `cds/documentation/examples.html`
- Token documentation in `cds/tokens/*.css`
- Component source in `cds/components/*.css`
