## Karma Market

A playful stock-market simulator built on Reddit. Ten curated subreddits trade like tickers, prices drift with mocked Reddit activity, and every trade updates a shared tape and leaderboard in real time.

### Highlights

- **Instant trading loop** – React + Sonner confirm flows, SWR cache hydration, and Redis-backed execution keep buys and sells snappy.
- **Deterministic price engine** – Scheduler tick blends activity and order flow, clamps wild moves, and broadcasts updates to every client.
- **Demo-ready data** – The `demo` user loads with a seeded portfolio that mirrors the mock leaderboard so reviewers can trade right away.
- **Responsive fintech UI** – Tailwind tokens, shadcn primitives, and Framer Motion touches deliver a polished mobile/desktop layout.
- **Devvit-native** – Express server, Redis cache, and realtime APIs are tuned for Reddit's hosting model with graceful fallbacks.

### Tech Stack

React 19 · Vite · Tailwind · Framer Motion · SWR · Express · TypeScript · Redis (via Devvit) · Devvit realtime + scheduler

## Getting Started

1. **Prereqs** – Install Node 22 and log in with `devvit login`.
2. **Install deps** – `npm install`
3. **Copy env template** – `cp .env.template .env` (tweak ports or API overrides as needed)
4. **Run everything** – `npm run dev` spins up client, server, and Devvit playtest watchers.

The Devvit playtest URL (shown in the console) lets you see trades inside a Reddit UI shell. Hitting `http://localhost:3000` serves the Express API directly for local debugging.

### Useful Scripts

- `npm run dev` – client/server/watchers + Devvit playtest
- `npm run dev:vite` – local Vite preview without Devvit wrapper
- `npm run build` / `npm run build:*` – bundle client and server
- `npm run check` – type-check, lint (with autofix), and prettier sweep
- `npm run test:server` – Vitest suite for server utilities
- `npm run launch` – build, upload, and publish to Reddit (use with care)

### Manual Utilities

- `curl -X POST http://localhost:3000/internal/dev/price-engine/run` – trigger a price tick without waiting for the scheduler.
- `curl http://localhost:3000/internal/dev/karma?user=demo` – view the deterministic karma stipend used for seeding.

## Project Notes

- **User identity** – The local demo runs under the `demo` username. Add `?user=<name>` to the playtest URL or send `X-User-Name` headers to test separate portfolios.
- **Fallbacks** – If Redis is unavailable, the server logs a warning and switches to in-memory storage so you can still demo trades.
- **Deployment** – Update `devvit.json` (media, scheduler cron, etc.) before running `npm run deploy` or `npm run launch`.

Enjoy trading! Open issues or ideas are welcome—this repo is meant to showcase how rich Devvit experiences can feel with a tight, UI-first build.