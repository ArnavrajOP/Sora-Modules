const fs = require('fs');
const s = fs.readFileSync('chunks/i2X40NLc.js', 'utf8');

console.log('=== Ei @65482 ===');
console.log(s.slice(65482, 65482 + 500));
console.log('\n=== md @67501 ===');
console.log(s.slice(67501, 67501 + 700));
console.log('\n=== Ki @87172 / Pr @87212 ===');
console.log(s.slice(87100, 87900));
console.log('\n=== As @87587 ===');
console.log(s.slice(87587, 87587 + 400));
