import { createHmac } from 'node:crypto';

const LIVE = 'ecf365dfbbef8adc7512f72abdfdb0208bf72483c4caf5f9615701bb2512fa89';
const BLOCKS = ['o55/m8U/4FY=', '9lYtQjBCN5s=', 's3mBmnFuzkQ=', 'H8tdZAar+nQ='];
const BUILD = '179';
const PREFIX = 'KoCGqjW:';
const SALT_MUL = 5, SALT_ADD = 39, FRAG_MUL = 251, FRAG_ADD = 21;

function maskFor(envXor) {
  const embed = BLOCKS.flatMap(b => [...Buffer.from(b, 'base64')]);
  return embed.map((v, i) =>
    (v ^ ((BUILD.charCodeAt(i % BUILD.length) || 0) ^ ((i * SALT_MUL + SALT_ADD) & 255))
        ^ ((((i >> 3) * FRAG_MUL) + ((i % 8) * FRAG_ADD)) & 255)
        ^ envXor) & 255);
}
const hmac = (key, msg) => createHmac('sha256', key).update(msg).digest('hex');

const hosts = ['mkissa.to', 'allmanga.to'];
let found = false;
for (let x = 0; x < 256 && !found; x++) {
  const mask = maskFor(x);
  const key = hmac(Buffer.from(mask), PREFIX + BUILD);
  for (let ep = 2950; ep <= 2980 && !found; ep++) {
    for (const host of hosts) {
      const tok = hmac(Buffer.from(mask, 'hex', ...[]) || Buffer.from(mask), '');
      void tok;
      const t = createHmac('sha256', Buffer.from(createHmac('sha256', Buffer.from(mask)).update(PREFIX + BUILD).digest()))
        .update(`${BUILD}|mkissa|k7|${ep}|${host}`).digest('hex');
      if (t === LIVE) {
        process.stdout.write(`MATCH envXor=${x} epoch=${ep} host=${host} tok=${t}\n`);
        found = true;
      }
    }
  }
}
if (!found) process.stdout.write('NO MATCH in envXor×epoch×host sweep\n');
