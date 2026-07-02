<script lang="ts">
  interface Props {
    results: { correct: boolean }[];
    total: number;
  }
  let { results, total }: Props = $props();

  const dots = $derived(
    Array.from({ length: total }, (_, i) => {
      const result = results[i];
      if (!result) return 'pending';
      return result.correct ? 'correct' : 'wrong';
    }),
  );
</script>

<div
  class="dots"
  role="img"
  aria-label={`${results.filter((r) => r.correct).length} of ${total} correct so far`}
>
  {#each dots as state, i (i)}
    <span class="dot {state}"></span>
  {/each}
</div>

<style>
  .dots {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .dot.correct {
    background: var(--good);
    border-color: var(--good);
  }

  .dot.wrong {
    background: var(--bad);
    border-color: var(--bad);
  }
</style>
