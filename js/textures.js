// Procedurella texturer (ritas på canvas) – inga externa bildfiler behövs.
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grime(g, w, h, count, maxA, y0 = 0) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = `rgba(18,12,8,${Math.random() * maxA})`;
    g.beginPath();
    g.ellipse(Math.random() * w, y0 + Math.random() * (h - y0), rand(2, w * 0.05), rand(2, h * 0.04), Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
}

function drips(g, w, h, count, maxY) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y0 = Math.random() * maxY;
    const len = rand(h * 0.04, h * 0.3);
    const grad = g.createLinearGradient(0, y0, 0, y0 + len);
    grad.addColorStop(0, 'rgba(25,15,8,0.28)');
    grad.addColorStop(1, 'rgba(25,15,8,0)');
    g.fillStyle = grad;
    g.fillRect(x, y0, rand(1, 4), len);
  }
}

// Schackrutigt golv. 256px = 2 m (rutor på 0.5 m)
export function checkerTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  const n = 4, s = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? '#151515' : '#b4ac98';
    g.fillRect(i * s, j * s, s, s);
  }
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, S); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(S, i * s); g.stroke();
  }
  grime(g, S, S, 120, 0.22);
  return toTex(c);
}

// Vägg: 512px = 2.4 m bred, 768px = 3.6 m hög
export function wallTexture(upper, lower) {
  const W = 512, H = 768, ppm = H / 3.6;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = upper;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    g.fillRect(Math.random() * W, 0, rand(2, 14), H);
  }
  const yLow = H - 1.0 * ppm;
  g.fillStyle = lower;
  g.fillRect(0, yLow, W, H - yLow);
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.lineWidth = 2;
  const tile = W / 12;
  for (let y = yLow; y < H; y += tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += tile) { g.beginPath(); g.moveTo(x, yLow); g.lineTo(x, H); g.stroke(); }
  // schackrand
  const cs = W / 32, sy = yLow - cs * 2;
  for (let k = 0; k < 32; k++) for (let r = 0; r < 2; r++) {
    g.fillStyle = (k + r) % 2 ? '#101010' : '#d6cdb8';
    g.fillRect(k * cs, sy + r * cs, cs, cs);
  }
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, H - 0.08 * ppm, W, 0.08 * ppm);
  grime(g, W, H, 240, 0.12);
  drips(g, W, H, 30, yLow);
  return toTex(c);
}

export function ceilingTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#2b2b2a';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#151515';
  g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, S); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke();
  }
  for (let i = 0; i < 10; i++) {
    g.fillStyle = `rgba(90,70,30,${Math.random() * 0.25})`;
    g.beginPath(); g.arc(Math.random() * S, Math.random() * S, rand(5, 25), 0, 7); g.fill();
  }
  return toTex(c);
}

export function doorTexture() {
  const W = 256, H = 512, c = makeCanvas(W, H), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#55595e'); grad.addColorStop(0.5, '#6d7177'); grad.addColorStop(1, '#4b4f54');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  for (let y = 16; y < H - 70; y += 32) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, W, 4);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y + 4, W, 2);
  }
  // varningsrand
  g.save();
  g.beginPath(); g.rect(0, H - 64, W, 64); g.clip();
  g.fillStyle = '#d6b21c'; g.fillRect(0, H - 64, W, 64);
  g.fillStyle = '#111';
  for (let x = -64; x < W + 64; x += 40) {
    g.beginPath(); g.moveTo(x, H); g.lineTo(x + 20, H); g.lineTo(x + 84, H - 64); g.lineTo(x + 64, H - 64); g.fill();
  }
  g.restore();
  for (let i = 0; i < 12; i++) {
    g.fillStyle = '#333'; g.beginPath(); g.arc(12, 20 + i * 40, 4, 0, 7); g.fill();
    g.beginPath(); g.arc(W - 12, 20 + i * 40, 4, 0, 7); g.fill();
  }
  grime(g, W, H, 80, 0.2);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function curtainTexture(base, dark, stars = false) {
  const W = 512, H = 256, c = makeCanvas(W, H), g = c.getContext('2d');
  for (let x = 0; x < W; x++) {
    const k = Math.pow(Math.sin((x / W) * Math.PI * 14), 2);
    g.fillStyle = k > 0.5 ? base : dark;
    g.globalAlpha = 1;
    g.fillRect(x, 0, 1, H);
    g.fillStyle = `rgba(0,0,0,${(1 - k) * 0.45})`;
    g.fillRect(x, 0, 1, H);
  }
  if (stars) {
    g.fillStyle = 'rgba(255,220,120,0.85)';
    for (let i = 0; i < 18; i++) star(g, Math.random() * W, Math.random() * H, rand(5, 11));
  }
  grime(g, W, H, 60, 0.2);
  const t = toTex(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

export function textTexture(text, { w = 512, h = 128, bg = '#000', fg = '#fff', font = 'bold 72px Arial Black, Impact, sans-serif', glow = null, border = null } = {}) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = h * 0.08; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.12 > 0 ? h - h * 0.12 : h); }
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (glow) { g.shadowColor = glow; g.shadowBlur = h * 0.25; }
  g.fillStyle = fg;
  const lines = text.split('\n');
  const lh = h / (lines.length + 0.4);
  lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh));
  g.shadowBlur = 0;
  grime(g, w, h, 30, 0.15);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function bearFace(g, cx, cy, r, eyes = 'normal') {
  const gold = eyes === 'hollow';
  g.fillStyle = gold ? '#c9a227' : '#6b4423';
  g.beginPath(); g.arc(cx - r * 0.75, cy - r * 0.75, r * 0.32, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + r * 0.75, cy - r * 0.75, r * 0.32, 0, 7); g.fill();
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.fillStyle = gold ? '#e8d38a' : '#c49a63';
  g.beginPath(); g.ellipse(cx, cy + r * 0.35, r * 0.5, r * 0.35, 0, 0, 7); g.fill();
  g.fillStyle = '#111';
  g.beginPath(); g.ellipse(cx, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, 7); g.fill();
  g.fillStyle = gold ? '#050505' : '#fff';
  g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.2, r * 0.2, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + r * 0.35, cy - r * 0.2, r * 0.2, 0, 7); g.fill();
  g.fillStyle = eyes === 'red' ? '#d01010' : gold ? '#fff' : '#123';
  const pr = gold ? r * 0.03 : r * 0.08;
  g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.18, pr, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + r * 0.35, cy - r * 0.18, pr, 0, 7); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = r * 0.06;
  g.beginPath(); g.arc(cx, cy + r * 0.32, r * 0.25, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  // hatt
  g.fillStyle = '#111';
  g.fillRect(cx - r * 0.35, cy - r * 1.45, r * 0.7, r * 0.55);
  g.fillRect(cx - r * 0.55, cy - r * 0.95, r * 1.1, r * 0.1);
}

export function posterTexture(kind) {
  const W = 256, H = 352, c = makeCanvas(W, H), g = c.getContext('2d');
  if (kind === 'bruno') {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f2cf45'); grad.addColorStop(1, '#d9762a');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7a1010'; g.font = 'bold 36px Arial Black, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('FIRA MED', W / 2, 48);
    bearFace(g, W / 2, 190, 70);
    g.font = 'bold 50px Arial Black, Impact, sans-serif';
    g.fillText('BRUNO!', W / 2, 322);
  } else if (kind === 'golden') {
    // samma layout som 'bruno' (näsan på samma ställe) men guld och fel
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3a2a08'); grad.addColorStop(1, '#120c02');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d8b84a'; g.font = 'bold 36px Arial Black, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('LEK MED', W / 2, 48);
    bearFace(g, W / 2, 190, 70, 'hollow');
    g.fillStyle = '#9a1010';
    g.font = 'bold 50px Arial Black, Impact, sans-serif';
    g.fillText('MIG', W / 2, 322);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`; g.fillRect(0, Math.random() * H, W, rand(1, 4)); }
  } else if (kind === 'rules') {
    g.fillStyle = '#e7e0cc'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#222'; g.font = 'bold 22px Courier New, monospace'; g.textAlign = 'left';
    g.fillText('REGLER FÖR', 18, 38); g.fillText('NATTPERSONAL', 18, 62);
    g.font = '15px Courier New, monospace';
    ['1. Lämna aldrig kontoret.', '2. Spara på strömmen.', '3. Ser du något i', '   ljuset: STÄNG dörren.', '4. Figurerna rör sig', '   fritt på natten.', '5. Släpp inte Rolf ur', '   sikte för länge.', '6. Skiftet slutar 06:00.']
      .forEach((l, i) => g.fillText(l, 14, 100 + i * 24));
    g.fillStyle = 'rgba(150,0,0,0.6)'; g.font = 'italic 16px Courier New, monospace';
    g.fillText('lycka till', 140, 330);
  } else if (kind === 'smile') {
    g.fillStyle = '#141414'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8e2d0'; g.font = 'bold 110px Arial Black, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('LE!', W / 2, 140);
    bearFace(g, W / 2, 255, 55, 'red');
  } else {
    // barnteckning
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
    const cols = ['#d22', '#22a', '#1a1', '#e90', '#a2a', '#333'];
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = cols[(Math.random() * cols.length) | 0]; g.lineWidth = 5;
      const x = 50 + i * 75 + rand(-10, 10), y = 230;
      g.beginPath(); g.arc(x, y - 70, 18, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(x, y - 52); g.lineTo(x, y); g.lineTo(x - 18, y + 40); g.moveTo(x, y); g.lineTo(x + 18, y + 40);
      g.moveTo(x - 25, y - 35); g.lineTo(x + 25, y - 35); g.stroke();
    }
    bearFace(g, rand(70, 190), 95, 40, Math.random() < 0.5 ? 'red' : 'normal');
    g.fillStyle = '#d22'; g.font = 'bold 30px Comic Sans MS, cursive, sans-serif'; g.textAlign = 'center';
    g.fillText(Math.random() < 0.5 ? 'BRUNO' : 'MIN VÄN', W / 2, 335);
  }
  grime(g, W, H, 50, 0.18);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Dynamisk "snö" för CRT-skärmen på skrivbordet
export function crtTexture() {
  const c = makeCanvas(64, 48), g = c.getContext('2d');
  const img = g.createImageData(64, 48);
  const t = toTex(c);
  t.magFilter = THREE.NearestFilter;
  t.update = () => {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 120) | 0;
      d[i] = v * 0.6; d[i + 1] = v; d[i + 2] = v * 0.7; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = 'rgba(160,255,160,0.5)';
    g.font = '9px monospace';
    g.fillText('CAM', 4, 10);
    t.needsUpdate = true;
  };
  t.update();
  return t;
}
