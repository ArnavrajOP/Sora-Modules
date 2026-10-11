// Reproduce aaBuildMask (the module's build-175 formula) with build-179 constants
// and compare against the chunk's py() output.
const BLOCKS = ['o55/m8U/4FY=', '9lYtQjBCN5s=', 's3mBmnFuzkQ=', 'H8tdZAar+nQ='];
const BUILD = '179';
const SALT_MUL = 5, SALT_ADD = 39, FRAG_MUL = 251, FRAG_ADD = 21, ENV_XOR = 3;

function b64bytes(b64) { return [...Buffer.from(b64, 'base64')]; }

function buildMask(withEnvXor) {
  const embed = BLOCKS.flatMap(b64bytes);
  const out = [];
  for (let i = 0; i < embed.length; i++) {
    const salt = (BUILD.charCodeAt(i % BUILD.length) || 0) ^ ((i * SALT_MUL + SALT_ADD) & 255);
    const linear = (((i >> 3) * FRAG_MUL) + ((i % 8) * FRAG_ADD)) & 255;
    let m = embed[i] ^ salt ^ linear;
    if (withEnvXor) m ^= ENV_XOR;
    out.push(m & 255);
  }
  return out;
}
const hex = a => a.map(b => b.toString(16).padStart(2, '0')).join('');
console.log('py() from chunk : b6935ea09e2ce9bb7820651c2e7a19550634121d8a931b6d435dd5c8c4731a06');
console.log('formula no envXor:', hex(buildMask(false)));
console.log('formula w/ envXor :', hex(buildMask(true)));
