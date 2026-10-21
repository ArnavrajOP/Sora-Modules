/* .tmp-audit/ak-decrypt3.cjs — clean standalone check: does 123anime's fixed
 * megaplay key/IV decrypt anikoto's megaplay.buzz `enc` blob? */
'use strict';
const fs = require('fs');

// AES-256-CBC decryptor (same algorithm as 123anime's _A256 block, minimal).
function cbcDecryptBytes(cipher, key, iv) {
  const SBOX = [/* standard AES S-box, generated inline below */];
  // Build S-box via GF(2^8) inverse
  const inv = (x) => {
    if (x === 0) return 0;
    let z = x, p = 1;
    for (let i = 0; i < 8; i++) { z = mul(z, z); p = mul(p, x); }
    return mul(z, p);
  };
  const mul = (a, b) => {
    let r = 0, hi = a;
    for (let i = 0; i < 8; i++) {
      r = (r << 1) ^ ((r & 0x80) ? 0x1b : 0);
      if (b & (1 << i)) r ^= hi;
      hi = (hi << 1) ^ ((hi & 0x80) ? 0x1b : 0);
    }
    return r & 0xff;
  };
  const sbox = new Array(256);
  for (let i = 0; i < 256; i++) sbox[i] = i === 0 ? 0 : inv(i) ^ ((i << 1) ^ ((i << 2) ^ ((i << 3) ^ (i << 4))) & 0xff ? 0 : 0);
  // (sbox computation is approximate; we instead use a known-correct S-box table below)
  const S = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0x5f,0xa5,0x6c,0x50,0x3d,
    0x3e,0x66,0x48,0x06,0x2d,0x04,0xc1,0x10,0x4b,0x5a,0x32,0x84,0xd6,0x4c,0x34,0x1a,
    0x4e,0x35,0x83,0xe8,0xa6,0xba,0xec,0x96,0xb8,0xf1,0x79,0xa0,0x8f,0x7a,0x1e,0x1f,
    0x72,0x4c,0x53,0x89,0x07,0xfe,0xe4,0x8e,0x1d,0xc2,0x80,0x28,0xa7,0x8c,0x27,0x63,
    0xf7,0x66,0x24,0x5a,0x70,0x68,0x18,0xef,0x76,0x11,0x73,0x0d,0x8c,0x0e,0x38,0xb8,
    0x4e,0xd0,0x85,0x5a,0x46,0x54,0xe2,0x18,0x94,0xb3,0x8f,0xa1,0x30,0x26,0xc6,0xd1,
    0xa2,0x8d,0x3d,0x76,0x2a,0x6e,0x89,0x44,0x59,0xa5,0xd4,0xc1,0x3e,0x96,0x33,0xd0,
    0x26,0xc0,0x4e,0x60,0x85,0x24,0x06,0x49,0xd6,0x59,0x0f,0x7a,0x2d,0xf9,0x4d,0xc0,
  ];
  // This approximation table is not reliable. Instead, load a trusted S-box.
  throw new Error('placeholder');
}

// Simpler and reliable: use node:crypto for AES-256-CBC.
const crypto = require('crypto');

function b64ToBytesLenient(s) {
  const std = String(s).replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
  return Buffer.from(std, 'base64');
}

const KEY16 = 'i?LMTAx0Q6,:}50U';
const IV16 = "W0;27ToaUpl_P%'c";

const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cipher = b64ToBytesLenient(j.enc);
const key = Buffer.alloc(32, 0);
for (let i = 0; i < KEY16.length; i++) key[i] = KEY16.charCodeAt(i) & 0xff;
const iv = Buffer.alloc(16);
for (let i = 0; i < IV16.length; i++) iv[i] = IV16.charCodeAt(i) & 0xff;

try {
  const dec = crypto.createDecipheriv('aes-256-cbc', key, iv);
  dec.setAutoPadding(true);
  const plain = Buffer.concat([dec.update(cipher), dec.final()]).toString('utf8');
  console.log('DECRYPT OK →', plain.slice(0, 400));
  const parsed = JSON.parse(plain);
  console.log('has sources.file:', !!(parsed && parsed.sources && parsed.sources.file));
} catch (e) {
  console.log('DECRYPT FAIL:', e.message, '(cipher bytes:', cipher.length, ')');
}
