export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover' | 'combat';

export interface SoulDoll {
  id: string;
  x: number;
  z: number;
  y: number;
  name: string;
  title: string;
  lore: string;
  color: string;
  collected: boolean;
  floatOffset: number;
}

export interface Spirit {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export interface NPC {
  id: string;
  x: number;
  z: number;
  name: string;
  dialogue: string[];
  questGiven?: string;
  questCompleted?: boolean;
}

export interface Signpost {
  id: string;
  x: number;
  z: number;
  name: string;
  text: string;
}

export interface Chest {
  id: string;
  x: number;
  z: number;
  opened: boolean;
  rewardType: 'gold' | 'item' | 'soul';
  rewardAmount: number;
  rewardName: string;
}

export interface Enemy {
  id: string;
  x: number;
  z: number;
  startX: number;
  startZ: number;
  hp: number;
  maxHp: number;
  radius: number;
  patrolDist: number;
  speed: number;
  alive: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  description: string;
}

export interface GrassPatch {
  x: number;
  z: number;
  radius: number;
}

export type SoulType = 'Fuego' | 'Agua' | 'Planta' | 'Rayo' | 'Sombra' | 'Luz';

export interface BattleMove {
  id: string;
  name: string;
  type: SoulType;
  power: number;
  pp: number;
  maxPp: number;
  accuracy: number;
  description: string;
  shaderVfx?: 'lava' | 'water' | 'slime' | 'blackhole';
}

export interface BattleSoul {
  id: string;
  name: string;
  level: number;
  type: SoulType;
  hp: number;
  maxHp: number;
  exp: number;
  maxExp: number;
  speed: number;
  attack: number;
  defense: number;
  moves: BattleMove[];
  spritesheet: string;
  frameBack: { x: number; y: number; w: number; h: number };
  frameFront: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  rarity?: 'común' | 'poco común' | 'rara';
}

export type ItemId = 'potion' | 'soul_crystal' | 'super_crystal';

export interface BagItem {
  id: ItemId;
  name: string;
  count: number;
  description: string;
  effect: 'heal' | 'capture';
  healAmount?: number;
  catchBonus?: number;
}

export interface GameSaveData {
  version: number;
  timestamp: number;
  team: BattleSoul[];
  box: BattleSoul[];
  bag: BagItem[];
  playerPos: { x: number; z: number };
  gold: number;
  hp?: number;
  questState: 'none' | 'active' | 'completed';
  starterChosen: boolean;
  openedChests?: string[];
  discoveredSouls?: Record<string, 'seen' | 'captured'>;
  discoveredGrass?: number[];
}

export interface Mob {
  name: string;
  type: SoulType;
  minLevel: number;
  maxLevel: number;
  rarity: 'común' | 'poco común' | 'rara';
  condition: 'día' | 'noche' | 'cualquiera';
  color: string;
}

export interface PlayerState {
  x: number;
  z: number;
  y: number;
  rotation: number;
  speed: number;
  isMoving: boolean;
  soulsCollected: number;
  hp: number;
  maxHp: number;
  gold: number;
  inventory: InventoryItem[];
  questState: 'none' | 'active' | 'completed';
}
