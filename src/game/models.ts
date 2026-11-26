import * as THREE from 'three';
import { createContactShadowTexture, createProceduralTexture } from './textures';

export interface CharacterOptions {
  type?: 'boy' | 'girl' | 'ustaz' | 'ranger' | 'wazir' | 'king';
  shirtColor?: number;
  pantsColor?: number;
  headwearColor?: number;
  skinColor?: number;
}

export interface CharacterRig {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowDisc(radius = 0.7): THREE.Mesh {
  if (!sharedShadowTex) {
    sharedShadowTex = createContactShadowTexture();
  }
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: sharedShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.018;
  return disc;
}

export function createRealisticCharacter(options: CharacterOptions = {}): CharacterRig {
  const {
    type = 'boy',
    shirtColor = 0x2563eb,
    pantsColor = 0xf8fafc,
    headwearColor = 0x1d4ed8,
    skinColor = 0xf2c29b,
  } = options;

  const root = new THREE.Group();
  root.add(getContactShadowDisc(0.55));

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55, metalness: 0.04 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.65, metalness: 0.04 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.72, metalness: 0.02 });
  const sandalLeatherMat = new THREE.MeshStandardMaterial({ color: 0x7c3f1d, roughness: 0.45, metalness: 0.1 });
  const sandalSoleMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.78 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.85 });

  // Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.08;
  root.add(torsoGroup);

  const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.66, 20), shirtMat);
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torsoGroup.add(chestMesh);

  const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.135, 0.09, 18), shirtMat);
  collarMesh.position.y = 0.35;
  collarMesh.castShadow = true;
  torsoGroup.add(collarMesh);

  const placketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.03), shirtMat);
  placketMesh.position.set(0, 0.14, 0.245);
  torsoGroup.add(placketMesh);

  const buttonGeo = new THREE.SphereGeometry(0.017, 10, 10);
  const buttonMat =
    type === 'girl'
      ? new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.18, metalness: 0.35 })
      : whiteMat;
  for (let b = 0; b < 5; b++) {
    const btn = new THREE.Mesh(buttonGeo, buttonMat);
    btn.position.set(0, 0.27 - b * 0.068, 0.262);
    torsoGroup.add(btn);
  }

  const tunicHem = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.24, 20), shirtMat);
  tunicHem.position.y = -0.36;
  tunicHem.castShadow = true;
  torsoGroup.add(tunicHem);

  if (type === 'ustaz' || type === 'wazir' || type === 'king') {
    const robeTrimMat =
      type === 'king'
        ? goldMat
        : new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.38, metalness: 0.45 });
    const robeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.285, 0.365, 0.88, 20, 1, true),
      robeTrimMat
    );
    robeMesh.position.y = -0.1;
    torsoGroup.add(robeMesh);
  }

  // Head & Face
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.62;
  torsoGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 16), skinMat);
  neck.position.y = -0.21;
  headGroup.add(neck);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 24), skinMat);
  headMesh.scale.set(0.96, 1.04, 0.98);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  if (type !== 'girl' && type !== 'ranger') {
    const earGeo = new THREE.SphereGeometry(0.042, 12, 12);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.scale.set(0.55, 1.15, 0.8);
    earL.position.set(-0.225, -0.01, -0.01);
    const earR = earL.clone();
    earR.position.x = 0.225;
    headGroup.add(earL, earR);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.242, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
      type === 'ustaz' ? whiteMat : hairMat
    );
    hairCap.rotation.x = -0.22;
    headGroup.add(hairCap);
  }

  if (type === 'boy' || type === 'ustaz' || type === 'wazir' || type === 'king') {
    const beardMat = type === 'ustaz' ? whiteMat : hairMat;
    const jawBeard = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.026, 10, 20, Math.PI * 0.85),
      beardMat
    );
    jawBeard.rotation.z = Math.PI * 1.075;
    jawBeard.rotation.x = 0.45;
    jawBeard.position.set(0, -0.095, 0.135);
    headGroup.add(jawBeard);

    const chinBeard = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), beardMat);
    chinBeard.scale.set(1.2, 0.9, 0.7);
    chinBeard.position.set(0, -0.185, 0.165);
    headGroup.add(chinBeard);
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.065, 12), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, -0.015, 0.235);
  headGroup.add(nose);

  const eyePositions = [-0.078, 0.078];
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x2b1810, roughness: 0.12 });
  eyePositions.forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 14), whiteMat);
    sclera.scale.set(1.05, 0.9, 0.65);
    sclera.position.set(ex, 0.032, 0.212);
    headGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 12), irisMat);
    iris.position.set(ex, 0.032, 0.228);
    headGroup.add(iris);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), whiteMat);
    catchlight.position.set(ex + 0.007, 0.039, 0.244);
    headGroup.add(catchlight);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.014, 0.018), hairMat);
    brow.position.set(ex, 0.082, 0.222);
    brow.rotation.z = ex < 0 ? 0.08 : -0.08;
    headGroup.add(brow);
  });

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.011, 8, 16, Math.PI * 0.8),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 })
  );
  smile.rotation.z = Math.PI * 1.1;
  smile.position.set(0, -0.085, 0.218);
  headGroup.add(smile);

  // Headwear
  const headwearMat = new THREE.MeshStandardMaterial({ color: headwearColor, roughness: 0.55 });
  if (type === 'boy') {
    const kopiah = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.232, 0.145, 24), headwearMat);
    kopiah.position.y = 0.175;
    kopiah.castShadow = true;
    headGroup.add(kopiah);

    const kopiahTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.35),
      headwearMat
    );
    kopiahTop.position.y = 0.205;
    headGroup.add(kopiahTop);

    const kopiahRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.231, 0.009, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.35, metalness: 0.2 })
    );
    kopiahRim.rotation.x = Math.PI / 2;
    kopiahRim.position.y = 0.115;
    headGroup.add(kopiahRim);
  } else if (type === 'girl' || type === 'ranger') {
    const hijabHood = new THREE.Mesh(
      new THREE.SphereGeometry(0.268, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.78),
      headwearMat
    );
    hijabHood.rotation.x = -0.18;
    hijabHood.castShadow = true;
    headGroup.add(hijabHood);

    const hijabDrape = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.52, 24, 1, true), headwearMat);
    hijabDrape.position.set(0, 0.28, -0.02);
    hijabDrape.castShadow = true;
    torsoGroup.add(hijabDrape);
  } else if (type === 'ustaz' || type === 'wazir') {
    const turban = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.075, 14, 24), headwearMat);
    turban.rotation.x = Math.PI / 2;
    turban.position.y = 0.15;
    headGroup.add(turban);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 14), goldMat);
    cap.position.y = 0.16;
    headGroup.add(cap);
  } else if (type === 'king') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.2, 0.16, 16), goldMat);
    crown.position.y = 0.22;
    headGroup.add(crown);
    for (let k = 0; k < 6; k++) {
      const ka = (k / 6) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 8), goldMat);
      point.position.set(Math.cos(ka) * 0.18, 0.34, Math.sin(ka) * 0.18);
      headGroup.add(point);
    }
  }

  // Arms
  const createArm = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.31, 0.25, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.064, 0.48, 14), shirtMat);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    pivot.add(sleeve);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.05, 14), shirtMat);
    cuff.position.y = -0.45;
    pivot.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 14), skinMat);
    hand.scale.set(0.85, 1.15, 0.75);
    hand.position.y = -0.51;
    hand.castShadow = true;
    pivot.add(hand);

    return pivot;
  };
  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  torsoGroup.add(leftArm, rightArm);

  // Legs + Folded Trouser Cuffs + Leather Sandals & 5 Toes
  const createLeg = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.13, 0.72, 0);

    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.082, 0.56, 16), pantsMat);
    trouser.position.y = -0.28;
    trouser.castShadow = true;
    pivot.add(trouser);

    const foldedCuff = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.018, 10, 20), pantsMat);
    foldedCuff.rotation.x = Math.PI / 2;
    foldedCuff.position.y = -0.55;
    pivot.add(foldedCuff);

    const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.11, 14), skinMat);
    ankle.position.y = -0.61;
    pivot.add(ankle);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.048, 0.22), skinMat);
    foot.position.set(0, -0.675, 0.045);
    foot.castShadow = true;
    pivot.add(foot);

    for (let t = 0; t < 5; t++) {
      const toeRadius = t === 0 ? 0.015 : 0.011;
      const toe = new THREE.Mesh(new THREE.SphereGeometry(toeRadius, 8, 8), skinMat);
      const offsetX = side === -1 ? 0.042 - t * 0.021 : -0.042 + t * 0.021;
      toe.position.set(offsetX, -0.682, 0.158 - t * 0.004);
      pivot.add(toe);
    }

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.026, 0.255), sandalSoleMat);
    sole.position.set(0, -0.706, 0.05);
    sole.castShadow = true;
    sole.receiveShadow = true;
    pivot.add(sole);

    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.136, 0.022, 0.045), sandalLeatherMat);
    strap1.position.set(0, -0.665, 0.075);
    strap1.rotation.y = side * 0.22;
    pivot.add(strap1);

    const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.136, 0.022, 0.04), sandalLeatherMat);
    strap2.position.set(0, -0.662, 0.015);
    strap2.rotation.y = -side * 0.22;
    pivot.add(strap2);

    return pivot;
  };
  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);
  root.add(leftLeg, rightLeg);

  return { group: root, torso: torsoGroup, head: headGroup, leftArm, rightArm, leftLeg, rightLeg };
}

// Shared Foliage & Bark Materials
let sharedBarkMat: THREE.MeshStandardMaterial | null = null;
let sharedLeafMaterials: THREE.MeshStandardMaterial[] | null = null;
let sharedGrassBaseMat: THREE.MeshStandardMaterial | null = null;
const cachedCanopyGeos: THREE.BufferGeometry[] = [];

function initSharedFoliageMaterials(maxAnisotropy: number): void {
  if (sharedBarkMat) return;
  const barkTex = createProceduralTexture('bark', maxAnisotropy, true);
  barkTex.repeat.set(2, 4);
  sharedBarkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    bumpMap: barkTex,
    bumpScale: 0.08,
    roughness: 0.88,
    metalness: 0.02,
  });

  const leafTex = createProceduralTexture('leaves', maxAnisotropy, true);
  leafTex.repeat.set(2, 2);
  const leafTones = [0x266b2e, 0x33873b, 0x45a349, 0x2d7a36];
  sharedLeafMaterials = leafTones.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        map: leafTex,
        bumpMap: leafTex,
        bumpScale: 0.05,
        roughness: 0.78,
        metalness: 0.02,
      })
  );

  sharedGrassBaseMat = new THREE.MeshStandardMaterial({
    color: 0x3b8c3f,
    roughness: 0.9,
  });
}

function getCanopyClusterGeo(variant = 0): THREE.BufferGeometry {
  if (cachedCanopyGeos[variant]) return cachedCanopyGeos[variant];
  const geo = new THREE.IcosahedronGeometry(1.0, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const noise =
      1 +
      0.18 * Math.sin(vx * 4.5 + variant) * Math.cos(vy * 4.2) +
      0.12 * Math.sin(vz * 5.1);
    pos.setXYZ(i, vx * noise, vy * noise * 0.82, vz * noise);
  }
  geo.computeVertexNormals();
  cachedCanopyGeos[variant] = geo;
  return geo;
}

export function createRealisticTree(scale = 1.0, seed = 1, maxAnisotropy = 4): THREE.Group {
  initSharedFoliageMaterials(maxAnisotropy);
  const tree = new THREE.Group();
  const leafMats = sharedLeafMaterials!;

  const grassMound = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.75, 0.22, 16),
    sharedGrassBaseMat!
  );
  grassMound.position.y = 0.1;
  grassMound.receiveShadow = true;
  tree.add(grassMound);

  for (let b = 0; b < 5; b++) {
    const angle = (b / 5) * Math.PI * 2 + seed;
    const bush = new THREE.Mesh(
      getCanopyClusterGeo(b % 3),
      leafMats[(b + seed) % leafMats.length]
    );
    bush.scale.set(0.45 + (b % 2) * 0.15, 0.35, 0.45);
    bush.position.set(Math.cos(angle) * 1.05, 0.25, Math.sin(angle) * 1.05);
    bush.castShadow = true;
    bush.receiveShadow = true;
    tree.add(bush);
  }

  for (let r = 0; r < 5; r++) {
    const rAngle = (r / 5) * Math.PI * 2 + seed * 0.4;
    const rootButtress = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.28, 1.15, 8),
      sharedBarkMat!
    );
    rootButtress.position.set(Math.cos(rAngle) * 0.34, 0.45, Math.sin(rAngle) * 0.34);
    rootButtress.rotation.z = -Math.cos(rAngle) * 0.45;
    rootButtress.rotation.x = Math.sin(rAngle) * 0.45;
    rootButtress.castShadow = true;
    tree.add(rootButtress);
  }

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 2.9, 14), sharedBarkMat!);
  trunk.position.y = 1.45;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const branchConfigs = [
    { angle: 0.3, tilt: 0.58, len: 1.9, y: 2.55, rTop: 0.13, rBot: 0.22 },
    { angle: 2.4, tilt: 0.62, len: 1.85, y: 2.65, rTop: 0.13, rBot: 0.21 },
    { angle: 4.5, tilt: 0.54, len: 1.95, y: 2.5, rTop: 0.14, rBot: 0.22 },
    { angle: 1.3, tilt: 0.25, len: 1.7, y: 2.85, rTop: 0.12, rBot: 0.2 },
  ];

  branchConfigs.forEach((cfg, idx) => {
    const bPivot = new THREE.Group();
    bPivot.position.set(0, cfg.y, 0);
    bPivot.rotation.y = cfg.angle + seed;
    bPivot.rotation.z = cfg.tilt;
    tree.add(bPivot);

    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.rTop, cfg.rBot, cfg.len, 10),
      sharedBarkMat!
    );
    limb.position.y = cfg.len * 0.5;
    limb.castShadow = true;
    bPivot.add(limb);

    const twig = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.11, 1.0, 8),
      sharedBarkMat!
    );
    twig.position.set(0.22, cfg.len * 0.72, 0);
    twig.rotation.z = -0.55;
    twig.castShadow = true;
    bPivot.add(twig);

    const clusterMain = new THREE.Mesh(
      getCanopyClusterGeo(idx % 3),
      leafMats[idx % leafMats.length]
    );
    clusterMain.scale.set(1.45, 1.15, 1.45);
    clusterMain.position.set(0, cfg.len + 0.35, 0);
    clusterMain.castShadow = true;
    clusterMain.receiveShadow = true;
    bPivot.add(clusterMain);

    const clusterSub = new THREE.Mesh(
      getCanopyClusterGeo((idx + 1) % 3),
      leafMats[(idx + 2) % leafMats.length]
    );
    clusterSub.scale.set(1.1, 0.9, 1.1);
    clusterSub.position.set(0.55, cfg.len + 0.15, 0.35);
    clusterSub.castShadow = true;
    clusterSub.receiveShadow = true;
    bPivot.add(clusterSub);
  });

  const crownTop = new THREE.Mesh(getCanopyClusterGeo(0), leafMats[2]);
  crownTop.scale.set(1.75, 1.35, 1.75);
  crownTop.position.set(0, 4.65, 0);
  crownTop.castShadow = true;
  crownTop.receiveShadow = true;
  tree.add(crownTop);

  tree.scale.setScalar(scale);
  return tree;
}

export function createRealisticPalmTree(scale = 1.0, seed = 1, maxAnisotropy = 4): THREE.Group {
  initSharedFoliageMaterials(maxAnisotropy);
  const palm = new THREE.Group();
  const leafMats = sharedLeafMaterials!;
  palm.add(getContactShadowDisc(1.15));

  const segments = 9;
  let curX = 0;
  let curY = 0;
  const bendDir = seed % 2 === 0 ? 1 : -1;

  for (let s = 0; s < segments; s++) {
    const rBot = 0.28 - s * 0.015;
    const rTop = 0.25 - s * 0.015;
    const segH = 0.62;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH, 12), sharedBarkMat!);
    const tilt = s * 0.045 * bendDir;
    seg.position.set(curX, curY + segH * 0.5, 0);
    seg.rotation.z = tilt;
    seg.castShadow = true;
    seg.receiveShadow = true;
    palm.add(seg);

    curX -= Math.sin(tilt) * segH * 0.85;
    curY += Math.cos(tilt) * segH * 0.96;
  }

  const crownGroup = new THREE.Group();
  crownGroup.position.set(curX, curY, 0);
  palm.add(crownGroup);

  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.5 });
  for (let c = 0; c < 5; c++) {
    const ca = (c / 5) * Math.PI * 2;
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), coconutMat);
    coco.position.set(Math.cos(ca) * 0.24, -0.1, Math.sin(ca) * 0.24);
    coco.castShadow = true;
    crownGroup.add(coco);
  }

  const frondCount = 9;
  for (let f = 0; f < frondCount; f++) {
    const fPivot = new THREE.Group();
    fPivot.rotation.y = (f / frondCount) * Math.PI * 2 + seed;
    fPivot.rotation.z = 0.35 + (f % 3) * 0.14;
    crownGroup.add(fPivot);

    for (let p = 0; p < 6; p++) {
      const leafBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.45 - p * 0.04, 0.03, 0.55 - p * 0.06),
        leafMats[p % leafMats.length]
      );
      leafBlade.position.set(0.35 + p * 0.42, -p * p * 0.045, 0);
      leafBlade.rotation.z = -p * 0.14;
      leafBlade.castShadow = true;
      fPivot.add(leafBlade);
    }
  }

  palm.scale.setScalar(scale);
  return palm;
}

export function createStage1PedestalProp(objId: string): { group: THREE.Group; statusMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  group.add(getContactShadowDisc(1.0));

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.72 });
  const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.78 });
  const statusMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.5,
    roughness: 0.22,
    metalness: 0.45,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.88, 0.9, 18), woodMat);
  base.position.y = 0.45;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.78, 0.1, 18), trimGoldMat);
  collar.position.y = 0.92;
  group.add(collar);

  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 10, 28), statusMat);
  haloRing.rotation.x = Math.PI / 2;
  haloRing.position.y = 1.02;
  group.add(haloRing);

  const propGroup = new THREE.Group();
  propGroup.position.y = 1.52;

  if (objId === 'obj_kitab') {
    // Open 3D Book
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.4 });
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.75 });
    const leftCover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.56), coverMat);
    leftCover.position.set(-0.2, 0, 0);
    leftCover.rotation.z = 0.28;
    const rightCover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.56), coverMat);
    rightCover.position.set(0.2, 0, 0);
    rightCover.rotation.z = -0.28;
    const leftPages = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.5), pageMat);
    leftPages.position.set(-0.19, 0.03, 0);
    leftPages.rotation.z = 0.28;
    const rightPages = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.5), pageMat);
    rightPages.position.set(0.19, 0.03, 0);
    rightPages.rotation.z = -0.28;
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.56, 12), trimGoldMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.y = -0.05;
    propGroup.add(leftCover, rightCover, leftPages, rightPages, spine);
  } else if (objId === 'obj_yashrabu') {
    // Ornate Water Pitcher / Goblet
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.2 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.14, 0.42, 18), trimGoldMat);
    cup.position.y = 0.08;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 12), trimGoldMat);
    stem.position.y = -0.2;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 16), trimGoldMat);
    foot.position.y = -0.32;
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 16), waterMat);
    liquid.position.y = 0.25;
    propGroup.add(cup, stem, foot, liquid);
  } else if (objId === 'obj_masjid') {
    // Miniature Mosque
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.35, metalness: 0.2 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.52), wallMat);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), domeMat);
    dome.position.y = 0.19;
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.65, 12), wallMat);
    minaret.position.set(0.32, 0.16, 0.2);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), trimGoldMat);
    spire.position.set(0.32, 0.56, 0.2);
    propGroup.add(cube, dome, minaret, spire);
  } else if (objId === 'obj_yaktubu') {
    // Parchment Scroll & Quill
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 });
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    const parchment = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.42), paperMat);
    parchment.rotation.x = 0.25;
    const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.14, 12), trimGoldMat);
    inkwell.position.set(0.24, 0.08, -0.1);
    const quill = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.52, 8), featherMat);
    quill.position.set(0.18, 0.3, -0.05);
    quill.rotation.z = -0.35;
    propGroup.add(parchment, inkwell, quill);
  } else {
    // Potted Sapling Tree (شجرة)
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.26, 14), potMat);
    pot.position.y = -0.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.34, 10), woodMat);
    stem.position.y = 0.05;
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), leafMat);
    canopy.position.y = 0.32;
    propGroup.add(pot, stem, canopy);
  }

  propGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
    }
  });
  group.add(propGroup);
  group.userData.propMesh = propGroup;

  return { group, statusMat };
}
