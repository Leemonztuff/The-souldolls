/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GameState, SoulDoll, NPC, Chest, Enemy, InventoryItem, BattleSoul, ItemId, GrassPatch, Signpost, GameSaveData } from '../types';
import { buildWorld, getTerrainHeight, TreeData, CollisionBox, FountainData } from '../world/worldGen';
import { disposeTextures } from '../world/textureManager';
import { PlayerController } from '../world/playerController';
import { audioManager } from '../audio/audioManager';
import { vfxEngine } from '../core/vfxEngine';
import { createRandomWildSoul } from '../data/mobs';
import { createExclamationTexture, createDustTexture } from '../world/textures';
import { StateMachine, GameStateKey } from '../core/stateMachine';
import { GameLoop } from '../core/gameLoop';
import { InputManager } from '../core/inputManager';
import { eventBus } from '../core/eventBus';
import { SaveManager } from '../save/saveManager';
import { DebugManager } from '../core/debugManager';
import { GAME_CONSTANTS } from '../data/constants';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { ObjectPool } from '../core/pool';

interface DustParticle {
  mesh: THREE.Sprite;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer!: EffectComposer;

  private stateMachine: StateMachine;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private debugManager: DebugManager;

  private player!: PlayerController;
  private soulDolls: SoulDoll[] = [];
  private trees: TreeData[] = [];
  private collisionBoxes: CollisionBox[] = [];
  private lakeCenter: { x: number; z: number } = { x: 100, z: -80 };
  private npcs: NPC[] = [];
  private chests: Chest[] = [];
  private enemies: Enemy[] = [];
  private grassPatches: GrassPatch[] = [];
  private fountains: FountainData[] = [];
  private signposts: Signpost[] = [];
  private discoveredGrass: number[] = [];
  private updateWorldFn!: (delta: number, px: number, pz: number) => void;
  private setTimeOfDayFn!: (t: number) => void;
  private isInsideGrassFn!: (x: number, z: number) => boolean;

  private exclamationSprite!: THREE.Sprite;
  private grassDistanceWalked: number = 0;
  private graceSteps: number = 6;

  private timeOfDay: number = 0.0;
  private targetTimeOfDay: number = 0.0;
  private transitionTimer: number = 0;
  private transitionDuration: number = 3.0;
  private isTransitioning: boolean = false;
  private autoCycle: boolean = false;
  private cycleTimer: number = 0;

  private lastFootstepTime: number = 0;
  private velocityX: number = 0;
  private velocityZ: number = 0;
  private isSprintingMobile: boolean = false;
  
  private activeDustParticles: DustParticle[] = [];
  private dustPool: ObjectPool<THREE.Sprite>;
  private dustTimer: number = 0;

  private gameState: GameState = 'title';
  private onStateChange?: (
    state: GameState,
    souls: number,
    total: number,
    isDay: boolean,
    autoCycle: boolean,
    hp: number,
    maxHp: number,
    gold: number,
    inventory: InventoryItem[],
    activeDialogue: { name: string; text: string } | null,
    questState: 'none' | 'active' | 'completed',
    playerPos: { x: number; z: number; rotation: number },
    discoveredGrass: number[]
  ) => void;
  private onSoulCollected?: (soul: SoulDoll) => void;
  private onCombatTrigger?: (rivalSoul: BattleSoul, introText: string) => void;
  private onChestReward?: (items: { id: ItemId; name: string; count: number }[], gold: number) => void;
  private onHealTeam?: () => void;
  private hasWaterSoulFn?: () => boolean;
  private onWaterQuestReward?: () => void;
  private onItemReward?: (items: { id: ItemId; name: string; count: number }[]) => void;
  private getSaveData: () => Partial<GameSaveData>;


  private activeDialogue: { name: string; text: string } | null = null;
  private dialogueIndex: number = 0;
  private currentNPC: NPC | null = null;

  private hp: number = 100;
  private maxHp: number = 100;
  private gold: number = 50;
  private inventory: InventoryItem[] = [];
  private questState: 'none' | 'active' | 'completed' = 'none';

  private currentLookTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraInitialized: boolean = false;

  constructor(
    container: HTMLElement,
    onStateChange?: any,
    onSoulCollected?: (soul: SoulDoll) => void,
    onCombatTrigger?: (rivalSoul: BattleSoul, introText: string) => void,
    onChestReward?: (items: { id: ItemId; name: string; count: number }[], gold: number) => void,
    onHealTeam?: () => void,
    hasWaterSoulFn?: () => boolean,
    onWaterQuestReward?: () => void,
    onItemReward?: (items: { id: ItemId; name: string; count: number }[]) => void,
    getSaveData?: () => Partial<GameSaveData>
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onSoulCollected = onSoulCollected;
    this.onCombatTrigger = onCombatTrigger;
    this.onChestReward = onChestReward;
    this.onHealTeam = onHealTeam;
    this.hasWaterSoulFn = hasWaterSoulFn;
    this.onWaterQuestReward = onWaterQuestReward;
    this.onItemReward = onItemReward;
    this.getSaveData = getSaveData || (() => ({}));

    // 1. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.65, 0.4, 0.85
    );
    this.composer.addPass(bloomPass);

    // 3. Core modules
    this.inputManager = new InputManager(this.renderer.domElement);
    this.stateMachine = new StateMachine();
    this.debugManager = new DebugManager(this);
    this.initStateMachine();

    // 4. Build world & player
    const world = buildWorld(this.scene, this.camera, 'fixed-seed');
    this.soulDolls = world.soulDolls;
    this.trees = world.trees;
    this.collisionBoxes = world.collisionBoxes;
    this.lakeCenter = world.lakeCenter;
    this.npcs = world.npcs;
    this.chests = world.chests;
    this.enemies = world.enemies;
    this.grassPatches = world.grassPatches;
    this.fountains = world.fountains;
    this.signposts = world.signposts;
    this.updateWorldFn = world.updateWorld;
    this.setTimeOfDayFn = world.setTimeOfDay;
    this.isInsideGrassFn = world.isInsideGrass;

    this.player = new PlayerController(this.scene);
    this.setTimeOfDayFn(0.0);

    this.loadGame();

    const exMat = new THREE.SpriteMaterial({ map: createExclamationTexture(), transparent: true });
    this.exclamationSprite = new THREE.Sprite(exMat);
    this.exclamationSprite.scale.set(1.8, 1.8, 1);
    this.exclamationSprite.visible = false;
    this.scene.add(this.exclamationSprite);

    // Dust Pooling
    const dustTex = createDustTexture();
    this.dustPool = new ObjectPool<THREE.Sprite>(
      () => {
        const mat = new THREE.SpriteMaterial({ map: dustTex, transparent: true, opacity: 0, depthWrite: false });
        const s = new THREE.Sprite(mat);
        s.scale.set(0.6, 0.6, 1);
        s.visible = false;
        this.scene.add(s);
        return s;
      },
      (s) => {
        s.visible = false;
        (s.material as THREE.SpriteMaterial).opacity = 0;
      },
      16
    );

    this.initEventListeners();
    this.onWindowResize();

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // this.saveGame();
      }
    });

    // 5. Game Loop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
  }

  private initStateMachine() {
    this.stateMachine.registerState('title', {
      enter: () => { this.gameState = 'title'; this.notifyState(); },
    });
    this.stateMachine.registerState('world', {
      enter: () => { this.gameState = 'playing'; this.notifyState(); },
      update: (dt) => this.updateWorldLogic(dt),
    });
    this.stateMachine.registerState('transitionToEncounter', {
      enter: () => { this.gameState = 'combat'; this.notifyState(); },
    });
    this.stateMachine.registerState('combat', {
      enter: () => { this.gameState = 'combat'; this.notifyState(); },
    });
    this.stateMachine.registerState('partyMenu', {
      enter: () => { this.gameState = 'playing'; this.notifyState(); },
    });
    this.stateMachine.registerState('bag', {
      enter: () => { this.gameState = 'playing'; this.notifyState(); },
    });
    this.stateMachine.registerState('pause', {
      enter: () => { this.notifyState(); },
    });
    this.stateMachine.registerState('error', {
      enter: () => { this.notifyState(); },
    });
  }

  private activeSlot: number = 0;

  public setActiveSlot(slot: number) { this.activeSlot = slot; this.loadGame(); }

  private loadGame() {
    const data = SaveManager.loadFromSlot(this.activeSlot);
    if (data) {
      this.gold = data.gold ?? 50;
      this.questState = data.questState ?? 'none';
      if (data.playerPos && this.player) {
        const tx = data.playerPos.x ?? 0;
        const tz = data.playerPos.z ?? 0;
        if (this.checkPointCollision(tx, tz)) {
          this.player.state.x = 0;
          this.player.state.z = 7.0;
        } else {
          this.player.state.x = tx;
          this.player.state.z = tz;
        }
        this.player.updatePosition(0);
      }
      if (data.openedChests && Array.isArray(data.openedChests)) {
        this.chests.forEach(c => {
          if (data.openedChests!.includes(c.id)) {
            c.opened = true;
          }
        });
      }
    }
  }

  public saveGame() {
    const data = this.getSaveData();
    const pos = this.player ? { x: this.player.state.x, z: this.player.state.z } : { x: 0, z: 0 };
    SaveManager.saveToSlot(this.activeSlot, {
      ...data,
      hp: this.hp,
      gold: this.gold,
      questState: this.questState,
      playerPos: pos,
    } as GameSaveData);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'F2') {
      const cmd = prompt('Debug command: tp x z | encuentro [mob] | darNivel n | darObjeto n | curar | semilla n | noche/dia | guardar/cargar');
      if (cmd) {
        this.debugManager.handleCommand(cmd);
      }
    }
    
    if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      if (this.stateMachine.getState() === 'title') {
        this.stateMachine.transition('world');
      }
    }

    if (e.code === 'KeyT') {
      this.autoCycle = false;
      this.targetTimeOfDay = this.targetTimeOfDay === 0 ? 1 : 0;
      this.isTransitioning = true;
      this.transitionTimer = 0;
      this.notifyState();
    }

    if (e.code === 'KeyC') {
      this.autoCycle = !this.autoCycle;
      this.notifyState();
    }

    if (e.code === 'KeyM') {
      audioManager.toggleMute();
    }

    if (e.code === 'KeyE' && this.stateMachine.getState() === 'world') {
      this.handleInteraction();
    }

    if (e.code === 'Space' && this.stateMachine.getState() === 'world' && !this.activeDialogue) {
      this.handleAttack();
    }

    if (e.code === 'KeyB' && this.stateMachine.getState() === 'world' && !this.activeDialogue) {
      this.triggerGrassEncounter('RUNIKA');
    }
  };

  private handleMouseDown = () => {
    if (this.stateMachine.getState() === 'title') {
      this.stateMachine.transition('world');
    }
  };

  private handleTouchStart = () => {
    if (this.stateMachine.getState() === 'title') {
      this.stateMachine.transition('world');
    }
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.gameLoop.pause();
      audioManager.pauseAll? audioManager.pauseAll() : null;
    } else {
      this.gameLoop.resume();
      audioManager.resumeAll? audioManager.resumeAll() : null;
    }
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    console.warn('[Engine] WebGL Context Lost');
    this.gameLoop.pause();
    // Show overlay or notify user if needed
  };

  private handleContextRestored = () => {
    console.log('[Engine] WebGL Context Restored. Reconstructing...');
    this.renderer.setAnimationLoop(null);
    // In a real app we might need to recreate materials/textures here.
    // Three.js handles most of it if we don't dispose things prematurely.
    this.gameLoop.resume();
  };

  private initEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.handleMouseDown);
    dom.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    
    dom.addEventListener('webglcontextlost', this.handleContextLost, false);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleInteraction() {
    const px = this.player.state.x;
    const pz = this.player.state.z;

    if (this.activeDialogue) {
      if (this.currentNPC) {
        this.dialogueIndex++;
        if (this.dialogueIndex < this.currentNPC.dialogue.length) {
          this.activeDialogue = {
            name: this.currentNPC.name,
            text: this.currentNPC.dialogue[this.dialogueIndex],
          };
          if (this.currentNPC.questGiven && this.questState === 'none') {
            this.questState = 'active';
          }
        } else {
          this.activeDialogue = null;
          this.currentNPC = null;
        }
        this.notifyState();
      } else {
        this.activeDialogue = null;
        this.notifyState();
      }
      return;
    }

    for (let i = 0; i < this.fountains.length; i++) {
      const f = this.fountains[i];
      const dist = Math.hypot(f.x - px, f.z - pz);
      if (dist < 3.8) {
        this.hp = this.maxHp;
        audioManager.playHeal();
        vfxEngine.triggerSkillVFX('heal', window.innerWidth * 0.5, window.innerHeight * 0.5);
        vfxEngine.showFloatingText('¡Salud Restaurada!', 50, 40, '#34d399', 'text-2xl');
        if (this.onHealTeam) {
          this.onHealTeam();
        }
        if (this.onItemReward) {
          this.onItemReward([{ id: 'potion', name: 'Poción', count: 1 }]);
        }
        this.activeDialogue = {
          name: 'Fuente Sagrada',
          text: '¡Las aguas sagradas han restaurado por completo tu equipo y te han otorgado una Poción Ancestral extra!',
        };
        this.currentNPC = null;
        // this.saveGame();
        this.notifyState();
        return;
      }
    }

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const dist = Math.hypot(npc.x - px, npc.z - pz);
      if (dist < 4.2) {
        this.currentNPC = npc;
        this.dialogueIndex = 0;

        if (npc.id === 'npc-elder') {
          if (this.questState === 'none') {
            this.questState = 'active';
            this.activeDialogue = {
              name: npc.name,
              text: '¡Saludos, caminante de almas! Las aguas de nuestro lago oriental albergan a las almas de Agua más puras. ¿Podrías capturar un alma de tipo AGUA para nuestro santuario? ¡Te daré 3 Cristales Superiores!',
            };
          } else if (this.questState === 'active') {
            const hasWater = this.hasWaterSoulFn ? this.hasWaterSoulFn() : false;
            if (hasWater) {
              this.questState = 'completed';
              if (this.onWaterQuestReward) {
                this.onWaterQuestReward();
              }
              audioManager.playVictory();
              this.activeDialogue = {
                name: npc.name,
                text: '¡Increíble! Percibo la pureza del alma de Agua que has capturado. Has cumplido la misión sagrada. ¡Toma estos 3 Cristales Superiores para tu viaje!',
              };
            } else {
              this.activeDialogue = {
                name: npc.name,
                text: 'Aún no has capturado un alma de tipo AGUA (Aquelle o Tomoe). Búscalas en la hierba alta cerca del lago al este.',
              };
            }
          } else {
            this.activeDialogue = {
              name: npc.name,
              text: 'Gracias a ti, las corrientes sagradas fluyen en paz. Que las almas guíen tus pasos en el bosque.',
            };
          }
        } else {
          this.activeDialogue = {
            name: npc.name,
            text: npc.dialogue[0],
          };
        }

        audioManager.playCollectSoul();
        // this.saveGame();
        this.notifyState();
        return;
      }
    }

    for (let i = 0; i < this.chests.length; i++) {
      const chest = this.chests[i];
      if (!chest.opened) {
        const dist = Math.hypot(chest.x - px, chest.z - pz);
        if (dist < 3.5) {
          chest.opened = true;
          this.gold += chest.rewardAmount;
          audioManager.playCollectSoul();
          vfxEngine.triggerSkillVFX('levelup', window.innerWidth * 0.5, window.innerHeight * 0.5);
          vfxEngine.showFloatingText(`+${chest.rewardAmount} ORO Y TESORO!`, 50, 40, '#fde047', 'text-2xl');

          const itemsGiven: { id: ItemId; name: string; count: number }[] = [];
          const potCount = Math.random() < 0.6 ? Math.floor(1 + Math.random() * 2) : 0;
          const crysCount = Math.floor(1 + Math.random() * 2);
          if (potCount > 0) itemsGiven.push({ id: 'potion', name: 'Poción', count: potCount });
          itemsGiven.push({ id: 'soul_crystal', name: 'Cristal de alma', count: crysCount });

          if (this.onChestReward) {
            this.onChestReward(itemsGiven, chest.rewardAmount);
          }

          // this.saveGame();
          this.notifyState();
          return;
        }
      }
    }

    for (let i = 0; i < this.signposts.length; i++) {
      const sign = this.signposts[i];
      const dist = Math.hypot(sign.x - px, sign.z - pz);
      if (dist < 3.2) {
        this.currentNPC = null;
        this.activeDialogue = {
          name: sign.name,
          text: sign.text,
        };
        audioManager.playCollectSoul();
        this.notifyState();
        return;
      }
    }
  }

  private handleAttack() {
    const px = this.player.state.x;
    const pz = this.player.state.z;
    audioManager.playHitSpirit();

    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (en.alive) {
        const dist = Math.hypot(en.x - px, en.z - pz);
        if (dist < 4.5) {
          en.hp--;
          if (en.hp <= 0) {
            en.alive = false;
            this.gold += 25;
            audioManager.playCollectSoul();
            // this.saveGame();
          }
        }
      }
    }
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;

    this.camera.aspect = w / h;
    const baseFov = 60;
    if (this.camera.aspect < 1.0) {
      const refAspect = 1.25;
      const targetHFovRad = 2 * Math.atan(Math.tan((baseFov * Math.PI / 180) / 2) * refAspect);
      const calculatedVFovDeg = 2 * Math.atan(Math.tan(targetHFovRad / 2) / this.camera.aspect) * (180 / Math.PI);
      this.camera.fov = Math.min(80, Math.max(baseFov, calculatedVFovDeg));
    } else {
      this.camera.fov = baseFov;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  };

  private notifyState() {
    const collected = this.soulDolls.filter(s => s.collected).length;
    if (this.onStateChange) {
      const isDay = this.timeOfDay >= 0.5;
      const playerPosAndRot = {
        x: this.player ? this.player.state.x : 0,
        z: this.player ? this.player.state.z : 0,
        rotation: this.player ? this.player.state.rotation : 0,
      };
      this.onStateChange(
        this.gameState,
        collected,
        this.soulDolls.length,
        isDay,
        this.autoCycle,
        this.hp,
        this.maxHp,
        this.gold,
        this.inventory,
        this.activeDialogue,
        this.questState,
        playerPosAndRot,
        this.discoveredGrass
      );
    }
  }

  public setGameState(state: GameState) {
    if (state === 'playing') {
      this.stateMachine.transition('world');
    } else if (state === 'combat') {
      this.stateMachine.transition('combat');
    } else if (state === 'title') {
      this.stateMachine.transition('title');
    }
  }

  public restartGame() {
    this.player.reset();
    this.soulDolls.forEach(s => s.collected = false);
    this.stateMachine.transition('world');
  }

  public start() {
    this.gameLoop.start();
  }

  private checkPointCollision(testX: number, testZ: number): boolean {
    if (testX < -190 || testX > 190 || testZ < -190 || testZ > 190) return true;
    const playerRadius = GAME_CONSTANTS.PLAYER_RADIUS;

    for (let i = 0; i < this.trees.length; i++) {
      const tree = this.trees[i];
      const dist = Math.hypot(tree.x - testX, tree.z - testZ);
      if (dist < tree.radius + playerRadius) {
        return true;
      }
    }

    for (let i = 0; i < this.collisionBoxes.length; i++) {
      const box = this.collisionBoxes[i];
      if (
        Math.abs(testX - box.x) < box.rx + playerRadius &&
        Math.abs(testZ - box.z) < box.rz + playerRadius
      ) {
        return true;
      }
    }

    if (this.lakeCenter) {
      const lakeDist = Math.hypot(testX - this.lakeCenter.x, testZ - this.lakeCenter.z);
      if (lakeDist < 22 + playerRadius) {
        return true;
      }
    }

    return false;
  }

  private spawnDustParticle(x: number, y: number, z: number, isSprinting: boolean) {
    const mesh = this.dustPool.get();
    mesh.visible = true;
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.5,
      y + 0.15,
      z + (Math.random() - 0.5) * 0.5
    );
    mesh.scale.set(0.45, 0.45, 1);
    (mesh.material as THREE.SpriteMaterial).opacity = 0.75;
    
    this.activeDustParticles.push({
      mesh,
      life: 0,
      maxLife: isSprinting ? 0.32 : 0.42,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.5 + Math.random() * 0.4,
      vz: (Math.random() - 0.5) * 0.6,
    });
  }

  private update(dt: number) {
    if (this.autoCycle) {
      this.cycleTimer += dt;
      const cycleDuration = GAME_CONSTANTS.DAY_NIGHT_CYCLE_DURATION;
      const progress = (this.cycleTimer % cycleDuration) / cycleDuration;
      this.timeOfDay = (Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      this.setTimeOfDayFn(this.timeOfDay);
    } else if (this.isTransitioning) {
      this.transitionTimer += dt;
      const p = Math.min(1.0, this.transitionTimer / this.transitionDuration);
      const easeP = p * p * (3 - 2 * p);
      const startT = this.targetTimeOfDay === 1 ? 0 : 1;
      this.timeOfDay = THREE.MathUtils.lerp(startT, this.targetTimeOfDay, easeP);
      this.setTimeOfDayFn(this.timeOfDay);

      if (p >= 1.0) {
        this.isTransitioning = false;
      }
    }

    // State machine update
    if (this.stateMachine.getState() === 'world') {
      this.updateWorldLogic(dt);
    }
  }

  private updateWorldLogic(dt: number) {
    const rot = this.player.state.rotation;

    let moveForward = 0;
    let moveRight = 0;

    if (this.inputManager.isActionActive('turnLeft')) {
      this.player.state.rotation += 2.2 * dt;
    }
    if (this.inputManager.isActionActive('turnRight')) {
      this.player.state.rotation -= 2.2 * dt;
    }

    if (!this.activeDialogue) {
      if (this.inputManager.isActionActive('moveForward')) moveForward += 1;
      if (this.inputManager.isActionActive('moveBackward')) moveForward -= 1;
      if (this.inputManager.isActionActive('strafeRight')) moveRight += 1;
      if (this.inputManager.isActionActive('strafeLeft')) moveRight -= 1;
    }

    const hasInput = moveForward !== 0 || moveRight !== 0;
    const isSprinting = (this.inputManager.isActionActive('sprint') || this.isSprintingMobile) && hasInput;
    const maxSpeed = isSprinting ? GAME_CONSTANTS.PLAYER_SPRINT_SPEED : GAME_CONSTANTS.PLAYER_BASE_SPEED;

    let targetDirX = 0;
    let targetDirZ = 0;
    let strafeDir = 0;
    let forwardDir = 0;

    if (hasInput) {
      const inputLen = Math.hypot(moveForward, moveRight);
      const normF = moveForward / inputLen;
      const normR = moveRight / inputLen;
      strafeDir = normR;
      forwardDir = normF;

      targetDirX = -Math.sin(rot) * normF + Math.cos(rot) * normR;
      targetDirZ = -Math.cos(rot) * normF - Math.sin(rot) * normR;
    }

    const targetVX = targetDirX * maxSpeed;
    const targetVZ = targetDirZ * maxSpeed;
    const accelRate = hasInput ? 24 : 18;

    this.velocityX = THREE.MathUtils.lerp(this.velocityX, targetVX, Math.min(1.0, dt * accelRate));
    this.velocityZ = THREE.MathUtils.lerp(this.velocityZ, targetVZ, Math.min(1.0, dt * accelRate));

    const currentSpeed = Math.hypot(this.velocityX, this.velocityZ);
    const moving = currentSpeed > 0.15;
    this.player.state.isMoving = moving;

    if (moving) {
      const stepX = this.velocityX * dt;
      const stepZ = this.velocityZ * dt;

      const prevX = this.player.state.x;
      const prevZ = this.player.state.z;

      const testBothX = Math.max(-190, Math.min(190, prevX + stepX));
      const testBothZ = Math.max(-190, Math.min(190, prevZ + stepZ));

      const midX = (prevX + testBothX) * 0.5;
      const midZ = (prevZ + testBothZ) * 0.5;
      const midCollision = this.checkPointCollision(midX, midZ);

      if (!midCollision && !this.checkPointCollision(testBothX, testBothZ)) {
        this.player.state.x = testBothX;
        this.player.state.z = testBothZ;
      } else {
        const canMoveX = !this.checkPointCollision(testBothX, prevZ);
        const canMoveZ = !this.checkPointCollision(prevX, testBothZ);

        if (canMoveX) this.player.state.x = testBothX;
        if (canMoveZ) this.player.state.z = testBothZ;
      }

      const actualStepDist = Math.hypot(this.player.state.x - prevX, this.player.state.z - prevZ);

      this.dustTimer += dt;
      const dustInterval = isSprinting ? 0.08 : 0.15;
      if (this.dustTimer > dustInterval) {
        this.dustTimer = 0;
        this.spawnDustParticle(this.player.state.x, this.player.state.y - 2.8, this.player.state.z, isSprinting);
      }

      const footstepInterval = isSprinting ? 220 : 360;
      if (performance.now() - this.lastFootstepTime > footstepInterval) {
        this.lastFootstepTime = performance.now();
        audioManager.playFootstep();
      }

      if (actualStepDist > 0.001) {
        this.grassPatches.forEach((gp, idx) => {
          if (!this.discoveredGrass.includes(idx)) {
            if (Math.hypot(gp.x - this.player.state.x, gp.z - this.player.state.z) < gp.radius + 20) {
              this.discoveredGrass.push(idx);
            }
          }
        });

        if (this.isInsideGrassFn && this.isInsideGrassFn(this.player.state.x, this.player.state.z)) {
          this.grassDistanceWalked += actualStepDist;
          if (this.grassDistanceWalked >= 1.0) {
            this.grassDistanceWalked = 0;
            if (this.graceSteps > 0) {
              this.graceSteps--;
            } else if (this.gameState === 'playing' && Math.random() < GAME_CONSTANTS.GRASS_ENCOUNTER_CHANCE) {
              this.triggerGrassEncounter();
            }
          }
        }
      }
    } else {
      this.velocityX = 0;
      this.velocityZ = 0;
    }

    for (let i = this.activeDustParticles.length - 1; i >= 0; i--) {
      const p = this.activeDustParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.dustPool.release(p.mesh);
        this.activeDustParticles.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const progress = p.life / p.maxLife;
        (p.mesh.material as THREE.SpriteMaterial).opacity = (1 - progress) * 0.75;
        const s = 0.45 + progress * 0.35;
        p.mesh.scale.set(s, s, 1);
      }
    }

    this.player.updatePosition(dt, strafeDir, forwardDir, isSprinting);

    const px = this.player.state.x;
    const pz = this.player.state.z;
    const py = this.player.state.y;

    const aspect = this.camera.aspect || 1.0;
    const isPortrait = aspect < 1.0;
    const portraitFactor = isPortrait
      ? THREE.MathUtils.lerp(1.2, 1.0, Math.max(0, Math.min(1.0, (aspect - 0.45) / 0.55)))
      : 1.0;

    const camDist = GAME_CONSTANTS.CAMERA_DISTANCE * portraitFactor;
    const camHeight = GAME_CONSTANTS.CAMERA_HEIGHT * portraitFactor;
    const targetCx = px + Math.sin(rot) * camDist;
    const targetCz = pz + Math.cos(rot) * camDist;
    const targetCy = py + camHeight;
    const targetLookY = py + (isPortrait ? 1.8 : 2.2);

    const lerpSpeed = Math.min(1.0, dt * 10);
    if (!this.cameraInitialized) {
      this.camera.position.set(targetCx, targetCy, targetCz);
      this.currentLookTarget.set(px, targetLookY, pz);
      this.cameraInitialized = true;
    } else {
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCx, lerpSpeed);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCy, lerpSpeed);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCz, lerpSpeed);

      this.currentLookTarget.x = THREE.MathUtils.lerp(this.currentLookTarget.x, px, lerpSpeed);
      this.currentLookTarget.y = THREE.MathUtils.lerp(this.currentLookTarget.y, targetLookY, lerpSpeed);
      this.currentLookTarget.z = THREE.MathUtils.lerp(this.currentLookTarget.z, pz, lerpSpeed);
    }

    this.camera.lookAt(this.currentLookTarget);
    this.updateWorldFn(dt, px, pz);

    this.soulDolls.forEach(soul => {
      if (!soul.collected) {
        const dist = Math.hypot(soul.x - px, soul.z - pz);
        if (dist < 3.5) {
          soul.collected = true;
          audioManager.playCollectSoul();
          vfxEngine.triggerSkillVFX('capture', window.innerWidth * 0.5, window.innerHeight * 0.5);
          vfxEngine.showFloatingText(`¡Alma "${soul.name}" Obtenida!`, 50, 40, '#c084fc', 'text-2xl');
          const collectedCount = this.soulDolls.filter(s => s.collected).length;
          if (this.onSoulCollected) {
            this.onSoulCollected(soul);
          }
          eventBus.emit('soulCollected', soul);
          this.notifyState();

          if (collectedCount >= this.soulDolls.length) {
            audioManager.playVictory();
            this.setGameState('victory' as any);
          }
        }
      }
    });
  }

  private render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.debugManager.update(this.renderer, this.scene, this.trees, this.grassPatches);
  }

  public triggerGrassEncounter(forcedMobName?: string) {
    if (this.stateMachine.getState() === 'combat') return;
    this.stateMachine.transition('transitionToEncounter');

    const { soul, introText } = createRandomWildSoul(forcedMobName);

    this.exclamationSprite.position.set(this.player.state.x, this.player.state.y + 4.2, this.player.state.z);
    this.exclamationSprite.visible = true;
    audioManager.playBattleStart();

    setTimeout(() => {
      this.exclamationSprite.visible = false;
      this.stateMachine.transition('combat');
      eventBus.emit('encounterStarted', soul);
      if (this.onCombatTrigger) {
        this.onCombatTrigger(soul, introText);
      }
    }, 600);
  }

  public respawnAtVillage() {
    this.player.state.x = 0;
    this.player.state.z = 2;
    this.player.state.rotation = 0;
    this.hp = this.maxHp;
    this.graceSteps = 10;
    // this.saveGame();
    this.notifyState();
  }

  public onCombatVictory(gold: number) {
    this.gold += gold;
    this.graceSteps = 8;
    // this.saveGame();
    this.stateMachine.transition('world');
    this.notifyState();
    eventBus.emit('combatEnded', { victory: true });
  }

  public onCombatFlee() {
    this.graceSteps = 8;
    this.stateMachine.transition('world');
    eventBus.emit('combatEnded', { flee: true });
  }

  public toggleAudio(): boolean {
    return audioManager.toggleMute();
  }

  public setTargetTimeOfDay(t: number) {
    this.targetTimeOfDay = t;
    this.isTransitioning = true;
    this.transitionTimer = 0;
    this.notifyState();
  }

  public teleport(x: number, z: number) {
    if (this.player) {
      this.player.state.x = x;
      this.player.state.z = z;
      this.player.updatePosition(0);
      this.cameraInitialized = false; // Reset camera to snap
    }
  }

  public addGold(amount: number) {
    this.gold += amount;
    this.notifyState();
  }

  public healFull() {
    this.hp = this.maxHp;
    this.notifyState();
  }

  public getStateMachine() { return this.stateMachine; }

  public getPlayerPos(): { x: number; z: number } {
    return { x: this.player ? this.player.state.x : 0, z: this.player ? this.player.state.z : 0 };
  }

  public getLakeCenter(): { x: number; z: number } {
    return this.lakeCenter;
  }

  public getGrassPatches(): GrassPatch[] {
    return this.grassPatches;
  }

  public getSoulDolls(): SoulDoll[] {
    return this.soulDolls;
  }

  public getDiscoveredGrass(): number[] {
    return this.discoveredGrass;
  }

  public getChests(): Chest[] {
    return this.chests;
  }

  public getFountains(): FountainData[] {
    return this.fountains;
  }

  public setVirtualKey(code: string, isDown: boolean) {
    if (code === 'KeyW' || code === 'ArrowUp') this.inputManager.setVirtualAction('moveForward', isDown);
    if (code === 'KeyS' || code === 'ArrowDown') this.inputManager.setVirtualAction('moveBackward', isDown);
    if (code === 'KeyA') this.inputManager.setVirtualAction('strafeLeft', isDown);
    if (code === 'KeyD') this.inputManager.setVirtualAction('strafeRight', isDown);
    if (code === 'KeyQ' || code === 'ArrowLeft') this.inputManager.setVirtualAction('turnLeft', isDown);
    if (code === 'KeyE' || code === 'ArrowRight') this.inputManager.setVirtualAction('turnRight', isDown);

    if (isDown && ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      if (this.stateMachine.getState() === 'title') {
        this.stateMachine.transition('world');
      }
    }
  }

  public triggerInteract() {
    if (this.stateMachine.getState() === 'world') {
      this.handleInteraction();
    }
  }

  public triggerAttack() {
    if (this.stateMachine.getState() === 'world' && !this.activeDialogue) {
      this.handleAttack();
    }
  }

  public toggleSprint(active?: boolean) {
    if (active !== undefined) {
      this.isSprintingMobile = active;
    } else {
      this.isSprintingMobile = !this.isSprintingMobile;
    }
  }

  public isSprinting(): boolean {
    return this.isSprintingMobile || this.inputManager.isActionActive('sprint');
  }

  public destroy() {
    this.gameLoop.stop();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.handleMouseDown);
    dom.removeEventListener('touchstart', this.handleTouchStart);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);
    
    if (this.container && this.container.contains(dom)) {
        this.container.removeChild(dom);
    }
    
    // Thorough cleanup of all 3D resources
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Sprite) {
        if (obj.geometry) obj.geometry.dispose();
        
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    disposeTextures();
    if (this.composer) {
      this.composer.dispose();
    }
    this.renderer.dispose();
  }
}
