<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' = 'primary';
  export let size: 'sm' | 'base' | 'lg' = 'base';
  export let full = false;
  export let icon = false;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';

  $: classes = [
    'cds-button',
    variant !== 'primary' ? `cds-button--${variant}` : 'cds-button--primary',
    size !== 'base' ? `cds-button--${size}` : '',
    full ? 'cds-button--full' : '',
    icon ? 'cds-button--icon' : ''
  ].filter(Boolean).join(' ');
</script>

<button
  class={classes}
  {type}
  {disabled}
  on:click
>
  <slot />
</button>
