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

// exact message string uT builds
const msg = mod.__uT({ buildId: '179', group: 'mkissa', host: 'mkissa.to', epoch: 2962, lane: 'k7' });
realOut('uT message: ' + JSON.stringify(msg));

// variants of host/lane/epoch
for (const host of ['mkissa', 'https://mkissa.to', 'mkissa.to/']) {
  realOut('uT host=' + JSON.stringify(host) + ' -> ' + JSON.stringify(mod.__uT({ buildId: '179', group: 'mkissa', host, epoch: 2962, lane: 'k7' })));
}

// cT prefix
realOut('cT("179") = ' + JSON.stringify(mod.__cT('179')));
realOut('cT(md) = ' + JSON.stringify(mod.__cT(mod.__md)));

// s0 is the HMAC: check s0(mask, key-material) signatures
const mask = [...mod.__py(mod.__md)];
try {
  const h = await mod.__s0(mask, mod.__cT('179'));
  realOut('s0(mask, cT) len: ' + (h && h.length));
} catch (e) { realOut('s0 err: ' + e.message); }

// what does yT really compute? check boundaries
const now = Date.now();
realOut('now=' + now + ' by=' + mod.__by(now) + ' yT=' + mod.__yT(now) + ' yT(now-3d)=' + mod.__yT(now - 3 * 86400000) + ' yT(now-8d)=' + mod.__yT(now - 8 * 86400000));

// tokens for variant epochs via dT (the chunk's own pipeline)
for (const ep of [2962, 2961]) {
  const tok = await mod.__dT({ buildId: '179', epoch: ep, keyGroup: 'mkissa', refererHost: 'mkissa.to', contentLane: 'k7' });
  realOut('dT epoch=' + ep + ': ' + tok);
}
process.exit(0);
