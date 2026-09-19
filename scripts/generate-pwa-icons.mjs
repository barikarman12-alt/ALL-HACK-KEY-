import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create crisp SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b" />
      <stop offset="50%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e000ff" />
      <stop offset="100%" stop-color="#7928ca" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Outer rounded background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" stroke="#e000ff" stroke-opacity="0.3" stroke-width="8" />
  
  <!-- Glowing circle ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="url(#neonGrad)" stroke-width="12" opacity="0.8" filter="url(#glow)" />
  
  <!-- Stylized 'A X' and Key Icon -->
  <g transform="translate(136, 120)" filter="url(#glow)">
    <!-- Letter A & X -->
    <path d="M40 220 L120 40 L200 220 M70 155 L170 155" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M160 80 L230 180 M230 80 L160 180" fill="none" stroke="#e000ff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Crown / Star Accent -->
  <polygon points="256,60 270,95 308,95 277,118 289,153 256,130 223,153 235,118 204,95 242,95" fill="#e000ff" opacity="0.9" />

  <!-- Subtitle -->
  <text x="256" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="6">
    ARMAN X STORE
  </text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

// Helper to create valid uncompressed/DEFLATE PNG buffer
function createPng(width, height, rBg = 9, gBg = 9, bBg = 11) {
  // Simple solid color with glowing gradient block representation in raw PNG
  const rowSize = width * 4 + 1; // +1 for filter byte (0 = None)
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate distance from center for subtle radial glow
      const cx = width / 2;
      const cy = height / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = rBg;
      let g = gBg;
      let b = bBg;

      // Draw stylized glowing rounded square / logo center
      if (dist < 0.75) {
        // Neon fuchsia tone gradient
        const intensity = Math.max(0, 1 - dist);
        r = Math.min(255, Math.floor(rBg + intensity * 210));
        g = Math.min(255, Math.floor(gBg + intensity * 15));
        b = Math.min(255, Math.floor(bBg + intensity * 240));
      }

      // Draw border ring
      if (Math.abs(dist - 0.7) < 0.04) {
        r = 224;
        g = 0;
        b = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255; // Alpha
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression: Deflate (0)
  ihdrData[11] = 0; // Filter: Adaptive (0)
  ihdrData[12] = 0; // Interlace: None (0)

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = calculateCrc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function calculateCrc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate files
const png192 = createPng(192, 192);
const png512 = createPng(512, 512);
const appleTouch = createPng(180, 180);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
fs.writeFileSync(path.join(publicDir, 'logo.png'), png192);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png192);

console.log('PWA Icons generated successfully!');
