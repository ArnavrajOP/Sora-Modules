/* .tmp-audit/probe-hosts.js — quick reachability probe of upstream hosts
 * for (discontinued) modules, to find revival candidates.
 * Reads local <module>/<module>.json manifests for baseUrl, extracts the
 * host, and curls each unique host (GET, 12s cap) printing status + final URL.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules.json'), 'utf8'));
const entries = index.modules.filter(m => m.discontinued === true || m.needs_review === true);

// Map entry -> local manifest dir: local modules live at <id?> — the manifestUrl
// tells us the dir for local-repo manifests; external ones (other repos) we probe
// by the baseUrl recorded in a local manifest if present, else by the entry's iconUrl? No —
// we only probe hosts we can find in local manifests.
const hostByEntry = new Map();
for (const e of entries) {
  const mUrl = e.manifestUrl || '';
  let dir = null;
  const m = mUrl.match(/xdfkenny-sora-modules\/main\/([^/]+)\/[^/]+\.json$/);
  if (m) dir = m[1];
  if (!dir) continue;
  const manPath = path.join(ROOT, dir, dir + '.json');
  // manifest file name may differ (e.g. hydrahd-shirox.json in hydrahd/)
  let manFile = fs.existsSync(manPath) ? manPath : null;
  if (!manFile && fs.existsSync(path.join(ROOT, dir))) {
    const alt = fs.readdirSync(path.join(ROOT, dir)).find(f => f.endsWith('.json') && f !== dir + '.json');
    if (alt && mUrl.endsWith(alt)) manFile = path.join(ROOT, dir, alt);
  }
  if (!manFile) continue;
  try {
    const man = JSON.parse(fs.readFileSync(manFile, 'utf8'));
    const base = man.baseUrl;
    if (!base) continue;
    const host = new URL(base).host;
    hostByEntry.set(e.id, { host, base, dir });
  } catch (err) { /* skip unreadable */ }
}

const hosts = [...new Set([...hostByEntry.values()].map(v => v.host))];
console.log('probing ' + hosts.length + ' unique hosts:\n');

for (const host of hosts) {
  const url = 'https://' + host + '/';
  let code = 'ERR', eff = '';
  try {
    const out = execFileSync('curl.exe', [
      '-sS', '-o', 'NUL', '-L', '--max-time', '12',
      '-w', '%{http_code} %{url_effective}',
      url
    ], { encoding: 'utf8', timeout: 15000 }).trim();
    code = out.split(' ')[0];
    eff = out.slice(code.length + 1).trim();
  } catch (e) {
    code = e && e.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'FAIL';
  }
  const entriesFor = [...hostByEntry.entries()].filter(([, v]) => v.host === host).map(([id]) => id).join(', ');
  console.log(String(code).padStart(6) + '  ' + host.padEnd(38) + (eff && eff !== url ? ' -> ' + eff : '') + '\n        modules: ' + entriesFor);
}
