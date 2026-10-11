// Shims for browser globals the chunk touches at import time
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
  globalThis.self = globalThis;
  globalThis.location = { origin: 'https://mkissa.to', href: 'https://mkissa.to/', protocol: 'https:', host: 'mkissa.to', hostname: 'mkissa.to', pathname: '/', search: '' };
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: UA, language: 'en-US', languages: ['en-US'] }, configurable: true });
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [], addEventListener() {} };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
}

const realOut = (s) => process.stdout.write(s + '\n');
const log = realOut;

const mod = await import('./mod.mjs');

realOut('== import ok ==');
realOut('md (buildId default): ' + JSON.stringify(mod.__md));
realOut('Pr (current buildId): ' + JSON.stringify(mod.__Pr));
realOut('cp (episode lane): ' + JSON.stringify(mod.__cp));
realOut('tT (epoch divisor): ' + mod.__tT);
realOut('rT (day ms): ' + mod.__rT);
realOut('_m (mask blocks): ' + JSON.stringify(mod.__m));
realOut('Df (config): ' + JSON.stringify(mod.__Df));
realOut('ga() hasMask: ' + mod.__ga());
try { realOut('vT() static key: ' + JSON.stringify(mod.__vT())); } catch (e) { realOut('vT err: ' + e.message); }

const now = Date.now();
realOut('by(now) = ' + mod.__by(now));
realOut('yT(now) = ' + mod.__yT(now));

const mask = mod.__py(mod.__md);
realOut('py(buildId) mask len: ' + (mask && mask.length) + ' hex: ' + (mask ? [...mask].map(b => b.toString(16).padStart(2, '0')).join('') : null));

const urlInfo = mod.__iT({ apolloOrigin: 'https://api.mkissa.net', pageOrigin: 'https://mkissa.to', buildId: mod.__md, contentLane: 'k7' });
realOut('iT -> ' + JSON.stringify(urlInfo));

try {
  realOut('bT("mkissa.to") = ' + JSON.stringify(mod.__bT('mkissa.to')));
} catch (e) { realOut('bT err: ' + e.message); }

try {
  const epoch = mod.__yT(now);
  const tok = await mod.__dT({ buildId: mod.__md, epoch, keyGroup: 'mkissa', refererHost: 'mkissa.to', contentLane: 'k7' });
  realOut('dT token (k7, epoch ' + epoch + '): ' + tok);
} catch (e) {
  realOut('dT err: ' + (e && e.stack || e));
}
process.exit(0);
