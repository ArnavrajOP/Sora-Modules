import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const profile = mkdtempSync(join(tmpdir(), 'aa-cdp4-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }

const resp = await fetch(`http://127.0.0.1:${PORT}/json/new?https://mkissa.to/watch/y6CkLkj4e9Trc9zDu`, { method: 'PUT' }).catch(async () => {
  return fetch(`http://127.0.0.1:${PORT}/json/new?https://mkissa.to/`, { method: 'PUT' });
});
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
    if (r.url.includes('/api') && (r.postData || r.url.includes('variables=') || r.url.includes('episode'))) {
      hits.push({ url: r.url.slice(0, 300), method: r.method, postData: (r.postData || '').slice(0, 300) });
    }
  }
  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.url.includes('/api')) hits.push({ response: r.url.slice(0, 160), status: r.status });
  }
};
await new Promise(r => { ws.onopen = r; });
await send('Network.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'https://mkissa.to/anime/y6CkLkj4e9Trc9zDu' });
await sleep(15000);

out('captured:');
for (const h of hits.slice(0, 20)) out(JSON.stringify(h).slice(0, 350));
ws.close(); chrome.kill(); process.exit(0);
