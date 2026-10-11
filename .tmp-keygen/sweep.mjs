const realOut = (s) => process.stdout.write(s + '\n');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
  globalThis.self = globalThis;
  globalThis.location = { origin: 'https://mkissa.to', href: 'https://mkissa.to/', protocol: 'https:', host: 'mkissa.to', hostname: 'mkissa.to', pathname: '/', search: '' };
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: UA, language: 'en-US' }, configurable: true });
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [], addEventListener() {} };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
}
const mod = await import('./mod.mjs');

const hosts = ['mkissa.to', 'allmanga.to', 'www.mkissa.to', 'api.mkissa.net'];
const epochs = [2960, 2961, 2962, 2963, 2964];

for (const host of hosts) {
  let group;
  try { group = mod.__bT(host); } catch { group = 'mkissa'; }
  for (const ep of epochs) {
    const tok = await mod.__dT({ buildId: '179', epoch: ep, keyGroup: group, refererHost: host, contentLane: 'k7' });
    const url = 'https://api.mkissa.net/client-crypto/v1/bootstrap?buildId=179&k=k7';
    const resp = await fetch(url, {
      headers: {
        'x-build-id': '179',
        'x-aa-boot': tok,
        'Origin': 'https://' + host.replace(/^www\./, ''),
        'Referer': 'https://' + host.replace(/^www\./, '') + '/',
        'User-Agent': UA
      }
    });
    const body = await resp.text();
    realOut('host=' + host + ' group=' + group + ' epoch=' + ep + ' -> HTTP ' + resp.status + ' ' + body.slice(0, 120));
    if (resp.ok) process.exit(0);
  }
}
process.exit(0);
