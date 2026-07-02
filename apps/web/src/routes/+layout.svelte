<script lang="ts">
  import '@fontsource-variable/fraunces';
  import '../app.css';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { children } = $props();
</script>

<div class="shell">
  <header>
    <a class="wordmark" href="/">Movie Quotes</a>
    <ThemeToggle />
  </header>

  <div class="content">
    {@render children()}
  </div>

  <footer>
    <p>This product uses the TMDb API but is not endorsed or certified by TMDb.</p>
  </footer>
</div>

<style>
  .shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    max-width: 56rem;
    margin: 0 auto;
    width: 100%;
  }

  .wordmark {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: 1.15rem;
    letter-spacing: -0.01em;
    text-decoration: none;
    color: var(--ink);
  }

  .content {
    flex: 1;
    width: 100%;
  }

  footer {
    padding: var(--space-3);
    max-width: 56rem;
    margin: 0 auto;
    width: 100%;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }

  footer p {
    margin: 0;
  }
</style>
