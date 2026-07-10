<script lang="ts">
  import { onDestroy } from "svelte";
  import { fade, fly, scale } from "svelte/transition";

  interface Props {
    open?: boolean;
    size?: "sm" | "base" | "lg" | "xl" | "fullscreen";
    title?: string;
    centered?: boolean;
    onclose?: () => void;
    children?: import("svelte").Snippet;
    footer?: import("svelte").Snippet;
  }

  let {
    open = $bindable(false),
    size = "base",
    title = "",
    centered = false,
    onclose,
    children,
    footer,
  }: Props = $props();

  function handleClose() {
    open = false;
    if (onclose) onclose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  $effect(() => {
    if (open && typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    } else if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  });

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  });
</script>

{#if open}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    transition:fade={{ duration: 300 }}
    role="presentation"
  >
    <div
      class="modal-content modal--{size}"
      class:modal--centered={centered}
      transition:fly={{ y: 20, duration: 400, opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      {#if title}
        <div class="modal-header">
          <h2 class="modal-title">{title}</h2>
          <button class="close-btn" onclick={handleClose} aria-label="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      {/if}

      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>

      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--cds-color-surface-overlay);
    backdrop-filter: var(--cds-blur-md);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 24px;
  }

  .modal-content {
    background: white;
    width: 100%;
    max-width: 500px;
    border-radius: 32px;
    box-shadow: var(--cds-shadow-modal);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: none; /* Handled by Svelte transitions */
    overflow: hidden;
  }

  .modal--sm {
    max-width: 400px;
  }
  .modal--lg {
    max-width: 800px;
  }
  .modal--xl {
    max-width: 1140px;
  }
  .modal--fullscreen {
    max-width: none;
    height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: 32px 32px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--cds-color-gray-50);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--cds-color-text-tertiary);
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--cds-color-gray-100);
    color: var(--cds-color-text-primary);
  }

  .close-btn svg {
    width: 20px;
    height: 20px;
  }

  .modal-body {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 24px 32px;
    border-top: 1px solid var(--cds-color-border);
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
</style>
