// Capture the live x-aa-boot header mkissa.to sends to the bootstrap endpoint,
// by driving headless Chrome over CDP (Node 22 native WebSocket).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'aa-cdp-'));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1280,900',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(250);
  }
  throw new Error('devtools never came up');
}

await waitForDevtools();

// create a new tab pointed at mkissa.to
const resp = await fetch(`http://127.0.0.1:${PORT}/json/new?https://mkissa.to/`, { method: 'PUT' });
const tab = await resp.json();
if (!tab.webSocketDebuggerUrl) throw new Error('no ws url: ' + JSON.stringify(tab));

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => {
  const mid = ++id;
  pending.set(mid, resolve);
  ws.send(JSON.stringify({ id: mid, method, params }));
});

const hits = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Network.requestWillBeSent') {
    const url = msg.params.request.url;
    if (url.includes('client-crypto') || url.includes('bootstrap')) {
      hits.push({ url, headers: msg.params.request.headers });
    }
  }
  if (msg.method === 'Network.requestWillBeSentExtraInfo') {
    const h = msg.params.headers || {};
    const boot = h['x-aa-boot'] || h['X-AA-Boot'] || h['x-AA-boot'];
    if (boot) hits.push({ stage: 'extraInfo', connect: msg.params.associatedCookies?.length, headers: h });
  }
};

await new Promise(r => { ws.onopen = r; });
await send('Network.enable');
await send('Page.enable');
await send('Page.navigate', { url: 'https://mkissa.to/' });

// wait up to 30s for a bootstrap hit
const t0 = Date.now();
while (Date.now() - t0 < 30000 && hits.length === 0) await sleep(500);

const out = (s) => process.stdout.write(s + '\n');
if (hits.length === 0) {
  out('NO bootstrap request captured in 30s');
} else {
  for (const h of hits) out(JSON.stringify(h));
}
ws.close();
chrome.kill();
process.exit(0);
