<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { Game, TOTAL_ROUNDS } from '$lib/game.svelte';
  import { buildShareText } from '$lib/share';
  import { loadStats } from '$lib/stats';
  import ProgressDots from '$lib/components/ProgressDots.svelte';

  let game = $state<Game | null>(null);
  let copied = $state(false);

  onMount(() => {
    const sp = $page.url.searchParams;
    const genre = sp.get('genre');
    const decade = sp.get('decade');
    const instance = new Game({
      genre: genre ? Number(genre) : undefined,
      decade: decade ? Number(decade) : undefined,
    });
    game = instance;
    void instance.start();
  });

  function onKey(event: KeyboardEvent) {
    if (!game) return;
    if (game.phase === 'question' && game.view) {
      const index = Number(event.key) - 1;
      const choice = game.view.choices[index];
      if (choice) {
        event.preventDefault();
        void game.choose(choice.choiceId);
      }
    } else if (
      game.phase === 'reveal' &&
      game.guess &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      void game.next();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
  });
  onDestroy(() => {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
  });

  function choiceState(choiceId: number): 'correct' | 'wrong' | 'idle' | 'muted' {
    if (!game?.guess) return 'idle';
    if (choiceId === game.guess.answerChoiceId) return 'correct';
    if (choiceId === game.selectedChoiceId) return 'wrong';
    return 'muted';
  }

  async function share() {
    if (!game) return;
    const text = buildShareText(game.score, game.results);
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }

  const stats = $derived(game?.phase === 'done' ? loadStats() : null);
</script>

<svelte:head>
  <title>Playing · Movie Quotes</title>
</svelte:head>

<main>
  {#if !game || (game.phase === 'loading' && !game.view)}
    <p class="status" data-testid="loading">Loading round…</p>
  {:else if game.phase === 'error'}
    <div class="status">
      <p>{game.error}</p>
      <button class="secondary" onclick={() => game?.start()}>Try again</button>
    </div>
  {:else if game.phase === 'done'}
    <section class="results" data-testid="results">
      <p class="eyebrow">Game over</p>
      <h1 data-testid="final-score">{game.score} points</h1>
      <p class="summary">
        You matched <strong>{game.correctCount}</strong> of {TOTAL_ROUNDS} lines · best streak
        {game.bestStreak}
      </p>
      <ProgressDots results={game.results} total={TOTAL_ROUNDS} />

      {#if stats}
        <p class="best">Best score {stats.bestScore} · {stats.gamesPlayed} games played</p>
      {/if}

      <div class="actions">
        <button class="primary" onclick={share} data-testid="share-button">
          {copied ? 'Copied to clipboard' : 'Share result'}
        </button>
        <button class="secondary" onclick={() => game?.start()} data-testid="play-again">
          Play again
        </button>
        <a class="link" href="/">Change filters</a>
      </div>
    </section>
  {:else if game.view}
    <section class="round">
      <div class="topbar">
        <span class="counter">Round {game.roundNumber} / {TOTAL_ROUNDS}</span>
        <ProgressDots results={game.results} total={TOTAL_ROUNDS} />
        <span class="score" data-testid="score">{game.score}</span>
      </div>

      <div class="prompt">
        <p class="which">Which line is from</p>
        <h1 class="film">
          {game.view.film.title} <span class="year">({game.view.film.year})</span>
        </h1>
        <span class="band band-{game.view.band}">{game.view.band}</span>
      </div>

      <ul class="choices">
        {#each game.view.choices as choice, i (choice.choiceId)}
          <li>
            <button
              class="choice {choiceState(choice.choiceId)}"
              disabled={game.phase !== 'question'}
              onclick={() => game?.choose(choice.choiceId)}
              data-testid="choice"
            >
              <span class="key">{i + 1}</span>
              <span class="quote">{choice.text}</span>
            </button>
          </li>
        {/each}
      </ul>

      {#if game.phase === 'reveal'}
        <div class="reveal" data-testid="reveal">
          {#if game.guess}
            <div class="verdict {game.guess.correct ? 'good' : 'bad'}">
              <div class="verdict-head">
                <span>{game.guess.correct ? 'Correct' : 'Not quite'}</span>
                {#if game.guess.points > 0}<span class="points">+{game.guess.points}</span>{/if}
              </div>
              <div class="film-card">
                {#if game.guess.film.posterUrl}
                  <img
                    class="poster"
                    src={game.guess.film.posterUrl}
                    alt={`${game.guess.film.title} poster`}
                    loading="lazy"
                  />
                {/if}
                <div>
                  <p class="film-name">{game.guess.film.title} ({game.guess.film.year})</p>
                  {#if game.guess.decoySources.length}
                    <p class="decoys">
                      Decoys from {game.guess.decoySources.map((d) => d.title).join(', ')}
                    </p>
                  {/if}
                </div>
              </div>
              <button class="primary next" onclick={() => game?.next()} data-testid="next-button">
                {game.roundNumber >= TOTAL_ROUNDS ? 'See results' : 'Next round'}
              </button>
            </div>
          {:else}
            <p class="status">Checking…</p>
          {/if}
        </div>
      {/if}
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--space-2) var(--space-3) var(--space-5);
  }

  .status {
    text-align: center;
    color: var(--ink-soft);
    padding: var(--space-5) 0;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .counter {
    font-size: 0.82rem;
    letter-spacing: 0.05em;
    color: var(--ink-soft);
  }

  .score {
    font-family: var(--font-serif);
    font-size: 1.3rem;
    font-weight: 600;
    min-width: 2.5rem;
    text-align: right;
  }

  .prompt {
    margin-bottom: var(--space-4);
  }

  .which {
    margin: 0 0 0.25rem;
    color: var(--ink-soft);
    font-size: 0.95rem;
  }

  .film {
    font-size: clamp(1.8rem, 5vw, 2.6rem);
    margin: 0 0 var(--space-2);
    line-height: 1.05;
  }

  .year {
    color: var(--ink-soft);
    font-weight: 400;
  }

  .band {
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.68rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--ink-soft);
  }
  .band-hard {
    color: var(--accent);
    border-color: var(--accent);
  }

  .choices {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .choice {
    width: 100%;
    text-align: left;
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
    font: inherit;
    font-size: 1.05rem;
    color: var(--ink);
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background-color 0.2s ease,
      transform 0.1s ease;
  }

  .choice:hover:not(:disabled) {
    border-color: var(--ink-soft);
    transform: translateY(-1px);
  }

  .choice:disabled {
    cursor: default;
  }

  .choice .key {
    font-size: 0.8rem;
    color: var(--ink-soft);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 0 0.4rem;
    flex-shrink: 0;
  }

  .choice.correct {
    border-color: var(--good);
    background: color-mix(in srgb, var(--good) 12%, var(--surface));
  }

  .choice.wrong {
    border-color: var(--bad);
    background: color-mix(in srgb, var(--bad) 12%, var(--surface));
  }

  .choice.muted {
    opacity: 0.55;
  }

  .reveal {
    margin-top: var(--space-3);
  }

  .verdict {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: var(--space-3);
    animation: rise 0.2s ease;
  }

  .verdict-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--font-serif);
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: var(--space-2);
  }

  .verdict.good .verdict-head {
    color: var(--good);
  }
  .verdict.bad .verdict-head {
    color: var(--bad);
  }

  .points {
    color: var(--ink);
    font-size: 1.1rem;
  }

  .film-card {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .poster {
    width: 60px;
    height: auto;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .film-name {
    margin: 0 0 0.25rem;
    font-weight: 600;
  }

  .decoys {
    margin: 0;
    font-size: 0.88rem;
    color: var(--ink-soft);
  }

  .results {
    text-align: center;
    max-width: 30rem;
    margin: 0 auto;
    padding: var(--space-5) 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .results h1 {
    font-size: clamp(2.4rem, 8vw, 3.6rem);
    margin: 0;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    color: var(--accent);
    margin: 0;
  }

  .summary {
    margin: 0;
    color: var(--ink-soft);
  }

  .best {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
    max-width: 18rem;
    margin-top: var(--space-2);
  }

  .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    font: inherit;
    font-weight: 600;
    padding: 0.85rem 1.4rem;
    border-radius: var(--radius);
    cursor: pointer;
  }

  .next {
    margin-top: var(--space-1);
    width: 100%;
  }

  .secondary {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line);
    font: inherit;
    font-weight: 600;
    padding: 0.85rem 1.4rem;
    border-radius: var(--radius);
    cursor: pointer;
  }

  .link {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .verdict {
      animation: none;
    }
  }
</style>
