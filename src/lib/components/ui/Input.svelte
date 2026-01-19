<script lang="ts">
  export let type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' = 'text';
  export let value = '';
  export let placeholder = '';
  export let label = '';
  export let required = false;
  export let disabled = false;
  export let error = '';
  export let success = '';
  export let helperText = '';
  export let size: 'sm' | 'base' | 'lg' = 'base';

  $: inputClasses = [
    'cds-input',
    size !== 'base' ? `cds-input--${size}` : '',
    error ? 'cds-input--error' : '',
    success ? 'cds-input--success' : ''
  ].filter(Boolean).join(' ');

  $: labelClasses = [
    'cds-label',
    required ? 'cds-label--required' : ''
  ].filter(Boolean).join(' ');
</script>

<div class="cds-form-group">
  {#if label}
    <label class={labelClasses}>
      {label}
    </label>
  {/if}
  <input
    class={inputClasses}
    {type}
    {placeholder}
    {disabled}
    bind:value
    on:input
    on:change
    on:focus
    on:blur
  />
  {#if error}
    <div class="cds-helper-text cds-helper-text--error">{error}</div>
  {:else if success}
    <div class="cds-helper-text cds-helper-text--success">{success}</div>
  {:else if helperText}
    <div class="cds-helper-text">{helperText}</div>
  {/if}
</div>
