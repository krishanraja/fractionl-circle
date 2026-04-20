#!/usr/bin/env node
// Generates extension/icons/{16,48,128}.png as MV3 toolbar icons.
// Pure-Node: zlib + Buffer, no deps. Produces a solid-purple rounded-square
// with a white "C" ring cutout. Replace with a designer asset before
// Chrome Web Store submission.

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../extension/icons');
mkdirSync(OUT_DIR, { recursive: true });

// #7C3AED, Circle primary
const BRAND = [0x7c, 0x3a, 0xed];
const WHITE = [0xff, 0xff, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

// ---------------------------------------------------------------------------
// PNG encoder (RGBA, color type 6, 8-bit depth, filter=None).
// ---------------------------------------------------------------------------

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(size, pixels /* Uint8Array length size*size*4 */) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);    // bit depth
  ihdr.writeUInt8(6, 9);    // color type: RGBA
  ihdr.writeUInt8(0, 10);   // compression
  ihdr.writeUInt8(0, 11);   // filter
  ihdr.writeUInt8(0, 12);   // interlace

  const bytesPerPixel = 4;
  const scanlineLength = size * bytesPerPixel;
  const raw = Buffer.alloc(size * (1 + scanlineLength));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + scanlineLength)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const srcOff = (y * size + x) * 4;
      const dstOff = y * (1 + scanlineLength) + 1 + x * 4;
      raw[dstOff] = pixels[srcOff];
      raw[dstOff + 1] = pixels[srcOff + 1];
      raw[dstOff + 2] = pixels[srcOff + 2];
      raw[dstOff + 3] = pixels[srcOff + 3];
    }
  }
  const idatData = deflateSync(raw);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing. A purple rounded square with a slightly-off-centre white ring, to
// evoke a "Circle" mark. Anti-aliasing via simple pixel-level alpha blending.
// ---------------------------------------------------------------------------

function blend(px, i, [r, g, b], alpha) {
  const a = alpha * 255;
  const existingA = px[i + 3];
  const outA = a + existingA * (1 - alpha);
  const mix = (c, existingC) => (c * a + existingC * existingA * (1 - alpha)) / (outA || 1);
  px[i] = Math.round(mix(r, px[i]));
  px[i + 1] = Math.round(mix(g, px[i + 1]));
  px[i + 2] = Math.round(mix(b, px[i + 2]));
  px[i + 3] = Math.round(outA);
}

function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  // Fill transparent.
  for (let i = 0; i < px.length; i += 4) {
    px[i] = TRANSPARENT[0];
    px[i + 1] = TRANSPARENT[1];
    px[i + 2] = TRANSPARENT[2];
    px[i + 3] = TRANSPARENT[3];
  }

  const radius = size * 0.22;                       // corner radius
  const pad = size * 0.08;
  const ringCenter = [size / 2, size / 2];
  const ringOuter = size * 0.36;
  const ringInner = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded rectangle mask: compute distance-to-corner for smooth edges.
      const minX = x + 0.5 - pad;
      const maxX = (size - pad) - (x + 0.5);
      const minY = y + 0.5 - pad;
      const maxY = (size - pad) - (y + 0.5);
      const dx = Math.max(0, radius - Math.max(minX, maxX));
      const dy = Math.max(0, radius - Math.max(minY, maxY));
      // If the pixel is outside the rounded-rect mask, skip.
      let squareAlpha = 1;
      if (Math.min(minX, maxX, minY, maxY) < 0) {
        squareAlpha = 0;
      } else if (dx > 0 && dy > 0) {
        const cornerDist = Math.hypot(dx, dy);
        squareAlpha = Math.max(0, Math.min(1, radius - cornerDist + 0.5));
      }
      if (squareAlpha > 0) blend(px, i, BRAND, squareAlpha);

      // Ring (white, slight alpha for visual depth).
      const rx = x + 0.5 - ringCenter[0];
      const ry = y + 0.5 - ringCenter[1];
      const dist = Math.hypot(rx, ry);
      if (dist >= ringInner && dist <= ringOuter) {
        const edge = Math.min(
          Math.abs(dist - ringInner),
          Math.abs(dist - ringOuter)
        );
        const ringAlpha = Math.min(1, edge + 0.5);
        blend(px, i, WHITE, ringAlpha);
      }
    }
  }
  return px;
}

for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size);
  const buf = encodePng(size, pixels);
  const outPath = resolve(OUT_DIR, `${size}.png`);
  writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${buf.length} bytes)`);
}
