const fs = require('fs');
const s = fs.readFileSync('chunks/i2X40NLc.js', 'utf8');

console.log('=== fT/mT @86019 ===');
console.log(s.slice(86019, 86200));
console.log('\n=== py (mask builder) @75763 ===');
console.log(s.slice(75763, 77400));
