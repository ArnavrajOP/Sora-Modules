// Verify the megaplay getSources AES-CBC protocol with Node crypto.
// key = I(a,32) where a='i?LMTAx0Q6,:}50U'  -> 16 bytes zero-padded to 32 (AES-256)
// iv  = I(c,16) where c='W0;27ToaUpl_P%\'c' -> 16 bytes exact
const crypto = require('crypto');
const key = Buffer.from('i?LMTAx0Q6,:}50U'.padEnd(32, '\0')); // 32 bytes
const iv = Buffer.from("W0;27ToaUpl_P%'c");                    // 16 bytes
function b64url(buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urldec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Buffer.from(s, 'base64'); }

const id = process.argv[2] || '36396';
(async () => {
  // request: encrypt {action:"status"}
  const plain = JSON.stringify({ action: 'status' });
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encReq = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  const p = b64url(encReq);
  const resp = await fetch('https://megaplay.buzz/stream/getSourcesNew?id=' + id, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126',
      'Referer': 'https://megaplay.buzz/'
    },
    body: JSON.stringify({ p })
  });
  const rt = await resp.text();
  let rj; try { rj = JSON.parse(rt); } catch { rj = null; }
  if (!rj) { console.log('RESPONSE NOT JSON (status ' + resp.status + '):', rt.slice(0, 300)); return; }
  console.log('response keys:', Object.keys(rj));
  if (rj.p) {
    const d = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let dec;
    try { dec = Buffer.concat([d.update(b64urldec(rj.p)), d.final()]).toString('utf8'); }
    catch (e) { console.log('DECRYPT FAIL:', e.message); console.log('raw p head:', String(rj.p).slice(0, 60)); return; }
    const src = JSON.parse(dec);
    console.log('DECRYPTED source:', JSON.stringify(src).slice(0, 500));
  } else {
    console.log('response (no p):', JSON.stringify(rj).slice(0, 400));
  }
})().catch(e => console.log('ERR', e.message));
