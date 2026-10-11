# AllManga / AllAnime keygen live capture — chrome agent prompt

Use this when the `aaReq` keygen values in `allmanga/allmanga.js` /
`allmanga-novels/allmanga-novels.js` go stale (allmanga search / episodes
break, API returns `AA_CRYPTO_STALE`). Paste the prompt below into the
chrome agent, run it, then patch the module `FALLBACK_KEYGEN` with the
returned JSON.

## What the values are

| Value | Source |
| :--- | :--- |
| `build_id` | Site JS chunk (regex `!=="string"?"([0-9]+)"`), also visible in the bootstrap request URL |
| `lane` | Site JS chunk (regex `const ..="(k[0-9]+)"`), also in the bootstrap request URL as `k=` |
| `epoch` | Live `client-crypto/v1/bootstrap` response (7-day epochs from 1970) |
| `key` | `crypto-mask XOR base64decode(partB)` — partB comes from the same bootstrap response, the mask lives in the site chunk |
| `static_key` | Constant `Xot36i3lK3:v1` (never changes) |

Reference implementation (what the values are derived from):
`sdaqo/anipy-cli` branch `key-gen`, `scripts/keygen/keygen.py`; mask
extraction: `mbpowers/ani-extract` (evaluates the chunk's root decoder
array). A stale copy of the keygen also lives at
`https://raw.githubusercontent.com/sdaqo/anipy-cli/refs/heads/key-gen/scripts/keygen/keygen.json`
— it is **usually outdated** (it lags behind the live site), so always
capture fresh from the site instead.

---

## PROMPT (paste into the chrome agent)

```
You are a web scraping agent. Your job: extract the current AllAnime/AllManga
"keygen" crypto values from the live site so a personal scraper module can keep
working. The API (api.mkissa.net) gates its GraphQL endpoints behind an aaReq
AES-GCM token built from these values; the token expires and the site rotates
the values periodically. Do everything in the browser, do not use external
services, do not paste these values anywhere.

GOAL: report exactly one JSON object at the end:
  { "build_id": "...", "epoch": <number>, "lane": "k7", "key": "<64 hex chars>", "static_key": "Xot36i3lK3:v1" }

=== STEP 1 — load the site ===
Open https://allmanga.to/ (if it fails or redirects, use https://mkissa.to/ —
same platform, same CDN and API). Let the page fully load.

=== STEP 2 — capture the bootstrap response (this is the easy part) ===
Open DevTools → Network tab, filter for "bootstrap" (or "client-crypto").
Reload the page. Find the request to:
  https://api.mkissa.net/client-crypto/v1/bootstrap?buildId=...&k=...
- From the REQUEST URL copy `buildId=...` and `k=...` (this gives build_id and lane).
- From the RESPONSE body (JSON) copy three fields: `epoch`, `k`, `partB`.
If no bootstrap request appears on reload, try navigating to any anime detail
page, or searching for something — the app fires it when it needs the API. If
it still never fires, use the manual fallback in APPENDIX A at the end.

=== STEP 3 — find the site JS chunk with the crypto code ===
Still in the Network tab (or via View Source), find the app entry bundle
referenced from the page HTML: a URL like
  https://cdn.mkissa.net/all/mk/_app/immutable/entry/app.<hash>.js
Open that URL in a NEW tab. From its text, find chunk file references like
  "../chunks/<hash>.js"   (or "chunks/<hash>.js")
Open the first few (up to 5) of those chunk URLs from
  https://cdn.mkissa.net/all/mk/_app/immutable/chunks/<hash>.js
until you find the chunk whose text contains "VaildTranslationTypeEnumType"
or "x-aa-boot" — that is the keygen chunk. Keep its full text handy (you can
leave it open in its tab; its body text is the JS source).

=== STEP 4 — extract build_id and lane from the chunk ===
From the keygen chunk text:
- build_id: find the string pattern  !=="string"?"<digits>"  — the digits in
  the quotes are the build_id. It must match the buildId from STEP 2.
- lane: find the pattern  const <2 chars>="k<digits>"  — e.g. "k7". Must
  match the k= from STEP 2.
If the regexes don't match (site updated), look around the "x-aa-boot" /
"aa-boot" code in the chunk and figure out the equivalent literals: a short
numeric build id string and a "k<digits>" lane string used in the bootstrap
URL building. Report what you find.

=== STEP 5 — extract the 4 crypto-mask blocks from the chunk (hard part) ===
The chunk contains a root array of EXACTLY 4 elements, each element being two
function calls joined with "+", e.g.:
  const X = [ Hr("...") + jr("..."), Hr("...") + jr("..."), Hr("...") + jr("..."), Hr("...") + jr("...") ];
  (identifier names differ; the pattern is what matters: 4 elements, each
   <fn>("...") + <fn>("...") )
Do this:
1. In the chunk text, locate that array declaration.
2. Copy the array declaration AND every top-level function/const declaration
   it references (and anything those reference — usually a couple of decoder
   functions and one big table array). The decoder functions typically do
   string manipulation / base64 on their arguments.
3. Open the DevTools Console in the allmanga.to tab, paste all copied
   declarations, then run:
     console.log(JSON.stringify(X));    // X = the root array name you found
   The output is a JSON array of 4 base64 strings — those are the mask blocks.
4. If you get a ReferenceError for a missing identifier, copy that
   declaration from the chunk too and re-run. If the array has a different
   shape than expected (site updated), find whatever produces 4 long
   base64-looking strings from the chunk's decoder functions and use those.

=== STEP 6 — derive the AES key ===
In the same DevTools console, run this script with YOUR captured values
(replace the three const lines at the top):

  // ---- INPUTS (fill in) ----
  const BUILD_ID = '97';                    // from STEP 4
  const BLOCKS   = ['...','...','...','...']; // 4 base64 strings from STEP 5
  const PART_B   = '...';                   // base64 partB from STEP 2 response
  // -----------------------------

  function b64bytes(b64){ const s = atob(b64); const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  let embedded = [];
  for (const b of BLOCKS) embedded.push(...b64bytes(b));
  const mask = new Uint8Array(embedded.length);
  for (let i = 0; i < embedded.length; i++) {
    mask[i] = embedded[i]
      ^ (BUILD_ID.charCodeAt(i % BUILD_ID.length) ^ ((i * 17 + 31) & 0xFF))
      ^ (((Math.floor(i / 8)) * 41 + (i % 8) * 7) & 0xFF);
  }
  const partB = b64bytes(PART_B);
  const key = new Uint8Array(partB.length);
  for (let i = 0; i < partB.length; i++) key[i] = mask[i] ^ partB[i];
  let hex = ''; for (const b of key) hex += b.toString(16).padStart(2, '0');
  console.log('KEY_HEX=' + hex);
  console.log('maskLen=' + mask.length + ' partBLen=' + partB.length);

The last console line starting with KEY_HEX= is the AES key (must be 64 hex
chars = 32 bytes).

=== STEP 7 — sanity checks ===
- key: 64 hex characters. If partB is longer than the mask, the mask
  extraction is wrong — retry STEP 5.
- epoch: a number close to 2954 (7-day epochs from 1970; formula check:
  Math.floor(Date.now()/604800000) should equal it or differ by at most 1).
  Use the value the API returned, not your computation.
- build_id/lane from STEP 4 must match STEP 2.
- static_key is always Xot36i3lK3:v1.

=== STEP 8 — report ===
Reply with ONLY this JSON (no markdown fences, no extra text):

{ "build_id": "...", "epoch": <number>, "lane": "k7", "key": "<64 hex>", "static_key": "Xot36i3lK3:v1" }


=== APPENDIX A — manual bootstrap call (only if the page never fires it) ===
Run in the DevTools console of the allmanga.to tab, after STEP 5 (needs the
`mask` Uint8Array from STEP 6's script — run that script first):

  (async () => {
    const buildId = BUILD_ID, lane = 'k7';       // from STEP 4
    const now = Date.now();
    let e3 = Math.floor(now / 259200000);        // 3-day epoch for aa-boot
    if (now - e3 * 259200000 < 86400000 && e3 > 0) e3 -= 1;
    const enc = new TextEncoder();
    const hmac = async (keyBytes, msg) => {
      const k = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
      return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
    };
    const hmacKey = await hmac(mask, 'aa-boot:' + buildId);
    const aaBoot = [...await hmac(hmacKey, buildId + ':mkissa:mkissa.to:' + e3 + ':' + lane)]
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const r = await fetch('https://api.mkissa.net/client-crypto/v1/bootstrap?buildId=' + buildId + '&k=' + lane, {
      headers: { 'x-build-id': buildId, 'x-aa-boot': aaBoot,
                 'Referer': 'https://mkissa.to/', 'Origin': 'https://mkissa.to' }
    });
    console.log(await r.text());
  })();

The response JSON gives you `epoch`, `k` and `partB` — use those in STEP 6.
```

---

## After the capture: patch the modules

Apply the returned JSON to both modules (values are shared):

1. `allmanga/allmanga.js` → `FALLBACK_KEYGEN` (lines ~18-24):
   ```js
   const FALLBACK_KEYGEN = {
       build_id: '<build_id>',
       epoch: <epoch>,
       lane: '<lane>',
       key: '<key>',
       static_key: 'Xot36i3lK3:v1'
   };
   ```
2. `allmanga-novels/allmanga-novels.js` → same `FALLBACK_KEYGEN` (~lines 38-44).
3. Bump `"version"` in both `.json` manifests (+ `.js` version log string).
4. Verify with the repo harness (see `documentation/Howtotest.md` /
   `HowtotestNovels.md`) — search + extract one episode/chapter against the
   live API.

### IV derivation (build 114+)

Since build 114 the site derives the aaReq AES-GCM IV as
`sha256(epoch:buildId:qh:ts:lane)[0:12]` (site function `zI()`), not the old
`sha256(epoch:qh:ts)[0:12]`. Both modules' `aaBuildToken()` already use the
new form — do not revert it when updating keygen values.

### Build 179 scheme changes (captured 2026-10-11)

- **Mask blocks / constants changed**: `o55/m8U/4FY=`, `9lYtQjBCN5s=`,
  `s3mBmnFuzkQ=`, `H8tdZAar+nQ=`; salt `saltMul=5, saltAdd=39`,
  `fragMul=251, fragAdd=21`; boot prefix `KoCGqjW:` (was `X8S061oCq:`).
- **Boot message order changed** to `buildId|group|lane|epoch|host` (build 175
  used `buildId|group|host|epoch|lane`). Verified live:
  `179|mkissa|k7|2962|mkissa.to`.
- **envXor trap**: the chunk's `Df` config carries `envXor:3`, but the
  PRODUCTION runtime applies envXor=0 to the mask. A token built with the
  `^3` mask is rejected with `invalid_boot_token`. The chunk's obfuscated
  mask builder evaluates differently in a stubbed Node harness than in the
  browser — when re-extracting, sweep envXor 0..255 against a live-captured
  `x-aa-boot` header before trusting the mask.
- **Extraction method that worked**: run the whole crypto chunk
  (`_app/immutable/chunks/i2X40NLc.js` for build 179) in Node with stubbed
  imports + browser shims, append `export {...}` for the internal functions
  (`md`, `_m`, `Df`, `py`, `cT`, `uT`, `dT`, `bT`, `iT`), then compare its
  output against a CDP-captured live `x-aa-boot`. Automated static scanning
  for the 4-element mask array fails on this build (fragment-table
  obfuscation); dynamic evaluation is required.
- **Bootstrap response shape** (unchanged): `{epoch, epochMs:604800000,
  graceMs:86400000, switchAt, partB, k}`; partB is stable per epoch.
- **NEED_CAPTCHA is a Cloudflare Turnstile gate, not a keygen error**: the
  live browser gets 204 → Turnstile → 200 on the same endpoints when it is
  challenged. After a burst of automated requests the API demands captcha;
  low-frequency requests pass without it. The modules already degrade
  gracefully (both IVs, next host, legacy fallback).
- **Search gotcha**: `shows(search:{sortBy:Trending,query:"..."})` makes the
  API ignore the query text (returns unrelated picks). Use
  `search:{query:"..."}` without sortBy (fixed in allmanga.js v1.12.0).

### Last captured values (2026-10-11, verified end-to-end against the live API)

```json
{ "build_id": "179", "epoch": 2962, "lane": "k7",
  "key": "93ae3a7ef8e5e1ccbd3da7fa4b9b475c1f87526429f7e355b2b87aed03f9a245",
  "static_key": "Xot36i3lK3:v1" }
```

Verification notes for this capture:
- partB from live bootstrap (k7): `Jj5n3WXKC3TGHsHlZuJdChqwQ3qgZ/s78uasJsSJu0A=`
  (`switchAt` 1792108800000 = next weekly rotation); k9 partB:
  `GZcaSdhw57Z+pOaTcWbJMS/Ui92UaNSJydhc75Vc3Dc=`.
- Client mask for build 179 (envXor=0):
  `b5905da39d2feab87b23661f2d791a560537111e8990186e405ed6cbc7701905`.
- The derived boot token matched a CDP-captured live `x-aa-boot` header
  byte-for-byte; both bootstraps returned 200; an episode query built with
  the k7 key decrypted `tobeparsed` (real HLS `sourceUrls`) on the first run.
- Because epochs rotate WEEKLY, static snapshots expire quickly;
  `allmanga.js v1.9.0+` therefore self-bootstraps fresh keys on
  `AA_CRYPTO_STALE` using the pure-JS flow above (see `aaLiveKeys` /
  `aaBootstrapFor`) and only falls back to the anipy-cli repo afterwards.

### Build 136 scheme changes (captured 2026-08-22)

- **Epochs are now 7-day**: `epoch = floor(now / 604800000)`; during the first
  day of an epoch the previous one is still accepted
  (`now - epoch*604800000 < 86400000 → epoch-1`). The aa-boot HMAC uses this
  same epoch value.
- **aa-boot message format changed** from colon-joined
  `buildId:group:host:epoch:lane` to tilde-joined parts in a NEW order:
  ```
  `${epoch}~${host}~${lane}~${group}~${buildId}`      e.g. 2955~mkissa.to~k7~mkissa~136
  ```
- **HMAC key prefix changed** from `aa-boot:<buildId>` to `qrSOLsg:<buildId>`.
- **Per-content lanes are enforced by the API**: episode queries must use
  lane `k7`, chapterPages `k9`, music `k2` (site picks via query text). The
  aaReq token payload/IV and the bootstrap call must all use the matching lane,
  otherwise the API answers `AA_CRYPTO_QUERY_MISMATCH`.
- Mask fragments for build 136: `zZ9iqAzia78=`, `0GqOekVONY4=`,
  `uyiEMZfgVqA=`, `HBpHBAntve4=`; salt constants
  `saltMul=78, saltAdd=200, fragMul=234, fragAdd=70`.
  Full client-side key derivation (no secret round-trip):
  ```
  embed[i] = concat(base64decode(fragments))[i]
  salt[i]  = (buildId.charCodeAt(i % len) || 0) ^ ((i * 78 + 200) & 255)
  lin[i]   = (((i >> 3) * 234) + ((i % 8) * 70)) & 255
  mask[i]  = embed[i] ^ salt[i] ^ lin[i]
  hmacKey  = HMAC-SHA256(mask, "qrSOLsg:" + buildId)
  bootTok  = hex(HMAC-SHA256(hmacKey, `${epoch}~${host}~${lane}~${group}~${buildId}`))
  GET api.mkissa.net/client-crypto/v1/bootstrap?buildId=<id>&k=<lane>
      headers: x-build-id, x-aa-boot=<bootTok>, Referer https://mkissa.to/
  key      = first32(base64decode(partB)) XOR mask
  ```

### Last captured values (2026-08-22, verified end-to-end against the live API)

```json
{ "build_id": "136", "epoch": 2955, "lane": "k7",
  "key": "deeb2732190ceee0d84c7668d79b64ddcd5f27b9f858f2327fe29a7841b7b5da",
  "static_key": "Xot36i3lK3:v1" }
```

Verification notes for this capture:
- partB from live bootstrap: `6hebyz7IjGzsoWm60RDl7Dmtto9VlZPQ9KkV3/3ut5U=`
  (`switchAt` 1787875200000 = next weekly rotation).
- Client mask for build 136:
  `34fcbcf927c4628c34ed1fd2068b8131f4f29136adcd61e28b4b8fa7bc59024f`
  (reproduced byte-exact by allmanga.js `aaBuildMask()`).
- A token built from these values registered the episode persisted query via
  POST and decrypted its `tobeparsed` response (real `sourceUrls` returned).
- Because epochs rotate WEEKLY, static snapshots expire quickly;
  `allmanga.js v1.9.0+` therefore self-bootstraps fresh keys on
  `AA_CRYPTO_STALE` using the pure-JS flow above (see `aaLiveKeys` /
  `aaBootstrapFor`) and only falls back to the anipy-cli repo afterwards.

Note: the remote keygen URL
(`raw.githubusercontent.com/sdaqo/anipy-cli/.../keygen.json`) is stale more
often than not — when the fallback is fresh, the module never fetches it
(only on `AA_CRYPTO_STALE`). Both modules reject a remote keygen whose
`build_id` is older than the bundled fallback.
