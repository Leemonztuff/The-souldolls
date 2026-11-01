/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEngine } from '../game/engine';
import { logger } from './logger';
import { eventBus } from './eventBus';
import { setGlobalSeed } from './rng';

export class DebugManager {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  public handleCommand(command: string) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    
    logger.info(`Executing debug command: ${cmd}`);

    switch (cmd) {
      case 'tp':
        if (parts.length >= 3) {
          const x = parseFloat(parts[1]);
          const z = parseFloat(parts[2]);
          if (!isNaN(x) && !isNaN(z)) {
            this.engine.teleport(x, z);
          }
        }
        break;
      case 'encuentro':
        const mobName = parts.slice(1).join(' ').toUpperCase();
        this.engine.triggerGrassEncounter(mobName || undefined);
        break;
      case 'darnivel':
        const level = parseInt(parts[1]);
        if (!isNaN(level)) {
          eventBus.emit('debug_addExperience', { level });
        }
        break;
      case 'dar':
        if (parts[1] === 'objeto' && parts[2]) {
          const count = parseInt(parts[3]) || 1;
          eventBus.emit('debug_giveItem', { id: parts[2], count });
        }
        break;
      case 'curar':
        this.engine.healFull();
        break;
      case 'semilla':
        const seed = parseInt(parts[1]);
        if (!isNaN(seed)) {
          setGlobalSeed(seed);
          logger.info(`Global seed set to: ${seed}`);
        }
        break;
      case 'noche':
        this.engine.setTargetTimeOfDay(0);
        break;
      case 'dia':
        this.engine.setTargetTimeOfDay(1);
        break;
      case 'guardar':
        this.engine.saveGame();
        break;
      case 'cargar':
        this.engine.setActiveSlot(0); // For now, slot 0 as default debug load
        break;
      default:
        logger.warn(`Unknown debug command: ${cmd}`);
    }
  }
}
