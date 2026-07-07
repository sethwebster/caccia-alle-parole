<script lang="ts">
  import { onMount } from "svelte";

  let {
    subject = "",
    icon = "",
    class: className = "",
  }: { subject?: string; icon?: string; class?: string } = $props();

  // Address is split and only assembled in the browser after mount, so it
  // never appears in the served HTML or as one contiguous string in the bundle.
  const user = ["sup", "port"].join("");
  const host = ["caccia", "parole"].join("") + String.fromCharCode(46) + "com";
  let email = $state("");

  onMount(() => {
    email = user + String.fromCharCode(64) + host;
  });
</script>

{#if email}
  <a
    class={className}
    href={"mailto:" + email + (subject ? "?subject=" + encodeURIComponent(subject) : "")}
  >
    {#if icon}{icon}&nbsp;{/if}{email}
  </a>
{:else}
  <span class={className}>{#if icon}{icon}&nbsp;{/if}…</span>
{/if}
