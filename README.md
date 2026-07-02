# Movie Quotes

A quick game of recall: each round names a film and shows three lines of dialogue. One was really spoken in that film. The other two are decoys pulled from other movies and chosen to sound close. Guess the real one.

The decoys are picked by semantic similarity, so the closer they read to the real line, the harder the round and the more it is worth.

## Structure

This is a pnpm + Turborepo monorepo.

| Path                | What it is                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `apps/web`          | SvelteKit front end (the game)                                                               |
| `apps/api`          | Hono API on Cloudflare Workers (serves rounds, scores guesses)                               |
| `packages/shared`   | Shared types and pure logic (scoring, difficulty, dedupe)                                    |
| `packages/pipeline` | Offline data pipeline: discover films, fetch scripts, extract and score quotes, build rounds |

## Getting started

```bash
pnpm install
pnpm dev        # runs web + api locally
pnpm test       # unit tests
pnpm e2e        # Playwright end to end
pnpm build      # production build of every package
```

## Data

Films are selected from TMDb by popularity, then their screenplays are parsed into short quotes. Similar quotes are grouped so each round can draw convincing decoys. See `packages/pipeline` for the full flow.

## Attribution

This product uses the TMDb API but is not endorsed or certified by TMDb.

## License

MIT
