/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTexture } from './textureManager';
import { SoulDoll, Spirit, NPC, Chest, Enemy, GrassPatch, Signpost } from '../types';
import { LUMINATI_SCALE } from '../data/constants';
import {
  createGroundTexture,
  createDenseTreeTexture,
  createSparkleTexture,
  createStoneWallTexture,
  createPropsSpriteTexture,
  createNPCTexture,
  createEnemyTexture,
  createChestTexture,
  createGrassTexture,
  createSoulDollTexture,
  createSpiritTexture,
  createMoonTexture,
  createHouseWallTexture,
  createHouseRoofTexture,
  createHouseSideTexture,
  createLabWallTexture,
  createLabRoofTexture,
  createCobblestoneRoadTexture,
  createFenceTexture,
  createHedgeTexture,
  createFlowerbedTexture,
  createSignpostTexture,
  createStreetLampTexture,
  createWoodPlankTexture,
} from './textures';

export interface TreeData {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Sprite;
  scale: number;
}

export interface FountainData {
  x: number;
  z: number;
  radius: number;
}

export interface CollisionBox {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export interface SparkleData {
  mesh: THREE.Sprite;
  baseY: number;
  phase: number;
  speed: number;
}

export interface GrassTuftData {
  mesh: THREE.Sprite;
  x: number;
  z: number;
  baseY: number;
  phase: number;
}

export function getTerrainHeight(x: number, z: number): number {
  let h1 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 6;
  const h2 = Math.sin(x * 0.05 + 1.2) * Math.sin(z * 0.05 + 0.8) * 2.5;
  const h3 = Math.cos(x * 0.008) * Math.sin(z * 0.008) * 12;

  let rawH = h1 + h2 + h3;

  const lakeDist = Math.hypot(x - 100, z - (-80));
  if (lakeDist < 50) {
    const depth = Math.max(0, (50 - lakeDist) / 50) * 5;
    rawH -= depth;
  }

  const vmDist = Math.hypot(x, z);
  if (vmDist < 34) {
    const targetH = 1.0;
    const blend = Math.max(0, Math.min(1.0, (vmDist - 22) / 12));
    rawH = THREE.MathUtils.lerp(targetH, rawH, blend);
  }

  return rawH;
}

export function buildWorld(scene: THREE.Scene, camera: THREE.PerspectiveCamera): {
  soulDolls: SoulDoll[];
  spirits: Spirit[];
  trees: TreeData[];
  collisionBoxes: CollisionBox[];
  lakeCenter: { x: number; z: number };
  npcs: NPC[];
  chests: Chest[];
  enemies: Enemy[];
  grassPatches: GrassPatch[];
  fountains: FountainData[];
  signposts: Signpost[];
  isInsideGrass: (x: number, z: number) => boolean;
  updateWorld: (delta: number, playerX: number, playerZ: number) => void;
  setTimeOfDay: (t: number) => void;
} {
  const nightColor = new THREE.Color(0x0e1b38);
  const dayColor = new THREE.Color(0x7dd3fc);

  scene.background = nightColor.clone();
  scene.fog = new THREE.Fog(nightColor.getHex(), 55, 240);

  const hemi = new THREE.HemisphereLight(0x60a5fa, 0x162447, 0.95);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xe0f2fe, 1.35);
  moonLight.position.set(-80, 100, -80);
  scene.add(moonLight);

  const terrainGeo = new THREE.PlaneGeometry(400, 400, 128, 128);
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    pos.setY(i, getTerrainHeight(px, pz));
  }
  terrainGeo.computeVertexNormals();

  const groundTex = getTexture('ground', createGroundTexture);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.85,
    metalness: 0.05,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  scene.add(terrainMesh);

  const moonTex = getTexture('moon', createMoonTexture);
  const moonMat = new THREE.SpriteMaterial({
    map: moonTex,
    transparent: true,
  });
  const moonSprite = new THREE.Sprite(moonMat);
  moonSprite.scale.set(27.04, 27.04, 1); // 20.8 * 1.3
  moonSprite.position.set(-120, 117, -140); // Y: 90 * 1.3
  scene.add(moonSprite);

  const starsGeo = new THREE.BufferGeometry();
  const starCount = 300;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPos[i] = (Math.random() - 0.5) * 350;
    starPos[i + 1] = 60 + Math.random() * 60;
    starPos[i + 2] = (Math.random() - 0.5) * 350;
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  const mountainGroup = new THREE.Group();
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const mountainCount = 18;
  for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2;
    const dist = 320 + Math.random() * 40;
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist;

    const mGeo = new THREE.ConeGeometry(40 + Math.random() * 20, 35 + Math.random() * 25, 4);
    const mMesh = new THREE.Mesh(mGeo, mountainMat);
    mMesh.position.set(mx, getTerrainHeight(mx, mz) + 10, mz);
    mountainGroup.add(mMesh);
  }
  scene.add(mountainGroup);

  const lakeX = 100;
  const lakeZ = -80;
  const lakeY = getTerrainHeight(lakeX, lakeZ) + 0.2;

  const waterGeo = new THREE.CircleGeometry(26, 32);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.82,
    roughness: 0.15,
    metalness: 0.7,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(lakeX, lakeY, lakeZ);
  scene.add(waterMesh);

  const collisionBoxes: CollisionBox[] = [];

  const isOnPath = (x: number, z: number): boolean => {
    const pathCurve = Math.sin(x * 0.03) * 35 + Math.cos(x * 0.01) * 20;
    return Math.abs(z - pathCurve) < 7.0;
  };

  const grassPatches: GrassPatch[] = [];
  const grassTufts: GrassTuftData[] = [];
  const grassTex = getTexture('grass', createGrassTexture);
  const grassMat = new THREE.SpriteMaterial({
    map: grassTex,
    transparent: true,
    alphaTest: 0.5,
  });

  const grassGroup = new THREE.Group();
  const v1x = -70, v1z = -70;
  const v2x = 90, v2z = 10;
  const v3x = 10, v3z = 80;

  let patchCount = 0;
  let grassAttempts = 0;
  while (patchCount < 32 && grassAttempts < 400) {
    grassAttempts++;
    const gx = (Math.random() - 0.5) * 340;
    const gz = (Math.random() - 0.5) * 340;
    const gRadius = 3 + Math.random() * 4.5;

    if (Math.hypot(gx, gz) < 30) continue;
    if (isOnPath(gx, gz)) continue;
    if (Math.hypot(gx - v1x, gz - v1z) < 20) continue;
    if (Math.hypot(gx - v2x, gz - v2z) < 20) continue;
    if (Math.hypot(gx - v3x, gz - v3z) < 20) continue;
    if (Math.hypot(gx - lakeX, gz - lakeZ) < 35) continue;

    grassPatches.push({ x: gx, z: gz, radius: gRadius });
    patchCount++;

    const tuftCount = Math.floor(gRadius * 5);
    for (let t = 0; t < tuftCount; t++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * gRadius;
      const tx = gx + Math.cos(angle) * r;
      const tz = gz + Math.sin(angle) * r;
      const ty = getTerrainHeight(tx, tz);

      const sprite = new THREE.Sprite(grassMat);
      sprite.scale.set(LUMINATI_SCALE.TALL_GRASS_SIZE, LUMINATI_SCALE.TALL_GRASS_SIZE, 1);
      sprite.position.set(tx, ty + (LUMINATI_SCALE.TALL_GRASS_SIZE * 0.5), tz);
      grassGroup.add(sprite);

      grassTufts.push({
        mesh: sprite,
        x: tx,
        z: tz,
        baseY: ty + (LUMINATI_SCALE.TALL_GRASS_SIZE * 0.5),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  scene.add(grassGroup);

  const isInsideGrass = (x: number, z: number): boolean => {
    for (let i = 0; i < grassPatches.length; i++) {
      const p = grassPatches[i];
      if (Math.hypot(p.x - x, p.z - z) <= p.radius) {
        return true;
      }
    }
    return false;
  };

  const fountains: { x: number; z: number; radius: number; orbMesh: THREE.Mesh; baseY: number }[] = [
    { x: -2.0, z: -1.0, radius: 3.5, orbMesh: null as any, baseY: 0 },
    { x: 82, z: 8, radius: 3.5, orbMesh: null as any, baseY: 0 },
    { x: -64, z: -62, radius: 3.5, orbMesh: null as any, baseY: 0 },
  ];

  const fountainGroup = new THREE.Group();
  const fountainStoneMat = new THREE.MeshStandardMaterial({
    map: getTexture('stone_wall', createStoneWallTexture),
    roughness: 0.8,
  });
  const fountainWaterMat = new THREE.MeshStandardMaterial({
    color: 0x5fe3d2,
    emissive: 0x0d9488,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.8,
  });
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x5fe3d2,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  fountains.forEach(f => {
    const fy = getTerrainHeight(f.x, f.z);
    f.baseY = fy + 1.8;

    const basinGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 8);
    const basinMesh = new THREE.Mesh(basinGeo, fountainStoneMat);
    basinMesh.position.set(f.x, fy + 0.6, f.z);
    fountainGroup.add(basinMesh);

    const waterGeo = new THREE.CircleGeometry(2.2, 16);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, fountainWaterMat);
    waterMesh.position.set(f.x, fy + 1.15, f.z);
    fountainGroup.add(waterMesh);

    const orbGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.set(f.x, f.baseY, f.z);
    fountainGroup.add(orbMesh);
    f.orbMesh = orbMesh;

    const light = new THREE.PointLight(0x5fe3d2, 1.8, 14);
    light.position.set(f.x, fy + 2.2, f.z);
    fountainGroup.add(light);

    collisionBoxes.push({ x: f.x, z: f.z, rx: 2.4, rz: 2.4 });
  });
  scene.add(fountainGroup);

  const npcs: NPC[] = [
    {
      id: 'npc-elder',
      x: 8.5,
      z: -6.5,
      name: 'Anciano Kaelen',
      dialogue: [
        '¡Saludos, joven Marionetista! He dedicado mi vida a estudiar los lazos entre las almas y nuestros muñecos.',
        'Misión: En el Gran Lago al este habitan almas de Agua puras como Aquelle. ¡Captura una para purificar el santuario y te daré 3 Cristales Superiores!'
      ],
      questGiven: 'water_soul_quest',
      questCompleted: false,
    },
    {
      id: 'npc-alchemist',
      x: -5.5,
      z: -1.0,
      name: 'Alquimista Mira',
      dialogue: [
        '¡Bienvenido a la plaza de Villa Marioneta! Esta Fuente Sagrada bendice y restaura el HP de todas tus almas.',
        'Acércate a sus aguas cristalinas y pulsa la tecla [E] cuando tu equipo de almas necesite recuperarse.'
      ],
    },
    {
      id: 'npc-guard',
      x: -3.2,
      z: 22.5,
      name: 'Guardia Thorne',
      dialogue: [
        '¡Alto ahí, caminante! Más allá de este arco comienza la Ruta 1 del Bosque Sombra.',
        'Si te adentras en la hierba alta, las almas salvajes te desafiarán a combate por turnos. ¡Asegúrate de llevar pociones!'
      ],
    },
    {
      id: 'npc-apprentice',
      x: -2.0,
      z: 9.0,
      name: 'Tobías el Marionetista',
      dialogue: [
        '¡Hola vecino! Tu casa y la de Selene se ven hermosas hoy. Selene ya partió a entrenar al bosque.',
        'Recuerda que con la tecla [J] puedes abrir tu Luminadex para revisar las almas que has visto y capturado.'
      ],
    }
  ];

  const npcGroup = new THREE.Group();
  npcs.forEach((n, idx) => {
    const variant = idx % 3;
    const tex = getTexture(`npc_${variant}`, () => createNPCTexture(variant));
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.0, 6.0, 1);
    sprite.position.set(n.x, getTerrainHeight(n.x, n.z) + 3.0, n.z);
    npcGroup.add(sprite);
  });
  scene.add(npcGroup);

  const chests: Chest[] = [
    {
      id: 'chest-quest',
      x: 110,
      z: -75,
      opened: false,
      rewardType: 'gold',
      rewardAmount: 150,
      rewardName: '150x Oro Ancestral',
    },
    {
      id: 'chest-2',
      x: -80,
      z: -60,
      opened: false,
      rewardType: 'item',
      rewardAmount: 1,
      rewardName: 'Poción de Vida Mágica',
    },
    {
      id: 'chest-3',
      x: 95,
      z: 5,
      opened: false,
      rewardType: 'gold',
      rewardAmount: 100,
      rewardName: '100x Oro de la Torre',
    }
  ];

  const chestGroup = new THREE.Group();
  const chestSprites: THREE.Sprite[] = [];
  const closedChestTex = getTexture('chest_closed', () => createChestTexture(false));
  const openChestTex = getTexture('chest_open', () => createChestTexture(true));

  chests.forEach(c => {
    const mat = new THREE.SpriteMaterial({ map: closedChestTex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(LUMINATI_SCALE.CHEST_SIZE, LUMINATI_SCALE.CHEST_SIZE, 1);
    sprite.position.set(c.x, getTerrainHeight(c.x, c.z) + (LUMINATI_SCALE.CHEST_SIZE * 0.5), c.z);
    chestGroup.add(sprite);
    chestSprites.push(sprite);
  });
  scene.add(chestGroup);

  const enemies: Enemy[] = [];
  const enemySprites: THREE.Sprite[] = [];
  const enemyTex = getTexture('enemy_blob', createEnemyTexture);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const ex = Math.cos(angle) * 45;
    const ez = Math.sin(angle) * 45;
    enemies.push({
      id: `enemy-${i}`,
      x: ex,
      z: ez,
      startX: ex,
      startZ: ez,
      hp: 3,
      maxHp: 3,
      radius: 2.0,
      patrolDist: 15,
      speed: 2.5,
      alive: true,
    });

    const mat = new THREE.SpriteMaterial({ map: enemyTex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.0, 4.0, 1);
    sprite.position.set(ex, getTerrainHeight(ex, ez) + 2.0, ez);
    scene.add(sprite);
    enemySprites.push(sprite);
  }

  const villageGroup = new THREE.Group();
  const roadTex = getTexture('road_cobble', createCobblestoneRoadTexture);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.85,
    metalness: 0.08,
  });

  const plazaGeo = new THREE.CircleGeometry(12.0, 32);
  plazaGeo.rotateX(-Math.PI / 2);
  const plazaMesh = new THREE.Mesh(plazaGeo, roadMat);
  plazaMesh.position.set(-1.0, 1.02, -0.5);
  villageGroup.add(plazaMesh);

  const nsRoadGeo = new THREE.PlaneGeometry(9.0, 56);
  nsRoadGeo.rotateX(-Math.PI / 2);
  const nsRoadMesh = new THREE.Mesh(nsRoadGeo, roadMat);
  nsRoadMesh.position.set(0, 1.018, 0);
  villageGroup.add(nsRoadMesh);

  const ewRoadGeo = new THREE.PlaneGeometry(54, 9.0);
  ewRoadGeo.rotateX(-Math.PI / 2);
  const ewRoadMesh = new THREE.Mesh(ewRoadGeo, roadMat);
  ewRoadMesh.position.set(0, 1.022, 10);
  villageGroup.add(ewRoadMesh);

  const labRoadGeo = new THREE.PlaneGeometry(16, 7.5);
  labRoadGeo.rotateX(-Math.PI / 2);
  const labRoadMesh = new THREE.Mesh(labRoadGeo, roadMat);
  labRoadMesh.position.set(10, 1.022, -8);
  villageGroup.add(labRoadMesh);

  const southWaterGeo = new THREE.CircleGeometry(15.0, 32);
  southWaterGeo.rotateX(-Math.PI / 2);
  const southWaterMesh = new THREE.Mesh(southWaterGeo, waterMat);
  southWaterMesh.position.set(0, 0.8, -32);
  villageGroup.add(southWaterMesh);

  const plankTex = getTexture('wood_plank', createWoodPlankTexture);
  const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.8 });
  const pierGeo = new THREE.BoxGeometry(6.5, 0.5, 14);
  const pierMesh = new THREE.Mesh(pierGeo, plankMat);
  pierMesh.position.set(0, 1.0, -25);
  villageGroup.add(pierMesh);

  const heroWallTex = getTexture('house_wall_hero', () => createHouseWallTexture('hero'));
  const sideWallTex = getTexture('house_side', createHouseSideTexture);
  const heroRoofTex = getTexture('house_roof_hero', () => createHouseRoofTexture('hero'));

  const heroWallMat = new THREE.MeshStandardMaterial({ map: heroWallTex, roughness: 0.75 });
  const sideWallMat = new THREE.MeshStandardMaterial({ map: sideWallTex, roughness: 0.75 });
  const heroRoofMat = new THREE.MeshStandardMaterial({ map: heroRoofTex, roughness: 0.7 });

  const heroHouseMaterials = [sideWallMat, sideWallMat, sideWallMat, sideWallMat, sideWallMat, heroWallMat];
  const houseGeo = new THREE.BoxGeometry(
    LUMINATI_SCALE.HOUSE_WIDTH,
    LUMINATI_SCALE.HOUSE_HEIGHT,
    LUMINATI_SCALE.HOUSE_DEPTH
  );
  const heroHouse = new THREE.Mesh(houseGeo, heroHouseMaterials);
  heroHouse.position.set(-20, 6.0, 18);
  villageGroup.add(heroHouse);
  collisionBoxes.push({ x: -20, z: 18, rx: 9.8, rz: 7.8 });

  const roofGeo = new THREE.BoxGeometry(
    LUMINATI_SCALE.HOUSE_WIDTH + 1.6,
    LUMINATI_SCALE.ROOF_HEIGHT,
    LUMINATI_SCALE.HOUSE_DEPTH + 1.6
  );
  const heroRoof = new THREE.Mesh(roofGeo, heroRoofMat);
  heroRoof.position.set(-20, 12.6, 18);
  villageGroup.add(heroRoof);

  const rivalWallTex = getTexture('house_wall_rival', () => createHouseWallTexture('rival'));
  const rivalRoofTex = getTexture('house_roof_rival', () => createHouseRoofTexture('rival'));
  const rivalWallMat = new THREE.MeshStandardMaterial({ map: rivalWallTex, roughness: 0.75 });
  const rivalRoofMat = new THREE.MeshStandardMaterial({ map: rivalRoofTex, roughness: 0.7 });

  const rivalHouseMaterials = [sideWallMat, sideWallMat, sideWallMat, sideWallMat, sideWallMat, rivalWallMat];
  const rivalHouse = new THREE.Mesh(houseGeo, rivalHouseMaterials);
  rivalHouse.position.set(20, 6.0, 18);
  villageGroup.add(rivalHouse);
  collisionBoxes.push({ x: 20, z: 18, rx: 9.8, rz: 7.8 });

  const rivalRoof = new THREE.Mesh(roofGeo, rivalRoofMat);
  rivalRoof.position.set(20, 12.6, 18);
  villageGroup.add(rivalRoof);

  const labWallTex = getTexture('lab_wall', createLabWallTexture);
  const labRoofTex = getTexture('lab_roof', createLabRoofTexture);
  const labWallMat = new THREE.MeshStandardMaterial({ map: labWallTex, roughness: 0.75 });
  const labRoofMat = new THREE.MeshStandardMaterial({ map: labRoofTex, roughness: 0.7 });

  const labMaterials = [sideWallMat, sideWallMat, sideWallMat, sideWallMat, labWallMat, sideWallMat];
  const labGeo = new THREE.BoxGeometry(
    LUMINATI_SCALE.LAB_WIDTH,
    LUMINATI_SCALE.LAB_HEIGHT,
    LUMINATI_SCALE.LAB_DEPTH
  );
  const labBuilding = new THREE.Mesh(labGeo, labMaterials);
  labBuilding.position.set(22, 7.5, -16);
  villageGroup.add(labBuilding);
  collisionBoxes.push({ x: 22, z: -16, rx: 13.8, rz: 9.8 });

  const labRoofGeo = new THREE.BoxGeometry(
    LUMINATI_SCALE.LAB_WIDTH + 1.8,
    LUMINATI_SCALE.LAB_ROOF_HEIGHT,
    LUMINATI_SCALE.LAB_DEPTH + 1.8
  );
  const labRoof = new THREE.Mesh(labRoofGeo, labRoofMat);
  labRoof.position.set(22, 16.0, -16);
  villageGroup.add(labRoof);

  const fenceTex = getTexture('fence', createFenceTexture);
  const hedgeTex = getTexture('hedge', createHedgeTexture);
  const flowerbedTex = getTexture('flowerbed', createFlowerbedTexture);
  const lampTex = getTexture('street_lamp', createStreetLampTexture);

  const fenceMat = new THREE.SpriteMaterial({ map: fenceTex, transparent: true });
  const hedgeMat = new THREE.SpriteMaterial({ map: hedgeTex, transparent: true });
  const flowerbedMat = new THREE.MeshStandardMaterial({ map: flowerbedTex, transparent: true, roughness: 0.9 });
  const lampMat = new THREE.SpriteMaterial({ map: lampTex, transparent: true });

  // Picket fences along front gardens
  [-28, -24, -20, -16, -12].forEach(fx => {
    const s = new THREE.Sprite(fenceMat);
    s.scale.set(LUMINATI_SCALE.FENCE_SIZE, LUMINATI_SCALE.FENCE_SIZE, 1);
    s.position.set(fx, 1.0 + (LUMINATI_SCALE.FENCE_SIZE * 0.5), 10.5);
    villageGroup.add(s);
  });
  [12, 16, 20, 24, 28].forEach(fx => {
    const s = new THREE.Sprite(fenceMat);
    s.scale.set(LUMINATI_SCALE.FENCE_SIZE, LUMINATI_SCALE.FENCE_SIZE, 1);
    s.position.set(fx, 1.0 + (LUMINATI_SCALE.FENCE_SIZE * 0.5), 10.5);
    villageGroup.add(s);
  });

  // Street lamps around central plaza
  const lampPositions = [
    { x: -6.0, z: 3.5 },
    { x: 6.0, z: 3.5 },
    { x: -6.0, z: -4.5 },
    { x: 6.0, z: -4.5 },
  ];
  lampPositions.forEach(lp => {
    const s = new THREE.Sprite(lampMat);
    s.scale.set(LUMINATI_SCALE.STREET_LAMP_WIDTH, LUMINATI_SCALE.STREET_LAMP_HEIGHT, 1);
    s.position.set(lp.x, 1.0 + (LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.5), lp.z);
    villageGroup.add(s);
  });

  const fbGeo = new THREE.PlaneGeometry(14, 3);
  fbGeo.rotateX(-Math.PI / 2);
  const fb1 = new THREE.Mesh(fbGeo, flowerbedMat);
  fb1.position.set(-20, 1.025, 9.5);
  villageGroup.add(fb1);

  const fb2 = new THREE.Mesh(fbGeo, flowerbedMat);
  fb2.position.set(20, 1.025, 9.5);
  villageGroup.add(fb2);

  const signposts: Signpost[] = [
    {
      id: 'sign-town',
      x: 3.8,
      z: 1.5,
      name: 'Villa Marioneta',
      text: 'VILLA MARIONETA: "Pueblo natal de los Marionetistas. Donde los lazos de alma cobran vida."',
    },
    {
      id: 'sign-hero',
      x: -11.5,
      z: 9.5,
      name: 'Casa del Héroe',
      text: 'Casa de Robin: "Un hogar acogedor. La aventura de un coleccionista de almas comienza aquí."',
    },
    {
      id: 'sign-rival',
      x: 11.5,
      z: 9.5,
      name: 'Casa de Selene',
      text: 'Casa de Selene: "¡Partí al amanecer hacia el bosque! ¡Atrápame si puedes, vecino!"',
    },
    {
      id: 'sign-lab',
      x: 7.5,
      z: -8.0,
      name: 'Laboratorio de Almas',
      text: 'LABORATORIO DE ALMAS: "Anciano Kaelen, Maestro de Marionetas. Investigación y consagración de almas místicas."',
    },
    {
      id: 'sign-route1',
      x: 5.5,
      z: 26.0,
      name: 'Ruta 1 Norte',
      text: 'RUTA 1 NORTE: "Senda del Bosque Sombra hacia el Gran Lago. ¡Peligro: Almas salvajes acechan en la hierba alta!"',
    },
    {
      id: 'sign-dock',
      x: 4.5,
      z: -20.0,
      name: 'Muelle del Sur',
      text: 'Muelle Marioneta: "Aguas plácidas de Villa Marioneta. El aire huele a salvia y brisa fresca."',
    },
  ];

  const signTex = getTexture('signpost', createSignpostTexture);
  const signMat = new THREE.SpriteMaterial({ map: signTex, transparent: true });
  signposts.forEach(sp => {
    const sprite = new THREE.Sprite(signMat);
    sprite.scale.set(LUMINATI_SCALE.SIGNPOST_SIZE, LUMINATI_SCALE.SIGNPOST_SIZE, 1);
    sprite.position.set(sp.x, 1.0 + (LUMINATI_SCALE.SIGNPOST_SIZE * 0.5), sp.z);
    villageGroup.add(sprite);
  });

  scene.add(villageGroup);

  const treeTextures = [
    getTexture('tree_0', () => createDenseTreeTexture(0)),
    getTexture('tree_1', () => createDenseTreeTexture(1)),
    getTexture('tree_2', () => createDenseTreeTexture(2)),
  ];

  const treeMaterials = treeTextures.map(tex => new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.5,
  }));

  const trees: TreeData[] = [];
  const treeGroup = new THREE.Group();

  const candidateAttempts = 30;
  const minSpacing = 6.0;
  const maxTrees = 700;
  const existingPoints: { x: number; z: number }[] = [];

  let attempts = 0;
  while (trees.length < maxTrees && attempts < maxTrees * candidateAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * 380;
    const tz = (Math.random() - 0.5) * 380;

    if (Math.hypot(tx, tz) < 32) continue;
    if (isOnPath(tx, tz)) continue;
    if (Math.hypot(tx - v1x, tz - v1z) < 22) continue;
    if (Math.hypot(tx - v2x, tz - v2z) < 22) continue;
    if (Math.hypot(tx - v3x, tz - v3z) < 22) continue;
    if (Math.hypot(tx - lakeX, tz - lakeZ) < 32) continue;

    let valid = true;
    for (let i = 0; i < existingPoints.length; i++) {
      const p = existingPoints[i];
      if (Math.hypot(p.x - tx, p.z - tz) < minSpacing) {
        valid = false;
        break;
      }
    }

    if (valid) {
      existingPoints.push({ x: tx, z: tz });
      const ty = getTerrainHeight(tx, tz);
      const variant = Math.floor(Math.random() * 3);
      const scale = 0.85 + Math.random() * 0.45;

      const tree = new THREE.Sprite(treeMaterials[variant]);
      const baseScaleH = LUMINATI_SCALE.TREE_WIDTH_BASE * scale;
      const baseScaleV = LUMINATI_SCALE.TREE_HEIGHT_BASE * scale;
      tree.scale.set(baseScaleH, baseScaleV, 1);
      tree.position.set(tx, ty + (baseScaleV * 0.5), tz);
      treeGroup.add(tree);

      trees.push({
        x: tx,
        z: tz,
        radius: 2.2 * scale,
        mesh: tree,
        scale: scale,
      });
    }
  }
  scene.add(treeGroup);

  const sparkleTex = getTexture('sparkle', createSparkleTexture);
  const sparkleMat = new THREE.SpriteMaterial({
    map: sparkleTex,
    transparent: true,
  });

  const sparkles: SparkleData[] = [];
  const sparkleGroup = new THREE.Group();
  const sparkleCount = 120;

  for (let i = 0; i < sparkleCount; i++) {
    const sx = (Math.random() - 0.5) * 360;
    const sz = (Math.random() - 0.5) * 360;
    if (Math.hypot(sx - lakeX, sz - lakeZ) < 28) continue;
    const sy = getTerrainHeight(sx, sz) + 1 + Math.random() * 4;

    const sSprite = new THREE.Sprite(sparkleMat);
    const sScale = (0.8 + Math.random() * 1.2) * 1.3;
    sSprite.scale.set(sScale * 1.3, sScale * 1.3, 1);
    sSprite.position.set(sx, sy, sz);
    sparkleGroup.add(sSprite);

    sparkles.push({
      mesh: sSprite,
      baseY: sy,
      phase: Math.random() * Math.PI * 2,
      speed: 1.5 + Math.random() * 2,
    });
  }
  scene.add(sparkleGroup);

  const soulColors = ['#38bdf8', '#a855f7', '#ec4899', '#34d399', '#fbbf24', '#f43f5e', '#6366f1', '#14b8a6', '#eab308', '#d946ef'];
  const soulNames = [
    'Aethelgard el Valiente', 'Lyra la Tejedorasueños', 'Valthor el Errante', 
    'Kaelen la Sombra', 'Mirella del Manantial', 'Balthazar el Sabio',
    'Seraphina la Celeste', 'Orion el Astrónomo', 'Thalia la Musa', 'Zephyr el Viento'
  ];
  const soulTitles = [
    'Alma de Guerrero Caído', 'Alma de Bardo Estelar', 'Alma de Explorador',
    'Alma de Asesino Silencioso', 'Alma de Ninfa Oculta', 'Alma de Archimago',
    'Alma de Serafín', 'Alma de Astrólogo', 'Alma de Poeta', 'Alma de Espíritu Libre'
  ];
  const soulLores = [
    'Custodiaba los pasos montañosos antes de la Gran Niebla.',
    'Sus cantos aún resuenan en las noches de luna llena.',
    'Cruzó los abismos estelares buscando el origen de los mundos.',
    'Guardiana de los secretos olvidados en el tiempo.',
    'Su lágrima formó el manantial azul que brota en el valle.',
    'Conoció los mil nombres de las estrellas errantes.',
    'Desplegó sus alas de cristal cuando el cielo nocturno despertó.',
    'Mapeó constelaciones que ya no existen en los cielos modernos.',
    'Escribió versos que enamoraron a los dioses antiguos.',
    'Danza con las brisas frías de los páramos del norte.'
  ];

  const soulDolls: SoulDoll[] = [];
  const soulGroup = new THREE.Group();
  const soulMeshes: THREE.Sprite[] = [];

  for (let i = 0; i < 10; i++) {
    let sx = 0, sz = 0;
    do {
      const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 60 + Math.random() * 120;
      sx = Math.cos(angle) * dist;
      sz = Math.sin(angle) * dist;
    } while (isOnPath(sx, sz) || Math.hypot(sx - lakeX, sz - lakeZ) < 30);

    const sy = getTerrainHeight(sx, sz) + 2;
    const col = soulColors[i];

    const soul: SoulDoll = {
      id: `soul-${i}`,
      x: sx,
      z: sz,
      y: sy,
      name: soulNames[i],
      title: soulTitles[i],
      lore: soulLores[i],
      color: col,
      collected: false,
      floatOffset: Math.random() * Math.PI * 2,
    };
    soulDolls.push(soul);

    const mat = new THREE.SpriteMaterial({
      map: getTexture(`soul_${col}`, () => createSoulDollTexture(col)),
      transparent: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(LUMINATI_SCALE.SOUL_DOLL_SIZE, LUMINATI_SCALE.SOUL_DOLL_SIZE, 1);
    sprite.position.set(sx, sy + 2.0, sz);
    soulGroup.add(sprite);
    soulMeshes.push(sprite);
  }
  scene.add(soulGroup);

  const spirits: Spirit[] = [];
  const spiritMeshes: THREE.Sprite[] = [];
  const spiritTex = getTexture('spirit_orb', createSpiritTexture);
  const spiritMat = new THREE.SpriteMaterial({
    map: spiritTex,
    transparent: true,
  });

  for (let i = 0; i < 8; i++) {
    const sx = (Math.random() - 0.5) * 220;
    const sz = (Math.random() - 0.5) * 220;
    spirits.push({
      id: `spirit-${i}`,
      x: sx,
      z: sz,
      vx: (Math.random() - 0.5) * 4,
      vz: (Math.random() - 0.5) * 4,
      radius: 3,
    });

    const sSprite = new THREE.Sprite(spiritMat);
    sSprite.scale.set(4.5, 4.5, 1);
    scene.add(sSprite);
    spiritMeshes.push(sSprite);
  }

  let timeElapsed = 0;

  const setTimeOfDay = (t: number) => {
    const currentSky = nightColor.clone().lerp(dayColor, t);
    scene.background = currentSky;
    if (scene.fog) {
      scene.fog.color = currentSky;
    }

    hemi.intensity = THREE.MathUtils.lerp(0.95, 1.3, t);
    moonLight.intensity = THREE.MathUtils.lerp(1.35, 0.4, t);
    moonMat.opacity = THREE.MathUtils.lerp(1.0, 0.0, t);
    starsMat.opacity = THREE.MathUtils.lerp(1.0, 0.0, t);

    const grassColor = new THREE.Color().setHSL(0.55, 0.82, THREE.MathUtils.lerp(0.48, 0.68, t));
    grassTufts.forEach(gt => {
      gt.mesh.material.color = grassColor;
    });
  };

  const updateWorld = (delta: number, playerX: number, playerZ: number) => {
    timeElapsed += delta;

    const cullingDistSq = 120 * 120;
    trees.forEach(tree => {
      const distSq = (tree.x - playerX) ** 2 + (tree.z - playerZ) ** 2;
      tree.mesh.visible = distSq <= cullingDistSq;
    });

    soulMeshes.forEach((mesh, idx) => {
      const s = soulDolls[idx];
      if (!s.collected) {
        const floatY = s.y + Math.sin(timeElapsed * 3 + s.floatOffset) * 0.8;
        mesh.position.y = floatY;
      } else {
        mesh.visible = false;
      }
    });

    spirits.forEach((sp, idx) => {
      sp.x += sp.vx * delta;
      sp.z += sp.vz * delta;

      if (Math.abs(sp.x) > 180) sp.vx *= -1;
      if (Math.abs(sp.z) > 180) sp.vz *= -1;

      const sy = getTerrainHeight(sp.x, sp.z) + 4.225 + Math.sin(timeElapsed * 4 + idx) * 0.5; // 3.25 * 1.3
      spiritMeshes[idx].position.set(sp.x, sy, sp.z);
    });

    enemies.forEach((en, idx) => {
      if (!en.alive) {
        enemySprites[idx].visible = false;
        return;
      }
      const angle = timeElapsed * en.speed * 0.5 + idx;
      en.x = en.startX + Math.cos(angle) * en.patrolDist;
      en.z = en.startZ + Math.sin(angle) * en.patrolDist;
      const ey = getTerrainHeight(en.x, en.z) + 2.0;
      enemySprites[idx].position.set(en.x, ey, en.z);
    });

    chests.forEach((c, idx) => {
      if (c.opened) {
        chestSprites[idx].material.map = openChestTex;
        chestSprites[idx].material.needsUpdate = true;
      }
    });

    grassTufts.forEach(gt => {
      const sway = Math.sin(timeElapsed * 4 + gt.phase) * 0.15;
      gt.mesh.position.x = gt.x + sway;
    });

    sparkles.forEach(sp => {
      const currentY = sp.baseY + Math.sin(timeElapsed * sp.speed + sp.phase) * 0.6;
      sp.mesh.position.y = currentY;
      const opacity = 0.5 + Math.sin(timeElapsed * 5 + sp.phase) * 0.5;
      sp.mesh.material.opacity = opacity;
    });

    fountains.forEach(f => {
      if (f.orbMesh) {
        f.orbMesh.position.y = f.baseY + Math.sin(timeElapsed * 3 + f.x) * 0.25;
      }
    });
  };

  return {
    soulDolls,
    spirits,
    trees,
    collisionBoxes,
    lakeCenter: { x: lakeX, z: lakeZ },
    npcs,
    chests,
    enemies,
    grassPatches,
    fountains: fountains.map(f => ({ x: f.x, z: f.z, radius: f.radius })),
    signposts,
    isInsideGrass,
    updateWorld,
    setTimeOfDay,
  };
}
