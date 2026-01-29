<script lang="ts">
  interface Props {
    type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
    value?: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    success?: string;
    helperText?: string;
    size?: "sm" | "base" | "lg";
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    onfocus?: (e: FocusEvent) => void;
    onblur?: (e: FocusEvent) => void;
    [key: string]: any;
  }

  let {
    type = "text",
    value = $bindable(""),
    placeholder = "",
    label = "",
    required = false,
    disabled = false,
    error = "",
    success = "",
    helperText = "",
    size = "base",
    oninput,
    onchange,
    onfocus,
    onblur,
    ...rest
  }: Props = $props();

  let inputClasses = $derived(
    [
      "cds-input",
      `cds-input--${size}`,
      error ? "cds-input--error" : "",
      success ? "cds-input--success" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  let labelClasses = $derived(
    ["cds-label", required ? "cds-label--required" : ""]
      .filter(Boolean)
      .join(" "),
  );
</script>

<div class="cds-form-group">
  {#if label}
    <label class={labelClasses}>
      {label}
    </label>
  {/if}
  <div class="input-wrapper">
    <input
      class={inputClasses}
      {type}
      {placeholder}
      {disabled}
      bind:value
      {oninput}
      {onchange}
      {onfocus}
      {onblur}
      {...rest}
    />
  </div>
  {#if error}
    <div class="cds-helper-text cds-helper-text--error">{error}</div>
  {:else if success}
    <div class="cds-helper-text cds-helper-text--success">{success}</div>
  {:else if helperText}
    <div class="cds-helper-text">{helperText}</div>
  {/if}
</div>

<style>
  .cds-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .cds-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--cds-color-text-secondary);
    margin-left: 4px;
  }

  .cds-label--required::after {
    content: " *";
    color: var(--cds-color-error);
  }

  .input-wrapper {
    position: relative;
    width: 100%;
  }

  .cds-input {
    width: 100%;
    background: white;
    border: 1px solid var(--cds-color-border);
    border-radius: 12px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 1rem;
    color: var(--cds-color-text-primary);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
  }

  .cds-input:placeholder {
    color: var(--cds-color-text-tertiary);
  }

  .cds-input:focus {
    outline: none;
    border-color: var(--cds-color-primary);
    box-shadow: 0 0 0 4px var(--cds-color-primary-light);
  }

  .cds-input--error {
    border-color: var(--cds-color-error);
  }
  .cds-input--error:focus {
    box-shadow: 0 0 0 4px var(--cds-color-error-light);
  }

  .cds-helper-text {
    font-size: 0.75rem;
    margin-left: 4px;
    color: var(--cds-color-text-tertiary);
  }

  .cds-helper-text--error {
    color: var(--cds-color-error);
  }
</style>
