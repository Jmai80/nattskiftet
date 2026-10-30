// Figurernas AI. Varje figur får en "rörelsechans" med jämna mellanrum.
// Slå 1–20: om resultatet <= figurens AI-nivå så flyttar den sig.
import { SPOTS, FOX_PATH } from './world.js';

const R = Math.random;
const roll = (lvl) => 1 + Math.floor(R() * 20) <= lvl;
const pick = (a) => a[Math.floor(R() * a.length)];

// AI-nivå per natt
export const LEVELS = {
  1: { hare: 4, crow: 3, bear: 0, fox: 2 },
  2: { hare: 6, crow: 5, bear: 1, fox: 4 },
  3: { hare: 9, crow: 8, bear: 3, fox: 7 },
  4: { hare: 12, crow: 11, bear: 6, fox: 10 },
  5: { hare: 15, crow: 14, bear: 9, fox: 13 },
};
const INTERVAL = { hare: 4.97, crow: 4.98, bear: 3.02, fox: 5.01 };

const MOVES = {
  hare: { stage: ['dining'], dining: ['westHall', 'westHall', 'backstage'], backstage: ['dining', 'westHall'], westHall: ['westCorner', 'westCorner', 'dining'], westCorner: ['leftDoor', 'leftDoor', 'westHall'] },
  crow: { stage: ['dining'], dining: ['eastHall'], eastHall: ['eastCorner', 'eastCorner', 'dining'], eastCorner: ['rightDoor', 'rightDoor', 'eastHall'] },
  bear: { stage: ['dining'], dining: ['eastHall'], eastHall: ['eastCorner'], eastCorner: ['rightDoor'] },
};

export const LOC_CAM = { stage: '1A', dining: '1B', foxden: '1C', backstage: '5', westHall: '2A', westCorner: '2B', eastHall: '4A', eastCorner: '4B' };
const DOOR_SIDE = { leftDoor: 'left', rightDoor: 'right' };
const SIDE_PAN = { left: -0.85, right: 0.85 };
const RUN_TIME = 2.6;

export function createAI({ G, world, chars, sfx, hooks }) {
  const A = {};
  let frozen = false;

  // förberäkna rävens springväg
  const segs = [];
  let total = 0;
  for (let i = 1; i < FOX_PATH.length; i++) {
    const [ax, az] = FOX_PATH[i - 1], [bx, bz] = FOX_PATH[i];
    const len = Math.hypot(bx - ax, bz - az);
    segs.push({ ax, az, bx, bz, len, start: total });
    total += len;
  }

  function faceYaw(spot, p) {
    let fx, fz;
    if (typeof spot.face === 'string') { const c = world.camsById[spot.face]; fx = c.pos[0]; fz = c.pos[2]; } else [fx, fz] = spot.face;
    return Math.atan2(fx - p[0], fz - p[2]);
  }

  function place(id, loc, key = id) {
    const ch = chars[id], spot = SPOTS[loc], p = spot[key];
    ch.root.position.set(p[0], p[1], p[2]);
    ch.root.rotation.set(0, faceYaw(spot, p) + (R() - 0.5) * 0.3, 0);
    ch.head.rotation.set(R() * 0.3 - 0.1, (R() - 0.5) * 0.4, (R() - 0.5) * 0.5);
    ch.jaw.rotation.x = R() < 0.3 ? 0.25 : 0;
    ch.arms.forEach((a, i) => { a.rotation.x = (R() - 0.5) * 0.4; a.rotation.z = (i ? 1 : -1) * (0.08 + R() * 0.15); });
    ch.root.visible = true;
  }

  function sideOf(loc) {
    if (!loc) return null;
    if (loc.startsWith('west') || loc === 'leftDoor') return 'left';
    if (loc.startsWith('east') || loc === 'rightDoor') return 'right';
    return null;
  }

  function moveTo(id, loc) {
    const a = A[id], from = a.loc;
    a.loc = loc;
    a.doorTime = 0;
    a.stung = false;
    place(id, loc);
    if (G.camUp && (LOC_CAM[from] === G.curCam || LOC_CAM[loc] === G.curCam)) hooks.disrupt();
    const side = sideOf(loc) || sideOf(from);
    const p = side ? SIDE_PAN[side] : 0;
    if (DOOR_SIDE[loc]) sfx.steps(p, 0.55, 3);
    else if (DOOR_SIDE[from]) sfx.steps(p, 0.4, 3);
    else if (loc.endsWith('Corner')) sfx.steps(p * 0.7, 0.22, 2);
    else if (R() < 0.35) sfx.steps(p * 0.4, 0.07, 2);
  }

  const occupied = (loc) => ['hare', 'crow', 'bear'].some((i) => A[i].loc === loc);

  function enterOffice(id, side) {
    const a = A[id];
    a.inOffice = true;
    a.wasUp = G.camUp;
    a.killT = G.camUp ? 9 : 1.2 + R() * 1.8;
    G.broken[side] = true;
    hooks.lightsOff(side);
    chars[id].root.visible = false;
  }

  function opportunity(id) {
    const a = A[id];
    const side = DOOR_SIDE[a.loc];
    if (side) {
      if (a.doorTime < 2.5) return;
      if (G.doors[side]) moveTo(id, id === 'bear' ? 'eastHall' : 'dining');
      else enterOffice(id, side);
      return;
    }
    if (id === 'bear') {
      if (G.camUp && G.curCam === LOC_CAM[a.loc]) return; // Bruno rör sig inte när du tittar på honom
      if (a.loc === 'stage' && (A.hare.loc === 'stage' || A.crow.loc === 'stage')) return;
    }
    const next = pick(MOVES[id][a.loc]);
    if (DOOR_SIDE[next] && occupied(next)) return;
    moveTo(id, next);
  }

  // ---------- räven ----------
  function setFoxStage(s) {
    const f = A.fox, ch = chars.fox;
    f.stage = s;
    if (G.camUp && G.curCam === '1C') hooks.disrupt();
    if (s <= 2) {
      place('fox', 'foxden', 'fox' + s);
      world.setCurtain([0, 0.28, 1][s]);
      if (s === 1) ch.head.rotation.set(0.15, 0.2, 0.35);
    } else {
      ch.root.visible = false;
      world.setCurtain(1);
      f.run = 'wait';
      f.t = 5 + R() * 6;
    }
  }

  function foxPos(k) {
    const dist = k * total;
    const s = segs.find((sg) => dist <= sg.start + sg.len) || segs[segs.length - 1];
    const u = Math.min(1, (dist - s.start) / s.len);
    return { x: s.ax + (s.bx - s.ax) * u, z: s.az + (s.bz - s.az) * u, yaw: Math.atan2(s.bx - s.ax, s.bz - s.az) };
  }

  function updateFox(dt) {
    const f = A.fox, ch = chars.fox;
    if (f.run === 'idle') {
      if (f.level <= 0) return;
      f.timer += dt;
      if (f.timer >= INTERVAL.fox) {
        f.timer -= INTERVAL.fox;
        if (!G.camUp && roll(f.level)) setFoxStage(f.stage + 1); // Rolf rör sig bara när du INTE tittar på kamerorna
      }
    } else if (f.run === 'wait') {
      f.t -= dt;
      if (G.camUp && G.curCam === '2A') f.t = Math.min(f.t, 0.7);
      if (f.t <= 0) {
        f.run = 'run';
        f.t = 0;
        ch.root.visible = true;
        ch.head.rotation.set(0, 0, 0);
        sfx.run(-0.7);
      }
    } else if (f.run === 'run') {
      f.t += dt / RUN_TIME;
      const k = Math.min(1, f.t);
      const p = foxPos(k);
      ch.root.position.set(p.x, Math.abs(Math.sin(f.t * RUN_TIME * 13)) * 0.09, p.z);
      ch.root.rotation.set(0.18, p.yaw, 0);
      ch.arms[0].rotation.x = Math.sin(f.t * 40) * 0.9;
      ch.arms[1].rotation.x = -Math.sin(f.t * 40) * 0.9;
      if (f.t >= 1) {
        if (G.doors.left) {
          sfx.knock(-0.85);
          const loss = 2 + f.attacks * 4;
          G.power = Math.max(0, G.power - loss);
          hooks.notify(`Bank på vänster dörr! −${loss}% ström`);
          f.attacks++;
          f.run = 'idle';
          f.timer = 0;
          ch.arms.forEach((a) => (a.rotation.x = 0));
          setFoxStage(R() < 0.5 ? 0 : 1);
        } else {
          f.run = 'done';
          hooks.jumpscare('fox');
        }
      }
    }
  }

  return {
    reset(night) {
      frozen = false;
      const L = LEVELS[night] || LEVELS[5];
      for (const id of ['hare', 'crow', 'bear']) {
        A[id] = { loc: 'stage', level: L[id], timer: R() * INTERVAL[id] * 0.5, doorTime: 0, inOffice: false, stung: false };
        place(id, 'stage');
        chars[id].eyeMat.emissiveIntensity = 0.35;
        chars[id].pupils.forEach((p) => p.scale.set(0.03, 0.03, 0.02));
      }
      A.fox = { stage: 0, level: L.fox, timer: R() * 2, run: 'idle', t: 0, attacks: 0 };
      chars.fox.arms.forEach((a) => (a.rotation.x = 0));
      setFoxStage(0);
      world.setCurtain(0, true);
    },

    onHour(h) {
      if (h === 2 || h === 3 || h === 4) A.hare.level++;
      if (h === 3 || h === 4) { A.crow.level++; A.fox.level++; }
    },

    freeze() { frozen = true; },

    update(dt) {
      if (frozen) return;
      for (const id of ['hare', 'crow', 'bear']) {
        const a = A[id];
        if (a.inOffice) {
          // Figuren är inne i kontoret. Fäller du ner kameran är det kört.
          if (G.camUp) { a.wasUp = true; a.killT -= dt; if (a.killT <= 0) hooks.jumpscare(id); }
          else if (a.wasUp) hooks.jumpscare(id);
          else { a.killT -= dt; if (a.killT <= 0) hooks.jumpscare(id); }
          continue;
        }
        if (DOOR_SIDE[a.loc]) a.doorTime += dt;
        if (a.level <= 0) continue;
        a.timer += dt;
        if (a.timer >= INTERVAL[id]) {
          a.timer -= INTERVAL[id];
          if (roll(a.level)) opportunity(id);
        }
      }
      updateFox(dt);
    },

    atDoor(side) {
      const loc = side === 'left' ? 'leftDoor' : 'rightDoor';
      return ['hare', 'crow', 'bear'].find((i) => A[i].loc === loc && !A[i].inOffice) || null;
    },
    isStung(id) { return A[id].stung; },
    setStung(id) { A[id].stung = true; },
    placeAt(id, loc) { place(id, loc); },
    debug: A,
    _moveTo: moveTo,
    _setFoxStage: setFoxStage,
  };
}
