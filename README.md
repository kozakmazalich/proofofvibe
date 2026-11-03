# PROOF OF VIBE — Vibe Scanner

Enter an X username to get a report on that account's vibe/vibe activity: posts mentioning
`@vibevibefun` / `@vibevibeeco` / `vibevibe` / `vibe/vibe`, likes, views, replies, reposts,
quotes, first and last mention, recent posts, and Vibe Vibers Battlegrounds points and rank.

Stack: Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · React Bits.

## Run

```bash
npm install
cp .env.example .env.local   # optional — the site works on mock data without keys
npm run dev                  # http://localhost:3000
```

Shareable links: `/?u=username&w=0xWallet` scans automatically when the page opens (wallet is optional).

## Data sources

| Data | Mode switch | Code |
| --- | --- | --- |
| X (Twitter) stats | `WEIR_API_KEY` / `WEIR_API_KEYS` set → live data via Weir, otherwise mock | `src/lib/x-api.ts`, `src/lib/weir-api.ts` |
| Battlegrounds rank | Always live — the game's public `/api/cup/board` (Season 1, falls back to Preseason) | `src/lib/game-api.ts` |
| Robinhood testnet activity | Always live — public indexer of testnet.vibevibe.fun (chain 46630), by wallet | `src/lib/testnet-api.ts` |
| X Score and Testnet Score (each 0–100) | Computed from the data above | `src/lib/score.ts` |
| Mock data | Seeded by username, so each handle always gets the same report | `src/lib/mock-data.ts` |

Set `VIBE_DATA_MODE=mock` to force mock data even when keys are present.

**Weir notes:** free accounts get 5 000 credits a month (1 per call + 1 per post returned).
`WEIR_API_KEY` and `WEIR_API_KEYS` accept comma-separated lists; when a key is out of credits,
rejected or rate-limited the next one is used automatically, so a second free account keeps the
site live. Keeping `WEIR_MAX_POSTS` low is the main lever on credit spend.



## Structure

```
src/app/page.tsx              hero + layout
src/app/actions.ts            scanVibe() server action (validation + parallel fetch)
src/components/VibeScanner    client state machine: idle → loading → success | error
src/components/SearchBar      Electric Border (color #dff904, preset "plasma")
src/components/LightningStrike React Bits Lightning bolt that hits the card
src/components/report/*       ReflectiveCard (tint #dff904) + X / Game / Posts sections
src/components/reactbits/*    original React Bits sources (from the reactbits.dev registry)
```

## Deploy to Vercel

```bash
vercel                       # preview
vercel env add WEIR_API_KEY  # plus WEIR_API_KEYS for failover
vercel --prod
```
