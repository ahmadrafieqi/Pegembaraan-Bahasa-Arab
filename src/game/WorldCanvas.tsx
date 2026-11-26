import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraMode,
  HeroId,
  InteractiveEntity,
  NPC_LOCATIONS,
  NpcId,
  STAGE1_OBJECTS,
  STAGE2_CARDS,
  STAGE3_SENTENCES,
  ScreenPhase,
} from './curriculum';
import { playSound } from './audio';
import {
  CharacterRig,
  createRealisticCharacter,
  createRealisticPalmTree,
  createRealisticTree,
  createStage1PedestalProp,
} from './models';
import {
  createFloatingTextSprite,
  createProceduralTexture,
  createSkyGradientTexture,
} from './textures';

export interface MinimapSnapshot {
  playerX: number;
  playerZ: number;
  playerYaw: number;
}

export interface WorldController {
  rebuildHero: (heroId: HeroId) => void;
  teleportTo: (x: number, z: number) => void;
  unlockGate: (gateNum: number) => void;
  lockAllGates: () => void;
  markEntityStatus: (id: string, status: 'default' | 'correct' | 'wrong') => void;
  setStage2CardVisible: (id: string, visible: boolean) => void;
  resetAllStageVisuals: () => void;
  triggerJump: () => void;
  setTouchKey: (code: string, active: boolean) => void;
  triggerCheer: (seconds?: number) => void;
  resetCameraBehindPlayer: () => void;
  rotateCameraBy: (dx: number, dy: number) => void;
}

interface WorldCanvasProps {
  screenPhase: ScreenPhase;
  heroId: HeroId;
  cameraMode: CameraMode;
  muted: boolean;
  isModalOpen: boolean;
  collectedStage2Ids: Record<string, boolean>;
  onNearestEntityChange: (entity: InteractiveEntity | null) => void;
  onInteractEntity: (entity: InteractiveEntity) => void;
  onAutoCollectStage2Card: (entity: InteractiveEntity) => void;
  onToggleCameraMode: () => void;
  onToggleWorldMap: () => void;
  onToast: (message: string) => void;
  onMinimapUpdate: (snap: MinimapSnapshot) => void;
  controllerRef: React.RefObject<WorldController | null>;
}

interface CircleCollider {
  x: number;
  z: number;
  r: number;
}

// Pre-allocated math helpers (zero GC inside animation loop)
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _wishDir = new THREE.Vector3();
const _targetCenter = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _pointerNDC = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  screenPhase,
  heroId,
  cameraMode,
  muted,
  isModalOpen,
  collectedStage2Ids,
  onNearestEntityChange,
  onInteractEntity,
  onAutoCollectStage2Card,
  onToggleCameraMode,
  onToggleWorldMap,
  onToast,
  onMinimapUpdate,
  controllerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Sync latest React props into refs so the WebGL loop never restarts
  const propsRef = useRef({
    screenPhase,
    heroId,
    cameraMode,
    muted,
    isModalOpen,
    collectedStage2Ids,
    onNearestEntityChange,
    onInteractEntity,
    onAutoCollectStage2Card,
    onToggleCameraMode,
    onToggleWorldMap,
    onToast,
    onMinimapUpdate,
  });
  propsRef.current = {
    screenPhase,
    heroId,
    cameraMode,
    muted,
    isModalOpen,
    collectedStage2Ids,
    onNearestEntityChange,
    onInteractEntity,
    onAutoCollectStage2Card,
    onToggleCameraMode,
    onToggleWorldMap,
    onToast,
    onMinimapUpdate,
  };

  // Mutable 3D world state refs
  const worldRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    playerRig: CharacterRig | null;
    playerPhysics: {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      yaw: number;
      onGround: boolean;
      walkTime: number;
      cheerTimer: number;
    };
    cameraState: {
      yaw: number;
      targetYaw: number;
      pitch: number;
      targetPitch: number;
      distance: number;
      targetDistance: number;
    };
    keysPressed: Record<string, boolean>;
    interactiveEntities: InteractiveEntity[];
    entityMeshMap: Map<string, { group: THREE.Group; statusMat?: THREE.MeshStandardMaterial }>;
    barrierGates: Record<number, THREE.Group>;
    unlockedStageNum: number;
    colliders: CircleCollider[];
    nearestId: string | null;
    rebuildHeroFn: (id: HeroId) => void;
  } | null>(null);

  useImperativeHandle(controllerRef, () => ({
    rebuildHero(id: HeroId) {
      worldRef.current?.rebuildHeroFn(id);
    },
    teleportTo(x: number, z: number) {
      const w = worldRef.current;
      if (!w) return;
      w.playerPhysics.x = x;
      w.playerPhysics.z = z;
      w.playerPhysics.y = 0;
      w.playerPhysics.vx = 0;
      w.playerPhysics.vz = 0;
      w.playerPhysics.vy = 0;
    },
    unlockGate(gateNum: number) {
      const w = worldRef.current;
      if (!w) return;
      w.unlockedStageNum = Math.max(w.unlockedStageNum, gateNum + 1);
      const gate = w.barrierGates[gateNum];
      if (gate) {
        const field = gate.getObjectByName('barrierField');
        if (field) field.visible = false;
      }
    },
    lockAllGates() {
      const w = worldRef.current;
      if (!w) return;
      w.unlockedStageNum = 1;
      [1, 2, 3].forEach((n) => {
        const gate = w.barrierGates[n];
        if (gate) {
          const field = gate.getObjectByName('barrierField');
          if (field) field.visible = true;
        }
      });
    },
    markEntityStatus(id: string, status: 'default' | 'correct' | 'wrong') {
      const w = worldRef.current;
      if (!w) return;
      const entry = w.entityMeshMap.get(id);
      if (!entry?.statusMat) return;
      if (status === 'correct') {
        entry.statusMat.color.setHex(0x10b981);
        entry.statusMat.emissive.setHex(0x059669);
      } else if (status === 'wrong') {
        entry.statusMat.color.setHex(0x64748b);
        entry.statusMat.emissive.setHex(0x334155);
      } else {
        const isStage3 = id.startsWith('sent_');
        entry.statusMat.color.setHex(isStage3 ? 0x8b5cf6 : 0x3b82f6);
        entry.statusMat.emissive.setHex(isStage3 ? 0x6d28d9 : 0x1d4ed8);
      }
    },
    setStage2CardVisible(id: string, visible: boolean) {
      const w = worldRef.current;
      if (!w) return;
      const entry = w.entityMeshMap.get(id);
      if (entry) {
        entry.group.visible = visible;
      }
    },
    resetAllStageVisuals() {
      const w = worldRef.current;
      if (!w) return;
      STAGE1_OBJECTS.forEach((o) => {
        const entry = w.entityMeshMap.get(o.id);
        if (entry?.statusMat) {
          entry.statusMat.color.setHex(0x3b82f6);
          entry.statusMat.emissive.setHex(0x1d4ed8);
        }
      });
      STAGE2_CARDS.forEach((c) => {
        const entry = w.entityMeshMap.get(c.id);
        if (entry) entry.group.visible = true;
      });
      STAGE3_SENTENCES.forEach((s) => {
        const entry = w.entityMeshMap.get(s.id);
        if (entry?.statusMat) {
          entry.statusMat.color.setHex(0x8b5cf6);
          entry.statusMat.emissive.setHex(0x6d28d9);
        }
      });
    },
    triggerJump() {
      const w = worldRef.current;
      if (!w) return;
      if (propsRef.current.screenPhase !== 'PLAYING' || propsRef.current.isModalOpen) return;
      if (w.playerPhysics.onGround) {
        w.playerPhysics.vy = 7.6;
        w.playerPhysics.onGround = false;
        playSound('jump', propsRef.current.muted);
      }
    },
    setTouchKey(code: string, active: boolean) {
      if (worldRef.current) {
        worldRef.current.keysPressed[code] = active;
      }
    },
    triggerCheer(seconds = 1.4) {
      if (worldRef.current) {
        worldRef.current.playerPhysics.cheerTimer = Math.max(
          worldRef.current.playerPhysics.cheerTimer,
          seconds
        );
      }
    },
    resetCameraBehindPlayer() {
      const w = worldRef.current;
      if (!w) return;
      w.cameraState.targetYaw = w.playerPhysics.yaw + Math.PI;
      w.cameraState.targetPitch = 0.28;
    },
    rotateCameraBy(dx: number, dy: number) {
      const w = worldRef.current;
      if (!w) return;
      w.cameraState.targetYaw -= dx * 0.009;
      w.cameraState.targetPitch = Math.max(
        -0.22,
        Math.min(0.85, w.cameraState.targetPitch + dy * 0.007)
      );
    },
  }));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('Pelayar anda tidak menyokong paparan WebGL 3D.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('Sambungan grafik 3D terputus buat sementara. Sedang memulihkan...');
    };
    const onContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0052);

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.15,
      300
    );

    // Studio reflection environment for gold, bronze, marble, and crystal PBR materials
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(210, 28, 20);
    const skyMat = new THREE.MeshBasicMaterial({
      map: createSkyGradientTexture(),
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Balanced warm/cool outdoor lighting rig
    const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x855e32, 0.72);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    sunLight.position.set(42, 68, 35);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 190;
    const shadowBound = 75;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
    rimLight.position.set(-40, 28, -60);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // --- State Containers ---
    const cloudList: { mesh: THREE.Group; speed: number }[] = [];
    const fountainParticles: { mesh: THREE.Mesh; angle: number; phase: number }[] = [];
    const animatedMeshes: { mesh: THREE.Object3D; baseY: number; spin: boolean }[] = [];
    const clickableMeshes: THREE.Object3D[] = [];
    const interactiveEntities: InteractiveEntity[] = [];
    const entityMeshMap = new Map<
      string,
      { group: THREE.Group; statusMat?: THREE.MeshStandardMaterial }
    >();
    const barrierGates: Record<number, THREE.Group> = {};
    const colliders: CircleCollider[] = [];

    // Clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    for (let c = 0; c < 16; c++) {
      const cloud = new THREE.Group();
      const puffs = 3 + (c % 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(2.6 + (p % 2) * 1.1, 14, 14),
          cloudMat
        );
        puff.scale.set(1.3, 0.75, 1.0);
        puff.position.set(p * 2.4 - puffs, (p % 2) * 0.6, (p % 3) * 0.7);
        cloud.add(puff);
      }
      cloud.position.set(
        -95 + Math.random() * 190,
        28 + Math.random() * 12,
        -115 + Math.random() * 190
      );
      scene.add(cloud);
      cloudList.push({ mesh: cloud, speed: 0.6 + Math.random() * 0.6 });
    }

    // --- Ground & Natural Horizon Perimeter ---
    const sandTex = createProceduralTexture('sand', maxAnisotropy, true);
    sandTex.repeat.set(36, 36);
    const grassTex = createProceduralTexture('grass', maxAnisotropy, true);
    grassTex.repeat.set(18, 14);
    const marbleTex = createProceduralTexture('marble', maxAnisotropy, true);
    marbleTex.repeat.set(14, 14);
    const cobbleTex = createProceduralTexture('cobble', maxAnisotropy, true);
    cobbleTex.repeat.set(3, 42);

    // Wide desert horizon skirt so the world never floats in a void
    const horizonGround = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 })
    );
    horizonGround.rotation.x = -Math.PI / 2;
    horizonGround.position.set(0, -0.04, -20);
    horizonGround.receiveShadow = true;
    scene.add(horizonGround);

    // Natural perimeter dunes & sandstone outcrops
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xd9b372, roughness: 0.92 });
    const duneCoords: [number, number, number, number][] = [
      [-55, 42, 16, 4.5],
      [56, 36, 18, 5.2],
      [-58, -10, 15, 4.8],
      [58, -18, 17, 5.0],
      [-54, -68, 20, 6.2],
      [54, -72, 19, 5.8],
      [0, -125, 28, 7.5],
      [-42, 66, 14, 4.2],
      [44, 65, 15, 4.4],
    ];
    duneCoords.forEach(([dx, dz, rad, h]) => {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), duneMat);
      dune.scale.set(1.4, h / rad, 1.1);
      dune.position.set(dx, -0.2, dz);
      dune.receiveShadow = true;
      scene.add(dune);
    });

    // Zone 1: Kampung Permulaan (Z = +16 to +52)
    const villageGround = new THREE.Mesh(
      new THREE.PlaneGeometry(76, 38),
      new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.9 })
    );
    villageGround.rotation.x = -Math.PI / 2;
    villageGround.position.set(0, 0, 34);
    villageGround.receiveShadow = true;
    scene.add(villageGround);

    // Zone 2: Hutan Ajaib (Z = -22 to +16)
    const forestGround = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 38),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
    );
    forestGround.rotation.x = -Math.PI / 2;
    forestGround.position.set(0, 0.02, -3);
    forestGround.receiveShadow = true;
    scene.add(forestGround);

    // Zone 3 & 4: Istana Misteri & Singgahsana Raja (Z = -105 to -22)
    const palaceGround = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 84),
      new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.42, metalness: 0.08 })
    );
    palaceGround.rotation.x = -Math.PI / 2;
    palaceGround.position.set(0, 0.04, -64);
    palaceGround.receiveShadow = true;
    scene.add(palaceGround);

    // Cobblestone road connecting all zones (offset >= 0.02 above floors)
    const mainPath = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 142),
      new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.85 })
    );
    mainPath.rotation.x = -Math.PI / 2;
    mainPath.position.set(0, 0.065, -24);
    mainPath.receiveShadow = true;
    scene.add(mainPath);

    // --- Courtyard Fountain ---
    const fGroup = new THREE.Group();
    fGroup.position.set(0, 0, 31);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
    const goldRimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.75 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.0, 0.65, 24), stoneMat);
    basin.position.y = 0.325;
    basin.castShadow = true;
    basin.receiveShadow = true;
    fGroup.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.12, 12, 28), goldRimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.66;
    fGroup.add(rim);
    const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.08, 24), waterMat);
    waterPool.position.y = 0.58;
    fGroup.add(waterPool);
    const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.7, 16), stoneMat);
    fPillar.position.y = 1.05;
    fPillar.castShadow = true;
    fGroup.add(fPillar);
    const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.4, 0.35, 20), goldRimMat);
    topBowl.position.y = 1.85;
    fGroup.add(topBowl);

    const dropGeo = new THREE.SphereGeometry(0.08, 8, 8);
    for (let i = 0; i < 18; i++) {
      const drop = new THREE.Mesh(dropGeo, waterMat);
      fGroup.add(drop);
      fountainParticles.push({ mesh: drop, angle: (i / 18) * Math.PI * 2, phase: i / 18 });
    }
    scene.add(fGroup);
    colliders.push({ x: 0, z: 31, r: 3.15 });

    // --- Traditional Village Houses ---
    const buildHouse = (hx: number, hz: number, rotY: number) => {
      const house = new THREE.Group();
      house.position.set(hx, 0, hz);
      house.rotation.y = rotY;
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.38, metalness: 0.15 });
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.0, 5.2), wallMat);
      body.position.y = 2.0;
      body.castShadow = true;
      body.receiveShadow = true;
      house.add(body);

      const parapet = new THREE.Mesh(new THREE.BoxGeometry(5.95, 0.35, 5.55), trimMat);
      parapet.position.y = 4.1;
      house.add(parapet);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.75, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        domeMat
      );
      dome.position.y = 4.2;
      dome.castShadow = true;
      house.add(dome);

      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 10), goldRimMat);
      finial.position.y = 6.15;
      house.add(finial);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 2.25, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72 })
      );
      door.position.set(0, 1.12, 2.58);
      house.add(door);

      const archFrame = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.1, 8, 16, Math.PI), trimMat);
      archFrame.position.set(0, 2.22, 2.62);
      house.add(archFrame);

      // Lattice windows & porch lantern
      [-1.55, 1.55].forEach((wx) => {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.95, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 })
        );
        win.position.set(wx, 2.3, 2.58);
        house.add(win);
      });
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), lanternMat);
      lantern.position.set(0.92, 2.55, 2.78);
      house.add(lantern);

      scene.add(house);
      colliders.push({ x: hx, z: hz, r: 3.7 });
    };
    buildHouse(-21, 38, Math.PI * 0.35);
    buildHouse(21, 39, -Math.PI * 0.35);
    buildHouse(-22, 24, Math.PI * 0.45);
    buildHouse(22, 23, -Math.PI * 0.45);

    // --- Village Palm Trees ---
    const palmCoords: [number, number, number][] = [
      [-16, 44, 0.95],
      [16, 43, 1.05],
      [-17, 29, 0.9],
      [17, 30, 1.0],
    ];
    palmCoords.forEach(([px, pz, sc], idx) => {
      const pTree = createRealisticPalmTree(sc, idx + 1, maxAnisotropy);
      pTree.position.set(px, 0, pz);
      scene.add(pTree);
      colliders.push({ x: px, z: pz, r: 0.7 });
    });

    // --- Forest Realistic Trees ---
    const forestTreeCoords: [number, number, number][] = [
      [-18, 9, 1.15],
      [18, 8, 1.2],
      [-22, -2, 1.25],
      [22, -4, 1.15],
      [-16, -13, 1.2],
      [17, -14, 1.18],
      [-8, -6, 0.95],
      [8, -5, 0.95],
      [-27, 4, 1.3],
      [27, 3, 1.3],
      [-26, -15, 1.25],
      [26, -15, 1.25],
      [-26, 33, 1.1],
      [26, 33, 1.1],
      [-26, -38, 1.15],
      [26, -38, 1.15],
      // Perimeter grove framing
      [-34, 14, 1.35],
      [34, 12, 1.35],
      [-35, -8, 1.4],
      [35, -10, 1.4],
    ];
    forestTreeCoords.forEach(([tx, tz, sc], idx) => {
      const rTree = createRealisticTree(sc, idx + 3, maxAnisotropy);
      rTree.position.set(tx, 0, tz);
      scene.add(rTree);
      colliders.push({ x: tx, z: tz, r: 0.95 * sc });
    });

    // --- Palace Architecture & Royal Throne ---
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.32 });
    const turquoiseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.15 });

    const pillarCoords: [number, number][] = [
      [-15, -28],
      [15, -28],
      [-15, -42],
      [15, -42],
      [-15, -56],
      [15, -56],
    ];
    pillarCoords.forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 6.2, 18), pillarMat);
      col.position.set(px, 3.1, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      scene.add(col);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 0.5, 18), goldRimMat);
      cap.position.set(px, 6.35, pz);
      scene.add(cap);
      colliders.push({ x: px, z: pz, r: 0.9 });
    });

    const pavilion = new THREE.Group();
    pavilion.position.set(0, 0, -82);
    scene.add(pavilion);

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.6, 32), pillarMat);
    dais.position.y = 0.3;
    dais.receiveShadow = true;
    pavilion.add(dais);

    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.72 })
    );
    carpet.position.set(0, 0.62, 3.5);
    pavilion.add(carpet);

    // Golden Throne behind Sultan Harun
    const throneGroup = new THREE.Group();
    throneGroup.position.set(0, 0.6, -2.5);
    const throneBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.4), goldRimMat);
    throneBase.position.y = 0.35;
    const throneBack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.4, 0.28), goldRimMat);
    throneBack.position.set(0, 1.5, -0.56);
    const throneCushion = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.2, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 })
    );
    throneCushion.position.set(0, 0.78, 0.04);
    throneGroup.add(throneBase, throneBack, throneCushion);
    pavilion.add(throneGroup);
    colliders.push({ x: 0, z: -84.5, r: 1.3 });

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.52;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 6.8, 16), pillarMat);
      p.position.set(Math.cos(ang) * 6.5, 3.8, Math.sin(ang) * 6.5);
      p.castShadow = true;
      pavilion.add(p);
      colliders.push({
        x: Math.cos(ang) * 6.5,
        z: -82 + Math.sin(ang) * 6.5,
        r: 0.7,
      });
    }

    const grandDome = new THREE.Mesh(
      new THREE.SphereGeometry(6.8, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
      turquoiseMat
    );
    grandDome.position.y = 7.1;
    grandDome.castShadow = true;
    pavilion.add(grandDome);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 12), goldRimMat);
    spire.position.y = 14.5;
    pavilion.add(spire);

    // --- Barrier Gates ---
    const buildGate = (gx: number, gz: number) => {
      const gate = new THREE.Group();
      gate.position.set(gx, 0, gz);
      const postMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.65 });
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.78,
      });
      const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4.6, 14), postMat);
      leftPost.position.set(-4.2, 2.3, 0);
      leftPost.castShadow = true;
      const rightPost = leftPost.clone();
      rightPost.position.x = 4.2;
      const arch = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.55, 0.6), postMat);
      arch.position.set(0, 4.6, 0);
      const energyField = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.0, 0.25), barMat);
      energyField.position.set(0, 2.1, 0);
      energyField.name = 'barrierField';
      gate.add(leftPost, rightPost, arch, energyField);
      scene.add(gate);
      colliders.push({ x: gx - 4.2, z: gz, r: 0.65 }, { x: gx + 4.2, z: gz, r: 0.65 });
      return gate;
    };
    barrierGates[1] = buildGate(0, 15.5);
    barrierGates[2] = buildGate(0, -22.5);
    barrierGates[3] = buildGate(0, -61.5);

    // --- Interactive NPCs & Collectibles ---
    const registerClickable = (group: THREE.Object3D, entity: InteractiveEntity) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.interactiveEntity = entity;
          clickableMeshes.push(child);
        }
      });
    };

    const addNpc = (
      npcId: NpcId,
      charType: 'ustaz' | 'ranger' | 'wazir' | 'king',
      shirtColor: number,
      pantsColor: number,
      headwearColor: number,
      spriteLabel: string,
      rotY: number,
      scale = 1,
      baseY = 0
    ) => {
      const loc = NPC_LOCATIONS[npcId];
      const rig = createRealisticCharacter({ type: charType, shirtColor, pantsColor, headwearColor });
      rig.group.scale.setScalar(scale);
      rig.group.position.set(loc.x, baseY, loc.z);
      rig.group.rotation.y = rotY;
      scene.add(rig.group);

      const labelSprite = createFloatingTextSprite(spriteLabel);
      labelSprite.position.set(loc.x, baseY + 2.55 * scale, loc.z);
      scene.add(labelSprite);
      animatedMeshes.push({ mesh: labelSprite, baseY: baseY + 2.55 * scale, spin: false });

      const ent: InteractiveEntity = {
        id: `npc_${npcId}`,
        type: 'NPC',
        npcId,
        label: loc.label,
        pos: { x: loc.x, z: loc.z },
      };
      interactiveEntities.push(ent);
      entityMeshMap.set(ent.id, { group: rig.group });
      registerClickable(rig.group, ent);
      colliders.push({ x: loc.x, z: loc.z, r: 0.65 });
    };

    addNpc('ustaz', 'ustaz', 0x047857, 0xfefce8, 0xffffff, '👳‍♂️ Ustaz Hakim', 0.45);
    addNpc('ranger', 'ranger', 0x15803d, 0xfef3c7, 0x065f46, '🧕 Penjaga Safiyyah', 0.35);
    addNpc('wazir', 'wazir', 0x1d4ed8, 0xf8fafc, 0xf59e0b, '🧔‍♂️ Wazir Faris', 0.35);
    addNpc('king', 'king', 0x991b1b, 0xfefce8, 0xfbbf24, '👑 Sultan Harun', 0, 1.18, 0.6);

    // Stage 1 Objects (Custom 3D props on pedestals)
    STAGE1_OBJECTS.forEach((obj) => {
      const { group: pedestal, statusMat } = createStage1PedestalProp(obj.id);
      pedestal.position.set(obj.pos.x, 0, obj.pos.z);

      const wordTag = createFloatingTextSprite(`${obj.icon} ${obj.arabic}`, 'rgba(30, 58, 138, 0.9)', '#ffffff');
      wordTag.position.y = 2.45;
      pedestal.add(wordTag);

      scene.add(pedestal);
      const propMesh = pedestal.userData.propMesh as THREE.Object3D;
      animatedMeshes.push({ mesh: propMesh, baseY: 1.52, spin: true });

      const ent: InteractiveEntity = {
        id: obj.id,
        type: 'STAGE1_OBJ',
        label: `Periksa Objek: ${obj.arabic}`,
        pos: obj.pos,
        data: obj,
      };
      interactiveEntities.push(ent);
      entityMeshMap.set(obj.id, { group: pedestal, statusMat });
      registerClickable(pedestal, ent);
      colliders.push({ x: obj.pos.x, z: obj.pos.z, r: 0.95 });
    });

    // Stage 2 Cards
    STAGE2_CARDS.forEach((card) => {
      const cardGroup = new THREE.Group();
      cardGroup.position.set(card.pos.x, 0, card.pos.z);

      const cardMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.35,
      });
      const cardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.12), cardMat);
      cardMesh.position.y = 1.3;
      cardMesh.castShadow = true;
      cardGroup.add(cardMesh);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.65, 0.035, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.6 })
      );
      halo.position.y = 1.3;
      cardGroup.add(halo);

      const cardTag = createFloatingTextSprite(`✨ ${card.arabic}`, 'rgba(6, 78, 59, 0.9)', '#a7f3d0');
      cardTag.position.y = 2.3;
      cardGroup.add(cardTag);

      scene.add(cardGroup);
      animatedMeshes.push({ mesh: cardMesh, baseY: 1.3, spin: true });
      animatedMeshes.push({ mesh: halo, baseY: 1.3, spin: true });

      const ent: InteractiveEntity = {
        id: card.id,
        type: 'STAGE2_CARD',
        label: `Kumpul Kad Hikmah: ${card.arabic}`,
        pos: card.pos,
        data: card,
      };
      interactiveEntities.push(ent);
      entityMeshMap.set(card.id, { group: cardGroup });
      registerClickable(cardGroup, ent);
    });

    // Stage 3 Crystal Podiums
    STAGE3_SENTENCES.forEach((sent, idx) => {
      const podGroup = new THREE.Group();
      podGroup.position.set(sent.pos.x, 0, sent.pos.z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.85, 1.15, 16),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 })
      );
      base.position.y = 0.575;
      base.castShadow = true;
      podGroup.add(base);

      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x6d28d9,
        emissiveIntensity: 0.55,
        roughness: 0.14,
        metalness: 0.35,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat);
      crystal.position.y = 1.65;
      crystal.castShadow = true;
      podGroup.add(crystal);

      const podTag = createFloatingTextSprite(`📜 Teka-Teki #${idx + 1}`, 'rgba(76, 29, 149, 0.9)', '#ede9fe');
      podTag.position.y = 2.5;
      podGroup.add(podTag);

      scene.add(podGroup);
      animatedMeshes.push({ mesh: crystal, baseY: 1.65, spin: true });

      const ent: InteractiveEntity = {
        id: sent.id,
        type: 'STAGE3_SENT',
        label: `Selesaikan Teka-Teki Ayat #${idx + 1}`,
        pos: sent.pos,
        data: sent,
      };
      interactiveEntities.push(ent);
      entityMeshMap.set(sent.id, { group: podGroup, statusMat: crystalMat });
      registerClickable(podGroup, ent);
      colliders.push({ x: sent.pos.x, z: sent.pos.z, r: 0.95 });
    });

    // --- Player Rig & Physics ---
    const playerPhysics = {
      x: 0,
      y: 0,
      z: 42,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.PI,
      onGround: true,
      walkTime: 0,
      cheerTimer: 0,
    };

    const cameraState = {
      yaw: 0,
      targetYaw: 0,
      pitch: 0.28,
      targetPitch: 0.28,
      distance: 6.2,
      targetDistance: 6.2,
    };

    let playerRig: CharacterRig | null = null;
    const rebuildHeroFn = (id: HeroId) => {
      if (playerRig?.group) {
        scene.remove(playerRig.group);
      }
      const isGirl = id === 'girl';
      playerRig = createRealisticCharacter({
        type: isGirl ? 'girl' : 'boy',
        shirtColor: isGirl ? 0xe11d48 : 0x2563eb,
        pantsColor: isGirl ? 0xfefce8 : 0xf8fafc,
        headwearColor: isGirl ? 0xfb7185 : 0x1d4ed8,
      });
      playerRig.group.position.set(playerPhysics.x, playerPhysics.y, playerPhysics.z);
      playerRig.group.rotation.y = playerPhysics.yaw;
      scene.add(playerRig.group);
      if (worldRef.current) {
        worldRef.current.playerRig = playerRig;
      }
    };

    rebuildHeroFn(propsRef.current.heroId);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const keysPressed: Record<string, boolean> = {};
    worldRef.current = {
      scene,
      camera,
      renderer,
      playerRig,
      playerPhysics,
      cameraState,
      keysPressed,
      interactiveEntities,
      entityMeshMap,
      barrierGates,
      unlockedStageNum: 1,
      colliders,
      nearestId: null,
      rebuildHeroFn,
    };

    // --- Input Event Listeners ---
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.code] = true;
      const p = propsRef.current;
      if (p.screenPhase !== 'PLAYING') return;

      if (e.code === 'Space' && !p.isModalOpen) {
        e.preventDefault();
        if (playerPhysics.onGround) {
          playerPhysics.vy = 7.6;
          playerPhysics.onGround = false;
          playSound('jump', p.muted);
        }
      } else if (e.code === 'KeyE' && !p.isModalOpen) {
        const w = worldRef.current;
        if (w?.nearestId) {
          const found = interactiveEntities.find((it) => it.id === w.nearestId);
          if (found) p.onInteractEntity(found);
        }
      } else if (e.code === 'KeyV' && !p.isModalOpen) {
        p.onToggleCameraMode();
      } else if (e.code === 'KeyR' && !p.isModalOpen) {
        cameraState.targetYaw = playerPhysics.yaw + Math.PI;
        cameraState.targetPitch = 0.28;
        p.onToast('Kamera dilaraskan ke belakang watak 🎥');
      } else if (e.code === 'KeyM') {
        p.onToggleWorldMap();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    let isDragging = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      const p = propsRef.current;
      if (p.screenPhase !== 'PLAYING' || p.isModalOpen) return;
      isDragging = true;
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cameraState.targetYaw -= dx * 0.0065;
      cameraState.targetPitch = Math.max(-0.22, Math.min(0.85, cameraState.targetPitch + dy * 0.005));
    };

    const onPointerUp = (e: PointerEvent) => {
      const p = propsRef.current;
      if (isDragging && p.screenPhase === 'PLAYING' && !p.isModalOpen) {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved < 7) {
          _pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
          _pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
          _raycaster.setFromCamera(_pointerNDC, camera);
          const hits = _raycaster.intersectObjects(clickableMeshes, false);
          if (hits.length > 0 && hits[0].object.userData.interactiveEntity) {
            const clickedEnt = hits[0].object.userData.interactiveEntity as InteractiveEntity;
            const dist = Math.hypot(
              playerPhysics.x - clickedEnt.pos.x,
              playerPhysics.z - clickedEnt.pos.z
            );
            if (dist <= 9.5) {
              p.onInteractEntity(clickedEnt);
            } else {
              p.onToast('Dekati objek atau watak itu terlebih dahulu! 🏃');
            }
          }
        }
      }
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      const p = propsRef.current;
      if (p.screenPhase !== 'PLAYING' || p.isModalOpen || p.cameraMode !== 'TPP') return;
      cameraState.targetDistance = Math.max(
        3.8,
        Math.min(10.5, cameraState.targetDistance + e.deltaY * 0.004)
      );
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let frameId = 0;
    let totalElapsed = 0;
    let lastMinimapTime = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      totalElapsed += dt;
      const p = propsRef.current;

      // Clouds
      for (let i = 0; i < cloudList.length; i++) {
        const c = cloudList[i];
        c.mesh.position.x += c.speed * dt;
        if (c.mesh.position.x > 115) c.mesh.position.x = -115;
      }

      // Fountain particles
      for (let i = 0; i < fountainParticles.length; i++) {
        const fp = fountainParticles[i];
        const t = (totalElapsed * 0.85 + fp.phase) % 1;
        const radius = 0.25 + t * 1.65;
        const height = 1.95 + Math.sin(t * Math.PI) * 0.85 - t * 1.35;
        fp.mesh.position.set(
          Math.cos(fp.angle) * radius,
          Math.max(0.62, height),
          Math.sin(fp.angle) * radius
        );
      }

      // Floating props & sprites
      for (let i = 0; i < animatedMeshes.length; i++) {
        const am = animatedMeshes[i];
        if (!am.mesh.visible) continue;
        am.mesh.position.y = am.baseY + Math.sin(totalElapsed * 2.5 + am.baseY) * 0.13;
        if (am.spin) am.mesh.rotation.y += dt * 1.5;
      }

      // Smooth camera damping
      cameraState.yaw = THREE.MathUtils.damp(cameraState.yaw, cameraState.targetYaw, 14, dt);
      cameraState.pitch = THREE.MathUtils.damp(cameraState.pitch, cameraState.targetPitch, 14, dt);
      cameraState.distance = THREE.MathUtils.damp(
        cameraState.distance,
        cameraState.targetDistance,
        10,
        dt
      );

      if (p.screenPhase === 'PLAYING' && playerRig) {
        let moveForward = 0;
        let moveRight = 0;
        if (!p.isModalOpen) {
          if (keysPressed['KeyW'] || keysPressed['ArrowUp']) moveForward += 1;
          if (keysPressed['KeyS'] || keysPressed['ArrowDown']) moveForward -= 1;
          if (keysPressed['KeyD'] || keysPressed['ArrowRight']) moveRight += 1;
          if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) moveRight -= 1;
        }

        const speed = 9.4;
        _forwardVec.set(-Math.sin(cameraState.yaw), 0, -Math.cos(cameraState.yaw));
        _rightVec.set(Math.cos(cameraState.yaw), 0, -Math.sin(cameraState.yaw));

        _wishDir
          .set(0, 0, 0)
          .addScaledVector(_forwardVec, moveForward)
          .addScaledVector(_rightVec, moveRight);

        const isMoving = _wishDir.lengthSq() > 0.001;
        if (isMoving) {
          _wishDir.normalize();
          playerPhysics.vx = _wishDir.x * speed;
          playerPhysics.vz = _wishDir.z * speed;

          if (p.cameraMode === 'TPP') {
            const targetYaw = Math.atan2(_wishDir.x, _wishDir.z);
            let diff = targetYaw - playerPhysics.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerPhysics.yaw += diff * (1 - Math.exp(-12 * dt));
          }
        } else {
          const dampFactor = Math.exp(-14 * dt);
          playerPhysics.vx *= dampFactor;
          playerPhysics.vz *= dampFactor;
        }

        if (p.cameraMode === 'FPP') {
          playerPhysics.yaw = cameraState.yaw + Math.PI;
        }

        playerPhysics.vy -= 19.5 * dt;
        let nextX = playerPhysics.x + playerPhysics.vx * dt;
        let nextY = playerPhysics.y + playerPhysics.vy * dt;
        let nextZ = playerPhysics.z + playerPhysics.vz * dt;

        // Ground & Royal Dais step
        const distRoyalDais = Math.hypot(nextX, nextZ + 82);
        const floorY = distRoyalDais < 8.4 ? 0.6 : 0.0;
        if (nextY <= floorY) {
          nextY = floorY;
          playerPhysics.vy = 0;
          playerPhysics.onGround = true;
        }

        // World bounds
        nextX = Math.max(-32, Math.min(32, nextX));
        nextZ = Math.max(-94, Math.min(48, nextZ));

        // Zone barrier gates
        const unlocked = worldRef.current?.unlockedStageNum ?? 1;
        if (unlocked < 2 && nextZ < 16.4) nextZ = 16.4;
        if (unlocked < 3 && nextZ < -21.6) nextZ = -21.6;
        if (unlocked < 4 && nextZ < -60.6) nextZ = -60.6;

        // Smooth circle obstacle collision resolution
        const playerRadius = 0.45;
        for (let i = 0; i < colliders.length; i++) {
          const c = colliders[i];
          const dx = nextX - c.x;
          const dz = nextZ - c.z;
          const minDist = c.r + playerRadius;
          const distSq = dx * dx + dz * dz;
          if (distSq < minDist * minDist && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const push = minDist - dist;
            nextX += (dx / dist) * push;
            nextZ += (dz / dist) * push;
          }
        }

        playerPhysics.x = nextX;
        playerPhysics.y = nextY;
        playerPhysics.z = nextZ;

        playerRig.group.position.set(playerPhysics.x, playerPhysics.y, playerPhysics.z);
        playerRig.group.rotation.y = playerPhysics.yaw;

        // Character skeletal limb kinematics
        if (playerPhysics.cheerTimer > 0) {
          playerPhysics.cheerTimer -= dt;
          const wave = Math.sin(playerPhysics.cheerTimer * 14);
          playerRig.leftArm.rotation.z = -2.6 + wave * 0.25;
          playerRig.rightArm.rotation.z = 2.6 - wave * 0.25;
          playerRig.torso.position.y = 1.08 + Math.abs(wave) * 0.08;
        } else if (!playerPhysics.onGround) {
          playerRig.leftArm.rotation.z = -0.55;
          playerRig.rightArm.rotation.z = 0.55;
          playerRig.leftLeg.rotation.x = 0.35;
          playerRig.rightLeg.rotation.x = -0.25;
        } else if (isMoving) {
          playerPhysics.walkTime += dt * 11;
          const swing = Math.sin(playerPhysics.walkTime) * 0.62;
          playerRig.leftLeg.rotation.x = swing;
          playerRig.rightLeg.rotation.x = -swing;
          playerRig.leftArm.rotation.x = -swing * 0.85;
          playerRig.rightArm.rotation.x = swing * 0.85;
          playerRig.leftArm.rotation.z = 0;
          playerRig.rightArm.rotation.z = 0;
          playerRig.torso.position.y = 1.08 + Math.abs(Math.cos(playerPhysics.walkTime)) * 0.04;
        } else {
          const idleDamp = Math.exp(-10 * dt);
          playerRig.leftLeg.rotation.x *= idleDamp;
          playerRig.rightLeg.rotation.x *= idleDamp;
          playerRig.leftArm.rotation.x *= idleDamp;
          playerRig.rightArm.rotation.x *= idleDamp;
          playerRig.leftArm.rotation.z *= idleDamp;
          playerRig.rightArm.rotation.z *= idleDamp;
          playerRig.torso.position.y = 1.08 + Math.sin(totalElapsed * 2.2) * 0.012;
        }

        // Camera positioning (FPP / TPP)
        if (p.cameraMode === 'FPP') {
          playerRig.head.visible = false;
          playerRig.torso.visible = false;
          const eyeY = playerPhysics.y + 1.68;
          camera.position.set(playerPhysics.x, eyeY, playerPhysics.z);
          _lookTarget.set(
            playerPhysics.x - Math.sin(cameraState.yaw) * 10,
            eyeY - Math.sin(cameraState.pitch) * 6,
            playerPhysics.z - Math.cos(cameraState.yaw) * 10
          );
          camera.lookAt(_lookTarget);
        } else {
          playerRig.head.visible = true;
          playerRig.torso.visible = true;
          _targetCenter.set(playerPhysics.x, playerPhysics.y + 1.45, playerPhysics.z);
          const horizDist = Math.cos(cameraState.pitch) * cameraState.distance;
          const vertDist = Math.sin(cameraState.pitch) * cameraState.distance;
          camera.position.set(
            _targetCenter.x + Math.sin(cameraState.yaw) * horizDist,
            Math.max(0.65, _targetCenter.y + vertDist),
            _targetCenter.z + Math.cos(cameraState.yaw) * horizDist
          );
          camera.lookAt(_targetCenter);
        }

        // Proximity detection & Stage 2 auto-pickup
        if (!p.isModalOpen) {
          let best: InteractiveEntity | null = null;
          let bestDist = 3.8;
          for (let i = 0; i < interactiveEntities.length; i++) {
            const ent = interactiveEntities[i];
            if (ent.type === 'STAGE2_CARD' && p.collectedStage2Ids[ent.id]) continue;
            const d = Math.hypot(playerPhysics.x - ent.pos.x, playerPhysics.z - ent.pos.z);
            if (ent.type === 'STAGE2_CARD' && d < 2.25) {
              p.onAutoCollectStage2Card(ent);
              continue;
            }
            if (d < bestDist) {
              bestDist = d;
              best = ent;
            }
          }
          const nextNearestId = best ? best.id : null;
          if (worldRef.current && worldRef.current.nearestId !== nextNearestId) {
            worldRef.current.nearestId = nextNearestId;
            p.onNearestEntityChange(best);
          }
        } else if (worldRef.current && worldRef.current.nearestId !== null) {
          worldRef.current.nearestId = null;
          p.onNearestEntityChange(null);
        }

        // Throttled Minimap (~12fps)
        if (totalElapsed - lastMinimapTime > 0.08) {
          lastMinimapTime = totalElapsed;
          p.onMinimapUpdate({
            playerX: playerPhysics.x,
            playerZ: playerPhysics.z,
            playerYaw: playerPhysics.yaw,
          });
        }
      } else if (p.screenPhase === 'CHAR_SELECT' && playerRig) {
        // Live hero turntable preview in front of the village courtyard
        playerRig.head.visible = true;
        playerRig.torso.visible = true;
        playerRig.group.position.set(0, 0, 42);
        playerRig.group.rotation.y = Math.sin(totalElapsed * 0.75) * 0.55;
        camera.position.set(1.6, 2.0, 45.8);
        _lookTarget.set(0, 1.25, 42);
        camera.lookAt(_lookTarget);
      } else {
        // Menu cinematic flyover of the village courtyard & fountain
        camera.position.set(
          Math.sin(totalElapsed * 0.16) * 18,
          9.5,
          48 + Math.cos(totalElapsed * 0.16) * 8
        );
        _lookTarget.set(0, 2.2, 26);
        camera.lookAt(_lookTarget);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      worldRef.current = null;
    };
  }, [controllerRef]);

  return (
    <>
      <div ref={mountRef} className="fixed inset-0 z-0" aria-label="Paparan Dunia 3D Kembara Bahasa Arab" />
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 text-center">
          <div className="quest-panel max-w-md rounded-3xl p-6">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Paparan 3D Tidak Tersedia</h2>
            <p className="text-sm text-slate-700">{webglError}</p>
          </div>
        </div>
      )}
    </>
  );
};
