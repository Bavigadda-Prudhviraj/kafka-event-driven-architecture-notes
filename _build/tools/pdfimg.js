// Extract embedded raster images from a PDF (FlateDecode RGB/Gray -> PNG, DCTDecode -> JPG).
// Usage: node pdfimg.js <file.pdf> <outDir> [minWidth]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const [, , pdfPath, outDir, minW = '300'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const buf = fs.readFileSync(pdfPath);
const bin = buf.toString('latin1');

function crc32(b) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < b.length; n++) {
    c = (crc ^ b[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, channels, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = channels === 3 ? 2 : 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * channels, rows = [];
  for (let y = 0; y < h; y++) rows.push(Buffer.from([0]), raw.subarray(y * stride, (y + 1) * stride));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}
// undo PNG predictors (DecodeParms /Predictor >= 10)
function unpredict(data, w, ch) {
  const stride = w * ch, out = Buffer.alloc(Math.floor(data.length / (stride + 1)) * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0, i = 0; i + stride < data.length + 1 && y * stride < out.length; y++) {
    const f = data[i++], row = Buffer.from(data.subarray(i, i + stride)); i += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? row[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      if (f === 1) row[x] = (row[x] + a) & 255;
      else if (f === 2) row[x] = (row[x] + b) & 255;
      else if (f === 3) row[x] = (row[x] + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); row[x] = (row[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
    }
    row.copy(out, y * stride); prev = row;
  }
  return out;
}

const re = /(\d+) 0 obj\s*<<([\s\S]*?)>>\s*stream\r?\n/g;
let m, count = 0;
while ((m = re.exec(bin))) {
  const dict = m[2];
  if (!/\/Subtype\s*\/Image/.test(dict)) continue;
  const start = re.lastIndex, end = bin.indexOf('endstream', start);
  const data = buf.subarray(start, end);
  const w = +(dict.match(/\/Width\s+(\d+)/) || [])[1], h = +(dict.match(/\/Height\s+(\d+)/) || [])[1];
  if (!w || w < +minW) continue;
  const name = path.join(outDir, `obj${m[1]}_${w}x${h}`);
  try {
    if (/DCTDecode/.test(dict)) { fs.writeFileSync(name + '.jpg', data); count++; continue; }
    if (!/FlateDecode/.test(dict)) continue;
    let raw = zlib.inflateSync(data);
    const ch = /DeviceGray/.test(dict) ? 1 : 3;
    if (/\/Predictor\s+1[0-5]/.test(dict)) raw = unpredict(raw, w, ch);
    if (raw.length < w * h * ch) { console.log('skip (indexed/other)', name); continue; }
    fs.writeFileSync(name + '.png', png(w, h, ch, raw)); count++;
  } catch (e) { console.log('fail', name, e.message); }
}
console.log(`extracted ${count} images to ${outDir}`);
