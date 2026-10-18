// 무작위 원천: 순수 JS SHA-256, 시드·지문, SHA-256 카운터 난수 생성기.
// crypto.subtle은 file://과 http에서 쓸 수 없고 비동기라서 쓰지 않는다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const W = new Uint32Array(64);

  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }

  // bytes(Uint8Array) → 32바이트 Uint8Array
  function sha256(bytes) {
    const len = bytes.length;
    const total = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor(len / 0x20000000));
    dv.setUint32(total - 4, (len * 8) >>> 0);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = W[i - 15], b = W[i - 2];
        const s0 = ror(a, 7) ^ ror(a, 18) ^ (a >>> 3);
        const s1 = ror(b, 17) ^ ror(b, 19) ^ (b >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i++) {
        const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
    return out;
  }

  // TextEncoder가 없는 환경(Node vm)에서도 쓰도록 UTF-8 인코딩을 직접 한다.
  function utf8(str) {
    const out = [];
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) {
        const d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  function concat(...parts) {
    const total = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }

  function toHex(bytes) {
    let s = '';
    for (const b of bytes) s += b.toString(16).padStart(2, '0');
    return s;
  }

  function fromHex(hex) {
    const clean = String(hex).replace(/[^0-9a-f]/gi, '');
    const out = new Uint8Array(clean.length >> 1);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  }

  // 시드 만들기: crypto.getRandomValues는 이 함수 한 곳에서만 쓴다.
  function makeSeed() {
    const seed = new Uint8Array(16);
    root.crypto.getRandomValues(seed);
    return seed;
  }

  // 지문 = SHA-256(시드) 앞 8자리 16진수, "A3F9-07C2" 형태
  function fingerprint(seed) {
    const h = toHex(sha256(seed)).slice(0, 8).toUpperCase();
    return h.slice(0, 4) + '-' + h.slice(4);
  }

  // 실제로 쓰는 키: 학생 숫자가 있으면 SHA-256(S ‖ "|" ‖ u), 없으면 SHA-256(S)
  function deriveKey(seed, u) {
    if (u === null || u === undefined || u === '') return sha256(seed);
    return sha256(concat(seed, utf8('|'), utf8(String(u))));
  }

  // 용도별 흐름: K_name = SHA-256(K ‖ "|" ‖ name), 블록 i = SHA-256(K_name ‖ i(4바이트 빅엔디언))
  function createStream(key, name) {
    const streamKey = sha256(concat(key, utf8('|'), utf8(name)));
    const input = new Uint8Array(streamKey.length + 4);
    input.set(streamKey);
    const tail = new DataView(input.buffer, streamKey.length, 4);
    let counter = 0;
    let block = null;
    let pos = 8;
    let used = 0;

    function nextU32() {
      if (pos === 8) {
        tail.setUint32(0, counter >>> 0);
        counter++;
        block = new DataView(sha256(input).buffer);
        pos = 0;
      }
      used++;
      return block.getUint32(4 * pos++);
    }

    // 0 ≤ x < n, 기각 샘플링으로 나머지 연산의 치우침을 없앤다.
    function randInt(n) {
      if (!(n >= 1) || n > 0x100000000 || n !== Math.floor(n)) throw new RangeError('randInt: n=' + n);
      const limit = Math.floor(0x100000000 / n) * n;
      for (;;) {
        const x = nextU32();
        if (x < limit) return x % n;
      }
    }

    // Fisher–Yates: 뒤에서부터 j = randInt(i+1)
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }

    function float() { return nextU32() / 0x100000000; }

    return { name, nextU32, randInt, shuffle, float, get used() { return used; } };
  }

  // 한 번의 추첨에 쓰는 흐름 묶음
  function createSession(seed, u) {
    const key = deriveKey(seed, u);
    return {
      seedHex: toHex(seed),
      fingerprint: fingerprint(seed),
      u: (u === null || u === undefined || u === '') ? null : String(u),
      assign: createStream(key, 'assign'),
      vector: createStream(key, 'vector'),
      fx: createStream(key, 'fx'),
    };
  }

  TD.random = { sha256, utf8, concat, toHex, fromHex, makeSeed, fingerprint, deriveKey, createStream, createSession };
})(typeof window !== 'undefined' ? window : globalThis);
