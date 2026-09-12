# Fieldnote AI — Security Checklist

Audit date: 12 September 2026
Scope: `server.ts`, `server/`, `src/`, build configuration, and environment handling.
Automated verification: `node scripts/api-smoke-test.mjs` (46 checks, all passing).

Legend: **✓** in place and verified · **—** not applicable to this architecture · **!** known limitation, documented below.

---

## 1. Secrets and credential handling

| ✓ | Control | Verification |
|---|---------|--------------|
| ✓ | API key read only in server code | `GEMINI_API_KEY` appears only in `server/ragEngine.ts`; no occurrence anywhere in `src/` |
| ✓ | No secret reaches the browser bundle | `dist/assets/*.js` searched for `GEMINI_API_KEY`, `AIza`, `googleapis`, `apiKey` — no matches |
| ✓ | No `VITE_`-prefixed secrets | Vite only exposes `VITE_*`; none are defined |
| ✓ | `.env` excluded from version control | `.gitignore` ignores `.env`, `.env.local`, `.env*`, with `!.env.example` |
| ✓ | `.env.example` contains no real value | `GEMINI_API_KEY=` ships empty |
| ✓ | Health endpoint leaks only a boolean | `/api/health` returns `geminiKeySet: true|false`, never the key |
| ✓ | No hardcoded credentials | No API keys, tokens, or passwords in source |
| ✓ | Placeholder key treated as unset | `isGeminiConfigured()` rejects empty and `MY_GEMINI_API_KEY` |
| ✓ | Graceful degradation without a key | Falls back to deterministic local embeddings and local step extraction |

## 2. Injection risks

| ✓ | Control | Verification |
|---|---------|--------------|
| — | SQL injection | No database and no SQL in the project. Retrieval runs over an in-memory array using exact string comparison and cosine/BM25 scoring |
| — | NoSQL / ORM injection | No database driver or ORM |
| ✓ | Command injection | No `child_process`, `exec`, or `spawn` anywhere in the app |
| ✓ | Code injection | No `eval`, no `new Function`, no dynamic `import()` of user input |
| ✓ | Cross-site scripting (stored and reflected) | No `dangerouslySetInnerHTML` or `innerHTML` in `src/`; all values render through React's escaping. Verified by typing `<img src=x onerror=alert(1)>` into the brand field — no execution |
| ✓ | XSS payloads rejected before dispatch | Brand and model are restricted to `^[A-Za-z0-9][A-Za-z0-9 .+\-/]*$` |
| ✓ | Path traversal via chunk id | `/api/chunks/..%2F..%2Fetc%2Fpasswd` returns 404; ids are matched against indexed records, never used as file paths |
| ✓ | Path traversal via static serving | Production serves a fixed `dist` directory; the SPA fallback sends one fixed `index.html` |
| ✓ | Prompt injection containment | The generation prompt is closed-domain and grounded in retrieved chunks only, questions are capped at 500 characters, and the abstention threshold (0.35) blocks generation when retrieval is weak |

## 3. Input validation rules

Client and server enforce the same limits. The client gives immediate feedback; the server is authoritative.

| Field | Endpoint | Rule |
|-------|----------|------|
| `question` | `POST /api/query` | Required string, trimmed, 8–500 characters |
| `brand` | `POST /api/query` | Optional string, ≤ 40 characters; client also enforces 2–40 and the name pattern |
| `model` | `POST /api/query` | Optional string, ≤ 40 characters; client also enforces 2–40 and the name pattern |
| `documentName` | `POST /api/manuals/ingest` | Required string, 3–120 characters |
| `text` | `POST /api/manuals/ingest` | Required string, 50–500,000 characters |
| `brand` / `model` | `POST /api/manuals/ingest` | Optional strings, ≤ 40 characters, defaulting to `Custom` / `Unit` |
| `defaultPage` | `POST /api/manuals/ingest` | Optional integer, 1–10,000 |
| `question` | `POST /api/escalations` | Required string, ≤ 500 characters |
| `chunks` | `POST /api/escalations` | Must be an array, ≤ 20 entries; each field coerced to a string and truncated |
| `queryId` | `POST /api/feedback` | Required string, ≤ 60 characters |
| `rating` | `POST /api/feedback` | Must be exactly `up` or `down` |
| `note` | `POST /api/feedback` | Optional string, ≤ 500 characters, PII-redacted before storage |
| `chunkIds` | `POST /api/feedback` | Must be an array, ≤ 50 entries, each ≤ 60 characters |
| `procedureSteps` | `POST /api/feedback` | Must be an array, ≤ 20 entries |
| Uploaded file | Admin ingest form | `.txt` or `.md` only, 2 MB maximum |
| Request body | All `/api` routes | Must be a JSON object; 1 MB maximum |

Additional guarantees:

- **✓** Non-string values are rejected with 400, never coerced into a runtime error.
- **✓** Arrays that arrive as strings or objects are rejected with 400.
- **✓** `null`, `undefined`, missing bodies, and malformed JSON all produce 4xx, never 500.
- **✓** Values read back from `localStorage` are re-validated against allow-lists and re-truncated before entering component state.

## 4. Data protection methods

| ✓ | Control | Detail |
|---|---------|--------|
| ✓ | Embeddings never leave the server | `sanitizeTopChunks()` and the `/api/chunks/:id` handler strip the `embedding` field from every response |
| ✓ | PII redaction on free text | Emails, phone numbers, and SSN-shaped strings in feedback notes become `[redacted-email]`, `[redacted-phone]`, `[redacted-id]` before storage |
| ✓ | Minimal data collection | No accounts, no passwords, no cookies, no session identifiers, no analytics, no third-party trackers |
| ✓ | No outbound data except the model call | Only the Gemini API is contacted, and only when a key is configured |
| ✓ | Local-only persistence | Client state lives in `localStorage` under `fieldnote-ai.session.v3` and `fieldnote-ai.answer-cache.v1`; nothing is synced |
| ✓ | Bounded client storage | Answer cache limited to 20 entries with chunk text trimmed to 600 characters |
| ✓ | Bounded server memory | Query logs, escalations, and feedback capped at 500 records each; chunk index capped at 5,000 |
| ✓ | Storage failures are contained | `safeStorage` never lets a quota error or a private-mode read failure reach React |
| ✓ | Server error messages are generic | Clients receive short messages; stack traces stay in the server log |

## 5. Abuse and availability controls

| ✓ | Control | Detail |
|---|---------|--------|
| ✓ | Query rate limit | 40 requests per minute per IP on `POST /api/query` |
| ✓ | Ingest rate limit | 20 requests per minute per IP on `POST /api/manuals/ingest` |
| ✓ | Other write rate limit | 120 requests per minute per IP on escalations and feedback |
| ✓ | Readable throttle response | 429 with `Retry-After` and "Too many questions in a short time. Wait a minute and try again." |
| ✓ | Request body size limit | 1 MB, down from 30 MB; oversize bodies return 413 |
| ✓ | Request timeout on the client | 45-second `AbortController` timeout on every fetch |
| ✓ | Library capacity guard | Ingest returns 507 rather than growing the index without bound |
| ✓ | Loopback binding by default | Listens on `127.0.0.1`; exposing it requires setting `HOST` explicitly |

## 6. Dependencies

| ✓ | Control | Detail |
|---|---------|--------|
| ✓ | `npm audit` clean | Reports **0 vulnerabilities** as of this audit |
| ✓ | Transitive advisory patched | Express 4.22.1 pins `qs@6.14.2`, which carries two moderate DoS/array-limit advisories. A `package.json` `overrides` entry forces `qs@^6.16.0` across the tree |
| ✓ | No unused runtime dependencies | Nine runtime dependencies, all in use |
| ✓ | Lockfile committed | `package-lock.json` pins the resolved tree |

## 7. HTTP hardening

| ✓ | Header / behaviour | Value |
|---|--------------------|-------|
| ✓ | `X-Content-Type-Options` | `nosniff` |
| ✓ | `X-Frame-Options` | `DENY` |
| ✓ | `Referrer-Policy` | `no-referrer` |
| ✓ | `Cross-Origin-Opener-Policy` | `same-origin` |
| ✓ | `Permissions-Policy` | `geolocation=(), camera=(), microphone=(self)` — microphone kept for voice input |
| ✓ | `X-Powered-By` | Removed |
| ✓ | CSRF surface | `POST` requires `Content-Type: application/json`; form-encoded posts return 415 |
| ✓ | CORS | No CORS headers are sent, so browsers block cross-origin reads by default |
| ✓ | Unknown API routes | Return JSON `404`, not the SPA HTML |

## 8. Error handling coverage

| ✓ | Scenario | Behaviour |
|---|----------|-----------|
| ✓ | Server unreachable | "Cannot reach the Fieldnote server. Check your connection, or confirm npm run dev is still running." with **Retry** |
| ✓ | Browser offline | "You are offline. Reconnect to retrieve new procedures." and, when available, the saved copy of that answer |
| ✓ | Request timeout (45 s) | "The request timed out. Check your connection and try again." |
| ✓ | Rate limited | The server's 429 message is surfaced verbatim |
| ✓ | Validation failure | Per-field `role="alert"` message; no request is sent |
| ✓ | Malformed JSON | 400 "Request body could not be parsed as JSON." |
| ✓ | Oversized body | 413 "Request body is too large." |
| ✓ | Unknown chunk id | 404 "Chunk not found", surfaced in the modal with **Retry** |
| ✓ | Chunk load failure | Error banner inside the modal, snippet still readable |
| ✓ | Escalation failure | Error banner with **Retry**; the refusal card stays usable |
| ✓ | Feedback save failure | Inline error; the rating is not falsely reported as saved |
| ✓ | Admin stats failure | Error banner with **Retry** |
| ✓ | File too large / wrong type / unreadable | Explicit inline message for each case |
| ✓ | `localStorage` quota or private mode | Silently degrades; the app keeps working |
| ✓ | Corrupt stored session | Discarded and replaced with defaults |
| ✓ | Unexpected render error | Error boundary shows an explanation and a retry control |
| ✓ | Unhandled server exception | Central handler returns a generic 500; details stay server-side |
| ✓ | Startup failure | Logged clearly, process exits with code 1 |
| ✓ | Speech recognition unsupported | In-page message, not a blocking `alert()` |

Coverage claim: every interactive control in the app either completes its action or renders a specific, readable message. No path was found that produces a blank screen, a silent failure, or an unhandled exception.

## 9. Known limitations

These are deliberate scope decisions for a local prototype, not oversights.

- **! No authentication or authorisation.** `GET /api/admin/stats` and `GET /api/escalations` expose every logged question and feedback note to anyone who can reach the server. The practical mitigation today is that the server binds to `127.0.0.1`. **Before any shared or public deployment, these routes need an authenticated admin role.**
- **! No transport encryption.** The dev server is plain HTTP. A real deployment needs TLS termination in front of it.
- **! Storage is in-memory.** Everything resets on restart, so there is nothing at rest to encrypt — and also no durability or audit trail.
- **! Rate limiting is per-process and in-memory.** It resets on restart and does not coordinate across instances. It also trusts `req.ip`, which would need `trust proxy` configured correctly behind a load balancer.
- **! No Content-Security-Policy.** Vite's dev server needs inline scripts; a production CSP should be added at the hosting layer.
- **! Dependency auditing is manual.** `npm audit` currently reports zero vulnerabilities, but it is not wired into a CI pipeline, so a new advisory would go unnoticed until someone runs it.
- **! PII redaction is pattern-based.** It catches emails, phone numbers, and SSN-shaped strings, not names or addresses written in prose.

## 10. Verification commands

```bash
npm run dev                        # start the server
node scripts/api-smoke-test.mjs    # 46 security and behaviour checks
npx tsc --noEmit                   # type safety
npm run build                       # production build
npm audit                           # dependency advisories
```

To confirm no secret is bundled for the browser, build and search the client output:

```bash
npm run build
# PowerShell
Select-String -Path dist\assets\*.js -Pattern "GEMINI_API_KEY","AIza","apiKey" -SimpleMatch
```

Expected result: no matches.
