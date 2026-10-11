const fs = require('fs');

const K7_KEY = '93ae3a7ef8e5e1ccbd3da7fa4b9b475c1f87526429f7e355b2b87aed03f9a245';
const K9_KEY = 'ac0747ea455f0d0e0587808c5c1fd3672ae39ac31df8cce789868a24522cc532';

// multi-line patterns use \r?\n; replacement text picks the file's own EOL
const COMMON = [
  [/build_id: '175',/, "build_id: '179',"],
  [/epoch: 2960,/, 'epoch: 2962,'],
  [/const AA_MASK_BLOCKS = \['jfTMXeWz1KY=', 'sSiL9IX1c1k=', 'jjOcW\/T0DYU=', 'vRF6mguezW8='\];/,
   "const AA_MASK_BLOCKS = ['o55/m8U/4FY=', '9lYtQjBCN5s=', 's3mBmnFuzkQ=', 'H8tdZAar+nQ='];"],
  [/const AA_SALT_MUL = 34;/, 'const AA_SALT_MUL = 5;'],
  [/const AA_SALT_ADD = 47;/, 'const AA_SALT_ADD = 39;'],
  [/const AA_FRAG_MUL = 93;/, 'const AA_FRAG_MUL = 251;'],
  [/const AA_FRAG_ADD = 29;/, 'const AA_FRAG_ADD = 21;'],
  [/const AA_BOOT_PREFIX = 'X8S061oCq:';/, "const AA_BOOT_PREFIX = 'KoCGqjW:';"],
];

const MSG_BLOCK = (eol) => [
  [new RegExp(`        const msgNew = \\[FALLBACK_KEYGEN\\.build_id, AA_BOOT_GROUP, AA_BOOT_HOST, String\\(epoch\\), lane\\]\\.join\\('\\|'\\);${eol}        const msgOld = AA_BOOT_GROUP \\+ ':' \\+ lane \\+ ':' \\+ epoch \\+ ':' \\+ AA_BOOT_HOST \\+ ':' \\+ FALLBACK_KEYGEN\\.build_id;`),
   (EOL) => `        const msgNew = [FALLBACK_KEYGEN.build_id, AA_BOOT_GROUP, lane, String(epoch), AA_BOOT_HOST].join('|');${EOL}        const msg175 = [FALLBACK_KEYGEN.build_id, AA_BOOT_GROUP, AA_BOOT_HOST, String(epoch), lane].join('|');${EOL}        const msgOld = AA_BOOT_GROUP + ':' + lane + ':' + epoch + ':' + AA_BOOT_HOST + ':' + FALLBACK_KEYGEN.build_id;`],
  [new RegExp(`        let j = await aaBootstrapOnce\\(url, aaHex\\(aaHmacSha256\\(hmacKey, aaAscii\\(msgNew\\)\\)\\)\\);${eol}        if \\(!j\\) \\{${eol}            j = await aaBootstrapOnce\\(url, aaHex\\(aaHmacSha256\\(hmacKey, aaAscii\\(msgOld\\)\\)\\)\\);${eol}        \\}`),
   (EOL) => `        let j = await aaBootstrapOnce(url, aaHex(aaHmacSha256(hmacKey, aaAscii(msgNew))));${EOL}        if (!j) {${EOL}            j = await aaBootstrapOnce(url, aaHex(aaHmacSha256(hmacKey, aaAscii(msg175))));${EOL}        }${EOL}        if (!j) {${EOL}            j = await aaBootstrapOnce(url, aaHex(aaHmacSha256(hmacKey, aaAscii(msgOld))));${EOL}        }`],
];

const FILES = [
  {
    f: 'allmanga-shirox/allmanga-shirox.js',
    laneKey: [/key: '64642f3d5c51401e26207d3649a6753fb4264069563b547270cb98cb051bd04a',/, "key: '" + K7_KEY + "',"],
    log: [/allmanga module v1\.12\.2 \(build 175 keygen, k7 episode lane, fetchv2 impersonate:chrome \+ toResponseLike \+ 403 plain-fetch retry\)/,
          'allmanga module v1.13.0 (build 179 keygen, k7 episode lane, fetchv2 impersonate:chrome + toResponseLike + 403 plain-fetch retry)'],
  },
  {
    f: 'allmanga-novels-shirox/allmanga-novels-shirox.js',
    laneKey: [/key: 'cd753590624ca574d65e9cdfea4fea60bc97438f2e95f9be61b0595c75c144ca',/, "key: '" + K9_KEY + "',"],
    log: [/\[AllMangaNovels\] module script loaded v1\.4\.2 \(build 175 keygen, k9 chapterPages lane \+ self-bootstrap \+ fetchv2 impersonate:chrome \+ 403 plain-fetch retry, kanzen-env safe\)/,
          '[AllMangaNovels] module script loaded v1.5.0 (build 179 keygen, k9 chapterPages lane + self-bootstrap + fetchv2 impersonate:chrome + 403 plain-fetch retry, kanzen-env safe)'],
  },
  {
    f: 'eclipse/allmanga-novels/allmanga-novels.js',
    laneKey: [/key: 'cd753590624ca574d65e9cdfea4fea60bc97438f2e95f9be61b0595c75c144ca',/, "key: '" + K9_KEY + "',"],
    log: [/\[AllMangaNovels\] module script loaded v1\.4\.0 \(build 175 keygen, k9 chapterPages lane \+ self-bootstrap \+ fetchv2 impersonate:chrome, kanzen-env safe\)/,
          '[AllMangaNovels] module script loaded v1.5.0 (build 179 keygen, k9 chapterPages lane + self-bootstrap + fetchv2 impersonate:chrome, kanzen-env safe)'],
  },
];

for (const spec of FILES) {
  let s = fs.readFileSync(spec.f, 'utf8');
  const crlf = s.includes('\r\n');
  const EOL = crlf ? '\r\n' : '\n';
  const eol = crlf ? '\\r\\n' : '\\n'; // for RegExp constructor matching
  let fails = [];
  for (const [from, to] of COMMON.concat(MSG_BLOCK(eol), [spec.laneKey, spec.log])) {
    if (!from.test(s)) { fails.push(String(from).slice(0, 70)); continue; }
    s = s.replace(from, typeof to === 'function' ? to(EOL) : to);
  }
  if (fails.length) {
    process.stdout.write('FAIL ' + spec.f + ' missing patterns:\n  ' + fails.join('\n  ') + '\n');
    process.exitCode = 1;
  } else {
    fs.writeFileSync(spec.f, s);
    process.stdout.write('OK   ' + spec.f + '\n');
  }
}
