const fs = require('fs');
const s = fs.readFileSync('chunks/i2X40NLc.js', 'utf8');

// find end of ru() array + its rotation IIFE: search for 'return e' after ru def
const ruStart = s.indexOf('function ru()');
console.log('ru @', ruStart);
// The array ends with "];return ru=function(){return e},ru()}" — find it
const retIdx = s.indexOf('];return', ruStart);
console.log('array ends @', retIdx);
console.log('--- after array (rotation) ---');
console.log(s.slice(retIdx, retIdx + 400));

console.log('\n=== mask construction around Df refs 69061 ===');
console.log(s.slice(68500, 70400));
