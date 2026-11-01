/* eslint-disable no-bitwise */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : 0) << 6) |
      (i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : 0);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

function utf16(bytes: Uint8Array, little: boolean): string {
  let s = '';
  for (let i = 2; i + 1 < bytes.length; i += 2) {
    s += String.fromCharCode(little ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
  }
  return s;
}

// Strict UTF-8; undefined on the first invalid sequence.
function utf8(bytes: Uint8Array): string | undefined {
  const codes: number[] = [];
  let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  while (i < bytes.length) {
    const b = bytes[i];
    const extra = b < 0x80 ? 0 : b >= 0xf0 && b < 0xf8 ? 3 : b >= 0xe0 ? 2 : b >= 0xc2 && b < 0xe0 ? 1 : -1;
    if (extra < 0 || i + extra >= bytes.length) return undefined;
    let cp = extra ? b & (0x3f >> extra) : b;
    for (let k = 1; k <= extra; k++) {
      const c = bytes[i + k];
      if ((c & 0xc0) !== 0x80) return undefined;
      cp = (cp << 6) | (c & 0x3f);
    }
    codes.push(cp);
    i += extra + 1;
  }
  let s = '';
  for (let k = 0; k < codes.length; k += 4096) s += String.fromCodePoint(...codes.slice(k, k + 4096));
  return s;
}

const latin1 = (bytes: Uint8Array) => {
  let s = '';
  for (let k = 0; k < bytes.length; k += 4096) s += String.fromCharCode(...bytes.subarray(k, k + 4096));
  return s;
};

// UTF-16 (BOM), UTF-8, else Latin-1 — covers what GEDCOM writers emit in practice.
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return utf16(bytes, true);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return utf16(bytes, false);
  return utf8(bytes) ?? latin1(bytes);
}
