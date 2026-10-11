const s = require('fs').readFileSync('.tmp-audit/newclient.js', 'utf8');
function show(label, re, before = 10, after = 120) {
  let m;
  const re2 = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = re2.exec(s)) !== null) {
    console.log('=== ' + label + ' @' + m.index + ' ===');
    console.log(s.slice(Math.max(0, m.index - before), m.index + after).replace(/\n/g, ' '));
    console.log('');
    if (m.index > s.length) break;
  }
}
show('H()', /\bfunction H\(/, 20, 260);
show('F()', /\bfunction F\(/, 20, 260);
show('H=', /\bH *= *function/, 10, 200);
show('AES', /AES|crypto|subtle/i, 60, 140);
