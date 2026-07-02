<script lang="ts">
  import { onMount } from 'svelte';
  import { applyTheme, loadTheme, nextTheme, type Theme } from '$lib/theme';

  let theme = $state<Theme>('system');

  onMount(() => {
    theme = loadTheme();
  });

  function cycle() {
    theme = nextTheme(theme);
    applyTheme(theme);
  }

  const label = $derived(theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark');
</script>

<button class="theme" onclick={cycle} aria-label={`Theme: ${label}. Change theme.`}>
  {label}
</button>

<style>
  .theme {
    font: inherit;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    color: var(--ink-soft);
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .theme:hover {
    color: var(--ink);
    border-color: var(--ink-soft);
  }
</style>
