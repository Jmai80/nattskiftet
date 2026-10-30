// Animatronikerna – byggda helt av enkla geometriska former.
import * as THREE from 'three';
import { textTexture } from './textures.js';

const MSM = THREE.MeshStandardMaterial;

export const DEFS = {
  bear: { name: 'Bruno Björn', fur: 0x6b4423, belly: 0xc49a63, eye: 0x88aaff },
  hare: { name: 'Harald Hare', fur: 0x4c56a8, belly: 0x9ea6e0, eye: 0xff2a2a },
  crow: { name: 'Klara Kråka', fur: 0xcfa520, belly: 0xf0e0a0, eye: 0xc070ff },
  fox: { name: 'Rolf Räv', fur: 0x9a2f1c, belly: 0xd8a080, eye: 0xffc830 },
};

let SHARED = null;
function shared() {
  if (SHARED) return SHARED;
  SHARED = {
    metal: new MSM({ color: 0x8a8a8a, metalness: 0.8, roughness: 0.35 }),
    dark: new MSM({ color: 0x111111, roughness: 0.5 }),
    white: new MSM({ color: 0xe8e4d8, roughness: 0.35 }),
    teeth: new MSM({ color: 0xd8cfae, roughness: 0.3 }),
    red: new MSM({ color: 0x9a1010, roughness: 0.6 }),
    orange: new MSM({ color: 0xe07a18, roughness: 0.5 }),
    bib: null,
  };
  const bt = textTexture('SMASKA!', { w: 256, h: 200, bg: '#f4f0e6', fg: '#c02020', font: 'bold 52px Arial Black, Impact, sans-serif' });
  SHARED.bib = new MSM({ map: bt, roughness: 0.8 });
  return SHARED;
}

const sphere = new THREE.SphereGeometry(1, 20, 16);
const sphereLo = new THREE.SphereGeometry(1, 12, 10);

export function buildCharacter(type) {
  const S = shared();
  const d = DEFS[type];
  const fur = new MSM({ color: d.fur, roughness: 0.85 });
  const belly = new MSM({ color: d.belly, roughness: 0.85 });
  const eyeMat = new MSM({ color: 0x050505, emissive: d.eye, emissiveIntensity: 0.35, roughness: 0.2 });

  const root = new THREE.Group();
  root.name = type;
  root.rotation.order = 'YXZ';

  const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  };

  // ben
  for (const sx of [-1, 1]) {
    add(root, new THREE.BoxGeometry(0.26, 0.13, 0.42), fur, 0.19 * sx, 0.065, 0.06);
    add(root, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), S.metal, 0.19 * sx, 0.2, 0);
    if (type === 'fox') {
      add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.78, 8), S.metal, 0.19 * sx, 0.62, 0);
      add(root, sphereLo, S.metal, 0.19 * sx, 0.6, 0.02, 0.07, 0.07, 0.07);
    } else {
      add(root, new THREE.CylinderGeometry(0.12, 0.14, 0.72, 12), fur, 0.19 * sx, 0.62, 0);
    }
  }
  add(root, sphere, fur, 0, 1.0, 0, 0.34, 0.22, 0.27);
  add(root, sphere, fur, 0, 1.35, 0, 0.44, 0.5, 0.36);
  add(root, sphere, belly, 0, 1.3, 0.17, 0.33, 0.38, 0.22);
  if (type === 'fox') {
    // riss i magen – endoskelett syns
    add(root, sphereLo, S.dark, 0.12, 1.15, 0.33, 0.1, 0.12, 0.05);
    add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), S.metal, 0.12, 1.15, 0.36);
  }

  // armar
  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.47 * sx, 1.66, 0);
    pivot.rotation.z = 0.12 * sx;
    root.add(pivot);
    add(pivot, sphereLo, fur, 0, 0, 0, 0.13, 0.13, 0.13);
    add(pivot, new THREE.CylinderGeometry(0.1, 0.09, 0.5, 10), fur, 0, -0.27, 0);
    add(pivot, new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6), S.metal, 0, -0.56, 0);
    add(pivot, new THREE.CylinderGeometry(0.09, 0.08, 0.45, 10), fur, 0, -0.82, 0.02);
    if (type === 'fox' && sx > 0) {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 14, Math.PI * 1.3), S.metal);
      hook.position.set(0, -1.12, 0.03);
      hook.rotation.y = Math.PI / 2;
      pivot.add(hook);
      add(pivot, new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), S.metal, 0, -1.07, 0.03);
    } else {
      add(pivot, sphereLo, type === 'crow' ? S.orange : fur, 0, -1.08, 0.03, 0.1, 0.12, 0.08);
    }
    arms.push(pivot);
  }

  // hals och huvud
  add(root, new THREE.CylinderGeometry(0.06, 0.07, 0.2, 8), S.metal, 0, 1.86, 0);
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 2.08, 0.02);
  root.add(head);
  add(head, sphere, fur, 0, 0, 0, 0.34, 0.31, 0.32);

  const jaw = new THREE.Group();
  jaw.name = 'jaw';
  jaw.position.set(0, -0.13, 0.05);
  head.add(jaw);

  if (type === 'crow') {
    const beak = new THREE.ConeGeometry(0.11, 0.3, 12);
    const up = add(head, beak, S.orange, 0, -0.06, 0.43, 1, 1, 0.55);
    up.rotation.x = Math.PI / 2;
    const lo = add(jaw, new THREE.ConeGeometry(0.09, 0.24, 12), S.orange, 0, -0.03, 0.33, 1, 1, 0.45);
    lo.rotation.x = Math.PI / 2;
    for (let i = -2; i <= 2; i++) {
      add(head, new THREE.BoxGeometry(0.025, 0.035, 0.02), S.teeth, i * 0.03, -0.11, 0.38 - Math.abs(i) * 0.015);
      add(jaw, new THREE.BoxGeometry(0.022, 0.03, 0.02), S.teeth, i * 0.028, 0.0, 0.31 - Math.abs(i) * 0.015);
    }
    for (let i = -1; i <= 1; i++) {
      const tuft = add(head, new THREE.ConeGeometry(0.035, 0.18, 8), fur, i * 0.06, 0.34, -0.02);
      tuft.rotation.z = -i * 0.4;
    }
    const bib = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.33), S.bib);
    bib.position.set(0, 1.47, 0.37);
    bib.rotation.x = -0.12;
    root.add(bib);
  } else {
    const mz = type === 'fox' ? 0.31 : 0.24;
    const mzs = type === 'fox' ? 0.2 : 0.14;
    add(head, sphere, belly, 0, -0.07, mz, 0.2, 0.12, mzs);
    add(head, sphereLo, S.dark, 0, -0.01, mz + mzs - 0.01, 0.06, 0.045, 0.04);
    const front = mz + mzs;
    for (let i = -3; i <= 3; i++) {
      add(head, new THREE.BoxGeometry(0.03, 0.045, 0.02), S.teeth, i * 0.034, -0.17, front - 0.06 - Math.abs(i) * 0.014);
    }
    add(jaw, sphere, belly, 0, -0.08, mz - 0.07, 0.18, 0.065, mzs + 0.01);
    for (let i = -3; i <= 3; i++) {
      add(jaw, new THREE.BoxGeometry(0.03, 0.04, 0.02), S.teeth, i * 0.032, -0.03, front - 0.11 - Math.abs(i) * 0.014);
    }
  }

  // ögon
  const pupils = [];
  for (const sx of [-1, 1]) {
    add(head, sphere, S.white, 0.12 * sx, 0.07, 0.27, 0.075, 0.08, 0.06);
    pupils.push(add(head, sphereLo, eyeMat, 0.12 * sx, 0.065, 0.33, 0.03, 0.03, 0.02));
    const brow = add(head, new THREE.BoxGeometry(0.13, 0.025, 0.03), S.dark, 0.12 * sx, 0.17, 0.29);
    brow.rotation.z = 0.25 * sx;
  }

  // typspecifikt
  if (type === 'bear') {
    for (const sx of [-1, 1]) {
      add(head, sphere, fur, 0.24 * sx, 0.24, -0.02, 0.1, 0.1, 0.06);
      add(head, sphereLo, belly, 0.24 * sx, 0.24, 0.025, 0.06, 0.06, 0.02);
    }
    add(head, new THREE.CylinderGeometry(0.13, 0.14, 0.22, 16), S.dark, 0, 0.39, -0.02);
    add(head, new THREE.CylinderGeometry(0.21, 0.21, 0.025, 18), S.dark, 0, 0.28, -0.02);
    addBowTie(root, S.dark);
  } else if (type === 'hare') {
    for (const sx of [-1, 1]) {
      const ear = add(head, new THREE.CapsuleGeometry(0.07, 0.33, 4, 10), fur, 0.13 * sx, 0.45, -0.03, 1, 1, 0.6);
      ear.rotation.z = -0.15 * sx;
      const inner = add(head, new THREE.CapsuleGeometry(0.04, 0.26, 4, 8), belly, 0.13 * sx + 0.004 * sx, 0.45, 0.012, 1, 1, 0.3);
      inner.rotation.z = -0.15 * sx;
    }
    addBowTie(root, S.red);
  } else if (type === 'fox') {
    for (const sx of [-1, 1]) {
      const ear = add(head, new THREE.ConeGeometry(0.085, 0.24, 10), fur, 0.2 * sx, 0.3, -0.03);
      ear.rotation.z = -0.35 * sx;
    }
    const patch = add(head, new THREE.CylinderGeometry(0.095, 0.095, 0.012, 16), S.dark, 0.12, 0.075, 0.335);
    patch.rotation.x = Math.PI / 2;
    const strap = add(head, new THREE.TorusGeometry(0.33, 0.008, 4, 30), S.dark, 0, 0.1, 0);
    strap.rotation.x = Math.PI / 2;
    strap.rotation.y = 0.35;
  }

  return { type, name: d.name, root, head, jaw, arms, pupils, eyeMat };
}

function addBowTie(root, mat) {
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.13, 10), mat);
    c.rotation.z = (Math.PI / 2) * sx;
    c.position.set(0.065 * sx, 1.75, 0.26);
    root.add(c);
  }
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat);
  k.position.set(0, 1.75, 0.27);
  root.add(k);
}
