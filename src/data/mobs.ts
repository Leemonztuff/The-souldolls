/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BattleSoul, BattleMove, SoulType, BagItem } from '../types';

export const TYPE_COLORS: Record<SoulType, { bg: string; border: string; text: string; glow: string }> = {
  Fuego: { bg: '#dc2626', border: '#ef4444', text: '#fee2e2', glow: 'rgba(239, 68, 68, 0.6)' },
  Agua: { bg: '#0284c7', border: '#38bdf8', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.6)' },
  Planta: { bg: '#16a34a', border: '#4ade80', text: '#dcfce7', glow: 'rgba(74, 222, 128, 0.6)' },
  Rayo: { bg: '#ca8a04', border: '#facc15', text: '#fef9c3', glow: 'rgba(250, 204, 21, 0.6)' },
  Sombra: { bg: '#7c3aed', border: '#a855f7', text: '#f3e8ff', glow: 'rgba(168, 85, 247, 0.6)' },
  Luz: { bg: '#d97706', border: '#fbbf24', text: '#fef3c7', glow: 'rgba(251, 191, 36, 0.6)' },
};

export const TYPE_EFFECTIVENESS: Record<SoulType, Partial<Record<SoulType, number>>> = {
  Fuego: { Planta: 2.0, Agua: 0.5, Fuego: 0.5 },
  Agua: { Fuego: 2.0, Planta: 0.5, Agua: 0.5 },
  Planta: { Agua: 2.0, Fuego: 0.5, Planta: 0.5 },
  Rayo: { Agua: 2.0, Planta: 0.5, Rayo: 0.5 },
  Sombra: { Luz: 2.0, Sombra: 0.5 },
  Luz: { Sombra: 2.0, Luz: 0.5 },
};

export interface LuminadexEntry {
  num: string;
  name: string;
  type: SoulType;
  title: string;
  lore: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  spritesheet: string;
  frameFront: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  rarity: 'común' | 'poco común' | 'rara';
}

export const LUMINADEX_ENTRIES: LuminadexEntry[] = [
  {
    num: '#001',
    name: 'RUNIKA',
    type: 'Fuego',
    title: 'Heraldo de la Llama Viva',
    lore: 'Nacida entre brasas antiguas, canaliza el ardor bélico de los guerreros caídos en las profundidades de la cripta.',
    baseHp: 35,
    baseAtk: 21,
    baseDef: 15,
    baseSpd: 13,
    spritesheet: '/assets/SD_01_spritesheet.webp',
    frameFront: { x: 2, y: 257, w: 123, h: 256 },
    sheetSize: { w: 128, h: 513 },
    rarity: 'común',
  },
  {
    num: '#002',
    name: 'TOMOE',
    type: 'Agua',
    title: 'Cuchilla de la Marea',
    lore: 'Custodia las corrientes subterráneas. Empuña dos filos nacidos del deshielo de las cumbres místicas.',
    baseHp: 36,
    baseAtk: 19,
    baseDef: 17,
    baseSpd: 14,
    spritesheet: '/assets/fixed_SD_13.png',
    frameFront: { x: 3, y: 212, w: 87, h: 210 },
    sheetSize: { w: 94, h: 423 },
    rarity: 'común',
  },
  {
    num: '#003',
    name: 'AQUELLE',
    type: 'Agua',
    title: 'Ninfa del Lago Celeste',
    lore: 'Emerge serena entre las aguas del gran lago oriental. Su sola presencia sosiega las almas errantes del bosque.',
    baseHp: 34,
    baseAtk: 18,
    baseDef: 18,
    baseSpd: 15,
    spritesheet: '/assets/fixed_SD_02.png',
    frameFront: { x: 0, y: 211, w: 73, h: 210 },
    sheetSize: { w: 73, h: 421 },
    rarity: 'común',
  },
  {
    num: '#004',
    name: 'FLORAYA',
    type: 'Planta',
    title: 'Espíritu de la Floresta',
    lore: 'Sintonizada con las raíces centenarias del bosque denso, comanda las lianas espinosas y el rocío curativo.',
    baseHp: 38,
    baseAtk: 18,
    baseDef: 19,
    baseSpd: 12,
    spritesheet: '/assets/spritesheet03.webp',
    frameFront: { x: 5, y: 211, w: 88, h: 210 },
    sheetSize: { w: 98, h: 421 },
    rarity: 'común',
  },
  {
    num: '#005',
    name: 'VOLTINA',
    type: 'Rayo',
    title: 'Centella de la Tormenta',
    lore: 'Almacena energía estática en sus runas corporales. Su velocidad es tal que parece teletransportarse.',
    baseHp: 32,
    baseAtk: 24,
    baseDef: 13,
    baseSpd: 18,
    spritesheet: '/assets/fixed_SD_06.png',
    frameFront: { x: 2, y: 211, w: 71, h: 210 },
    sheetSize: { w: 76, h: 421 },
    rarity: 'poco común',
  },
  {
    num: '#006',
    name: 'NOCTIS',
    type: 'Sombra',
    title: 'Sombra del Abismo',
    lore: 'Habitante del reino umbrío. Su velo absorbe la luz lunar para liberar llamaradas de fuego oscuro.',
    baseHp: 37,
    baseAtk: 22,
    baseDef: 16,
    baseSpd: 14,
    spritesheet: '/assets/fixed_SD_11.png',
    frameFront: { x: 0, y: 211, w: 78, h: 210 },
    sheetSize: { w: 78, h: 421 },
    rarity: 'poco común',
  },
];

export const BASIC_STRUGGLE_MOVE: BattleMove = {
  id: 'struggle',
  name: 'Golpe Básico',
  type: 'Luz',
  power: 30,
  pp: 99,
  maxPp: 99,
  accuracy: 100,
  description: 'Ataque básico cuando se agotan los PP.',
};

export const SHADER_ATTACK_MOVES: Record<string, BattleMove> = {
  lava: {
    id: 'mv_lava',
    name: 'Furia Volcánica',
    type: 'Fuego',
    power: 65,
    pp: 12,
    maxPp: 12,
    accuracy: 95,
    description: 'Esfera de magma incandescente con corteza quebrada y ríos de lava ardiente.',
    shaderVfx: 'lava',
  },
  water: {
    id: 'mv_water',
    name: 'Orbe Marino',
    type: 'Agua',
    power: 62,
    pp: 14,
    maxPp: 14,
    accuracy: 100,
    description: 'Esfera de agua pura refractiva con ondulaciones e impacto torrencial.',
    shaderVfx: 'water',
  },
  slime: {
    id: 'mv_slime',
    name: 'Cieno Hirviente',
    type: 'Planta',
    power: 60,
    pp: 15,
    maxPp: 15,
    accuracy: 95,
    description: 'Masa ácida viscosa que hierve en la superficie y gotea veneno corrosivo.',
    shaderVfx: 'slime',
  },
  blackhole: {
    id: 'mv_blackhole',
    name: 'Singularidad Umbría',
    type: 'Sombra',
    power: 75,
    pp: 8,
    maxPp: 8,
    accuracy: 90,
    description: 'Agujero negro con disco de acreción violeta que devora la luz y la materia.',
    shaderVfx: 'blackhole',
  },
};

export function getDefaultPlayerSoul(): BattleSoul {
  return getStarterSouls()[1];
}

export function getStarterSouls(): BattleSoul[] {
  return [
    {
      id: 'starter-runika',
      name: 'RUNIKA',
      level: 5,
      type: 'Fuego',
      hp: 35,
      maxHp: 35,
      exp: 0,
      maxExp: 45,
      speed: 13,
      attack: 21,
      defense: 15,
      spritesheet: '/assets/SD_01_spritesheet.webp',
      frameBack: { x: 0, y: 0, w: 128, h: 256 },
      frameFront: { x: 2, y: 257, w: 123, h: 256 },
      sheetSize: { w: 128, h: 513 },
      rarity: 'común',
      moves: [
        { id: 'r1', name: 'Ember Breath', type: 'Fuego', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Exhala una llamarada carmesí.' },
        { ...SHADER_ATTACK_MOVES.lava },
        { id: 'r2', name: 'Garra Ígnea', type: 'Fuego', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro envuelto en fuego ardiente.' },
        { ...SHADER_ATTACK_MOVES.blackhole },
      ],
    },
    {
      id: 'starter-tomoe',
      name: 'TOMOE',
      level: 5,
      type: 'Agua',
      hp: 36,
      maxHp: 36,
      exp: 0,
      maxExp: 45,
      speed: 14,
      attack: 19,
      defense: 17,
      spritesheet: '/assets/fixed_SD_13.png',
      frameBack: { x: 0, y: 0, w: 94, h: 211 },
      frameFront: { x: 3, y: 212, w: 87, h: 210 },
      sheetSize: { w: 94, h: 423 },
      rarity: 'común',
      moves: [
        { id: 't1', name: 'Tajo Acuático', type: 'Agua', power: 42, pp: 20, maxPp: 20, accuracy: 100, description: 'Corta con una hoja de agua pura.' },
        { ...SHADER_ATTACK_MOVES.water },
        { id: 't2', name: 'Pulso Frío', type: 'Agua', power: 36, pp: 20, maxPp: 20, accuracy: 100, description: 'Onda glacial que enfría al rival.' },
        { ...SHADER_ATTACK_MOVES.lava },
      ],
    },
    {
      id: 'starter-floraya',
      name: 'FLORAYA',
      level: 5,
      type: 'Planta',
      hp: 38,
      maxHp: 38,
      exp: 0,
      maxExp: 45,
      speed: 12,
      attack: 18,
      defense: 19,
      spritesheet: '/assets/spritesheet03.webp',
      frameBack: { x: 0, y: 0, w: 98, h: 210 },
      frameFront: { x: 5, y: 211, w: 88, h: 210 },
      sheetSize: { w: 98, h: 421 },
      rarity: 'común',
      moves: [
        { id: 'f1', name: 'Látigo Cepa', type: 'Planta', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Azota con lianas espinosas.' },
        { ...SHADER_ATTACK_MOVES.slime },
        { id: 'f2', name: 'Hoja Afilada', type: 'Planta', power: 50, pp: 15, maxPp: 15, accuracy: 95, description: 'Ráfaga de follaje cortante.' },
        { ...SHADER_ATTACK_MOVES.blackhole },
      ],
    },
  ];
}

export function getDefaultBag(): BagItem[] {
  return [
    {
      id: 'potion',
      name: 'Poción',
      count: 5,
      description: 'Restaura 20 HP al alma activa.',
      effect: 'heal',
      healAmount: 20,
    },
    {
      id: 'soul_crystal',
      name: 'Cristal de alma',
      count: 5,
      description: 'Cristal mágico para capturar almas salvajes.',
      effect: 'capture',
      catchBonus: 1.0,
    },
    {
      id: 'super_crystal',
      name: 'Cristal superior',
      count: 1,
      description: 'Cristal refinado con mayor índice de captura.',
      effect: 'capture',
      catchBonus: 1.8,
    },
  ];
}

export const LEARNABLE_MOVES: Record<string, { level: number; move: BattleMove }[]> = {
  Fuego: [
    { level: 5, move: { id: 'f_5', name: 'Garra Ígnea', type: 'Fuego', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro ardiente.' } },
    { level: 10, move: { ...SHADER_ATTACK_MOVES.lava } },
    { level: 15, move: { id: 'f_15', name: 'Llamarada Ancestral', type: 'Fuego', power: 75, pp: 5, maxPp: 5, accuracy: 85, description: 'Explosión de fuego volcánico.' } },
  ],
  Agua: [
    { level: 5, move: { ...SHADER_ATTACK_MOVES.water } },
    { level: 10, move: { id: 'w_10', name: 'Danza Espada', type: 'Luz', power: 50, pp: 10, maxPp: 10, accuracy: 95, description: 'Filo luminoso acuático.' } },
    { level: 15, move: { id: 'w_15', name: 'Hidrobomba', type: 'Agua', power: 80, pp: 5, maxPp: 5, accuracy: 85, description: 'Torrente a alta presión descomunal.' } },
  ],
  Planta: [
    { level: 5, move: { ...SHADER_ATTACK_MOVES.slime } },
    { level: 10, move: { id: 'p_10', name: 'Danza Sombra', type: 'Sombra', power: 50, pp: 10, maxPp: 10, accuracy: 90, description: 'Maleza espectral.' } },
    { level: 15, move: { id: 'p_15', name: 'Rayo Solar', type: 'Luz', power: 75, pp: 5, maxPp: 5, accuracy: 90, description: 'Haz celestial cargado de fotosíntesis.' } },
  ],
  Rayo: [
    { level: 5, move: { id: 't_5', name: 'Impactrueno', type: 'Rayo', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Chispazo directo.' } },
    { level: 10, move: { id: 't_10', name: 'Chispa Voltífera', type: 'Rayo', power: 58, pp: 10, maxPp: 10, accuracy: 95, description: 'Relámpago cegador.' } },
    { level: 15, move: { id: 't_15', name: 'Tormenta Eléctrica', type: 'Rayo', power: 78, pp: 5, maxPp: 5, accuracy: 85, description: 'Descarga masiva de alta tensión.' } },
  ],
  Sombra: [
    { level: 5, move: { id: 's_5', name: 'Aguja Sombría', type: 'Sombra', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Espina tenebrosa.' } },
    { level: 10, move: { ...SHADER_ATTACK_MOVES.blackhole } },
    { level: 15, move: { id: 's_15', name: 'Vacío Abisal', type: 'Sombra', power: 80, pp: 5, maxPp: 5, accuracy: 85, description: 'Colapso de gravedad umbría.' } },
  ],
  Luz: [
    { level: 5, move: { id: 'l_5', name: 'Chispa Astral', type: 'Luz', power: 42, pp: 20, maxPp: 20, accuracy: 100, description: 'Ráfaga celestial.' } },
    { level: 10, move: { id: 'l_10', name: 'Embestida Férrea', type: 'Luz', power: 52, pp: 10, maxPp: 10, accuracy: 95, description: 'Golpe bendito radiante.' } },
    { level: 15, move: { id: 'l_15', name: 'Sentencia Solar', type: 'Luz', power: 78, pp: 5, maxPp: 5, accuracy: 90, description: 'Juicio de luz sagrada.' } },
  ],
};

export function checkNewMoveOnLevelUp(soul: BattleSoul): BattleMove | null {
  if (soul.level !== 5 && soul.level !== 10 && soul.level !== 15) return null;
  const list = LEARNABLE_MOVES[soul.type] || [];
  const entry = list.find(e => e.level === soul.level);
  if (!entry) return null;
  if (soul.moves.some(m => m.name === entry.move.name)) return null;
  return entry.move;
}

export interface WildSoulTemplate {
  name: string;
  type: SoulType;
  minLevel: number;
  maxLevel: number;
  spritesheet: string;
  frameBack: { x: number; y: number; w: number; h: number };
  frameFront: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  rarity: 'común' | 'poco común' | 'rara';
  introText: string;
  moves: BattleMove[];
}

export const WILD_SOULS: WildSoulTemplate[] = [
  {
    name: 'RUNIKA',
    type: 'Fuego',
    minLevel: 4,
    maxLevel: 8,
    spritesheet: '/assets/SD_01_spritesheet.webp',
    frameBack: { x: 0, y: 0, w: 128, h: 256 },
    frameFront: { x: 2, y: 257, w: 123, h: 256 },
    sheetSize: { w: 128, h: 513 },
    rarity: 'común',
    introText: '¡ Runika acecha en la oscura mazmorra con mirada desafiante!',
    moves: [
      { id: 'r1', name: 'Ember Breath', type: 'Fuego', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Exhala una llamarada carmesí.' },
      { ...SHADER_ATTACK_MOVES.lava },
      { id: 'r2', name: 'Garra Ígnea', type: 'Fuego', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro envuelto en fuego ardiente.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
    ],
  },
  {
    name: 'AQUELLE',
    type: 'Agua',
    minLevel: 4,
    maxLevel: 7,
    spritesheet: '/assets/fixed_SD_02.png',
    frameBack: { x: 0, y: 0, w: 73, h: 210 },
    frameFront: { x: 0, y: 211, w: 73, h: 210 },
    sheetSize: { w: 73, h: 421 },
    rarity: 'común',
    introText: '¡ Aquelle surge entre la bruma con elegancia serena!',
    moves: [
      { id: 'a1', name: 'Burbuja Letal', type: 'Agua', power: 36, pp: 25, maxPp: 25, accuracy: 100, description: 'Dispara esferas acuáticas a presión.' },
      { ...SHADER_ATTACK_MOVES.water },
      { id: 'a2', name: 'Gota Cortante', type: 'Agua', power: 44, pp: 15, maxPp: 15, accuracy: 95, description: 'Lanza navajas de agua comprimida.' },
      { ...SHADER_ATTACK_MOVES.slime },
    ],
  },
  {
    name: 'FLORAYA',
    type: 'Planta',
    minLevel: 4,
    maxLevel: 8,
    spritesheet: '/assets/spritesheet03.webp',
    frameBack: { x: 0, y: 0, w: 98, h: 210 },
    frameFront: { x: 5, y: 211, w: 88, h: 210 },
    sheetSize: { w: 98, h: 421 },
    rarity: 'común',
    introText: '¡ Floraya hace crujir la maleza con su aura silvestre!',
    moves: [
      { id: 'f1', name: 'Látigo Cepa', type: 'Planta', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Azota con lianas espinosas.' },
      { ...SHADER_ATTACK_MOVES.slime },
      { id: 'f2', name: 'Hoja Afilada', type: 'Planta', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Ráfaga de hojas cortantes como navajas.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
    ],
  },
  {
    name: 'VOLTINA',
    type: 'Rayo',
    minLevel: 6,
    maxLevel: 10,
    spritesheet: '/assets/fixed_SD_06.png',
    frameBack: { x: 0, y: 0, w: 76, h: 210 },
    frameFront: { x: 2, y: 211, w: 71, h: 210 },
    sheetSize: { w: 76, h: 421 },
    rarity: 'poco común',
    introText: '¡ Voltina descarga chispas doradas lista para el duelo!',
    moves: [
      { id: 'v1', name: 'Impactrueno', type: 'Rayo', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Descarga eléctrica concentrada.' },
      { id: 'v2', name: 'Chispa Voltífera', type: 'Rayo', power: 58, pp: 10, maxPp: 10, accuracy: 95, description: 'Relámpago rápido y ensordecedor.' },
      { ...SHADER_ATTACK_MOVES.lava },
    ],
  },
  {
    name: 'NOCTIS',
    type: 'Sombra',
    minLevel: 7,
    maxLevel: 11,
    spritesheet: '/assets/fixed_SD_11.png',
    frameBack: { x: 0, y: 0, w: 77, h: 210 },
    frameFront: { x: 0, y: 211, w: 78, h: 210 },
    sheetSize: { w: 78, h: 421 },
    rarity: 'poco común',
    introText: '¡ Noctis emerge de las tinieblas de la mazmorra!',
    moves: [
      { id: 'n1', name: 'Aguja Sombría', type: 'Sombra', power: 46, pp: 20, maxPp: 20, accuracy: 100, description: 'Proyectiles de oscuridad pura.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
      { id: 'n2', name: 'Beso Tenebroso', type: 'Sombra', power: 55, pp: 10, maxPp: 10, accuracy: 90, description: 'Drena la vitalidad del oponente.' },
      { ...SHADER_ATTACK_MOVES.slime },
    ],
  },
];

export function createRandomWildSoul(forcedName?: string): { soul: BattleSoul; introText: string } {
  let template: WildSoulTemplate;
  if (forcedName) {
    template = WILD_SOULS.find(s => s.name.toLowerCase() === forcedName.toLowerCase()) || WILD_SOULS[0];
  } else {
    template = WILD_SOULS[Math.floor(Math.random() * WILD_SOULS.length)];
  }

  const level = Math.floor(template.minLevel + Math.random() * (template.maxLevel - template.minLevel + 1));
  const maxHp = 22 + level * 3;
  const attack = 14 + level * 2;
  const defense = 11 + Math.floor(level * 1.5);
  const speed = 10 + level * 2;

  const soul: BattleSoul = {
    id: `wild-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: template.name,
    level: level,
    type: template.type,
    hp: maxHp,
    maxHp: maxHp,
    exp: 0,
    maxExp: level * 10,
    speed: speed,
    attack: attack,
    defense: defense,
    moves: template.moves.map(m => ({ ...m })),
    spritesheet: template.spritesheet,
    frameBack: template.frameBack,
    frameFront: template.frameFront,
    sheetSize: template.sheetSize,
    rarity: template.rarity,
  };

  return { soul, introText: template.introText };
}
