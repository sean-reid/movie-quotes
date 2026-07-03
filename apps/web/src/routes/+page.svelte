<script lang="ts">
  import { onMount } from 'svelte';
  import { loadStats, type Stats } from '$lib/stats';

  let stats = $state<Stats | null>(null);

  onMount(() => {
    stats = loadStats();
  });
</script>

<svelte:head>
  <title>Movie Quotes</title>
</svelte:head>

<main>
  <section class="hero">
    <p class="eyebrow">A game of recall</p>
    <h1>Which line came from the film?</h1>
    <p class="lede">
      Ten rounds. Each names a movie and shows three quotes. One was really said on screen; the
      other two are impostors, picked to sound just close enough.
    </p>

    <a class="play" href="/play" data-testid="start-button">Start playing</a>

    {#if stats && stats.gamesPlayed > 0}
      <p class="stats">
        Best score <strong>{stats.bestScore}</strong> · Best streak
        <strong>{stats.bestStreak}</strong> · {stats.gamesPlayed} games played
      </p>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 34rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-5);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 60dvh;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    color: var(--accent);
    margin: 0 0 var(--space-2);
  }

  h1 {
    font-size: clamp(2.3rem, 7vw, 3.4rem);
    margin: 0 0 var(--space-3);
  }

  .lede {
    font-size: 1.1rem;
    color: var(--ink-soft);
    margin: 0 0 var(--space-4);
  }

  .play {
    display: inline-block;
    align-self: flex-start;
    background: var(--accent);
    color: var(--accent-ink);
    text-decoration: none;
    font-weight: 600;
    font-size: 1.05rem;
    padding: 0.85rem 1.8rem;
    border-radius: var(--radius);
    transition: transform 0.15s ease;
  }

  .play:hover {
    transform: translateY(-2px);
  }

  .stats {
    margin: var(--space-3) 0 0;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }

  .stats strong {
    color: var(--ink);
  }
</style>
