<script lang="ts">
  // Landing page. The game loop arrives in a later build phase.
</script>

<svelte:head>
  <title>Movie Quotes</title>
</svelte:head>

<main>
  <section class="hero">
    <p class="eyebrow">A game of recall</p>
    <h1>Which line came from the film?</h1>
    <p class="lede">
      Each round names a movie and shows three quotes. One was really said on screen. The other two
      are impostors, picked to sound just close enough.
    </p>
    <a class="play" href="/play">Start playing</a>
  </section>

  <footer>
    <p>This product uses the TMDb API but is not endorsed or certified by TMDb.</p>
  </footer>
</main>

<style>
  main {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-5);
    max-width: var(--measure);
    margin: 0 auto;
    padding: var(--space-4) var(--space-3);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    color: var(--accent);
    margin: 0 0 var(--space-2);
  }

  h1 {
    font-size: clamp(2.4rem, 7vw, 3.6rem);
    margin: 0 0 var(--space-3);
  }

  .lede {
    font-size: 1.12rem;
    color: var(--ink-soft);
    margin: 0 0 var(--space-4);
    max-width: 30rem;
  }

  .play {
    display: inline-block;
    align-self: flex-start;
    background: var(--accent);
    color: var(--accent-ink);
    text-decoration: none;
    font-weight: 600;
    padding: 0.85rem 1.6rem;
    border-radius: var(--radius);
    transition: transform 0.15s ease;
  }

  .play:hover {
    transform: translateY(-2px);
  }

  footer {
    font-size: 0.8rem;
    color: var(--ink-soft);
  }

  footer p {
    margin: 0;
  }
</style>
