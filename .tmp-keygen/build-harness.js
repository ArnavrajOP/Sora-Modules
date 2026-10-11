const fs = require('fs');

const src = fs.readFileSync('chunks/i2X40NLc.js', 'utf8');

// 1) collect imported names + their source modules
const imports = [...src.matchAll(/import\s*{([^}]*)}\s*from\s*"([^"]+)"/g)];
const byModule = new Map();
for (const m of imports) {
  const names = m[1].split(',').map(x => x.trim()).filter(Boolean).map(clause => {
    const mm = clause.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    return mm ? mm[1] : clause; // stub must export the MODULE's name (before "as")
  });
  if (!byModule.has(m[2])) byModule.set(m[2], []);
  byModule.get(m[2]).push(...names);
}
console.log('modules:', [...byModule.keys()].map(k => k + ' -> ' + byModule.get(k).length + ' names'));

// 2) write stub modules
let i = 0;
const stubFiles = [];
for (const [mod, names] of byModule) {
  const file = 'stub' + i + '.mjs';
  const body = names.map(n => `export const ${n} = _P;`).join('\n') + '\nexport default _P;\n';
  const stub =
    'const _sh={get(t,p){if(p===Symbol.toPrimitive)return()=>"0";if(p==="then")return undefined;return _P;},apply(){return _P;},construct(){return _P;},has(){return true;}};\n' +
    'const _P=new Proxy(function(){},_sh);\n' + body;
  fs.writeFileSync(file, stub);
  stubFiles.push(file);
  i++;
}

// 3) copy chunk to mod.mjs with appended exports of internals
const exportLine = `
export { cT as __cT, uT as __uT, dT as __dT, s0 as __s0, lT as __lT, bT as __bT, iT as __iT,
  ga as __ga, py as __py, md as __md, _m as __m, Df as __Df, Pr as __Pr, tT as __tT, rT as __rT,
  fT as __fT, mT as __mT, by as __by, yT as __yT, MT as __MT, vT as __vT, cp as __cp, Is as __Is, o0 as __o0 };
`;
fs.writeFileSync('mod.mjs', src + exportLine);

// 4) rewrite import specifiers to stub files
let mod = fs.readFileSync('mod.mjs', 'utf8');
mod = mod.replace(/import\s*{([^}]*)}\s*from\s*"([^"]+)"/g, (m0, names, spec) => {
  const idx = [...byModule.keys()].indexOf(spec);
  return `import {${names}} from "./${stubFiles[idx]}"`;
});
fs.writeFileSync('mod.mjs', mod);
console.log('wrote mod.mjs with stub imports + export of internals');
