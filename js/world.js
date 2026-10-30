// Bygger hela pizzerian: kontor, korridorer, matsal, scen, rävgrotta och backstage.
import * as THREE from 'three';
import * as TX from './textures.js';

const MSM = THREE.MeshStandardMaterial;

// Kameror: id, namn, position, mål, panorering (radianer), position på kartan (världens x/z)
export const CAMERAS = [
  { id: '1A', name: 'Scenen', pos: [0, 3.3, -13.4], target: [0, 1.5, -22.5], pan: 0.22, map: [0, -19] },
  { id: '1B', name: 'Matsalen', pos: [9.4, 3.35, -12.5], target: [-1, 0.6, -18], pan: 0.3, map: [6.5, -14.5] },
  { id: '1C', name: 'Rävgrottan', pos: [-5.4, 3.25, -13.2], target: [-10, 1.3, -18], pan: 0.12, map: [-12, -18] },
  { id: '5', name: 'Backstage', pos: [13.6, 2.75, -18.4], target: [11.4, 0.9, -23], pan: 0.2, map: [12, -21] },
  { id: '2A', name: 'Västra korridoren', pos: [-4.25, 2.8, -4.3], target: [-4.25, 0.9, -12], pan: 0.15, map: [-4.25, -8] },
  { id: '2B', name: 'Västra hörnet', pos: [-4.3, 2.85, -0.7], target: [-4.25, 0.6, -4.6], pan: 0.12, map: [-4.25, -1.6] },
  { id: '4A', name: 'Östra korridoren', pos: [4.25, 2.8, -4.3], target: [4.25, 0.9, -12], pan: 0.15, map: [4.25, -8] },
  { id: '4B', name: 'Östra hörnet', pos: [4.3, 2.85, -0.7], target: [4.25, 0.6, -4.6], pan: 0.12, map: [4.25, -1.6] },
];

// Rum för kartan (x0,x1,z0,z1)
export const MAP_ROOMS = [
  { id: 'dining', x0: -10, x1: 10, z0: -24, z1: -12 },
  { id: 'stage', x0: -5, x1: 5, z0: -24, z1: -20.5 },
  { id: 'foxden', x0: -14, x1: -10, z0: -21, z1: -15 },
  { id: 'backstage', x0: 10, x1: 14, z0: -24, z1: -18 },
  { id: 'westHall', x0: -5.5, x1: -3, z0: -12, z1: 3 },
  { id: 'eastHall', x0: 3, x1: 5.5, z0: -12, z1: 3 },
  { id: 'office', x0: -3, x1: 3, z0: -2.5, z1: 3 },
];

// Var figurerna står på varje plats. face = kamera-id eller [x,z] att titta mot
export const SPOTS = {
  stage: { hare: [-2.3, 0.7, -22.1], bear: [0, 0.7, -22.5], crow: [2.3, 0.7, -22.1], face: '1A' },
  dining: { hare: [-4.2, 0, -16.0], crow: [4.4, 0, -16.0], bear: [0.6, 0, -15.2], face: '1B' },
  backstage: { hare: [12.0, 0, -22.4], face: '5' },
  westHall: { hare: [-4.3, 0, -9.8], face: '2A' },
  westCorner: { hare: [-4.4, 0, -3.4], face: '2B' },
  leftDoor: { hare: [-4.2, 0, 0.4], bear: [-4.2, 0, 0.4], fox: [-4.2, 0, 0.4], face: [0, 0.4] },
  eastHall: { crow: [4.2, 0, -9.4], bear: [4.4, 0, -10.8], face: '4A' },
  eastCorner: { crow: [4.3, 0, -3.3], bear: [4.5, 0, -4.1], face: '4B' },
  rightDoor: { crow: [4.2, 0, 0.4], bear: [4.2, 0, 0.4], face: [0, 0.4] },
  foxden: { fox0: [-12.2, 0, -18], fox1: [-10.6, 0, -18], fox2: [-9.2, 0, -18.2], face: '1C' },
};

export const FOX_PATH = [[-9.2, -18.2], [-8.2, -13], [-4.3, -11.6], [-4.25, -1.5], [-4.2, 0.4]];

export function buildWorld(scene) {
  const W = { lights: [], buttons: [], updaters: [], doors: {}, camsById: {} };

  const M = {
    floor: new MSM({ map: TX.checkerTexture(), roughness: 0.55 }),
    office: new MSM({ map: TX.wallTexture('#4b513e', '#2d2922'), roughness: 0.9 }),
    hall: new MSM({ map: TX.wallTexture('#384452', '#25272b'), roughness: 0.9 }),
    dining: new MSM({ map: TX.wallTexture('#5a3246', '#2a1b22'), roughness: 0.9 }),
    den: new MSM({ map: TX.wallTexture('#3a284e', '#1e1626'), roughness: 0.9 }),
    back: new MSM({ map: TX.wallTexture('#3d3832', '#24211e'), roughness: 0.9 }),
    ceiling: new MSM({ map: TX.ceilingTexture(), roughness: 1 }),
    wood: new MSM({ color: 0x5a3b26, roughness: 0.75 }),
    darkwood: new MSM({ color: 0x2c1b12, roughness: 0.8 }),
    metal: new MSM({ color: 0x80848a, metalness: 0.6, roughness: 0.45 }),
    darkMetal: new MSM({ color: 0x2a2c30, metalness: 0.5, roughness: 0.6 }),
    cloth: new MSM({ color: 0xd9d4c8, roughness: 0.95 }),
    black: new MSM({ color: 0x0b0b0b, roughness: 0.7 }),
    plastic: new MSM({ color: 0xc9c0aa, roughness: 0.5 }),
    cardboard: new MSM({ color: 0x9c7a4c, roughness: 0.95 }),
    paper: new MSM({ color: 0xe8e4da, roughness: 0.9 }),
  };
  W.materials = M;

  // ---------- hjälpfunktioner ----------
  function planarUV(geo, uS, vS) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
      if (ny > 0.5) uv.setXY(i, x / uS, z / uS);
      else if (nx > 0.5) uv.setXY(i, z / uS, y / vS);
      else uv.setXY(i, x / uS, y / vS);
    }
    uv.needsUpdate = true;
  }

  function block(x0, x1, y0, y1, z0, z1, mat, uS = 2.4, vS = 3.6) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
    const ay = Math.min(y0, y1), by = Math.max(y0, y1);
    const az = Math.min(z0, z1), bz = Math.max(z0, z1);
    const geo = new THREE.BoxGeometry(bx - ax, by - ay, bz - az);
    geo.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    planarUV(geo, uS, vS);
    const m = new THREE.Mesh(geo, mat);
    scene.add(m);
    return m;
  }

  const T2 = 0.08;
  // vägg längs z vid fast x. matNeg = sidan som vetter mot -x
  function wallX(x, z0, z1, y0, y1, matNeg, matPos) {
    block(x - T2, x, y0, y1, z0, z1, matNeg);
    block(x, x + T2, y0, y1, z0, z1, matPos);
  }
  // vägg längs x vid fast z. matNeg = sidan som vetter mot -z
  function wallZ(z, x0, x1, y0, y1, matNeg, matPos) {
    block(x0, x1, y0, y1, z - T2, z, matNeg);
    block(x0, x1, y0, y1, z, z + T2, matPos);
  }

  function plane(mat, x, y, z, w, h, rotY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    scene.add(m);
    return m;
  }
  function poster(kind, x, y, z, w, rotY) {
    const tex = TX.posterTexture(kind);
    return plane(new MSM({ map: tex, roughness: 0.9 }), x, y, z, w, w * 1.375, rotY);
  }
  function addLight(light, x, y, z, role = 'room', flick = 0) {
    light.position.set(x, y, z);
    scene.add(light);
    W.lights.push({ light, base: light.intensity, role, flick, phase: Math.random() * 100 });
    return light;
  }

  // ---------- golv & tak ----------
  block(-14.2, 14.2, -0.1, 0, -24.2, 3.2, M.floor, 2);
  block(-5.6, 5.6, 3, 3.1, -12, 3.1, M.ceiling);
  block(-10, 10, 3.6, 3.7, -24, -12, M.ceiling);
  block(-14, -10, 3, 3.1, -21, -15, M.ceiling);
  block(10, 14, 3, 3.1, -24, -18, M.ceiling);

  // ---------- kontoret ----------
  const H0 = 3, HD = 3.6, DZ0 = -0.5, DZ1 = 1.3, DH = 2.4;
  wallZ(-2.5, -3, 3, 0, H0, M.hall, M.office);
  wallZ(3, -3, 3, 0, H0, M.office, M.hall);
  wallZ(3, -5.5, -3, 0, H0, M.hall, M.hall);
  wallZ(3, 3, 5.5, 0, H0, M.hall, M.hall);
  // västra väggen (dörr)
  wallX(-3, -2.5, DZ0, 0, H0, M.hall, M.office);
  wallX(-3, DZ1, 3, 0, H0, M.hall, M.office);
  wallX(-3, DZ0, DZ1, DH, H0, M.hall, M.office);
  wallX(-3, -12, -2.5, 0, H0, M.hall, M.hall);
  // östra väggen (dörr)
  wallX(3, -2.5, DZ0, 0, H0, M.office, M.hall);
  wallX(3, DZ1, 3, 0, H0, M.office, M.hall);
  wallX(3, DZ0, DZ1, DH, H0, M.office, M.hall);
  wallX(3, -12, -2.5, 0, H0, M.hall, M.hall);
  // korridorernas ytterväggar
  wallX(-5.5, -12, 3, 0, H0, M.hall, M.hall);
  wallX(5.5, -12, 3, 0, H0, M.hall, M.hall);

  // dörrkarmar, dörrar och knappar
  const doorTex = TX.doorTexture();
  const doorMat = new MSM({ map: doorTex, metalness: 0.5, roughness: 0.5 });
  const labelDoor = new MSM({ map: TX.textTexture('DÖRR', { w: 128, h: 48, bg: '#1a1a1a', fg: '#e33', font: 'bold 30px Arial, sans-serif' }) });
  const labelLight = new MSM({ map: TX.textTexture('LJUS', { w: 128, h: 48, bg: '#1a1a1a', fg: '#eee', font: 'bold 30px Arial, sans-serif' }) });
  for (const side of ['left', 'right']) {
    const s = side === 'left' ? -1 : 1;
    const xf = 2.9 * s;
    block(xf - 0.06, xf + 0.06, 0, DH + 0.1, DZ0 - 0.12, DZ0, M.darkMetal);
    block(xf - 0.06, xf + 0.06, 0, DH + 0.1, DZ1, DZ1 + 0.12, M.darkMetal);
    block(xf - 0.06, xf + 0.06, DH, DH + 0.12, DZ0 - 0.12, DZ1 + 0.12, M.darkMetal);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.42, DZ1 - DZ0), doorMat);
    const openY = 3.1 + 1.21 + 0.05, closedY = 1.21;
    door.position.set(2.86 * s, openY, (DZ0 + DZ1) / 2);
    scene.add(door);
    W.doors[side] = { mesh: door, openY, closedY };

    // knappanel
    block(2.88 * s, 2.92 * s, 0.95, 1.8, -1.62, -1.18, M.darkMetal);
    const btnGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20);
    const doorBtnMat = new MSM({ color: 0x701010, emissive: 0xff1a1a, emissiveIntensity: 0.12, roughness: 0.4 });
    const lightBtnMat = new MSM({ color: 0x8a8a8a, emissive: 0xfff0c0, emissiveIntensity: 0.05, roughness: 0.4 });
    const db = new THREE.Mesh(btnGeo, doorBtnMat);
    db.rotation.z = Math.PI / 2;
    db.position.set(2.86 * s, 1.5, -1.4);
    db.userData = { action: 'door', side };
    const lb = new THREE.Mesh(btnGeo, lightBtnMat);
    lb.rotation.z = Math.PI / 2;
    lb.position.set(2.86 * s, 1.13, -1.4);
    lb.userData = { action: 'light', side };
    scene.add(db, lb);
    W.buttons.push(db, lb);
    W.doors[side].doorBtn = doorBtnMat;
    W.doors[side].lightBtn = lightBtnMat;
    const rot = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    plane(labelDoor, 2.872 * s, 1.68, -1.4, 0.24, 0.09, rot);
    plane(labelLight, 2.872 * s, 1.31, -1.4, 0.24, 0.09, rot);
  }

  // skrivbord
  block(-1.7, 1.7, 0.78, 0.84, -1.45, -0.35, M.wood);
  block(-1.7, 1.7, 0, 0.78, -0.42, -0.36, M.darkwood);
  block(-1.7, -1.62, 0, 0.78, -1.45, -0.36, M.darkwood);
  block(1.62, 1.7, 0, 0.78, -1.45, -0.36, M.darkwood);

  // CRT-skärmar
  const crtTex = TX.crtTexture();
  const crtMat = new THREE.MeshBasicMaterial({ map: crtTex, color: 0xaaccaa });
  W.crtMat = crtMat;
  function crt(x, z, w, h, d, rotY) {
    const g = new THREE.Group();
    g.position.set(x, 0.84, z);
    g.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.plastic);
    body.position.y = h / 2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h * 0.7, d * 0.5), M.plastic);
    back.position.set(0, h * 0.45, -d * 0.6);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, h * 0.72), crtMat);
    screen.position.set(0, h * 0.52, d / 2 + 0.003);
    g.add(body, back, screen);
    scene.add(g);
  }
  crt(-0.45, -1.0, 0.55, 0.45, 0.45, 0.15);
  crt(0.5, -1.1, 0.45, 0.38, 0.4, -0.2);
  let crtTick = 0;
  W.updaters.push((dt) => { crtTick += dt; if (crtTick > 0.06) { crtTick = 0; crtTex.update(); } });

  // liten björnplysch på skärmen
  {
    const brown = new MSM({ color: 0x6b4423, roughness: 0.9 });
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), brown);
    h.position.set(-0.45, 1.37, -1.0);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), brown);
    e1.position.set(-0.52, 1.44, -1.0);
    const e2 = e1.clone(); e2.position.x = -0.38;
    const eyeM = new MSM({ color: 0x050505 });
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), eyeM);
    p1.position.set(-0.48, 1.39, -0.93);
    const p2 = p1.clone(); p2.position.x = -0.42;
    scene.add(h, e1, e2, p1, p2);
  }

  // fläkt
  {
    const fan = new THREE.Group();
    fan.position.set(-1.2, 0.84, -0.85);
    fan.rotation.y = 0.6;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.04, 16), M.darkMetal);
    base.position.y = 0.02;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), M.metal);
    stem.position.y = 0.18;
    const motor = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), M.darkMetal);
    motor.position.set(0, 0.36, -0.03);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 28), M.metal);
    cage.position.set(0, 0.36, 0.05);
    const blades = new THREE.Group();
    blades.position.set(0, 0.36, 0.04);
    for (let i = 0; i < 3; i++) {
      const piv = new THREE.Group();
      piv.rotation.z = (i / 3) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.008), M.metal);
      b.position.y = 0.085;
      b.rotation.y = 0.3;
      piv.add(b);
      blades.add(piv);
    }
    fan.add(base, stem, motor, cage, blades);
    scene.add(fan);
    W.updaters.push((dt) => { blades.rotation.z += dt * 22; });
  }

  // papper, mugg, pizzakartong
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.004, 0.3), M.paper);
    p.position.set(0.05 + Math.random() * 0.4, 0.843 + i * 0.004, -0.6 - Math.random() * 0.15);
    p.rotation.y = Math.random() * 0.8 - 0.4;
    scene.add(p);
  }
  {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), new MSM({ color: 0x8a1c1c, roughness: 0.4 }));
    mug.position.set(0.95, 0.89, -0.6);
    const pizza = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), M.cardboard);
    pizza.position.set(1.22, 0.865, -0.95);
    pizza.rotation.y = 0.3;
    scene.add(mug, pizza);
  }

  // taklampa
  {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), M.black);
    cord.position.set(0, 2.78, -0.2);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 20, 1, true), new MSM({ color: 0x2a3a2a, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(0, 2.55, -0.2);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bulbMat);
    bulb.position.set(0, 2.47, -0.2);
    scene.add(cord, shade, bulb);
    W.bulbMat = bulbMat;
  }

  // interaktiv Bruno-affisch vid skrivbordet (tuta på näsan!)
  {
    const w = 0.95, h = w * 1.375;
    const texNormal = TX.posterTexture('bruno');
    const texGold = TX.posterTexture('golden');
    const mat = new MSM({ map: texNormal, roughness: 0.9, side: THREE.DoubleSide });
    const pivot = new THREE.Group();
    pivot.position.set(-1.75, 1.85 + h / 2, -2.405);
    scene.add(pivot);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.y = -h / 2;
    mesh.userData = { action: 'poster' };
    pivot.add(mesh);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new MSM({ color: 0xb01818, roughness: 0.3 }));
    pin.position.set(0, -0.035, 0.012);
    pivot.add(pin);
    // näsan sitter där den är ritad på affischen (uv 0.5, 0.424)
    const NOSE_V = 1 - (190 + 70 * 0.18) / 352;
    const noseMat = new MSM({ color: 0x151010, roughness: 0.2, metalness: 0.1 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), noseMat);
    nose.position.set(0, -h / 2 + (NOSE_V - 0.5) * h, 0.014);
    const NS = [0.05, 0.034, 0.03];
    nose.scale.set(...NS);
    nose.userData = { action: 'nose' };
    pivot.add(nose);
    let amp = 0, st = 0, squash = 0;
    W.updaters.push((dt) => {
      st += dt;
      pivot.rotation.z = amp * Math.exp(-st * 2.4) * Math.sin(st * 11);
      squash = Math.max(0, squash - dt * 5);
      nose.scale.set(NS[0] * (1 + 0.3 * squash), NS[1] * (1 + 0.15 * squash), NS[2] * (1 - 0.65 * squash));
    });
    W.poster = {
      mesh, nose, noseV: NOSE_V,
      swing(a = 0.12) { amp = a; st = 0; },
      squash() { squash = 1; },
      setGolden(on) {
        mat.map = on ? texGold : texNormal;
        mat.needsUpdate = true;
        noseMat.color.setHex(on ? 0x2a1c04 : 0x151010);
      },
    };
  }
  // affischer i kontoret
  poster('rules', 1.8, 1.75, -2.41, 0.8, 0);
  poster('drawing', -0.75, 2.25, -2.41, 0.42, 0);
  poster('drawing', 0.15, 2.4, -2.41, 0.4, 0);
  poster('drawing', 0.85, 2.15, -2.41, 0.38, 0);
  poster('drawing', -0.15, 1.75, -2.41, 0.36, 0);
  poster('drawing', -2.91, 1.85, -2.05, 0.4, Math.PI / 2);
  poster('drawing', 2.91, 1.9, -2.0, 0.4, -Math.PI / 2);
  poster('drawing', 2.91, 2.0, 2.2, 0.38, -Math.PI / 2);
  poster('drawing', -2.91, 1.95, 2.2, 0.38, Math.PI / 2);

  // ---------- korridorer ----------
  poster('smile', -5.41, 1.7, -3.6, 0.7, Math.PI / 2);
  poster('bruno', -3.09, 1.8, -8.0, 0.7, -Math.PI / 2);
  poster('drawing', -3.09, 1.6, -5.6, 0.45, -Math.PI / 2);
  poster('rules', 5.41, 1.7, -3.8, 0.6, -Math.PI / 2);
  poster('smile', 3.09, 1.8, -8.4, 0.6, Math.PI / 2);
  poster('drawing', 3.09, 1.7, -6.0, 0.45, Math.PI / 2);
  for (const s of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 15, 8), M.metal);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(5.2 * s, 2.82, -4.5);
    scene.add(pipe);
    const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 15, 8), M.darkMetal);
    pipe2.rotation.x = Math.PI / 2;
    pipe2.position.set(5.05 * s, 2.7, -4.5);
    scene.add(pipe2);
  }
  {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.65, 14), M.metal);
    can.position.set(-5.1, 0.325, -6.2);
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), new MSM({ color: 0xc9a21a, roughness: 0.6 }));
    bucket.position.set(5.1, 0.2, -6.8);
    const mop = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), M.wood);
    mop.position.set(5.15, 0.9, -6.75);
    mop.rotation.z = 0.25;
    scene.add(can, bucket, mop);
  }

  // ---------- matsalen ----------
  wallZ(-12, -10, -5.5, 0, HD, M.dining, M.hall);
  wallZ(-12, -3, 3, 0, HD, M.dining, M.hall);
  wallZ(-12, 5.5, 10, 0, HD, M.dining, M.hall);
  wallZ(-12, -5.5, -3, H0, HD, M.dining, M.hall);
  wallZ(-12, 3, 5.5, H0, HD, M.dining, M.hall);
  wallZ(-24, -10, 10, 0, HD, M.dining, M.dining);
  wallX(-10, -24, -19.5, 0, HD, M.den, M.dining);
  wallX(-10, -16.5, -12, 0, HD, M.den, M.dining);
  wallX(-10, -19.5, -16.5, 2.8, HD, M.den, M.dining);
  wallX(10, -24, -22.5, 0, HD, M.dining, M.back);
  wallX(10, -20.5, -12, 0, HD, M.dining, M.back);
  wallX(10, -22.5, -20.5, 2.4, HD, M.dining, M.back);

  // bord, stolar, partyhattar
  const hatMats = [0xc82020, 0x2050c8, 0x20a040, 0xe0b020, 0xa030b0].map((c) => new MSM({ color: c, roughness: 0.6 }));
  const plateMat = new MSM({ color: 0xf0eee8, roughness: 0.3 });
  const chairMat = new MSM({ color: 0x3a3f8a, roughness: 0.7 });
  for (const zc of [-17.5, -14.5]) {
    for (const [xa, xb] of [[-7.5, -1.6], [1.6, 7.5]]) {
      block(xa, xb, 0.72, 0.78, zc - 0.5, zc + 0.5, M.cloth);
      block(xa, xb, 0.45, 0.72, zc - 0.52, zc - 0.5, M.cloth);
      block(xa, xb, 0.45, 0.72, zc + 0.5, zc + 0.52, M.cloth);
      for (const lx of [xa + 0.2, xb - 0.2]) for (const lz of [zc - 0.35, zc + 0.35]) block(lx - 0.04, lx + 0.04, 0, 0.72, lz - 0.04, lz + 0.04, M.darkMetal);
      for (let x = xa + 0.5; x < xb - 0.2; x += 1.0) {
        for (const side of [-1, 1]) {
          const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.015, 16), plateMat);
          pl.position.set(x, 0.79, zc + side * 0.28);
          scene.add(pl);
          if (Math.random() < 0.6) {
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), hatMats[(Math.random() * hatMats.length) | 0]);
            hat.position.set(x + 0.2, 0.88, zc + side * 0.2);
            if (Math.random() < 0.3) { hat.rotation.z = Math.PI / 2; hat.position.y = 0.85; }
            scene.add(hat);
          }
          block(x - 0.2, x + 0.2, 0.42, 0.47, zc + side * 0.75 - 0.2, zc + side * 0.75 + 0.2, chairMat);
          block(x - 0.2, x + 0.2, 0.47, 0.95, zc + side * 0.95 - 0.03, zc + side * 0.95 + 0.03, chairMat);
          for (const cx of [x - 0.17, x + 0.17]) block(cx - 0.02, cx + 0.02, 0, 0.42, zc + side * 0.75 - 0.02, zc + side * 0.75 + 0.02, M.darkMetal);
        }
      }
    }
  }
  poster('bruno', -8, 1.9, -12.09, 0.9, Math.PI);
  poster('bruno', 8, 1.9, -12.09, 0.9, Math.PI);
  poster('drawing', -9.91, 1.8, -13.6, 0.45, Math.PI / 2);
  poster('drawing', 9.91, 1.8, -14.5, 0.45, -Math.PI / 2);
  poster('smile', 9.91, 1.9, -16.5, 0.6, -Math.PI / 2);

  // scenen
  block(-5, 5, 0, 0.7, -24, -20.5, M.darkwood, 2);
  {
    const curtain = new MSM({ map: TX.curtainTexture('#8a1414', '#3a0606'), roughness: 0.95 });
    curtain.map.repeat.set(2, 1);
    plane(curtain, 0, 2.15, -23.9, 10, 2.9, 0);
    const side = new MSM({ map: TX.curtainTexture('#6a0f0f', '#2a0404'), roughness: 0.95, side: THREE.DoubleSide });
    plane(side, -4.5, 2.15, -20.6, 1.2, 2.9, 0);
    plane(side, 4.5, 2.15, -20.6, 1.2, 2.9, 0);
    const sign = TX.textTexture('BRUNOS PIZZALAND', { w: 1024, h: 140, bg: '#1a060c', fg: '#ffcc55', glow: '#ff5500', font: 'bold 84px Arial Black, Impact, sans-serif' });
    plane(new MSM({ map: sign, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0.6 }), 0, 3.22, -23.85, 4.6, 0.63, 0);
    // stjärnor
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.09 : 0.22;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const starGeo = new THREE.ShapeGeometry(shape);
    const starMat = new MSM({ color: 0xf0c040, emissive: 0x806010, emissiveIntensity: 0.5, roughness: 0.4 });
    [[-3.6, 2.5], [-2.2, 1.8], [-0.9, 2.7], [1.0, 1.9], [2.3, 2.6], [3.7, 2.0], [-4.0, 1.5], [4.1, 2.9]].forEach(([x, y]) => {
      const s = new THREE.Mesh(starGeo, starMat);
      s.position.set(x, y, -23.84);
      s.rotation.z = Math.random();
      scene.add(s);
    });
    // scenlampor längs kanten
    const bulbM = new THREE.MeshBasicMaterial({ color: 0xffd070 });
    for (let x = -4.75; x <= 4.76; x += 0.5) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbM);
      b.position.set(x, 0.62, -20.47);
      scene.add(b);
    }
    for (const s of [-1, 1]) block(4.0 * s - 0.35, 4.0 * s + 0.35, 0.7, 1.75, -23.6, -23.0, M.black);
  }

  // ---------- rävgrottan ----------
  wallX(-14, -21, -15, 0, H0, M.den, M.den);
  wallZ(-21, -14, -10, 0, H0, M.den, M.den);
  wallZ(-15, -14, -10, 0, H0, M.den, M.den);
  {
    const cm = new MSM({ map: TX.curtainTexture('#5a2a8a', '#22103a', true), roughness: 0.95, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(1.5, 2.8);
    const left = new THREE.Mesh(geo, cm), right = new THREE.Mesh(geo, cm);
    left.rotation.y = right.rotation.y = Math.PI / 2;
    left.position.set(-9.9, 1.4, -18.75);
    right.position.set(-9.9, 1.4, -17.25);
    scene.add(left, right);
    let open = 0, target = 0;
    const apply = () => {
      const w = 1.5 * (1 - 0.7 * open);
      left.scale.x = right.scale.x = w / 1.5;
      left.position.z = -19.5 + w / 2;
      right.position.z = -16.5 - w / 2;
    };
    W.setCurtain = (v, instant = false) => { target = v; if (instant) { open = v; apply(); } };
    W.updaters.push((dt) => { if (open !== target) { open += (target - open) * Math.min(1, dt * 6); if (Math.abs(open - target) < 0.002) open = target; apply(); } });
    apply();
    // skylt "UR FUNKTION"
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), M.metal);
    post.position.set(-8.7, 0.55, -15.6);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 14), M.darkMetal);
    foot.position.set(-8.7, 0.02, -15.6);
    scene.add(post, foot);
    const st = TX.textTexture('UR FUNKTION', { w: 512, h: 200, bg: '#e8c62a', fg: '#a01010', font: 'bold 70px Arial Black, Impact, sans-serif' });
    plane(new MSM({ map: st, roughness: 0.6 }), -8.7, 1.25, -15.6, 0.85, 0.33, 0.94);
  }

  // ---------- backstage ----------
  wallX(14, -24, -18, 0, H0, M.back, M.back);
  wallZ(-24, 10, 14, 0, H0, M.back, M.back);
  wallZ(-18, 10, 14, 0, H0, M.back, M.back);
  block(10.4, 13.6, 1.45, 1.5, -23.92, -23.45, M.wood);
  block(10.4, 13.6, 0.75, 0.8, -23.92, -23.45, M.wood);
  block(12.9, 13.8, 0.75, 0.8, -21.6, -19.2, M.wood);
  for (const [lx, lz] of [[13.0, -21.5], [13.7, -21.5], [13.0, -19.3], [13.7, -19.3]]) block(lx - 0.03, lx + 0.03, 0, 0.75, lz - 0.03, lz + 0.03, M.darkMetal);
  {
    // reservhuvuden på hyllan
    const cols = [0x6b4423, 0x4c56a8, 0xcfa520, 0x9a2f1c];
    const white = new MSM({ color: 0xe0dcd0, roughness: 0.4 });
    cols.forEach((c, i) => {
      const fur = new MSM({ color: c, roughness: 0.9 });
      const x = 10.8 + i * 0.85;
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), fur);
      h.position.set(x, 1.72, -23.68);
      h.rotation.z = (Math.random() - 0.5) * 0.4;
      scene.add(h);
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), white);
        e.position.set(x + 0.08 * s, 1.76, -23.48);
        scene.add(e);
      }
    });
    // endoskelett-arm på bordet
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), M.metal);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = 0.4;
    arm.position.set(13.3, 0.84, -20.3);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M.metal);
    hand.position.set(13.65, 0.85, -20.15);
    scene.add(arm, hand);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
    bulb.position.set(12, 2.75, -21);
    scene.add(bulb);
  }

  // ---------- ljus ----------
  const hemi = new THREE.HemisphereLight(0x2a3450, 0x0a0806, 0.14);
  scene.add(hemi);
  W.hemi = hemi;
  W.lamp = addLight(new THREE.PointLight(0xffd8a0, 7, 3.9, 1.4), 0, 2.42, -0.2, 'lamp');
  {
    const sp = new THREE.SpotLight(0xffe6c0, 70, 16, 0.75, 0.55, 1.5);
    sp.target.position.set(0, 0.8, -22.5);
    scene.add(sp.target);
    addLight(sp, 0, 3.5, -15, 'room');
  }
  addLight(new THREE.PointLight(0xa8b8ff, 6, 11, 1.5), -5, 3.3, -15.5, 'room');
  addLight(new THREE.PointLight(0xffc8a0, 6, 11, 1.5), 5, 3.3, -16.5, 'room', 0.5);
  addLight(new THREE.PointLight(0x9050ff, 3, 6, 1.5), -12, 2.6, -18, 'room');
  addLight(new THREE.PointLight(0xc0a0ff, 6, 6.5, 1.5), -7.8, 3.2, -18, 'room');
  addLight(new THREE.PointLight(0xffd090, 3.5, 7, 1.5), 12, 2.6, -21, 'room', 1);
  for (const s of [-1, 1]) {
    addLight(new THREE.PointLight(0xc0c8ff, 2.5, 6.5, 1.5), 4.25 * s, 2.75, -8.5, 'room', s > 0 ? 0.6 : 0);
    addLight(new THREE.PointLight(0xc0c8ff, 1.6, 3.6, 1.5), 4.25 * s, 2.75, -3.6, 'room');
  }
  W.doorLight = {
    left: addLight(new THREE.PointLight(0xfff0d0, 9, 4.2, 1.3), -4.1, 2.6, 0.4, 'doorL'),
    right: addLight(new THREE.PointLight(0xfff0d0, 9, 4.2, 1.3), 4.1, 2.6, 0.4, 'doorR'),
  };

  // ---------- kameror ----------
  W.cams = CAMERAS.map((c, i) => {
    const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.05, 60);
    cam.position.set(...c.pos);
    cam.rotation.order = 'YXZ';
    const dx = c.target[0] - c.pos[0], dy = c.target[1] - c.pos[1], dz = c.target[2] - c.pos[2];
    const yaw = Math.atan2(-dx, -dz);
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const obj = { ...c, cam, yaw, pitch, phase: i * 1.7 };
    W.camsById[c.id] = obj;
    return obj;
  });

  W.interactables = [...W.buttons, W.poster.mesh, W.poster.nose];
  W.update = (dt, t) => W.updaters.forEach((u) => u(dt, t));
  return W;
}
