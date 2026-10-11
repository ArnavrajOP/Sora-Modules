// From a real browser page context (clean fingerprint, Turnstile-capable),
// send the episode query with OUR aaReq token, then decrypt the tobeparsed
// with OUR module key in Node.
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = (s) => process.stdout.write(s + '\n');

// 1) build the episode query URL with our token (module code)
const url = execFileSync('node', ['make-url.cjs'], { cwd: process.cwd(), encoding: 'utf8' })
  .trim().split('\n').pop();

// 2) browser with mkissa.to open
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9341;
const profile = mkdtempSync(join(tmpdir(), 'aa-cdp6-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }

const resp = await fetch(`http://127.0.0.1:${PORT}/json/new?https://mkissa.to/`, { method: 'PUT' });
const tab = await resp.json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => { const m = ++id; pending.set(m, resolve); ws.send(JSON.stringify({ id: m, method, params })); });
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
await new Promise(r => { ws.onopen = r; });
await send('Page.enable');
await sleep(15000); // let the site bootstrap + clear any Turnstile

// 3) fetch the episode query from page context
const expr = `(async () => {
  try {
    const r = await fetch(${JSON.stringify(url)}, { headers: { 'Accept': 'application/json, text/plain, */*' } });
    const t = await r.text();
    return 'HTTP ' + r.status + ' :: ' + t.slice(0, 3000);
  } catch (e) { return 'FETCH-ERR ' + e.message; }
})()`;
const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
const body = res.result && res.result.result && res.result.result.value || JSON.stringify(res);
out('page-fetch: ' + body.slice(0, 260));

// 4) decrypt tobeparsed with OUR key
const m = body.match(/"tobeparsed":"([^"]+)"/);
if (m) {
  const crypto = await import('node:crypto');
  const KEY = Buffer.from('93ae3a7ef8e5e1ccbd3da7fa4b9b475c1f87526429f7e355b2b87aed03f9a245', 'hex');
  const raw = Buffer.from(m[1], 'base64');
  const iv = raw.slice(1, 13), ct = raw.slice(13, raw.length - 16), tag = raw.slice(raw.length - 16);
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    d.setAuthTag(tag);
    const plain = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
    const parsed = JSON.parse(plain);
    const urls = (parsed.episode && parsed.episode.sourceUrls) || [];
    out('DECRYPT OK with OUR build-179 key. sourceUrls: ' + urls.length);
    for (const s of urls.slice(0, 3)) out('  ' + JSON.stringify(s).slice(0, 130));
  } catch (e) {
    out('DECRYPT FAILED: ' + e.message);
  }
} else {
  out('no tobeparsed in response');
}
ws.close(); chrome.kill(); process.exit(0);
