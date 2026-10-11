const BLOCKS = ['o55/m8U/4FY=', '9lYtQjBCN5s=', 's3mBmnFuzkQ=', 'H8tdZAar+nQ='];
const BUILD = '179';
const SALT_MUL = 5, SALT_ADD = 39, FRAG_MUL = 251, FRAG_ADD = 21;
const PART_B = 'Jj5n3WXKC3TGHsHlZuJdChqwQ3qgZ/s78uasJsSJu0A=';

const embed = BLOCKS.flatMap(b => [...Buffer.from(b, 'base64')]);
const mask = Buffer.from(embed.map((v, i) =>
  (v ^ ((BUILD.charCodeAt(i % BUILD.length) || 0) ^ ((i * SALT_MUL + SALT_ADD) & 255))
      ^ ((((i >> 3) * FRAG_MUL) + ((i % 8) * FRAG_ADD)) & 255)) & 255));

const pb = Buffer.from(PART_B, 'base64');
const key = Buffer.from(pb.map((v, i) => v ^ mask[i]));
process.stdout.write('mask: ' + mask.toString('hex') + '\n');
process.stdout.write('partB len: ' + pb.length + '\n');
process.stdout.write('KEY: ' + key.toString('hex') + '\n');
