/**
 * 24-bit uncompressed BMP encoder. Browsers can only encode PNG, JPEG and WebP
 * — canvas.toBlob(cb, 'image/bmp') silently returns a PNG — so Convert Image
 * Format writes BMP itself from canvas pixel data.
 *
 * Input: RGBA bytes, top row first (what ctx.getImageData() returns).
 * Output: Uint8Array of a BITMAPINFOHEADER BMP with bottom-up BGR rows, each
 * padded to a multiple of 4 bytes. BMP has no alpha here, so transparent
 * pixels are blended onto white.
 */
const FILE_HEADER = 14;
const DIB_HEADER = 40;

export function encodeBmp(rgba, width, height) {
  if (rgba.length !== width * height * 4) {
    throw new Error(`BMP encoder: expected ${width * height * 4} bytes of RGBA data, got ${rgba.length}`);
  }
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const imageSize = rowSize * height;
  const offset = FILE_HEADER + DIB_HEADER;
  const out = new Uint8Array(offset + imageSize);
  const view = new DataView(out.buffer);

  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  view.setUint32(2, out.length, true);
  view.setUint32(10, offset, true);

  view.setUint32(14, DIB_HEADER, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive height = rows stored bottom-up
  view.setUint16(26, 1, true); // colour planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // BI_RGB, no compression
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true); // 72 DPI horizontal (pixels per metre)
  view.setInt32(42, 2835, true); // 72 DPI vertical

  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * width * 4;
    const dst = offset + y * rowSize;
    for (let x = 0; x < width; x++) {
      const i = src + x * 4;
      const a = rgba[i + 3] / 255;
      const blend = c => Math.round(c * a + 255 * (1 - a));
      out[dst + x * 3] = blend(rgba[i + 2]);
      out[dst + x * 3 + 1] = blend(rgba[i + 1]);
      out[dst + x * 3 + 2] = blend(rgba[i]);
    }
  }
  return out;
}
