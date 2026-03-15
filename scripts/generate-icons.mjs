import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, "..", "icons");

const palette = {
  teal: [19, 78, 74, 255],
  cream: [255, 248, 238, 255],
  sage: [221, 238, 232, 255],
  coral: [217, 119, 87, 255],
  transparent: [0, 0, 0, 0]
};

function createCanvas(size, color = palette.transparent) {
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    pixels.set(color, i * 4);
  }
  return { size, pixels };
}

function setPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) {
    return;
  }
  const index = (y * canvas.size + x) * 4;
  canvas.pixels.set(color, index);
}

function fillRoundedRect(canvas, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      const dx = Math.min(px - x, x + width - 1 - px);
      const dy = Math.min(py - y, y + height - 1 - py);
      const inCorner =
        (dx < radius && dy < radius && ((dx - radius) ** 2 + (dy - radius) ** 2 > radius ** 2)) ||
        (dx < radius && py >= y + height - radius && ((dx - radius) ** 2 + (py - (y + height - radius)) ** 2 > radius ** 2)) ||
        (px >= x + width - radius && dy < radius && ((px - (x + width - radius)) ** 2 + (dy - radius) ** 2 > radius ** 2)) ||
        (px >= x + width - radius && py >= y + height - radius &&
          ((px - (x + width - radius)) ** 2 + (py - (y + height - radius)) ** 2 > radius ** 2));
      if (!inCorner) {
        setPixel(canvas, px, py, color);
      }
    }
  }
}

function fillCircle(canvas, cx, cy, radius, color) {
  const radiusSq = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSq) {
        setPixel(canvas, x, y, color);
      }
    }
  }
}

function fillTriangle(canvas, a, b, c, color) {
  const minX = Math.floor(Math.min(a.x, b.x, c.x));
  const maxX = Math.ceil(Math.max(a.x, b.x, c.x));
  const minY = Math.floor(Math.min(a.y, b.y, c.y));
  const maxY = Math.ceil(Math.max(a.y, b.y, c.y));
  const area = edge(a, b, c);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const p = { x: x + 0.5, y: y + 0.5 };
      const w0 = edge(b, c, p);
      const w1 = edge(c, a, p);
      const w2 = edge(a, b, p);
      const hasNeg = w0 < 0 || w1 < 0 || w2 < 0;
      const hasPos = w0 > 0 || w1 > 0 || w2 > 0;
      if (!(hasNeg && hasPos) || area === 0) {
        setPixel(canvas, x, y, color);
      }
    }
  }
}

function edge(a, b, c) {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

function drawLine(canvas, x1, y1, x2, y2, thickness, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    fillCircle(canvas, x, y, thickness / 2, color);
  }
}

function drawIcon(size) {
  const canvas = createCanvas(size, palette.transparent);
  const scale = size / 128;

  fillRoundedRect(canvas, 0, 0, size, size, Math.round(28 * scale), palette.teal);
  fillRoundedRect(canvas, Math.round(28 * scale), Math.round(22 * scale), Math.round(72 * scale), Math.round(78 * scale), Math.round(12 * scale), palette.cream);
  fillTriangle(
    canvas,
    { x: 50 * scale, y: 22 * scale },
    { x: 40 * scale, y: 22 * scale },
    { x: 58 * scale, y: 30 * scale },
    palette.sage
  );
  fillCircle(canvas, 64 * scale, 65 * scale, 22 * scale, palette.teal);
  fillCircle(canvas, 64 * scale, 65 * scale, 16 * scale, palette.cream);
  fillTriangle(
    canvas,
    { x: 64 * scale, y: 47 * scale },
    { x: 58.2 * scale, y: 61.2 * scale },
    { x: 69.8 * scale, y: 61.2 * scale },
    palette.coral
  );
  fillTriangle(
    canvas,
    { x: 64 * scale, y: 83 * scale },
    { x: 58.2 * scale, y: 68.8 * scale },
    { x: 69.8 * scale, y: 68.8 * scale },
    palette.teal
  );
  fillCircle(canvas, 64 * scale, 65 * scale, 3.5 * scale, palette.coral);
  drawLine(canvas, 64 * scale, 39 * scale, 64 * scale, 44 * scale, 3 * scale, palette.sage);
  drawLine(canvas, 64 * scale, 86 * scale, 64 * scale, 91 * scale, 3 * scale, palette.sage);
  drawLine(canvas, 90 * scale, 65 * scale, 85 * scale, 65 * scale, 3 * scale, palette.sage);
  drawLine(canvas, 43 * scale, 65 * scale, 38 * scale, 65 * scale, 3 * scale, palette.sage);

  return canvas;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuffer), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(canvas) {
  const { size, pixels } = canvas;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  const pixelBuffer = Buffer.from(pixels);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    pixelBuffer.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

mkdirSync(outputDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = encodePng(drawIcon(size));
  writeFileSync(resolve(outputDir, `icon${size}.png`), png);
}
