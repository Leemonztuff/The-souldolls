/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameSaveData } from '../types';
import { logger } from '../core/logger';

const CURRENT_VERSION = 1;

export class SaveManager {
  private static getSlotKey(slot: number) { return `souldolls_save_slot_${slot}`; }
  private static getTmpKey(slot: number) { return `souldolls_save_slot_${slot}_tmp`; }

  public static saveToSlot(slot: number, data: Omit<GameSaveData, 'version' | 'timestamp'>) {
    const saveData: GameSaveData = {
      ...data,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
    };

    try {
      const json = JSON.stringify(saveData);
      const tmpKey = this.getTmpKey(slot);
      const realKey = this.getSlotKey(slot);
      
      localStorage.setItem(tmpKey, json);
      const verify = localStorage.getItem(tmpKey);
      if (verify === json) {
        localStorage.setItem(realKey, json);
        localStorage.removeItem(tmpKey);
        logger.info(`Saved successfully to slot ${slot}`);
      } else {
        throw new Error('Verification failed');
      }
    } catch (e) {
      logger.error(`Failed to save to slot ${slot}`, e);
    }
  }

  public static loadFromSlot(slot: number): GameSaveData | null {
    try {
      const saved = localStorage.getItem(this.getSlotKey(slot));
      if (!saved) return null;
      const data = JSON.parse(saved);
      if (typeof data.version !== 'number' || !Array.isArray(data.team)) {
        throw new Error('Invalid save data schema');
      }
      return this.migrate(data);
    } catch (e) {
      logger.error(`Failed to load slot ${slot}`, e);
      return null;
    }
  }

  public static exportSave(slot: number): string | null {
    return localStorage.getItem(this.getSlotKey(slot));
  }

  public static importSave(slot: number, json: string) {
    try {
      const data = JSON.parse(json);
      // Basic schema validation
      if (typeof data.version !== 'number' || (!Array.isArray(data.team) && !data.team)) {
        throw new Error('Formato de guardado inválido: Falta equipo o versión.');
      }
      this.saveToSlot(slot, data);
    } catch (e) {
      logger.error('Failed to import save', e);
      throw e; 
    }
  }

  private static migrate(data: any): GameSaveData {
    let currentData = data;
    
    // Future-proofing: sequential migrations
    if (currentData.version < 1) {
      // Logic for migration to v1
      currentData.version = 1;
    }
    
    return currentData as GameSaveData;
  }

  public static deleteSlot(slot: number) {
    localStorage.removeItem(this.getSlotKey(slot));
  }
}

