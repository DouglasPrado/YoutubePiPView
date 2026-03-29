/**
 * Generate app icons for YTView (YouTube PiP)
 * Creates PNG icons in various sizes for electron-builder
 *
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Simple PNG encoder (no external dependencies)
function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c;
  }

  function chunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const combined = Buffer.concat([typeBuffer, data]);
    const crcVal = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([length, combined, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT - raw pixel data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = pixels[srcIdx];     // R
      rawData[dstIdx + 1] = pixels[srcIdx + 1]; // G
      rawData[dstIdx + 2] = pixels[srcIdx + 2]; // B
      rawData[dstIdx + 3] = pixels[srcIdx + 3]; // A
    }
  }

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;
  const borderWidth = size * 0.03;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Anti-aliased circle
      if (dist <= radius + 1) {
        const alpha = Math.min(1, Math.max(0, radius + 1 - dist));

        // Red circle background (#FF0000)
        let r = 255, g = 0, b = 0;

        // White play triangle
        const triCx = cx + size * 0.03; // slightly offset right
        const triSize = size * 0.22;

        // Triangle vertices (play button)
        const ax2 = cx - triSize * 0.5;
        const ay2 = cy - triSize * 0.85;
        const bx2 = cx - triSize * 0.5;
        const by2 = cy + triSize * 0.85;
        const cx2 = cx + triSize * 0.85;
        const cy2 = cy;

        // Point in triangle test
        function sign(px, py, x1, y1, x2, y2) {
          return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
        }

        const d1 = sign(x, y, ax2, ay2, bx2, by2);
        const d2 = sign(x, y, bx2, by2, cx2, cy2);
        const d3 = sign(x, y, cx2, cy2, ax2, ay2);

        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        const inTriangle = !(hasNeg && hasPos);

        if (inTriangle) {
          r = 255;
          g = 255;
          b = 255;
        }

        // Subtle shadow/gradient for depth
        const gradientFactor = 1 - (dist / radius) * 0.15;
        if (!inTriangle) {
          r = Math.round(r * gradientFactor);
        }

        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = Math.round(alpha * 255);
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return createPNG(size, size, pixels);
}

// Generate tray icon (smaller, template-style for macOS - white on transparent)
function generateTrayIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const triSize = size * 0.3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Play triangle (white for macOS template)
      const ax2 = cx - triSize * 0.5;
      const ay2 = cy - triSize * 0.85;
      const bx2 = cx - triSize * 0.5;
      const by2 = cy + triSize * 0.85;
      const cx2 = cx + triSize * 0.85;
      const cy2 = cy;

      function sign(px, py, x1, y1, x2, y2) {
        return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
      }

      const d1 = sign(x, y, ax2, ay2, bx2, by2);
      const d2 = sign(x, y, bx2, by2, cx2, cy2);
      const d3 = sign(x, y, cx2, cy2, ax2, ay2);

      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      const inTriangle = !(hasNeg && hasPos);

      // Rounded rectangle border
      const padding = size * 0.1;
      const cornerRadius = size * 0.15;
      const inRect = x >= padding && x <= size - padding && y >= padding && y <= size - padding;

      let inRoundedRect = false;
      if (inRect) {
        const rx = Math.max(0, Math.abs(x - cx) - (cx - padding - cornerRadius));
        const ry = Math.max(0, Math.abs(y - cy) - (cy - padding - cornerRadius));
        inRoundedRect = (rx * rx + ry * ry) <= cornerRadius * cornerRadius;
      }

      const borderThickness = size * 0.06;
      const innerPadding = padding + borderThickness;
      const innerCornerRadius = cornerRadius - borderThickness * 0.5;
      const inInnerRect = x >= innerPadding && x <= size - innerPadding && y >= innerPadding && y <= size - innerPadding;

      let inInnerRoundedRect = false;
      if (inInnerRect) {
        const rx = Math.max(0, Math.abs(x - cx) - (cx - innerPadding - innerCornerRadius));
        const ry = Math.max(0, Math.abs(y - cy) - (cy - innerPadding - innerCornerRadius));
        inInnerRoundedRect = (rx * rx + ry * ry) <= innerCornerRadius * innerCornerRadius;
      }

      const onBorder = inRoundedRect && !inInnerRoundedRect;

      if (inTriangle || onBorder) {
        // Black for macOS template icon (system will invert as needed)
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return createPNG(size, size, pixels);
}

// Generate all icon sizes
const buildDir = path.join(__dirname, '..', 'build');
const assetsDir = path.join(__dirname, '..', 'assets');

// Main app icon - 512x512 (electron-builder will auto-generate other sizes)
console.log('Generating app icon (512x512)...');
const icon512 = generateIcon(512);
fs.writeFileSync(path.join(buildDir, 'icon.png'), icon512);
console.log('  -> build/icon.png');

// Additional sizes for better quality
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
for (const size of sizes) {
  console.log(`Generating ${size}x${size} icon...`);
  const icon = generateIcon(size);
  fs.writeFileSync(path.join(buildDir, `${size}x${size}.png`), icon);
  console.log(`  -> build/${size}x${size}.png`);
}

// Tray icons for macOS (template icons)
console.log('Generating tray icons...');
const tray16 = generateTrayIcon(16);
const tray32 = generateTrayIcon(32);  // @2x
fs.writeFileSync(path.join(assetsDir, 'tray-iconTemplate.png'), tray16);
fs.writeFileSync(path.join(assetsDir, 'tray-iconTemplate@2x.png'), tray32);
console.log('  -> assets/tray-iconTemplate.png');
console.log('  -> assets/tray-iconTemplate@2x.png');

// Also create a regular tray icon as fallback
const trayRegular = generateTrayIcon(22);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), trayRegular);
console.log('  -> assets/tray-icon.png');

console.log('\nAll icons generated successfully!');
console.log('\nNote: For production, consider replacing these with professionally designed icons.');
console.log('electron-builder will auto-convert build/icon.png to .ico and .icns formats.');
