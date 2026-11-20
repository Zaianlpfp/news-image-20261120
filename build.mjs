// build.mjs — compose entry.png for news-image-20261120.
// Reads the three model-generated lead photos in assets/, draws a one-page
// newspaper front page (masthead, date, 3 leads, 22 briefs, dotted world map)
// with a hand-written 5x7 bitmap font, and writes entry.png (1024x1024).
// Run: node build.mjs   (writes entry.png next to this file)
import fs from "node:fs";
import zlib from "node:zlib";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- font 5x7
// Each glyph: 7 rows of 5 bits ("1" = ink). Only capitals, digits and the
// punctuation this page uses; all page text is set in capitals.
const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
};
const CHAR_W = 6; // 5px glyph + 1px gap, times scale

// ---------------------------------------------------------------- PNG codec
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function decodePNG(buf) {
  // 8-bit, non-interlaced, colour types 2 (RGB) and 6 (RGBA) only.
  let pos = 8;
  let w = 0, h = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error("unsupported PNG (depth/interlace)");
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    pos += 12 + len;
  }
  if (colorType !== 2 && colorType !== 6) throw new Error("unsupported PNG colour type " + colorType);
  const ch = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(w * h * ch);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const row = raw.subarray(p, p + stride); p += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= ch && prev ? prev[x - ch] : 0;
      let v = row[x];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[x] = v;
    }
  }
  return { w, h, ch, data: out };
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- canvas
const W = 1024, H = 1024;
const PAPER = [248, 243, 230, 255];
const INK = [18, 18, 18, 255];
const RED = [178, 34, 34, 255];
const GREY = [110, 105, 95, 255];
const canvas = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  canvas[i * 4] = PAPER[0]; canvas[i * 4 + 1] = PAPER[1];
  canvas[i * 4 + 2] = PAPER[2]; canvas[i * 4 + 3] = 255;
}
function setPx(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  canvas[o] = c[0]; canvas[o + 1] = c[1]; canvas[o + 2] = c[2]; canvas[o + 3] = 255;
}
function fillRect(x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
}
function hline(x, y, w, c, t = 1) { fillRect(x, y, w, t, c); }
function vline(x, y, h, c, t = 1) { fillRect(x, y, t, h, c); }
function textWidth(s, scale) { return s.length * CHAR_W * scale - scale; }
function drawText(s, x, y, scale, c = INK) {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const g = GLYPHS[up[i]] || GLYPHS[" "];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1")
          fillRect(x + i * CHAR_W * scale + col * scale, y + r * scale, scale, scale, c);
  }
}
function drawTextCentered(s, cx, y, scale, c = INK) {
  drawText(s, Math.round(cx - textWidth(s, scale) / 2), y, scale, c);
}
function wrapText(s, maxWidth, scale) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, scale) <= maxWidth) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(s, x, y, maxWidth, scale, lineH, c = INK) {
  const lines = wrapText(s.toUpperCase(), maxWidth, scale);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lineH, scale, c));
  return lines.length;
}
// Blit a decoded photo into a slot, centre-cropped to the slot aspect.
function blitPhoto(img, dx, dy, dw, dh) {
  const sa = img.w / img.h, da = dw / dh;
  let sw, sh, sx, sy;
  if (sa > da) { sh = img.h; sw = Math.round(img.h * da); sx = Math.round((img.w - sw) / 2); sy = 0; }
  else { sw = img.w; sh = Math.round(img.w / da); sx = 0; sy = Math.round((img.h - sh) / 2); }
  for (let y = 0; y < dh; y++) {
    const iy = sy + Math.floor((y * sh) / dh);
    for (let x = 0; x < dw; x++) {
      const ix = sx + Math.floor((x * sw) / dw);
      const o = (iy * img.w + ix) * img.ch;
      setPx(dx + x, dy + y, [img.data[o], img.data[o + 1], img.data[o + 2], 255]);
    }
  }
  // thin black frame
  hline(dx, dy, dw, INK, 2); hline(dx, dy + dh - 2, dw, INK, 2);
  vline(dx, dy, dh, INK, 2); vline(dx + dw - 2, dy, dh, INK, 2);
}

// ---------------------------------------------------------------- layout
const MX = 28;                 // side margin
const CW = W - 2 * MX;         // content width 968
const summit = decodePNG(fs.readFileSync(path.join(ROOT, "assets", "lead-summit.png")));
const icj = decodePNG(fs.readFileSync(path.join(ROOT, "assets", "lead-icj.png")));
const cyclone = decodePNG(fs.readFileSync(path.join(ROOT, "assets", "lead-cyclone.png")));

// ---- masthead ----
hline(MX, 10, CW, INK, 3);
drawTextCentered("THE WORLD TODAY", W / 2, 20, 7);
drawTextCentered("FRIDAY, 20 NOVEMBER 2026", W / 2, 78, 3);
drawText("ONE DAY IN THE WORLD", MX, 82, 1, GREY);
drawText("NO. 325", MX + CW - textWidth("NO. 325", 1), 82, 1, GREY);
hline(MX, 104, CW, INK, 2);
hline(MX, 108, CW, INK, 1);

// ---- row 1: lead 1 (summit, left) + lead 2 (ICJ, right) ----
const colR = MX + 648;         // right column x
const colRW = MX + CW - colR;  // 320
let y = 122;
// Lead 1 headline, two lines, scale 4
drawText("TRUMP, XI AND PUTIN", MX, y, 4);
drawText("ISSUE PEACE DECLARATION", MX, y + 32, 4);
drawText("SHENZHEN, CHINA - A FIRST TRILATERAL SUMMIT", MX, y + 66, 1, RED);
blitPhoto(summit, MX, y + 82, 620, 180);
const lead1Lines = drawPara(
  "The three leaders issue a four-point declaration: reform the UN, boost fuel supplies, defend state immunity and talk down nuclear risk. Ukraine, Iran and North Korea are not mentioned.",
  MX, y + 272, 620, 2, 17);
drawPara(
  "Trump calls the meeting in Shenzhen \"bigger than Yalta\". The leaders meet for just over an hour at the APEC summit.",
  MX, y + 272 + lead1Lines * 17, 620, 2, 17);
// Lead 2 (right column)
drawText("MYANMAR GUILTY", colR, y, 3);
drawText("OF GENOCIDE", colR, y + 25, 3);
drawText("THE HAGUE - WORLD COURT", colR, y + 54, 1, RED);
blitPhoto(icj, colR, y + 70, colRW, 160);
const icjLines = drawPara(
  "The UN court finds Myanmar committed genocide against the Rohingya in 2017. About 10,000 were killed and 800,000 fled.",
  colR, y + 240, colRW, 2, 17);
drawPara(
  "Myanmar is the first state ever found directly responsible for genocide.",
  colR, y + 240 + icjLines * 17, colRW, 2, 17);

// ---- divider ----
hline(MX, 512, CW, INK, 2);

// ---- row 2: cyclone ----
y = 526;
blitPhoto(cyclone, MX, y, 340, 178);
drawText("CYCLONE AKVAN SLAMS ODISHA", MX + 356, y + 2, 4);
drawText("INDIA - 300,000 EVACUATED AS STORM MAKES LANDFALL", MX + 356, y + 36, 1, RED);
const cycLines = drawPara(
  "Severe Cyclone Akvan reaches India's east coast with winds near 100 km/h. Rescue teams move families to shelters as floods rise; trains cancelled and schools shut.",
  MX + 356, y + 56, 596, 2, 17);
drawPara(
  "423 rescue teams are deployed across Odisha and Andhra Pradesh. The storm is the day's biggest natural disaster.",
  MX + 356, y + 56 + cycLines * 17, 596, 2, 17);
hline(MX, 716, CW, INK, 2);

// ---- row 3: the day in brief (22 items, 2 columns) ----
y = 730;
drawText("THE DAY IN BRIEF", MX, y, 2);
drawText("20 NOVEMBER 2026", MX + CW - textWidth("20 NOVEMBER 2026", 2), y, 2, GREY);
hline(MX, y + 20, CW, INK, 1);
const BRIEFS = [
  "1. ANTHROPIC IPO RAISES $81.3BN, A RECORD",
  "2. US STOCKS FALL 2%; NASDAQ 7-MONTH LOW",
  "3. TRUMP DELAYS IRAN DECISION TO 2027",
  "4. VOYAGER 1 PASSES ONE LIGHT-DAY OUT",
  "5. HAYABUSA2 DROPS ASTEROID LANDING PLAN",
  "6. GTA 6 SALES PASS $1.8BN WORLDWIDE",
  "7. EUROPE OPEN TO RUSSIA TALKS ON UKRAINE",
  "8. BLAST NEAR DUTCH EMBASSY IN KYIV",
  "9. HOUTHI STRIKE DAMAGES RIYADH TOWER",
  "10. NICHOLLS 113* LIFTS NZ TO 243-5",
  "11. TAIWAN STEADIES STOCKS AFTER SLIDE",
  "12. JAPAN PM DODGES TAIWAN QUESTION",
  "13. S. KOREA COURT CLEARS EX-PM HAN",
  "14. FIJI DECLARES DISASTER AS DROUGHT BITES",
  "15. US, VENEZUELA RESTORE MILITARY TIES",
  "16. UKRAINE HITS CRIMEA BRIDGE RAIL LINK",
  "17. N. KOREA EXPANDS YONGBYON SITE",
  "18. SOUTH SUDAN VOTE DELAYED TO FEB 2027",
  "19. 17 KILLED IN SOUTH AFRICA SHOOTINGS",
  "20. EU STATES PLAN RWANDA DEPORTATION HUB",
  "21. UK HANDS US SOLDIER TO US OVER SPY CLAIM",
  "22. PALANTIR NHS DEAL EXTENDED TO 2029",
];
const briefY0 = y + 28;
const briefColW = Math.floor(CW / 2);
BRIEFS.forEach((b, i) => {
  const col = i < 11 ? 0 : 1;
  const row = i % 11;
  drawText(b, MX + col * briefColW, briefY0 + row * 13, 1);
});
hline(MX, briefY0 + 11 * 13 + 4, CW, INK, 2);

// ---- row 4: dotted world map with pins ----
// Land runs: [row, colStart, colEnd] on a 72x18 grid (lon -180..180, lat 84..-56).
const LAND = [
  [0, 6, 16], [0, 30, 35],
  [1, 5, 24], [1, 31, 35], [1, 48, 70],
  [2, 2, 8], [2, 9, 26], [2, 32, 32], [2, 38, 42], [2, 44, 71],
  [3, 8, 28], [3, 36, 36], [3, 37, 44], [3, 45, 71],
  [4, 8, 24], [4, 36, 45], [4, 46, 66], [4, 69, 70],
  [5, 8, 25], [5, 36, 46], [5, 47, 64], [5, 69, 69],
  [6, 7, 22], [6, 36, 48], [6, 49, 54], [6, 56, 59], [6, 60, 66],
  [7, 9, 16], [7, 36, 49], [7, 50, 53], [7, 56, 58], [7, 61, 65],
  [8, 11, 15], [8, 36, 42], [8, 44, 48], [8, 57, 57], [8, 60, 64],
  [9, 17, 22], [9, 37, 47], [9, 60, 66],
  [10, 18, 24], [10, 38, 46], [10, 59, 67],
  [11, 18, 25], [11, 38, 45], [11, 60, 68],
  [12, 19, 26], [12, 39, 44], [12, 62, 68],
  [13, 20, 26], [13, 39, 43], [13, 61, 68],
  [14, 21, 25], [14, 40, 43], [14, 62, 67], [14, 69, 70],
  [15, 22, 24], [15, 63, 66], [15, 69, 69],
  [16, 22, 23],
  [17, 22, 22],
];
const mapY = briefY0 + 11 * 13 + 12;
drawText("WHERE THE NEWS HAPPENED", MX, mapY, 2);
drawText("1 SHENZHEN  2 THE HAGUE  3 ODISHA  4 NEW YORK  5 KYIV  6 RIYADH  7 WELLINGTON  8 TAIPEI",
  MX + textWidth("WHERE THE NEWS HAPPENED", 2) + 24, mapY + 4, 1, RED);
const mapX = MX, mapW = CW, mapH = 68, mapTop = mapY + 20;
hline(mapX, mapTop - 3, mapW, INK, 1);
const cellW = mapW / 72, cellH = mapH / 18;
for (const [r, c0, c1] of LAND) {
  for (let c = c0; c <= c1; c++) {
    const x = Math.round(mapX + c * cellW + 1);
    const yy = Math.round(mapTop + r * cellH);
    fillRect(x, yy, Math.max(2, Math.round(cellW) - 4), Math.max(2, Math.round(cellH) - 2), [90, 90, 90, 255]);
  }
}
// pins: [col, row, label] — numbers on the map, legend below
const PINS = [
  [60, 8, "1"], [37, 4, "2"], [57, 7, "3"], [21, 6, "4"],
  [42, 4, "5"], [45, 8, "6"], [70, 15, "7"], [61, 7, "8"],
];
for (const [c, r, n] of PINS) {
  const cx = Math.round(mapX + (c + 0.5) * cellW);
  const cy = Math.round(mapTop + (r + 0.5) * cellH);
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++)
      if (dx * dx + dy * dy <= 16) setPx(cx + dx, cy + dy, RED);
  drawText(n, cx + 6, cy - 4, 1, RED);
}

// ---- footer ----
const footY = mapTop + mapH + 8;
hline(MX, footY, CW, INK, 1);
drawTextCentered("SOURCES: REUTERS - BBC - UN NEWS - LE MONDE - THE TIMES - THE HINDU - NDTV - ALL STORIES REPORTED 20 NOVEMBER 2026",
  W / 2, footY + 4, 1, GREY);


// ---------------------------------------------------------------- write out
const out = encodePNG(W, H, canvas);
fs.writeFileSync(path.join(ROOT, "entry.png"), out);
console.log("entry.png", out.length, "bytes, sha256",
  crypto.createHash("sha256").update(out).digest("hex"));
console.log("size limit 1048576:", out.length <= 1048576 ? "OK" : "TOO BIG");
