const fs = require('fs');
const s = fs.readFileSync('chunks/i2X40NLc.js', 'utf8');

const names = ['Ei', '_m', 'md', 'Pr', 'Pa', 'As', 'Ki', 'Is', 'l0', 'Cn', 'St'];
for (const name of names) {
  const pats = ['function ' + name + '(', 'const ' + name + '=', 'let ' + name + '=', 'var ' + name + '='];
  const found = [];
  for (const p of pats) {
    let j = s.indexOf(p);
    while (j >= 0 && found.length < 4) {
      found.push([p, j]);
      j = s.indexOf(p, j + 1);
    }
  }
  console.log('##', name, JSON.stringify(found));
}
