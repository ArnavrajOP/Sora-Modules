import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const profile = mkdtempSync(join(tmpdir(), 'aa-cdp2-'));
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
const out = (s) => process.stdout.write(s + '\n');
const hits = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Network.requestWillBeSent') {
    const r = msg.params.request;
    if (r.url.includes('api.mkissa.net') || r.url.includes('allanime') || r.url.includes('/api/')) {
      hits.push({ url: r.url, method: r.method, postData: r.postData });
    }
  }
};
await new Promise(r => { ws.onopen = r; });
await send('Network.enable'); await send('Page.enable');

// wait for homepage to settle, then navigate to the search route
await sleep(6000);
await send('Page.navigate', { url: 'https://mkissa.to/?search=frieren' });
await sleep(10000);

out('captured ' + hits.length + ' API requests:');
for (const h of hits.slice(0, 25)) {
  out(h.method + ' ' + h.url.slice(0, 150));
  if (h.postData) out('   BODY: ' + h.postData.replace(/\s+/g, ' ').slice(0, 300));
}
ws.close(); chrome.kill(); process.exit(0);
