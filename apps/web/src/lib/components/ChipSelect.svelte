<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }
  interface Props {
    label: string;
    options: Option[];
    value: string;
    testid?: string;
  }
  let { label, options, value = $bindable(), testid }: Props = $props();
</script>

<div class="field">
  <span class="label">{label}</span>
  <div class="scroller" role="radiogroup" aria-label={label} data-testid={testid}>
    {#each options as opt (opt.value)}
      <button
        type="button"
        role="radio"
        aria-checked={value === opt.value}
        class="chip"
        class:selected={value === opt.value}
        data-value={opt.value}
        onclick={() => (value = opt.value)}
      >
        {opt.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .label {
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .scroller {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    padding: 0.15rem 0.15rem 0.6rem;
    margin: -0.15rem -0.15rem -0.6rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    /* Fade the trailing edge to hint that the row scrolls. */
    -webkit-mask-image: linear-gradient(to right, #000 90%, transparent);
    mask-image: linear-gradient(to right, #000 90%, transparent);
  }

  .scroller::-webkit-scrollbar {
    display: none;
  }

  .chip {
    flex: 0 0 auto;
    scroll-snap-align: start;
    font: inherit;
    font-size: 0.95rem;
    white-space: nowrap;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .chip:hover {
    border-color: var(--ink-soft);
  }

  .chip.selected {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
</style>
