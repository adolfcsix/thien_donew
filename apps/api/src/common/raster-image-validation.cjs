'use strict';
/** Bounded structural validation of uploaded raster avatars. It does not
 * decode/re-encode images; the browser editor already exports a small JPEG. */
const MAX_DIM = 8192;
const MAX_PIXELS = 36_000_000;
function dimensionsOK(width, height) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 &&
    width <= MAX_DIM && height <= MAX_DIM && width * height <= MAX_PIXELS;
}
function jpegDimensions(data) {
  if (data.length < 16 || data[0] !== 0xff || data[1] !== 0xd8 ||
      data[data.length - 2] !== 0xff || data[data.length - 1] !== 0xd9) return null;
  let at = 2, dimensions = null;
  while (at + 4 <= data.length) {
    if (data[at] !== 0xff) return null;
    while (at < data.length && data[at] === 0xff) at++;
    if (at >= data.length) return null;
    const marker = data[at++];
    if (marker === 0xda) {
      if (at + 2 > data.length) return null;
      const length = data.readUInt16BE(at);
      return dimensions && length >= 6 && at + length < data.length - 2 ? dimensions : null;
    }
    if (marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (at + 2 > data.length) return null;
    const length = data.readUInt16BE(at);
    if (length < 2 || at + length > data.length) return null;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      if (length < 7) return null;
      const height = data.readUInt16BE(at + 3), width = data.readUInt16BE(at + 5);
      if (!dimensionsOK(width,height)) return null;
      dimensions = {width,height};
    }
    at += length;
  }
  return null;
}
/** Verify the PNG chunk chain and CRC, not just its 8-byte magic header.
 * A truncated image with a fabricated IEND must never be stored as a valid avatar. */
function crc32(data, start, end) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngDimensions(data) {
  if (data.length < 69 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return null;
  let at = 8, ihdr = false, idat = false, iend = false, width = 0, height = 0;
  while (at + 12 <= data.length) {
    const length = data.readUInt32BE(at);
    if (length > data.length - at - 12) return null;
    const name = data.toString('ascii',at+4,at+8), tail = at + 8 + length;
    if (crc32(data,at+4,tail) !== data.readUInt32BE(tail)) return null;
    if (!ihdr) {
      if (name !== 'IHDR' || length !== 13) return null;
      ihdr = true;
      width = data.readUInt32BE(at+8);height = data.readUInt32BE(at+12);
      if (!dimensionsOK(width,height)) return null;
    } else if (name === 'IDAT') idat = true;
    else if (name === 'IEND') {if (length !== 0 || !idat || tail + 4 !== data.length) return null; iend = true; break;}
    at = tail + 4;
  }
  return ihdr && idat && iend ? {width,height} : null;
}
function webpDimensions(data) {
  if (data.length < 30 || data.toString('ascii',0,4) !== 'RIFF' ||
      data.toString('ascii',8,12) !== 'WEBP' || data.readUInt32LE(4) !== data.length - 8) return null;
  const chunk = data.toString('ascii',12,16), size = data.readUInt32LE(16);
  if (size < 5 || size + 20 > data.length) return null;
  let width, height;
  if (chunk === 'VP8X' && size >= 10) {
    width = 1 + data[24] + (data[25] << 8) + (data[26] << 16);
    height = 1 + data[27] + (data[28] << 8) + (data[29] << 16);
  } else if (chunk === 'VP8L' && data[20] === 0x2f) {
    width = 1 + data[21] + ((data[22] & 0x3f) << 8);
    height = 1 + ((data[22] >> 6) & 3) + (data[23] << 2) + ((data[24] & 0xf) << 10);
  } else if (chunk === 'VP8 ' && size >= 10 && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
    width = data.readUInt16LE(26) & 0x3fff;
    height = data.readUInt16LE(28) & 0x3fff;
  } else return null;
  return dimensionsOK(width,height) ? {width,height} : null;
}
function inspectAvatar(data, contentType) {
  if (!Buffer.isBuffer(data) || data.length < 45 || data.length > 307200) return null;
  const candidates = {'image/jpeg':jpegDimensions,'image/png':pngDimensions,'image/webp':webpDimensions};
  if (!Object.hasOwn(candidates,contentType)) return null;
  const dimensions = candidates[contentType](data);
  return dimensions ? {mime:contentType,...dimensions} : null;
}
/** Full-file structural checks shared by avatar, books and Van Kho. Does not decode raster pixels. */
function rasterMime(data, format, maxBytes = 5 * 1024 * 1024) {
  const supported = {jpeg: ['image/jpeg',jpegDimensions], png: ['image/png',pngDimensions], webp: ['image/webp',webpDimensions]};
  if (!Object.hasOwn(supported,format) || !Buffer.isBuffer(data) || data.length < 45 || data.length > maxBytes) return null;
  const [mime, decoder] = supported[format];
  return decoder(data) ? mime : null;
}
module.exports = {inspectAvatar,jpegDimensions,pngDimensions,webpDimensions,rasterMime};
