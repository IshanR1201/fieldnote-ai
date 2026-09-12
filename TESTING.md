# Fieldnote AI — Testing Checklist & Report

Date of this pass: 12 September 2026
Build under test: local `npm run dev` on `http://localhost:3000`
Verification tools: `node scripts/api-smoke-test.mjs` (46 automated checks), `npx tsc --noEmit`, manual browser walkthrough at 390 px and 1280 px, Chrome DevTools offline emulation.

---

## 1. Feature & button checklist

Every interactive element in the app, grouped by screen. Check each box as you walk through it.

### Header and global chrome

- [x] **Field** view toggle switches to the technician screen
- [x] **Admin** view toggle switches to the administrator console
- [x] Chunk counter in the header reflects the indexed library size
- [x] Health spinner appears while `/api/health` is in flight
- [x] "API unavailable" banner appears when the server is unreachable, with a working **Retry**
- [x] SLA ribbon renders ("90-sec open-unit SLA", "Grounded retrieval only")

### Field presets (4 buttons)

- [x] **Carrier 59MN7A • Fault 33 & SW1 DIPs** fills brand, model, and question
- [x] **Trane XR14 • Defrost Test & 32°F Ohms** fills brand, model, and question
- [x] **Copeland ZP • High Discharge Temp (>225°F)** fills brand, model, and question
- [x] **Daikin VRV-IV • Error U4 (out of library)** fills the deliberate refusal case
- [x] Selecting a preset clears any visible field errors
- [x] Selecting a preset marks a previously displayed answer as outdated

### Query form

- [x] **Equipment brand** accepts normal values (`Carrier`, `Trane`, `Copeland`)
- [x] Brand under 2 characters is rejected with a readable message
- [x] Brand over 40 characters is rejected
- [x] Brand containing markup or punctuation outside `A-Z 0-9 space . + - /` is rejected
- [x] **Model number / series** accepts both `59MN7A` and `59-MN7A` and retrieves the same manual
- [x] **Diagnostic question** enforces an 8-character minimum
- [x] Question enforces a 500-character maximum, with a live `n/500` counter
- [x] Whitespace-only question is rejected
- [x] **Voice** button reports an in-page message when speech recognition is unavailable (no `alert()`)
- [x] **Query service manual** disables itself and all inputs while a request is in flight
- [x] Two-stage loading card shows retrieval, then generation
- [x] Double-submission is blocked while loading
- [x] Errors render in a banner with a working **Retry**

### Answer view (grounded procedure)

- [x] Status header shows the equipment match and the latency in seconds
- [x] Safety callout renders when the manual contains a warning
- [x] Every numbered step renders with large field-readable type
- [x] Every step carries a citation chip naming the document and page
- [x] Citation chip opens the passage modal
- [x] **Audit chunks (n)** opens the retrieval inspector
- [x] Footer reports the cited step count and the top RRF score
- [x] **Outdated result** warning appears if the form is edited after retrieval

### Answer view (abstention / refusal)

- [x] Out-of-library equipment produces "The manuals in your library do not cover this question."
- [x] Refusal states that confidence fell below 0.35 and generation was skipped
- [x] Refusal renders zero procedure steps
- [x] **Escalate to senior technician** records the escalation and shows a confirmation with an `ESC-` id
- [x] Escalation failure shows an error banner with **Retry**
- [x] Repeat clicks on escalate are blocked while the request is in flight

### Passage modal

- [x] Opens with the cited snippet and loads the full chunk
- [x] Shows "Loading full chunk..." while fetching
- [x] Shows an error banner with **Retry** if the chunk request fails
- [x] **Copy** copies the passage and confirms with "Copied"
- [x] **Close passage** (X) dismisses it
- [x] **Done** dismisses it
- [x] Clicking the backdrop dismisses it
- [x] **Escape** dismisses it
- [x] Focus starts inside the dialog and returns to the citation chip on close
- [x] Renders as a bottom sheet on mobile

### Retrieval inspector (RRF audit)

- [x] Lists the top 6 chunks with dense, BM25, and RRF scores
- [x] Shows an empty-state line when no chunks were retrieved
- [x] **View full chunk** hands off to the passage modal
- [x] **Close inspector**, backdrop click, and **Escape** all dismiss it
- [x] Focus returns to the **Audit chunks** trigger on close

### Answer feedback

- [x] **Thumbs up** saves and confirms "Saved. This rating survives a refresh."
- [x] **Thumbs down** saves and confirms
- [x] Buttons disable while the rating is saving
- [x] Note accepts up to 500 characters with a live counter
- [x] Over-long note is rejected with a readable message
- [x] Rating and note survive a page refresh
- [x] Failure to save shows an error, not a silent drop

### Admin console

- [x] **Library** tab lists every ingested manual with page and chunk counts
- [x] **Usage** tab shows questions asked, answer rate, refusal rate, thumbs-down rate
- [x] **Library gaps** tab groups escalations by brand and model, ranked by frequency
- [x] Selected tab survives a refresh
- [x] Stats load with a loading state and an error banner with **Retry**

### Manual ingestion form

- [x] **Document title** required, 3–120 characters
- [x] **Brand** required, **Model** required
- [x] **Manual text** required, 50-character minimum, with a live character counter
- [x] Empty submit flags all four fields at once and sends no request
- [x] **Attach .txt file** loads a file into the textarea
- [x] Files over 2 MB are rejected with a message
- [x] Non-`.txt`/`.md` files are rejected with a message
- [x] Unreadable files surface an error instead of failing silently
- [x] Successful ingest reports the number of chunks created
- [x] Newly ingested manual is immediately retrievable by a query
- [x] Ingest draft survives a refresh

### Persistence

- [x] View, brand, model, question, last answer, admin tab, ingest draft, and ratings all survive a refresh
- [x] "Restored your last question and answer after refresh." notice appears once and clears on edit
- [x] Corrupt or hand-edited `localStorage` does not crash the app
- [x] Exceeding the storage quota does not crash the app

### Offline / no internet

- [x] Query with no connection shows "You are offline. Reconnect to retrieve new procedures."
- [x] Re-asking a previously answered question offline serves the saved copy with a visible notice
- [x] The offline notice clears when the connection returns
- [x] No unhandled crash or blank screen at any point offline

### Responsive layout

- [x] 390 × 844 (iPhone): single column, stacked header buttons, full-width submit, bottom-sheet modals
- [x] 768 px (tablet): two-column presets, inline header
- [x] 1280 px (desktop): full layout with the answer beside the form controls
- [x] All tap targets are at least 48 px tall
- [x] Inputs use 16 px type so iOS does not zoom on focus

---

## 2. Bugs found and fixed

### BUG-01 — A stale answer could be mistaken for the current one (severity: high)

**Found:** After retrieving a procedure, editing the brand, model, or question left the previous procedure on screen unchanged. Clicking a different preset did the same. While a new query was loading, and after a failed query, the old procedure still rendered as if it were the answer.

**Why it matters:** A technician standing at an open unit could follow torque values or DIP switch positions belonging to a completely different machine.

**Expected:** A displayed procedure must always be identifiable as the answer to a specific question.

**Fix:** The app now records an `answeredFor` snapshot of the exact brand, model, and question that produced each answer (`src/lib/persistence.ts`). When the form no longer matches, the answer card shows an "Outdated result — do not follow yet" alert quoting the question it actually answers (`src/components/field/ProcedureAnswerView.tsx`). Escalations and feedback are now recorded against the answered question rather than whatever is currently typed, so records can no longer be internally inconsistent. The session storage key was bumped to `v3` because older saved sessions cannot prove which question their answer belongs to.

### BUG-02 — Malformed request bodies returned HTTP 500 (severity: medium)

**Found:** Sending `{"question": 99}` or `{"chunks": "not-an-array"}` to `/api/query`, `/api/manuals/ingest`, or `/api/escalations` caused `.trim()` or `.map()` to throw, producing a 500 and a stack trace in the server log.

**Expected:** Bad input is the client's fault and should return 400 with a readable message.

**Fix:** Added `server/validation.ts` with type-and-length checked accessors (`requireString`, `optionalString`, `requireArray`, `requireObjectBody`) and applied them to every write endpoint. All three cases now return 400.

### BUG-03 — No upper bound on request field sizes (severity: medium)

**Found:** A 50,000-character question was accepted and embedded. The JSON body limit was 30 MB, and the in-memory stores grew without limit.

**Expected:** Field lengths should match what the UI allows and the stores should be bounded.

**Fix:** Server-side caps now mirror the client rules (question 500, brand/model 40, title 120, manual text 500 k, note 500). The body limit dropped from 30 MB to 1 MB. Query logs, escalations, and feedback are capped at 500 records each, and the chunk index at 5,000 chunks.

### BUG-04 — Feedback notes stored contact details verbatim (severity: medium)

**Found:** A note reading `call me at marcus@example.com or 317-555-0142` was stored exactly as written, and the note cap was 2,000 characters even though the UI allows 500.

**Expected:** Free-text that feeds the evaluation corpus should not accumulate personal contact details.

**Fix:** `redactPii()` replaces emails, phone numbers, and SSN-shaped strings with `[redacted-email]`, `[redacted-phone]`, and `[redacted-id]` before the note is stored, and the cap is now 500 to match the form.

### BUG-05 — `localStorage` writes could crash the app (severity: medium)

**Found:** The session and the 50-entry answer cache were written with unguarded `localStorage.setItem`. Each cached answer carried six full chunk texts, so the 5 MB quota was reachable. A `QuotaExceededError` thrown inside the persistence effect propagated into React and tripped the error boundary; Safari private mode would fail the same way on the first write.

**Expected:** Failing to save a convenience copy should never take down the app.

**Fix:** Added `src/lib/safeStorage.ts`, which swallows read/write failures and retries once with a caller-supplied smaller payload. The answer cache now trims chunk text to 600 characters and holds 20 entries instead of 50; the session falls back to dropping the last answer and ingest draft if the full payload will not fit.

### BUG-06 — Session data from `localStorage` was trusted (severity: medium)

**Found:** `readSession()` spread the parsed JSON straight into component state. Hand-editing the stored value to set `view` or `adminTab` to an unexpected string, or `feedbackByQueryId` to an array, produced broken renders.

**Expected:** Anything read back from browser storage is untrusted input.

**Fix:** `readSession()` now validates each field against an allow-list, coerces types, truncates strings to the same limits the forms enforce, and rebuilds the feedback map entry by entry.

### BUG-07 — Modals were not keyboard accessible (severity: medium)

**Found:** Neither the passage modal nor the retrieval inspector closed on **Escape**. Neither carried `role="dialog"` or `aria-modal`, so assistive technology did not announce them as dialogs. Tab moved focus out of the dialog into the page behind it, and the page behind kept scrolling.

**Expected:** An overlay should behave like a dialog.

**Fix:** Added the `useDialog` hook (`src/lib/useDialog.ts`), which closes on Escape, cycles Tab within the dialog, moves focus in on open and back to the trigger on close, and locks body scroll. Both overlays now declare `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.

### BUG-08 — Offline mode ignored the app's own answer cache (severity: medium)

**Found:** The app saved every successful answer for offline use but only ever read the cache on page load. Asking a previously answered question with no connection produced an error and nothing else. The message also blamed the dev server rather than mentioning connectivity.

**Expected:** A technician in a basement with no signal should still be able to pull up a procedure they already retrieved.

**Fix:** `findCachedAnswer()` matches on normalised brand, model, and question. When a request fails at the network level, the app serves the saved copy and shows "No connection. Showing the saved copy of this answer from your last successful retrieval." The notice clears on reconnect (via the `online` event) and on view change. Offline and timeout messages now reference the connection first.

### BUG-09 — Lingering "restored session" notice (severity: low)

**Found:** "Restored your last question and answer after refresh." stayed visible while the user typed a new question, and after selecting a different preset.

**Fix:** The notice clears on any brand, model, question, or preset change.

### BUG-10 — Duplicate chunk ids were possible (severity: low)

**Found:** Ingestion derived new chunk ids from `manualChunksStore.length + 1`, which collides if the store is ever trimmed or seeded twice. Citations resolve by chunk id, so a collision would serve the wrong passage.

**Fix:** Ids come from a monotonic counter that is synced past the seeded range after seeding.

### BUG-11 — Express fingerprint and missing hardening headers (severity: low)

**Found:** Responses advertised `X-Powered-By: Express` and carried no `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy`.

**Fix:** `X-Powered-By` is disabled and the headers listed in `SECURITY.md` are set on every response.

### BUG-12 — Unhandled startup rejection (severity: low)

**Found:** `startServer()` was called without a `.catch()`, so a failure during seeding surfaced as an unhandled promise rejection.

**Fix:** Startup failures now log a clear message and exit with code 1.

### BUG-13 — Vulnerable transitive dependency (severity: moderate)

**Found:** `npm audit` reported two moderate advisories in `qs`, which Express 4.22.1 pins at `6.14.2` (an array-limit bypass and an attacker-controlled `isBuffer` denial of service). `npm audit fix` alone could not resolve it because the pin comes from Express itself.

**Fix:** Added a `package.json` `overrides` entry forcing `qs@^6.16.0` across the dependency tree. `npm audit` now reports **0 vulnerabilities**.

### Non-bugs confirmed during testing

- React escapes all rendered values, so `<img src=x onerror=alert(1)>` in the brand field never executed. Client validation rejected it before any request was sent.
- There is no SQL in the project, so there is no SQL injection surface. Retrieval runs over an in-memory array.
- `/api/chunks/..%2F..%2Fetc%2Fpasswd` returns 404. Chunk ids are matched by exact string equality against indexed records, never used as a file path.
- A body-less POST returns 415 rather than 400. That is correct: the content type is what fails first.

---

## 3. Security measures implemented

Full detail and the verification matrix live in [SECURITY.md](./SECURITY.md). Summary:

- **Secrets:** `GEMINI_API_KEY` is read only in server code, never referenced in `src/`, and confirmed absent from the production client bundle. `.env` is git-ignored; `.env.example` ships empty. `/api/health` exposes only a boolean.
- **Input validation:** Every write endpoint type-checks and length-caps every field, mirroring the client rules.
- **Injection:** No SQL, no shell execution, no `eval`, no `dangerouslySetInnerHTML`. Output escaping is React's default.
- **Data handling:** Embeddings are stripped from every response. Feedback notes are PII-redacted. In-memory stores are capped. Browser storage is treated as untrusted on read.
- **Abuse control:** Per-IP rate limits (40 queries/min, 20 ingests/min, 120 other writes/min) with a readable 429 message.
- **Transport and surface:** Server binds to `127.0.0.1` by default instead of `0.0.0.0`. JSON body limit 1 MB. Non-JSON `POST` content types rejected with 415. Unknown `/api` paths return JSON 404. A central error handler prevents stack traces from reaching clients.
- **Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy`; `X-Powered-By` removed.
- **Dependencies:** `npm audit` reports 0 vulnerabilities after overriding the `qs` version Express pins.

---

## 4. Accessibility features added

- **Dialog semantics:** Both overlays declare `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at their visible heading.
- **Keyboard operation:** Escape closes overlays, Tab and Shift+Tab cycle within them, focus moves into the dialog on open and returns to the triggering control on close. Body scroll is locked while an overlay is open.
- **Form field errors:** Every invalid input sets `aria-invalid` and `aria-describedby`, and each message renders in a `role="alert"` element so it is announced immediately.
- **Status and error regions:** Loading blocks use `role="status"`; error banners and the outdated-answer warning use `role="alert"`.
- **Labels:** Every input has a real `<label>`; every icon-only button (voice, close passage, close inspector, thumbs up, thumbs down) has an `aria-label`.
- **Touch and reading ergonomics:** 48 px minimum tap targets, 16 px input type to prevent iOS zoom, and procedure steps set with `clamp(1.05rem, 2.4vw + 0.7rem, 18pt)` for glove-and-flashlight legibility.
- **Meaning beyond colour:** Refusals, outdated answers, and errors all pair their colour with an icon and explicit text.
- **Crash recovery:** The error boundary presents a readable explanation and a retry control instead of a blank page.

Not yet addressed: no automated axe or Lighthouse audit has been run, and a full screen-reader pass (NVDA/VoiceOver) has not been done. Colour contrast was chosen for high-glare readability but has not been formally measured against WCAG AA.

---

## 5. How to re-run this suite

```bash
npm run dev          # terminal 1
npm run test:api     # terminal 2 — 46 checks
npm run lint         # type safety
npm run build        # production build
npm audit            # dependency advisories
```

The smoke test exercises the rate limiter last, on purpose: it exhausts the query budget, so anything after it in the same minute would see 429s. Restart the dev server if you want to use the UI immediately afterwards.

Current status: **46 / 46 automated checks pass**, `tsc --noEmit` clean, production build succeeds, `npm audit` reports 0 vulnerabilities, and all thirteen bugs above are fixed and re-verified.
