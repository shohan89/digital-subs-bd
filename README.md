# Digital Subs BD

Bangladesh's premium marketplace for digital subscriptions — Netflix, YouTube
Premium, Spotify, Canva Pro, ChatGPT Plus, Claude AI, Adobe Creative Cloud,
CapCut Pro, Microsoft 365 and more.

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for the full architecture
reference (folder layout, data flow, coding standards).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Framer Motion · Supabase · deployed to Cloudflare via `@opennextjs/cloudflare`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Regenerate route types, then `tsc --noEmit` |
| `npm run pages:build` | Build the Cloudflare Worker bundle |
| `npm run preview` | Build + run locally against the Workers runtime |
| `npm run deploy` | Build + deploy to Cloudflare |
