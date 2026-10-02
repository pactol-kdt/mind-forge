# Mindforge

Infinite brain-training roguelike with deep puzzle families, challenge modes, seeded runs, adaptive training, and optional cloud accounts.

> Mindforge tracks **in-game training performance only**. It does **not** measure IQ, intelligence, or medical/cognitive ability.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS · Zustand · Framer Motion · Vitest
- Auth.js (NextAuth v5) · Drizzle ORM · PostgreSQL (Neon-compatible)
- Zod validation · localStorage + cloud sync (schema v6)
- Vercel-compatible

## Run locally (guest / offline)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Guest play works with **no** database or OAuth configuration.

## Cloud / auth setup (optional)

1. Copy `.env.example` → `.env.local`
2. Provision PostgreSQL (Neon, Vercel Postgres, or Supabase) and set `DATABASE_URL`
3. Set `AUTH_SECRET` (long random string)
4. Configure Google and/or GitHub OAuth apps; set callback to  
   `https://YOUR_DOMAIN/api/auth/callback/google` (or `/github`)
5. Apply migrations:

```bash
npm run db:migrate
```

6. Restart `npm run dev`

Dev-only email login: set `AUTH_DEV_LOGIN=true` (never in production).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Push SQL migration (`drizzle/0000_init.sql`) via drizzle-kit |

## Routes

- `/` — Home
- `/setup` — Difficulty + optional seed
- `/challenges` — Challenge modes
- `/weekly` — Weekly challenge
- `/history` — Recent runs
- `/play` — Active session
- `/results` — Results
- `/profile` — Brain Profile (gameplay)
- `/account` — Account, sync, export/import, deletion
- `/settings` — Preferences

## Version 0.6 highlights

- Optional Auth.js accounts (Google / GitHub)
- Guest-first play with localStorage preserved
- Cloud profile sync with revision metadata
- Field-aware merge + conflict UI
- Offline pending sync
- Export / import JSON backups
- Account deletion
- Server-side Zod validation + authorization

## Privacy (plain language)

When you sign in, Mindforge may store:

- Account identity from your auth provider (email, name, avatar URL)
- Game progress (XP, mastery, unlocks, milestones)
- Performance statistics and run summaries
- Settings preferences

We do **not** collect location, contacts, advertising IDs, or browse your device beyond what is needed to run the game. Progress is game-performance data, not medical or diagnostic data.

## Version 0.5 (still included)

- Puzzle Family architecture + central registry
- Expanded Memory, Attention, Math, Logic, Spatial, Combined families
- Seeded puzzle generation + validation retries
- Family cooldowns / multi-stage helpers / schema v5→v6 migration
