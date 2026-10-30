// Nattskiftet – huvudloop, styrning, ström, klocka och spelets tillstånd.
import * as THREE from 'three';
import { buildWorld, CAMERAS, MAP_ROOMS } from './world.js';
import { buildCharacter, DEFS } from './characters.js';
import { Sfx } from './audio.js';
import { createAI } from './ai.js';

const HOUR_LEN = 60;            // sekunder per speltimme (00:00 → 06:00 = 6 min)
const DRAIN = 0.11;             // % ström per sekund och förbrukningssteg
const NIGHT_MULT = { 1: 0.9, 2: 1.0, 3: 1.05, 4: 1.12, 5: 1.2 };
const MAX_YAW = THREE.MathUtils.degToRad(80);
const CAM_ORDER = CAMERAS.map((c) => c.id);
const SAVE_KEY = 'nattskiftet_natt';

const INTRO = {
  1: `Hej och välkommen till <b>Brunos Pizzaland</b>!<br><br>
Ditt jobb är enkelt: sitt kvar i vaktkontoret och håll ut till <b>06:00</b>.
Våra figurer – Bruno, Harald, Klara och Rolf – går i "frigående läge" på nätterna. Om de hittar dig efter stängning... ja, stäng bara dörren.<br><br>
Strömmen är begränsad. Dörrar, lampor och kameror drar ström. Om strömmen tar slut... försök att inte låta den ta slut.`,
  2: 'Natt 2. Harald och Klara verkar piggare i kväll. Och glöm inte Rävgrottan – Rolf rör sig när du <b>inte</b> tittar på kamerorna.',
  3: 'Natt 3. Bruno har börjat lämna scenen. Han gömmer sig i mörkret och rör sig bara när ingen tittar på honom.',
  4: 'Natt 4. Någon har pillat på elsystemet. Spara ström. Mycket ström.',
  5: 'Natt 5. Sista natten. Vi ses i morgon bitti. Förhoppningsvis.',
};

const $ = (id) => document.getElementById(id);

// ---------- renderer & scen ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.05);

const playerCam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 80);
playerCam.position.set(0, 1.32, 0.6);
playerCam.rotation.order = 'YXZ';
scene.add(playerCam);

const world = buildWorld(scene);
const chars = {};
const jump = {};
for (const id of Object.keys(DEFS)) {
  chars[id] = buildCharacter(id);
  scene.add(chars[id].root);
  jump[id] = buildCharacter(id);
  jump[id].root.visible = false;
  playerCam.add(jump[id].root);
}
const jumpLight = new THREE.PointLight(0xfff4e0, 0, 4, 1.2);
jumpLight.position.set(0, 0.35, 0.1);
playerCam.add(jumpLight);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  playerCam.aspect = w / h;
  playerCam.updateProjectionMatrix();
  world.cams.forEach((c) => { c.cam.aspect = w / h; c.cam.updateProjectionMatrix(); });
}
window.addEventListener('resize', resize);
resize();

// ---------- tillstånd ----------
const sfx = new Sfx();
const G = {
  state: 'menu', night: 1, time: 0, hour: 0, power: 100, usage: 1,
  doors: { left: false, right: false }, lights: { left: false, right: false }, broken: { left: false, right: false },
  camUp: false, camAnim: 0, curCam: '1A',
  yaw: 0, targetYaw: 0, mouseX: 0.5,
  staticBurst: 0, killer: null, jsT: 0, po: null,
};
window.__G = G; // för felsökning i konsolen

const ai = createAI({
  G, world, chars, sfx,
  hooks: {
    disrupt() { G.staticBurst = 1.3; sfx.disrupt(); },
    jumpscare: (id) => jumpscare(id),
    lightsOff(side) { if (G.lights[side]) { G.lights[side] = false; sfx.lightBuzz(side, false); } },
    notify: (msg) => notify(msg),
  },
});
window.__ai = ai;

let saved = 1;
try { saved = Math.max(1, Math.min(5, parseInt(localStorage.getItem(SAVE_KEY) || '1', 10) || 1)); } catch (e) { /* ingen lagring */ }

// ---------- UI ----------
const ui = {
  hud: $('hud'), time: $('time'), nightlbl: $('nightlbl'), power: $('power'), usage: $('usage'),
  camui: $('camui'), camid: $('camid'), camlabel: $('camlabel'), map: $('map'), toggle: $('camtoggle'),
  tablet: $('tablet'), stat: $('static'), vignette: $('vignette'), flash: $('flash'), notice: $('notice'), hint: $('hint'),
};
const camButtons = {};
(function buildMap() {
  const S = 10.4, ox = 14.5, oz = 24.5;
  ui.map.style.width = 29 * S + 'px';
  ui.map.style.height = 28 * S + 'px';
  for (const r of MAP_ROOMS) {
    const d = document.createElement('div');
    d.className = 'room ' + r.id;
    d.style.left = (r.x0 + ox) * S + 'px';
    d.style.top = (r.z0 + oz) * S + 'px';
    d.style.width = (r.x1 - r.x0) * S + 'px';
    d.style.height = (r.z1 - r.z0) * S + 'px';
    if (r.id === 'office') d.innerHTML = '<span>DU</span>';
    ui.map.appendChild(d);
  }
  for (const c of CAMERAS) {
    const b = document.createElement('button');
    b.className = 'cambtn';
    b.textContent = c.id;
    b.title = c.name;
    b.style.left = (c.map[0] + ox) * S + 'px';
    b.style.top = (c.map[1] + oz) * S + 'px';
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); selectCam(c.id); });
    ui.map.appendChild(b);
    camButtons[c.id] = b;
  }
})();

const usageBars = [];
for (let i = 0; i < 5; i++) { const s = document.createElement('i'); ui.usage.appendChild(s); usageBars.push(s); }

let noticeTimer = 0;
function notify(msg) {
  ui.notice.textContent = msg;
  ui.notice.classList.add('show');
  noticeTimer = 2.5;
}

function showScreen(id) {
  for (const s of ['menu', 'intro', 'gameover', 'win']) $(s).classList.toggle('hidden', s !== id);
}

function refreshMenu() {
  $('btn-continue').classList.toggle('hidden', saved <= 1);
  $('btn-continue').textContent = `Fortsätt – Natt ${saved}`;
}

// ---------- statisk "snö" ----------
const sctx = ui.stat.getContext('2d');
ui.stat.width = 240; ui.stat.height = 135;
const simg = sctx.createImageData(240, 135);
const s32 = new Uint32Array(simg.data.buffer);
function drawStatic() {
  for (let i = 0; i < s32.length; i++) { const v = (Math.random() * 255) | 0; s32[i] = 0xff000000 | (v << 16) | (v << 8) | v; }
  sctx.putImageData(simg, 0, 0);
}

// ---------- handlingar ----------
function toggleDoor(side) {
  if (G.state !== 'playing' || G.camUp) return;
  if (G.broken[side]) { sfx.error(); return; }
  G.doors[side] = !G.doors[side];
  sfx.door(side, G.doors[side]);
}

function toggleLight(side) {
  if (G.state !== 'playing' || G.camUp) return;
  if (G.broken[side]) { sfx.error(); return; }
  const on = !G.lights[side];
  const other = side === 'left' ? 'right' : 'left';
  if (on && G.lights[other]) { G.lights[other] = false; sfx.lightBuzz(other, false); }
  G.lights[side] = on;
  sfx.lightBuzz(side, on);
}

function toggleCams() {
  if (G.state !== 'playing') return;
  G.camUp = !G.camUp;
  if (G.camUp) for (const s of ['left', 'right']) if (G.lights[s]) { G.lights[s] = false; sfx.lightBuzz(s, false); }
  sfx.monitor(G.camUp);
  if (G.camUp) G.staticBurst = 0.8;
}

function selectCam(id) {
  if (G.curCam === id) return;
  G.curCam = id;
  G.staticBurst = 0.9;
  sfx.camSwitch();
}

// ---------- input ----------
window.addEventListener('pointermove', (e) => {
  G.mouseX = e.clientX / window.innerWidth;
  hover(e);
});

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickButton(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, playerCam);
  const hit = ray.intersectObjects(world.buttons, false)[0];
  return hit && hit.distance < 5 ? hit.object : null;
}
function hover(e) {
  if (G.state !== 'playing' || G.camUp) { canvas.style.cursor = 'default'; return; }
  canvas.style.cursor = pickButton(e) ? 'pointer' : 'default';
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') G.mouseX = e.clientX / window.innerWidth;
  if (G.state !== 'playing' || G.camUp) return;
  const b = pickButton(e);
  if (!b) return;
  if (b.userData.action === 'door') toggleDoor(b.userData.side);
  else toggleLight(b.userData.side);
});

// Kameralisten: en växling per gång musen förs IN över listen.
// "armed" förhindrar att listen triggas av en slump (t.ex. när startknappen försvinner under pekaren).
let toggleArmed = false;
window.addEventListener('pointermove', (e) => { if (!ui.toggle.contains(e.target)) toggleArmed = true; });
ui.toggle.addEventListener('pointerenter', (e) => {
  if (e.pointerType !== 'mouse' || !toggleArmed) return;
  toggleArmed = false;
  toggleCams();
});
ui.toggle.addEventListener('pointerleave', () => { toggleArmed = true; });
ui.toggle.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') toggleCams(); });

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'm') { const m = sfx.toggleMute(); notify(m ? 'Ljud av' : 'Ljud på'); return; }
  if (G.state !== 'playing' || e.repeat) return;
  if (k === ' ' || k === 's') { e.preventDefault(); toggleCams(); }
  else if (k === 'q') toggleDoor('left');
  else if (k === 'e') toggleDoor('right');
  else if (k === 'a') toggleLight('left');
  else if (k === 'd') toggleLight('right');
  else if (/^[1-8]$/.test(k) && G.camUp) selectCam(CAM_ORDER[+k - 1]);
  else if ((k === 'arrowright' || k === 'arrowleft') && G.camUp) {
    const i = CAM_ORDER.indexOf(G.curCam) + (k === 'arrowright' ? 1 : -1);
    selectCam(CAM_ORDER[(i + CAM_ORDER.length) % CAM_ORDER.length]);
  }
});

// ---------- spelflöde ----------
function startNight(n) {
  sfx.init();
  G.night = n;
  $('intro-night').innerHTML = `00:00<br><small>Natt ${n}</small>`;
  $('intro-msg').innerHTML = INTRO[n] + (n === 1 ? `<div class="controls">
    <b>Styrning:</b> för musen åt sidorna för att titta dig omkring ·
    klicka på knapparna vid dörrarna (eller <b>Q</b>/<b>E</b> = dörrar, <b>A</b>/<b>D</b> = lampor) ·
    <b>Mellanslag</b> eller för musen över listen längst ner = kameror · <b>1–8</b> byter kamera · <b>M</b> = ljud av/på</div>` : '');
  showScreen('intro');
  G.state = 'intro';
}

function beginShift() {
  sfx.init();
  Object.assign(G, {
    state: 'playing', time: 0, hour: 0, power: 100, usage: 1, camUp: false, camAnim: 0, curCam: '1A',
    yaw: 0, targetYaw: 0, staticBurst: 0, killer: null, jsT: 0, po: null,
  });
  G.doors.left = G.doors.right = false;
  G.lights.left = G.lights.right = false;
  G.broken.left = G.broken.right = false;
  for (const s of ['left', 'right']) world.doors[s].mesh.position.y = world.doors[s].openY;
  for (const id in jump) jump[id].root.visible = false;
  jumpLight.intensity = 0;
  ai.reset(G.night);
  showScreen(null);
  toggleArmed = false;
  ui.hud.classList.remove('hidden');
  ui.toggle.classList.remove('hidden');
  ui.hint.classList.remove('hidden', 'fade');
  setTimeout(() => ui.hint.classList.add('fade'), 12000);
  sfx.stopLoops(0.05);
  sfx.startAmbience();
}

function powerOut() {
  G.state = 'powerout';
  G.power = 0;
  if (G.camUp) { G.camUp = false; sfx.monitor(false); }
  for (const s of ['left', 'right']) {
    if (G.lights[s]) { G.lights[s] = false; sfx.lightBuzz(s, false); }
    if (G.doors[s]) { G.doors[s] = false; sfx.door(s, false); }
  }
  ai.freeze();
  sfx.stopLoops(0.5);
  sfx.powerDown();
  ui.toggle.classList.add('hidden');
  G.po = { phase: 0, t: 3 + Math.random() * 5, glow: false };
}

function updatePowerOut(dt) {
  const p = G.po, bear = chars.bear;
  p.t -= dt;
  if (p.phase === 0 && p.t <= 0) {
    p.phase = 1;
    p.t = 7 + Math.random() * 9;
    ai.placeAt('bear', 'leftDoor');
    bear.head.rotation.set(0.1, 0, 0.15);
    bear.pupils.forEach((p) => p.scale.set(0.05, 0.05, 0.03));
    p.stopMusic = sfx.musicBox();
  } else if (p.phase === 1) {
    p.glow = Math.sin(clock * 9) > 0.1 && Math.random() > 0.06;
    bear.eyeMat.emissiveIntensity = p.glow ? 8 : 0;
    if (p.t <= 0) {
      p.phase = 2;
      p.t = 2 + Math.random() * 2.5;
      p.glow = false;
      if (p.stopMusic) p.stopMusic();
      bear.eyeMat.emissiveIntensity = 0;
      bear.root.visible = false;
    }
  } else if (p.phase === 2 && p.t <= 0) {
    jumpscare('bear');
  }
}

function jumpscare(id) {
  if (G.state === 'jumpscare' || G.state === 'gameover' || G.state === 'win') return;
  G.state = 'jumpscare';
  G.killer = id;
  if (G.camUp) sfx.monitor(false);
  G.camUp = false;
  G.camAnim = 0;
  if (G.po && G.po.stopMusic) G.po.stopMusic();
  sfx.stopLoops(0.05);
  sfx.scream();
  const j = jump[id];
  j.root.visible = true;
  j.root.position.set(0, -2.05, -1.6);
  j.root.rotation.set(0, 0, 0);
  j.eyeMat.emissiveIntensity = 2.5;
  jumpLight.intensity = 5;
  G.jsT = 0;
  ui.flash.classList.remove('on');
  void ui.flash.offsetWidth;
  ui.flash.classList.add('on');
}

function updateJumpscare(dt) {
  G.jsT += dt;
  const t = G.jsT, j = jump[G.killer];
  const k = Math.min(1, t / 0.12), ease = 1 - Math.pow(1 - k, 3);
  j.root.position.set((Math.random() - 0.5) * 0.05, -2.03 + (Math.random() - 0.5) * 0.05, -1.6 + ease * 1.0);
  j.jaw.rotation.x = 0.45 + Math.sin(t * 38) * 0.3;
  j.head.rotation.z = Math.sin(t * 23) * 0.12;
  j.head.rotation.x = -0.12 + Math.sin(t * 31) * 0.06;
  if (t > 1.3) gameOver();
}

function gameOver() {
  G.state = 'gameover';
  jump[G.killer].root.visible = false;
  jumpLight.intensity = 0;
  ui.hud.classList.add('hidden');
  ui.toggle.classList.add('hidden');
  $('go-text').innerHTML = `${DEFS[G.killer].name} fick tag på dig.<br><small>Natt ${G.night} · du klarade dig till 0${Math.min(5, G.hour)}:00</small>`;
  showScreen('gameover');
}

function winNight() {
  G.state = 'win';
  if (G.po && G.po.stopMusic) G.po.stopMusic();
  if (G.camUp) sfx.monitor(false);
  G.camUp = false;
  sfx.stopLoops(0.2);
  sfx.chime();
  ui.hud.classList.add('hidden');
  ui.toggle.classList.add('hidden');
  const next = Math.min(5, G.night + 1);
  if (next > saved) { saved = next; try { localStorage.setItem(SAVE_KEY, String(saved)); } catch (e) { /* ingen lagring */ } }
  const clockEl = $('win-clock');
  clockEl.textContent = '05:59';
  clockEl.classList.remove('done');
  $('win-text').textContent = '';
  $('win-buttons').classList.add('hidden');
  showScreen('win');
  setTimeout(() => { clockEl.textContent = '06:00'; clockEl.classList.add('done'); }, 1400);
  setTimeout(() => {
    $('win-text').textContent = G.night >= 5 ? 'Du klarade alla fem nätter! Lönen är 120 kr. Grattis.' : `Du överlevde natt ${G.night}!`;
    $('btn-next').classList.toggle('hidden', G.night >= 5);
    $('btn-next').textContent = `Natt ${next}`;
    $('win-buttons').classList.remove('hidden');
  }, 3000);
}

$('btn-new').addEventListener('click', () => startNight(1));
$('btn-continue').addEventListener('click', () => startNight(saved));
$('btn-start').addEventListener('click', beginShift);
$('btn-retry').addEventListener('click', () => startNight(G.night));
$('btn-menu').addEventListener('click', () => { G.state = 'menu'; refreshMenu(); showScreen('menu'); });
$('btn-next').addEventListener('click', () => startNight(Math.min(5, G.night + 1)));
$('btn-winmenu').addEventListener('click', () => { G.state = 'menu'; refreshMenu(); showScreen('menu'); });
refreshMenu();

// ---------- uppdatering ----------
let clock = 0;
let lampDip = 0;

function updateLights(dt) {
  const dark = G.state === 'powerout' || G.state === 'gameover' || (G.state === 'jumpscare' && G.po);
  if (Math.random() < dt * 0.15) lampDip = 0.06 + Math.random() * 0.12;
  lampDip = Math.max(0, lampDip - dt);
  for (const L of world.lights) {
    let i = L.base;
    if (L.role === 'lamp') {
      i *= 0.88 + Math.sin(clock * 37) * 0.04 + Math.random() * 0.08;
      if (lampDip > 0) i *= 0.25;
    } else if (L.role === 'doorL' || L.role === 'doorR') {
      const side = L.role === 'doorL' ? 'left' : 'right';
      i = G.lights[side] ? i * (0.9 + Math.random() * 0.1) : 0;
      if (G.state === 'powerout' && side === 'left' && G.po && G.po.glow) i = 1.1;
    } else if (L.flick) {
      i *= Math.random() < 0.04 ? 0.2 : 1;
    }
    L.light.intensity = dark && !(L.role === 'doorL' && G.po && G.po.glow) ? 0 : i;
  }
  world.bulbMat.color.setHex(dark || lampDip > 0 ? 0x221a10 : 0xffe0a0);
  world.hemi.intensity = dark ? 0.05 : 0.14;
}

function update(dt) {
  clock += dt;
  world.update(dt, clock);
  const playing = G.state === 'playing', po = G.state === 'powerout';

  if (playing || po) {
    G.time += dt;
    const hour = Math.floor(G.time / HOUR_LEN);
    if (hour !== G.hour) {
      G.hour = hour;
      if (hour >= 6) { winNight(); return; }
      ai.onHour(hour);
    }
  }

  if (playing) {
    G.usage = 1 + (G.doors.left ? 1 : 0) + (G.doors.right ? 1 : 0) + (G.lights.left ? 1 : 0) + (G.lights.right ? 1 : 0) + (G.camUp ? 1 : 0);
    G.power -= G.usage * DRAIN * NIGHT_MULT[G.night] * dt;
    if (G.power <= 0) powerOut();
    else {
      ai.update(dt);
      if (Math.random() < dt / 22) sfx.distant();
      // ljusskräck: figur i dörröppningen när du tänder lampan
      for (const side of ['left', 'right']) {
        if (!G.lights[side]) continue;
        const id = ai.atDoor(side);
        const looking = side === 'left' ? G.yaw > 0.7 : G.yaw < -0.7;
        if (id && looking && !ai.isStung(id)) { ai.setStung(id); sfx.sting(); }
      }
    }
  }
  if (G.state === 'powerout') updatePowerOut(dt);

  // titta runt
  if (G.state === 'playing' || G.state === 'powerout') {
    const c = (G.mouseX - 0.5) * 2, dz = 0.12;
    const n = Math.abs(c) < dz ? 0 : ((Math.abs(c) - dz) / (1 - dz)) * Math.sign(c);
    G.targetYaw = -n * MAX_YAW;
  }
  if (!G.camUp) G.yaw += (G.targetYaw - G.yaw) * Math.min(1, dt * 4);
  playerCam.rotation.set(-0.04, G.yaw, G.state === 'jumpscare' ? (Math.random() - 0.5) * 0.05 : 0);

  // dörrar & knappar
  for (const side of ['left', 'right']) {
    const d = world.doors[side];
    const target = G.doors[side] ? d.closedY : d.openY;
    d.mesh.position.y += (target - d.mesh.position.y) * Math.min(1, dt * 14);
    const dead = G.state === 'powerout' || (G.state === 'jumpscare' && G.po);
    d.doorBtn.emissiveIntensity = dead ? 0 : G.doors[side] ? 1.6 : 0.12;
    d.lightBtn.emissiveIntensity = dead ? 0 : G.lights[side] ? 1.4 : 0.05;
  }
  world.crtMat.color.setHex(G.state === 'powerout' || (G.state === 'jumpscare' && G.po) ? 0x000000 : 0xaaccaa);

  updateLights(dt);

  G.camAnim = G.camUp ? Math.min(1, G.camAnim + dt / 0.22) : Math.max(0, G.camAnim - dt / 0.18);
  G.staticBurst = Math.max(0, G.staticBurst - dt * 1.8);
  if (G.state === 'jumpscare') updateJumpscare(dt);
  noticeTimer -= dt;
  if (noticeTimer <= 0) ui.notice.classList.remove('show');
  updateUI();
}

let lastUI = '';
function updateUI() {
  const camView = G.camUp && G.camAnim >= 1 && G.state === 'playing';
  ui.camui.classList.toggle('hidden', !camView);
  const tabletVisible = G.camAnim > 0 && G.camAnim < 1 && G.state === 'playing';
  ui.tablet.style.display = tabletVisible ? 'block' : 'none';
  if (tabletVisible) ui.tablet.style.transform = `translateY(${(1 - G.camAnim) * 105}%)`;
  ui.vignette.style.opacity = camView ? 0.5 : 1;

  let so = 0;
  if (camView) so = Math.min(1, 0.1 + G.staticBurst * 0.85);
  else if (G.state === 'gameover') so = 0.6;
  ui.stat.style.opacity = so;
  if (so > 0.01) drawStatic();

  if (G.state === 'playing' || G.state === 'powerout') {
    const key = `${G.hour}|${Math.floor(G.power)}|${G.usage}|${G.curCam}|${G.night}|${G.state}`;
    if (key !== lastUI) {
      lastUI = key;
      ui.time.textContent = `0${Math.min(5, G.hour)}:00`;
      ui.nightlbl.textContent = `Natt ${G.night}`;
      ui.power.textContent = Math.max(0, Math.floor(G.power));
      const u = G.state === 'powerout' ? 0 : G.usage;
      usageBars.forEach((b, i) => { b.className = i < u ? (i < 2 ? 'g' : i < 3 ? 'y' : 'r') : ''; });
      const cam = world.camsById[G.curCam];
      ui.camid.textContent = 'CAM ' + cam.id;
      ui.camlabel.textContent = cam.name;
      for (const id in camButtons) camButtons[id].classList.toggle('active', id === G.curCam);
    }
  }
}

let renderedIdle = false;
function render() {
  // Bakom menyer behövs ingen 3D-rendering
  const idle = G.state === 'menu' || G.state === 'intro' || G.state === 'win' || G.state === 'gameover';
  if (idle && renderedIdle) return;
  renderedIdle = idle;
  const camView = G.camUp && G.camAnim >= 1 && G.state === 'playing';
  if (camView) {
    const c = world.camsById[G.curCam];
    c.cam.rotation.set(c.pitch, c.yaw + Math.sin(clock * 0.35 + c.phase) * c.pan, 0);
    renderer.toneMappingExposure = 2.3;
    canvas.classList.add('camview');
    renderer.render(scene, c.cam);
  } else {
    renderer.toneMappingExposure = 1.05;
    canvas.classList.remove('camview');
    renderer.render(scene, playerCam);
  }
}

// förkompilera shaders så att första kameravyn/jumpscaren inte hackar
renderer.compile(scene, playerCam);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// felsökningshjälp
window.__dbg = { G, ai, chars, world, startNight, beginShift, jumpscare, powerOut, toggleCams, selectCam, toggleDoor, toggleLight, winNight };
