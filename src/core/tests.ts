/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../core/logger';
import { calculateDamage, calculateCatchRate } from '../battle/battleRules';
import { getStarterSouls } from '../data/mobs';
import { SaveManager } from '../save/saveManager';
import { mulberry32 } from './rng';

export function runTests() {
  logger.info('Starting test suite...');
  
  let passed = 0;
  let failed = 0;

  const test = (name: string, condition: () => boolean) => {
    if (condition()) {
      logger.info(`PASSED: ${name}`);
      passed++;
    } else {
      logger.error(`FAILED: ${name}`);
      failed++;
    }
  };

  const soul1 = getStarterSouls()[0];
  const soul2 = getStarterSouls()[1];
  const move = soul1.moves[0];
  const random = Math.random;

  test('Damage never negative', () => {
    const res = calculateDamage(soul1, soul2, move, random);
    return res.damage >= 1;
  });

  test('Catch rate in bounds', () => {
    const rate = calculateCatchRate(soul2);
    return rate >= 0.1 && rate <= 0.95;
  });

  test('Save/Load consistency', () => {
    const data = {
      team: [], box: [], bag: [], playerPos: {x: 1, z: 2}, gold: 100,
      questState: 'none' as const, starterChosen: true
    };
    SaveManager.saveToSlot(99, data);
    const loaded = SaveManager.loadFromSlot(99);
    SaveManager.deleteSlot(99);
    return loaded !== null && loaded.gold === 100;
  });

  test('Simulation 1000 combats', () => {
    const seed = mulberry32(12345);
    let valid = true;
    for (let i = 0; i < 1000; i++) {
        const res = calculateDamage(soul1, soul2, move, seed);
        if (isNaN(res.damage) || res.damage < 0) valid = false;
    }
    return valid;
  });

  logger.info(`Test suite finished. Passed: ${passed}, Failed: ${failed}`);
  return { passed, failed };
}

(window as any).runTests = runTests;
