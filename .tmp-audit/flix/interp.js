// Minimal WASM interpreter for the flixcloud mixing payload (_r function).
// Supports the opcode subset used by these payloads.
'use strict';

function parseWasm(bytes) {
    let i = 8;
    let codeOff = 0, codeLen = 0;
    let dataSegs = [];
    while (i < bytes.length) {
        const id = bytes[i++];
        let len = 0, sh = 0, cont;
        do { const by = bytes[i++]; len |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont);
        if (id === 10) { codeOff = i; }
        else if (id === 11) {
            // data section: count, then segments: flags(0) + offset expr (41 <leb> 0b) + size + bytes
            const end = i + len;
            let p = i;
            const cnt = bytes[p++];
            for (let s = 0; s < cnt; s++) {
                const flags = bytes[p++]; // 0 = active
                // offset expr: expect 0x41 <leb i32> 0x0b
                if (bytes[p] === 0x41) {
                    p++;
                    let v = 0, sh2 = 0, c2;
                    do { const by = bytes[p++]; v |= (by & 0x7f) << sh2; sh2 += 7; c2 = by & 0x80; } while (c2);
                    p++; // 0x0b end
                    const size = bytes[p++];
                    dataSegs.push({ offset: v, bytes: bytes.subarray(p, p + size) });
                    p += size;
                } else throw new Error('unexpected data offset expr ' + bytes[p]);
            }
        }
        i += len;
    }
    let p = codeOff;
    const n = bytes[p++];
    const funcs = [];
    for (let f = 0; f < n; f++) {
        let s = 0, sh = 0, cont;
        do { const by = bytes[p++]; s |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont);
        funcs.push([p, p + s]);
        p += s;
    }
    // decode LEB helper
    function leb(buf, pos) {
        let v = 0, sh = 0, by, cont;
        do { by = buf[pos++]; v |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont);
        if (sh < 32 && (v & (1 << (sh - 1)))) v |= (-1 << sh); // sign extend
        return [v, pos];
    }
    // func0 = _s (sets global0), func1 = _r, func2 = _c
    const out = [];
    for (const [bs, be] of funcs) {
        let q = bs;
        const nLocGroups = bytes[q++];
        for (let g = 0; g < nLocGroups; g++) { q += 2; } // count byte + type byte
        // scan ops, match control flow
        const body = bytes.subarray(q, be);
        // first pass: record structure positions
        const matches = {}; // pc -> {end, else}
        const stk = [];
        let pc = 0;
        while (pc < body.length) {
            const op = body[pc];
            if (op === 0x02 || op === 0x03 || op === 0x04) {
                stk.push(pc);
            } else if (op === 0x05) { // else
                if (stk.length) matches[stk[stk.length - 1]] = matches[stk[stk.length - 1]] || {};
                if (stk.length) matches[stk[stk.length - 1]].else = pc;
            } else if (op === 0x0b) { // end
                const st = stk.pop();
                if (st !== undefined) {
                    matches[st] = matches[st] || {};
                    matches[st].end = pc;
                }
            }
            // skip inline immediates
            if (op === 0x41 || op === 0x20 || op === 0x21 || op === 0x22 || op === 0x24 ||
                op === 0x0c || op === 0x0d || op === 0x10) {
                let v; [v, pc] = leb(body, pc + 1); pc--; // pc will be incremented below
            } else if (op === 0x23) {
                let v; [v, pc] = leb(body, pc + 1); pc--;
            } else if (op === 0x2d || op === 0x3a) {
                pc += 2; // align + offset (both 0x00 in these payloads, but read generally: two LEBs)
            }
            pc++;
        }
        out.push({ body, matches });
    }
    out.dataSegs = dataSegs;
    return out;
}

// Execute _r-like function: memory is a Uint8Array, globals = [seed].
// args = [p1, p2, p3, out, len]
function runFunc(func, mem, globals, args) {
    const { body, matches } = func;
    const locals = args.slice();
    const stack = [];
    const labels = []; // {kind, start, end}
    let pc = 0;

    function pushOp(op) {
        switch (op) {
            case 0x6a: { const b = stack.pop(), a = stack.pop(); stack.push((a + b) | 0); break; }
            case 0x6b: { const b = stack.pop(), a = stack.pop(); stack.push((a - b) | 0); break; }
            case 0x6c: { const b = stack.pop(), a = stack.pop(); stack.push(Math.imul(a, b)); break; }
            case 0x71: { const b = stack.pop(), a = stack.pop(); stack.push(a & b); break; }
            case 0x72: { const b = stack.pop(), a = stack.pop(); stack.push(a | b); break; }
            case 0x73: { const b = stack.pop(), a = stack.pop(); stack.push(a ^ b); break; }
            case 0x74: { const b = stack.pop(), a = stack.pop(); stack.push(a << b); break; }
            case 0x76: { const b = stack.pop(), a = stack.pop(); stack.push(a >>> b); break; }
            case 0x4f: { const b = stack.pop(), a = stack.pop(); stack.push((a >>> 0) >= (b >>> 0) ? 1 : 0); break; }
            case 0x48: { const b = stack.pop(), a = stack.pop(); stack.push(a < b ? 1 : 0); break; }
            case 0x49: { const b = stack.pop(), a = stack.pop(); stack.push((a >>> 0) < (b >>> 0) ? 1 : 0); break; }
            case 0x45: { const a = stack.pop(); stack.push(a === 0 ? 1 : 0); break; }
            default: throw new Error('unhandled binop ' + op);
        }
    }

    while (pc < body.length) {
        const op = body[pc++];
        switch (op) {
            case 0x00: throw new Error('unreachable');
            case 0x02: labels.push({ kind: 'block', end: matches[pc - 1].end }); pc++; break; // skip blocktype
            case 0x03: labels.push({ kind: 'loop', start: pc + 1, end: matches[pc - 1].end }); pc++; break; // skip blocktype
            case 0x04: { // if: pop cond; if false jump to else/end
                const cond = stack.pop();
                const m = matches[pc - 1];
                if (!cond) pc = (m.else !== undefined ? m.else + 1 : m.end + 1);
                else labels.push({ kind: 'if', end: m.end });
                break;
            }
            case 0x05: { // else: reached end of then-branch → jump after end
                pc = labels[labels.length - 1].end + 1;
                labels.pop();
                break;
            }
            case 0x0b: labels.pop(); break; // end
            case 0x0c: { // br
                let v = 0, sh = 0, by, cont, q = pc;
                do { by = body[q++]; v |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont);
                pc = q;
                const lbl = labels[labels.length - 1 - v];
                labels.length = lbl.kind === 'loop' ? labels.length - v : labels.length - 1 - v;
                pc = lbl.kind === 'loop' ? lbl.start : lbl.end + 1;
                break;
            }
            case 0x0d: { // br_if
                let v = 0, sh = 0, by, cont, q = pc;
                do { by = body[q++]; v |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont);
                const cond = stack.pop();
                if (cond) {
                    const lbl = labels[labels.length - 1 - v];
                    labels.length = lbl.kind === 'loop' ? labels.length - v : labels.length - 1 - v;
                    pc = lbl.kind === 'loop' ? lbl.start : lbl.end + 1;
                } else pc = q;
                break;
            }
            case 0x20: { let v; [v, pc] = (function () { let val = 0, sh = 0, by, cont, q = pc; do { by = body[q++]; val |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont); return [val, q]; })(); stack.push(locals[v]); break; }
            case 0x21: { let v; [v, pc] = (function () { let val = 0, sh = 0, by, cont, q = pc; do { by = body[q++]; val |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont); return [val, q]; })(); locals[v] = stack.pop(); break; }
            case 0x22: { let v; [v, pc] = (function () { let val = 0, sh = 0, by, cont, q = pc; do { by = body[q++]; val |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont); return [val, q]; })(); locals[v] = stack[stack.length - 1]; break; }
            case 0x23: { let v; [v, pc] = (function () { let val = 0, sh = 0, by, cont, q = pc; do { by = body[q++]; val |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont); return [val, q]; })(); stack.push(globals[v]); break; }
            case 0x24: { let v; [v, pc] = (function () { let val = 0, sh = 0, by, cont, q = pc; do { by = body[q++]; val |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont); return [val, q]; })(); globals[v] = stack.pop(); break; }
            case 0x41: { let v; [v, pc] = (function () { let val = 0, sh = 0, by, cont, q = pc; do { by = body[q++]; val |= (by & 0x7f) << sh; sh += 7; cont = by & 0x80; } while (cont); return [val, q]; })(); stack.push(v); break; }
            case 0x2d: { const a = stack.pop(); stack.push(mem[a]); pc += 2; break; } // load8_u (align+offset skipped)
            case 0x3a: { const val = stack.pop(), a = stack.pop(); mem[a] = val & 0xff; pc += 2; break; } // store8
            default: pushOp(op);
        }
    }
    return stack.length ? stack[stack.length - 1] : 0;
}

function flixMix(wasmBytes, frag1, key2, v, seed) {
    const funcs = parseWasm(wasmBytes);
    const T = frag1.length;
    const mem = new Uint8Array(Math.max(8192, 4 * T + 4096));
    for (const seg of (funcs.dataSegs || [])) mem.set(seg.bytes, seg.offset);
    const _ = 1000, E = _ + T, V = E + T, B = V + T;
    mem.set(frag1, _); mem.set(key2, E); mem.set(v, V);
    const globals = [seed | 0];
    // func0 (_s): just sets global — run it for fidelity
    runFunc(funcs[0], mem, globals, [seed | 0]);
    runFunc(funcs[1], mem, globals, [_, E, V, B, T]);
    return mem.subarray(B, B + T);
}

// Replicates the player's window.__pk: run _c() over data-segment-initialized
// memory and read the 32 bytes at the returned offset.
function flixPk(wasmBytes) {
    const funcs = parseWasm(wasmBytes);
    const mem = new Uint8Array(8192);
    for (const seg of (funcs.dataSegs || [])) mem.set(seg.bytes, seg.offset);
    const globals = [0];
    const ret = runFunc(funcs[2], mem, globals, []);
    return mem.subarray(ret, ret + 32);
}

module.exports = { parseWasm, runFunc, flixMix, flixPk };
