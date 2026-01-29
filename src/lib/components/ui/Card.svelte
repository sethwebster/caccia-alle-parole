<script lang="ts">
  interface Props {
    variant?: "default" | "elevated" | "outline" | "flat" | "glass";
    interactive?: boolean;
    compact?: boolean;
    status?: "success" | "error" | "warning" | "info" | null;
    children?: import("svelte").Snippet;
    onclick?: (e: MouseEvent) => void;
    [key: string]: any;
  }

  let {
    variant = "default",
    interactive = false,
    compact = false,
    status = null,
    children,
    onclick,
    ...rest
  }: Props = $props();

  let classes = $derived(
    [
      "cds-card",
      `cds-card--${variant}`,
      interactive ? "cds-card--interactive" : "",
      compact ? "cds-card--compact" : "",
      status ? `cds-card--${status}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<div class={classes} {onclick} {...rest}>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .cds-card {
    background: white;
    border-radius: 20px;
    padding: 24px;
    border: 1px solid var(--cds-color-border);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
  }

  .cds-card--compact {
    padding: 16px;
  }

  /* Variants */
  .cds-card--elevated {
    box-shadow: var(--cds-shadow-card);
  }

  .cds-card--glass {
    background: var(--cds-color-glass);
    backdrop-filter: var(--cds-blur-md);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Interactive */
  .cds-card--interactive {
    cursor: pointer;
  }
  .cds-card--interactive:hover {
    transform: translateY(-4px);
    box-shadow: var(--cds-shadow-card-hover);
    border-color: var(--cds-color-primary-light);
  }

  /* Status Indicators */
  .cds-card--success {
    border-left: 4px solid var(--cds-color-success);
  }
  .cds-card--error {
    border-left: 4px solid var(--cds-color-error);
  }
</style>
