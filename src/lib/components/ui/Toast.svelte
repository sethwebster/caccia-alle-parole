<script lang="ts">
  import { toasts } from '$lib/stores/toast';
  import { fade, fly } from 'svelte/transition';

  export let position: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left' = 'top-right';

  $: containerClasses = [
    'cds-toast-container',
    `cds-toast-container--${position}`
  ].join(' ');

  function getIcon(type: string) {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '';
    }
  }

  function getToastClasses(type: string) {
    return [
      'cds-toast',
      type !== 'default' ? `cds-toast--${type}` : ''
    ].filter(Boolean).join(' ');
  }
</script>

<div class={containerClasses}>
  {#each $toasts as toast (toast.id)}
    <div
      class={getToastClasses(toast.type)}
      transition:fly={{ y: -20, duration: 300 }}
    >
      {#if toast.type !== 'default'}
        <div class="cds-toast__icon">
          {getIcon(toast.type)}
        </div>
      {/if}
      <div class="cds-toast__content">
        {#if toast.title}
          <div class="cds-toast__title">{toast.title}</div>
        {/if}
        <div class="cds-toast__message">{toast.message}</div>
      </div>
      <button
        class="cds-toast__close"
        on:click={() => toasts.remove(toast.id)}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  {/each}
</div>
