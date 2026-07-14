<script lang="ts">
  interface Props {
    variant?:
      | "primary"
      | "secondary"
      | "outline"
      | "ghost"
      | "danger"
      | "success";
    size?: "sm" | "base" | "lg";
    full?: boolean;
    icon?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    onclick?: (e: MouseEvent) => void;
    children?: import("svelte").Snippet;
    [key: string]: any;
  }

  let {
    variant = "primary",
    size = "base",
    full = false,
    icon = false,
    disabled = false,
    type = "button",
    onclick,
    children,
    ...rest
  }: Props = $props();

  let classes = $derived(
    [
      "cds-button",
      variant !== "primary" ? `cds-button--${variant}` : "cds-button--primary",
      size !== "base" ? `cds-button--${size}` : "",
      full ? "cds-button--full" : "",
      icon ? "cds-button--icon" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<button class={classes} {type} {disabled} {onclick} {...rest}>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .cds-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    border: 1px solid transparent;
    font-family: var(--cds-font-family-base);
    text-decoration: none;
    gap: 8px;
    border-radius: 12px;
    user-select: none;
  }

  .cds-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  /* Sizes */
  .cds-button--base {
    padding: 12px 24px;
    font-size: 0.95rem;
  }
  .cds-button--sm {
    padding: 8px 16px;
    font-size: 0.85rem;
    border-radius: 8px;
  }
  .cds-button--lg {
    padding: 16px 32px;
    font-size: 1.1rem;
    border-radius: 16px;
  }

  /* Full Width */
  .cds-button--full {
    width: 100%;
    display: flex;
  }

  /* Variants */
  .cds-button--primary {
    background: var(--cds-gradient-primary);
    color: white;
    box-shadow: var(--cds-shadow-button);
  }
  .cds-button--primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--cds-shadow-button-hover);
  }

  .cds-button--secondary {
    background: var(--cds-color-secondary);
    color: white;
  }
  .cds-button--secondary:hover:not(:disabled) {
    background: var(--cds-color-secondary-hover);
  }

  .cds-button--outline {
    background: transparent;
    border-color: var(--cds-color-border);
    color: var(--cds-color-text-primary);
  }
  .cds-button--outline:hover:not(:disabled) {
    background: var(--cds-color-gray-50);
    border-color: var(--cds-color-gray-300);
  }

  .cds-button--ghost {
    background: transparent;
    color: var(--cds-color-text-secondary);
  }
  .cds-button--ghost:hover:not(:disabled) {
    background: var(--cds-color-gray-100);
    color: var(--cds-color-text-primary);
  }

  .cds-button:active:not(:disabled) {
    transform: translateY(0);
    scale: 0.98;
  }
</style>
