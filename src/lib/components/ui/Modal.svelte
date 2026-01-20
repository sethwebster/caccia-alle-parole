<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let open = false;
  export let size: 'sm' | 'base' | 'lg' | 'xl' | 'fullscreen' = 'base';
  export let title = '';
  export let centered = false;

  $: backdropClasses = [
    'cds-modal-backdrop',
    open ? 'cds-modal--open' : ''
  ].filter(Boolean).join(' ');

  $: modalClasses = [
    'cds-modal',
    size !== 'base' ? `cds-modal--${size}` : '',
    centered ? 'cds-modal--centered' : '',
    open ? 'cds-modal--open' : ''
  ].filter(Boolean).join(' ');

  function handleClose() {
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  $: {
    if (open && typeof document !== 'undefined') {
      document.body.classList.add('cds-modal-open');
    } else if (typeof document !== 'undefined') {
      document.body.classList.remove('cds-modal-open');
    }
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('cds-modal-open');
    }
  });
</script>

{#if open}
  <div class={backdropClasses} />
  <div class={modalClasses} on:click={handleBackdropClick}>
    <div class="cds-modal__content">
      {#if title}
        <div class="cds-modal__header">
          <h2 class="cds-modal__title">{title}</h2>
          <button class="cds-modal__close" on:click={handleClose} aria-label="Close">
            ✕
          </button>
        </div>
      {/if}
      <div class="cds-modal__body">
        <slot />
      </div>
      {#if $$slots.footer}
        <div class="cds-modal__footer">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
