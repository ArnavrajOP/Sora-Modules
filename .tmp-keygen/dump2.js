const fs = require('fs');
const s = fs.readFileSync('chunks/i2X40NLc.js', 'utf8');

// rotation IIFE right after Ei/ru region
const rot = s.indexOf('(function(', 65482);
console.log('=== rotation IIFE @', rot, '===');
console.log(s.slice(rot, rot + 260));

// find fT, mT, py definitions
for (const name of ['fT', 'mT', 'py', 'bT', 'MT', 'iT']) {
  const pats = ['function ' + name + '(', 'const ' + name + '='];
  for (const p of pats) {
    const j = s.indexOf(p);
    if (j >= 0) console.log('##', p, '@', j);
  }
}

// where is Df referenced?
let refs = [];
let j = s.indexOf('Df');
while (j >= 0 && refs.length < 20) { refs.push(j); j = s.indexOf('Df', j + 1); }
console.log('Df refs:', refs.length, JSON.stringify(refs));
