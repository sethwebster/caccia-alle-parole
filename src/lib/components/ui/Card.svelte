<script lang="ts">
  export let variant: 'default' | 'elevated' | 'outline' | 'flat' = 'default';
  export let interactive = false;
  export let compact = false;
  export let status: 'success' | 'error' | 'warning' | 'info' | null = null;

  $: classes = [
    'cds-card',
    variant !== 'default' ? `cds-card--${variant}` : '',
    interactive ? 'cds-card--interactive' : '',
    compact ? 'cds-card--compact' : '',
    status ? `cds-card--${status}` : ''
  ].filter(Boolean).join(' ');
</script>

<div class={classes} on:click>
  <slot />
</div>
