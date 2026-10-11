// Fetch the episode response via a real browser (Turnstile-capable),
// then decrypt its tobeparsed with OUR module key — proving the keygen
// against live ciphertext.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9340;
const profile = mkdtempSync(join(tmpdir(), 'aa-cdp5-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }

const resp = await fetch(`http://127.0.0.1:${PORT}/json/new?https://mkissa.to/anime/y6CkLkj4e9Trc9zDu/p-1`, { method: 'PUT' });
const tab = await resp.json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => { const m = ++id; pending.set(m, resolve); ws.send(JSON.stringify({ id: m, method, params })); });
const out = (s) => process.stdout.write(s + '\n');
const bodies = [];

ws.onmessage = async (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.url.includes('/api') && !r.url.includes('authconfigs')) {
      await sleep(300);
      const body = await send('Network.getResponseBody', { requestId: msg.params.requestId });
      if (body && body.result && body.result.body) {
        bodies.push({ url: r.url.slice(0, 140), status: r.status, body: body.result.body.slice(0, 2000000) });
      }
    }
  }
};
await new Promise(r => { ws.onopen = r; });
await send('Network.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'https://mkissa.to/anime/y6CkLkj4e9Trc9zDu/p-1' });
await sleep(45000);

out('captured ' + bodies.length + ' candidate responses');
let saved = 0;
for (const b of bodies) {
  if (b.body.includes('tobeparsed')) {
    writeFileSync('live-episode-' + saved + '.json', b.body);
    out('saved live-episode-' + saved + '.json  (' + b.body.length + ' bytes, status ' + b.status + ')');
    saved++;
  } else {
    out('  no-tobeparsed response: ' + b.body.replace(/\s+/g, ' ').slice(0, 120));
  }
}
ws.close(); chrome.kill(); process.exit(saved > 0 ? 0 : 2);
