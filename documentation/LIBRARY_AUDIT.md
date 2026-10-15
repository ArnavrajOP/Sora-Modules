# Library audit & maintenance workflow

Repeatable revive / maintain / fix loop for every module in `modules.json`.
First full run: 2026-10-15 (commit `3c13a28`).

## 1. Run the sweep

```bash
node .tmp-audit/audit.js            # all 172 entries, concurrency 4, ~6 min
node .tmp-audit/audit.js 8 yfsp    # re-test specific ids after a fix
```

- The driver reuses `server.js`'s Sora-contract pipeline (search → details →
  episodes/stream | chapters/text | chapters/images) but loads manifests and
  scripts **from the working tree first** (`server.js` `localPathFromOurRawUrl`),
  so uncommitted fixes are tested without waiting for the GitHub-raw CDN.
  External manifests (JayGxnzalez, cranci1) still fetch live.
- Output: `.tmp-audit/audit-results.jsonl` (one line per entry) +
  `.tmp-audit/audit-summary.txt` (classification record).

## 2. Classify

Per-entry `status` in the JSONL:

| status | meaning |
| --- | --- |
| `working` | terminal step of the contract returned real data |
| `no-results` | search ok but 0 items |
| `search-broken` | upstream unreachable / Cloudflare-challenged / markup gone |
| `stream-broken` | video module, search ok, extractStreamUrl empty/failed |
| `text-broken` | novel module, search ok, extractText empty/failed |
| `images-broken` | manga module, search ok, extractImages empty/failed |
| `load-error` | manifest or script could not be loaded |

Flags: `discontinued` (out of scope), `external` (manifest in another repo —
record only), `needs_review` (from `modules.json`).

Note: `working` means *the module pipeline emitted stream objects* — for
resolver-style modules the emitted URL may still be a player-embed payload.
Spot-check a `streamFirst` URL with `curl -s -o /dev/null -w "%{http_code}"`
(no Referer) before calling a module truly revived.

## 3. Triage the broken ones

1. **Revive**: probe the failing step directly (curl the endpoint, read the
   module log via a probe like `.tmp-audit/probe-*.js`). If the upstream is
   back and the pipeline passes, clear `needs_review`, rewrite the `note`
   with today's evidence, and commit. (2026-10-15: anidb, animeland.)
2. **Record**: if the failure is an upstream wall that can't be fixed
   in-module (Cloudflare session/CAPTCHA, DNS-dead hosts, rate limits), keep
   the flag and update the `note` so the next run doesn't re-investigate
   blindly. (2026-10-15: moflix CF wall, allmanga mkissa NEED_CAPTCHA /
   allanime.day 429, hydrahd VapLayer payload playability.)
3. **Fix**: for genuine in-module bugs, change the script, bump the manifest
   `version` and any build-marker constant, `node --check`, re-audit the id
   (`node .tmp-audit/audit.js 1 <id>`), then:
   - `node refresh-updated.js`
   - commit module files + `modules.json` + the audit record together.
   (2026-10-15: yfsp v1.0.7 — unbounded code-5 backoff loop bounded to a
   shared 2×8s budget; 40s-timeout hang → 22s graceful empty.)

## 4. Invariants

- Modules must never throw; empty contract shapes on failure (guide §"try/catch").
- No `setTimeout`/`setInterval` in app code without a `timerSafe`-style guard.
- Stream URLs that will be fetched by the native player must answer 200
  **without a Referer header** (Sora reader sends none).
- Don't re-investigate "known dead ends" from `AGENTS.md` or module notes
  without fresh evidence (anime-nexus flixchain, kaliscan DNS, etc.).
