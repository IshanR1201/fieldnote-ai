# Fieldnote AI

Grounded answer engine for HVACR field technicians. Questions are answered only from an uploaded manufacturer manual library. Every procedure step carries a page-level citation. If retrieval confidence is below 0.35, the app refuses instead of guessing.

## Run locally

Prerequisites: Node.js 20 or later.

```bash
cd fieldnote-ai
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

That command starts the Express API and the Vite React app together. Leave the terminal open while you use the app.

Optional Gemini key (embeddings + generation). Without it, Fieldnote uses a local embedding fallback and extracts steps from retrieved chunks:

```bash
copy .env.example .env
```

Set `GEMINI_API_KEY` in `.env`, then restart `npm run dev`.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run lint` | Typecheck with `tsc --noEmit` |
| `npm run test:api` | Run 46 API behaviour and security checks against a running dev server |
| `npm run build` | Production Vite build plus bundled server |
| `npm start` | Run the production server from `dist/` |

The server binds to `127.0.0.1` by default. Set `HOST=0.0.0.0` only if you intend to
expose it on your network, and read the limitations in
[SECURITY.md](./SECURITY.md) first.

## What persists across refresh

The browser stores:

- Current Field vs Admin tab
- Brand, model, and question
- Last grounded answer or refusal, plus the exact question it answers
- Admin ingest draft
- Thumbs up / down notes keyed by query id
- Last 20 answers in an offline cache

If the connection drops and you re-ask a question that was already answered, Fieldnote
serves the saved copy and says so. If the form no longer matches the answer on screen,
the answer is flagged as outdated so a stale procedure cannot be mistaken for a current
one.

Server-side query logs, feedback, and escalations live in memory for the current `npm run dev` process and reset when the server restarts.

## Project layout

```
fieldnote-ai/
├── server.ts                 Express API + Vite middleware
├── server/
│   ├── ragEngine.ts          Chunking, embeddings, RRF, generation
│   ├── validation.ts         Request type/length rules, PII redaction
│   ├── middleware.ts         Security headers, rate limits, error handler
│   └── seedData.ts           Carrier / Trane / Copeland seed manuals
├── scripts/
│   └── api-smoke-test.mjs    46 API behaviour and security checks
├── src/
│   ├── App.tsx               Field + admin shell
│   ├── main.tsx
│   ├── types.ts
│   ├── index.css
│   ├── data/presets.ts
│   ├── lib/
│   │   ├── api.ts            Fetch helpers, timeouts, error messages
│   │   ├── validation.ts     Form rules
│   │   ├── persistence.ts    localStorage session
│   │   ├── offlineCache.ts   Saved answers for offline use
│   │   ├── safeStorage.ts    Quota-safe localStorage wrapper
│   │   └── useDialog.ts      Escape, focus trap, scroll lock
│   └── components/
│       ├── layout/           Header, field ribbon
│       ├── field/            Query form, answers, citations
│       ├── admin/            Library, usage, gaps
│       └── ui/               Errors, loading, boundary
├── TESTING.md                Feature checklist, bugs found and fixed
├── SECURITY.md               Security checklist and known limitations
└── README.md
```

## Testing and security

- [TESTING.md](./TESTING.md) — the full feature and button checklist, the twelve bugs
  found and fixed in this pass, and the accessibility work.
- [SECURITY.md](./SECURITY.md) — secrets handling, input validation rules, data
  protection, error-handling coverage, and the limitations that must be closed before
  any shared deployment.

## Core behavior

- Hybrid retrieval: dense cosine similarity + BM25-style keyword overlap, fused with reciprocal rank fusion
- Abstention when confidence is below 0.35 or the brand is not in the library
- High-contrast field UI with 48px touch targets and a mobile-first query bar
- Admin console for ingest, usage rates, and library-gap escalations

Seed manuals cover Carrier 59MN7A, Trane XR14, and Copeland ZP-Scroll. The Daikin VRV-IV preset is a deliberate refusal case.
