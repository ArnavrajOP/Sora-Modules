import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;
const profile = mkdtempSync(join(tmpdir(), 'aa-cdp3-'));
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
    if (r.url.includes('api.mkissa.net/api')) {
      hits.push({ url: decodeURIComponent(r.url), method: r.method, postData: r.postData });
    }
  }
};
await new Promise(r => { ws.onopen = r; });
await send('Network.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'https://mkissa.to/search-anime?keyword=frieren' });
await sleep(10000);

// find the search input and type into it via native input events
const typed = await send('Runtime.evaluate', {
  expression: `(async () => {
    const inp = document.querySelector('input[type=search], input[placeholder*=itle]');
    if (!inp) return 'NO INPUT';
    const setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setV.call(inp, 'frieren');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 4000));
    return 'OK: ' + inp.value;
  })()`,
  awaitPromise: true
});
out('type result: ' + JSON.stringify(typed.result));
await sleep(6000);

out('captured ' + hits.length + ' /api requests:');
const seen = new Set();
for (const h of hits) {
  const key = h.url.slice(0, 250);
  if (seen.has(key)) continue;
  seen.add(key);
  out(h.method + ' ' + h.url.slice(0, 400));
  if (h.postData) out('   BODY: ' + h.postData.replace(/\s+/g, ' ').slice(0, 400));
}
ws.close(); chrome.kill(); process.exit(0);
