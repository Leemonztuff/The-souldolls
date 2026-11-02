/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameHUD } from './components/GameHUD';
import { BattleScreen } from './components/BattleScreen';
import { StarterSelectModal } from './components/StarterSelectModal';
import { SlotSelectionModal } from './components/SlotSelectionModal';
import { LuminadexModal } from './components/LuminadexModal';
import { GameState, SoulDoll, InventoryItem, BattleSoul, BagItem, ItemId, GameSaveData, GrassPatch } from './types';
import { getDefaultPlayerSoul, getDefaultBag, createRandomWildSoul } from './data/mobs';
import { SaveManager } from './save/saveManager';
import { FountainData } from './world/worldGen';
import { VFXOverlay } from './components/VFXOverlay';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [soulsCollected, setSoulsCollected] = useState(0);
  const [totalSouls, setTotalSouls] = useState(10);
  const [isDay, setIsDay] = useState(false);
  const [autoCycle, setAutoCycle] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [gold, setGold] = useState(50);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<{ name: string; text: string } | null>(null);
  const [questState, setQuestState] = useState<'none' | 'active' | 'completed'>('none');

  const [lastCollectedSoul, setLastCollectedSoul] = useState<SoulDoll | null>(null);
  const [allSouls, setAllSouls] = useState<SoulDoll[]>([]);

  // Team, Box, Bag, and Starter states
  const [starterChosen, setStarterChosen] = useState<boolean>(true); // will be checked on mount
  const [team, setTeam] = useState<BattleSoul[]>([getDefaultPlayerSoul()]);
  const [box, setBox] = useState<BattleSoul[]>([]);
  const [bag, setBag] = useState<BagItem[]>(getDefaultBag());
  const [activeSoulIndex, setActiveSoulIndex] = useState<number>(0);

  // Active Rival Combat State
  const [rivalSoul, setRivalSoul] = useState<BattleSoul | null>(null);
  const [battleIntroText, setBattleIntroText] = useState<string>('');

  // World and Radar navigation state
  const [playerPosAndRot, setPlayerPosAndRot] = useState<{ x: number; z: number; rotation: number }>({ x: 0, z: 0, rotation: 0 });
  const [discoveredGrass, setDiscoveredGrass] = useState<number[]>([]);
  const [grassPatches, setGrassPatches] = useState<GrassPatch[]>([]);
  const [lakeCenter, setLakeCenter] = useState<{ x: number; z: number }>({ x: 100, z: -80 });
  const [fountains, setFountains] = useState<FountainData[]>([]);

  // Luminadex / Registro de Almas (Key J)
  const [showLuminadex, setShowLuminadex] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [discoveredSouls, setDiscoveredSouls] = useState<Record<string, 'seen' | 'captured'>>({});
  
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [showSlotSelection, setShowSlotSelection] = useState(true);

  // Initial load from SaveManager
  useEffect(() => {
    if (showSlotSelection) return;
    
    const data = SaveManager.loadFromSlot(activeSlot);
    if (data) {
      if (data.team && data.team.length > 0) {
        setTeam(data.team);
        setStarterChosen(true);
      } else {
        setStarterChosen(false);
      }
      setBox(data.box || []);
      setBag(data.bag || getDefaultBag());
      setGold(data.gold ?? 50);
      setQuestState(data.questState || 'none');
      setDiscoveredSouls(data.discoveredSouls || {});
      setDiscoveredGrass(data.discoveredGrass || []);
    } else {
      setStarterChosen(false);
      setBag(getDefaultBag());
    }
  }, [activeSlot, showSlotSelection]);

  const teamRef = useRef(team);
  teamRef.current = team;

  const boxRef = useRef(box);
  boxRef.current = box;

  const bagRef = useRef(bag);
  bagRef.current = bag;

  const goldRef = useRef(gold);
  goldRef.current = gold;

  const questStateRef = useRef(questState);
  questStateRef.current = questState;

  const discoveredSoulsRef = useRef(discoveredSouls);
  discoveredSoulsRef.current = discoveredSouls;

  const discoveredGrassRef = useRef(discoveredGrass);
  discoveredGrassRef.current = discoveredGrass;

  // Save game state using SaveManager
  const saveGameState = useCallback((
    currentTeam: BattleSoul[] = teamRef.current,
    currentBox: BattleSoul[] = boxRef.current,
    currentBag: BagItem[] = bagRef.current,
    currentGold: number = goldRef.current,
    currentQuest: 'none' | 'active' | 'completed' = questStateRef.current,
    currentDiscoveredSouls: Record<string, 'seen' | 'captured'> = discoveredSoulsRef.current,
    currentDiscoveredGrass: number[] = discoveredGrassRef.current
  ) => {
    const pos = engineRef.current ? engineRef.current.getPlayerPos() : { x: 0, z: 0 };
    SaveManager.saveToSlot(activeSlot, {
      team: currentTeam,
      box: currentBox,
      bag: currentBag,
      playerPos: pos,
      gold: currentGold,
      hp: hp,
      questState: currentQuest,
      starterChosen: true,
      openedChests: [], // Should ideally be tracked from engine or unified state
      discoveredSouls: currentDiscoveredSouls,
      discoveredGrass: currentDiscoveredGrass,
    });
  }, [activeSlot, hp]);

  // Handle Healing Fountain: Restore all souls in player team
  const handleHealTeam = useCallback(() => {
    setTeam(prevTeam => {
      const healedTeam = prevTeam.map(s => ({
        ...s,
        hp: s.maxHp,
        moves: s.moves.map(m => ({ ...m, pp: m.maxPp })),
      }));
      setHp(100);
      saveGameState(healedTeam, boxRef.current, bagRef.current, goldRef.current, questStateRef.current, discoveredSoulsRef.current, discoveredGrassRef.current);
      return healedTeam;
    });
  }, [saveGameState]);

  // Water Soul check function
  const hasWaterSoul = useCallback(() => {
    return (
      teamRef.current.some(s => s.type === 'Agua') ||
      boxRef.current.some(s => s.type === 'Agua') ||
      discoveredSoulsRef.current['AQUELLE'] === 'captured' ||
      discoveredSoulsRef.current['TOMOE'] === 'captured'
    );
  }, []);

  // Water Soul Quest Reward: 3 Super Crystals
  const handleWaterQuestReward = useCallback(() => {
    setBag(prevBag => {
      const newBag = [...prevBag];
      const supIdx = newBag.findIndex(i => i.id === 'super_crystal');
      if (supIdx >= 0) {
        newBag[supIdx] = { ...newBag[supIdx], count: newBag[supIdx].count + 3 };
      } else {
        newBag.push({
          id: 'super_crystal',
          name: 'Cristal superior',
          count: 3,
          description: 'Cristal refinado con mayor índice de captura.',
          effect: 'capture',
          catchBonus: 1.8,
        });
      }
      setInventory(prevInv => [
        ...prevInv,
        {
          id: `item-water-reward-${Date.now()}`,
          name: '3x Cristales Superiores',
          icon: 'crystal',
          count: 3,
          description: 'Recompensa del Anciano Kaelen por purificar las aguas.',
        },
      ]);
      setQuestState('completed');
      saveGameState(teamRef.current, boxRef.current, newBag, goldRef.current + 100, 'completed', discoveredSoulsRef.current, discoveredGrassRef.current);
      return newBag;
    });
  }, [saveGameState]);

  const handleItemReward = useCallback((rewardItems: { id: ItemId; name: string; count: number }[]) => {
    setBag(prevBag => {
      const newBag = prevBag.map(item => {
        const found = rewardItems.find(ri => ri.id === item.id);
        if (found) {
          return { ...item, count: item.count + found.count };
        }
        return item;
      });

      rewardItems.forEach(ri => {
        if (!newBag.some(b => b.id === ri.id)) {
          newBag.push({
            id: ri.id,
            name: ri.name,
            count: ri.count,
            description: ri.id === 'potion' ? 'Restaura 20 HP al alma activa.' : 'Cristal para capturar almas salvajes.',
            effect: ri.id === 'potion' ? 'heal' : 'capture',
          });
        }
      });

      saveGameState(teamRef.current, boxRef.current, newBag, goldRef.current, questStateRef.current, discoveredSoulsRef.current, discoveredGrassRef.current);
      return newBag;
    });
  }, [saveGameState]);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(
      containerRef.current,
      (
        state: GameState,
        souls: number,
        total: number,
        day: boolean,
        auto: boolean,
        currentHp: number,
        currentMaxHp: number,
        currentGold: number,
        currentInv: InventoryItem[],
        dialogue: { name: string; text: string } | null,
        quest: 'none' | 'active' | 'completed',
        posAndRot: { x: number; z: number; rotation: number },
        grassIdxs: number[]
      ) => {
        setGameState(state);
        setSoulsCollected(souls);
        setTotalSouls(total);
        setIsDay(day);
        setAutoCycle(auto);
        setHp(currentHp);
        setMaxHp(currentMaxHp);
        setGold(currentGold);
        setInventory(currentInv);
        setActiveDialogue(dialogue);
        setQuestState(quest);
        setAllSouls([...engine['soulDolls']]);
        if (posAndRot) setPlayerPosAndRot(posAndRot);
        if (grassIdxs) setDiscoveredGrass([...grassIdxs]);
      },
      (soul: SoulDoll) => {
        setLastCollectedSoul(soul);
        setAllSouls([...engine['soulDolls']]);
      },
      (rival: BattleSoul, intro: string) => {
        // Register soul as seen in Luminadex
        setDiscoveredSouls(prev => {
          const upper = rival.name.toUpperCase();
          if (prev[upper] === 'captured') return prev;
          const next = { ...prev, [upper]: 'seen' as const };
          saveGameState(teamRef.current, boxRef.current, bagRef.current, goldRef.current, questStateRef.current, next, discoveredGrassRef.current);
          return next;
        });

        setRivalSoul(rival);
        setBattleIntroText(intro);
        setGameState('combat');
      },
      (chestItems: { id: ItemId; name: string; count: number }[], chestGold: number) => {
        // Add items to bag
        setBag(prevBag => {
          const newBag = prevBag.map(item => {
            const found = chestItems.find(ci => ci.id === item.id);
            if (found) {
              return { ...item, count: item.count + found.count };
            }
            return item;
          });

          chestItems.forEach(ci => {
            if (!newBag.some(b => b.id === ci.id)) {
              newBag.push({
                id: ci.id,
                name: ci.name,
                count: ci.count,
                description: ci.id === 'potion' ? 'Restaura 20 HP al alma activa.' : 'Cristal para capturar almas salvajes.',
                effect: ci.id === 'potion' ? 'heal' : 'capture',
              });
            }
          });

          saveGameState(teamRef.current, boxRef.current, newBag, goldRef.current + chestGold, questStateRef.current, discoveredSoulsRef.current, discoveredGrassRef.current);
          return newBag;
        });
      },
      handleHealTeam,
      hasWaterSoul,
      handleWaterQuestReward,
      handleItemReward,
      () => ({
        team: teamRef.current,
        box: boxRef.current,
        bag: bagRef.current,
        starterChosen: starterChosen,
        discoveredSouls: discoveredSouls,
        discoveredGrass: discoveredGrass,
        openedChests: chestsRef.current.filter(c => c.opened).map(c => c.id)
      })
    );

    engine.setActiveSlot(activeSlot);

    engineRef.current = engine;
    setAllSouls([...engine['soulDolls']]);
    setGrassPatches(engine.getGrassPatches());
    setLakeCenter(engine.getLakeCenter());
    setFountains(engine.getFountains());
    engine.start();

    return () => {
      engine.destroy();
    };
  }, [handleHealTeam, hasWaterSoul, handleWaterQuestReward, handleItemReward, saveGameState]);

  // Global keydown for Luminadex (Key J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing' && e.code === 'KeyJ') {
        setShowLuminadex(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Starter Selection
  const handleSelectStarter = (starterSoul: BattleSoul) => {
    const initialTeam = [starterSoul];
    const initialBag = getDefaultBag();
    setTeam(initialTeam);
    setBag(initialBag);
    setActiveSoulIndex(0);
    setStarterChosen(true);

    const initialDiscovered = {
      ...discoveredSouls,
      [starterSoul.name.toUpperCase()]: 'captured' as const,
    };
    setDiscoveredSouls(initialDiscovered);
    saveGameState(initialTeam, [], initialBag, gold, questState, initialDiscovered, discoveredGrass);
  };

  const handleStart = () => {
    if (engineRef.current) {
      engineRef.current.setGameState('playing');
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  };

  const handleToggleAudio = () => {
    if (engineRef.current) {
      return engineRef.current.toggleAudio();
    }
    return true;
  };

  // Consume bag item in combat
  const handleUseBagItem = (itemId: ItemId) => {
    setBag(prevBag => {
      const updated = prevBag.map(item => {
        if (item.id === itemId && item.count > 0) {
          return { ...item, count: item.count - 1 };
        }
        return item;
      });
      saveGameState(team, box, updated, gold, questState, discoveredSouls, discoveredGrass);
      return updated;
    });
  };

  // Combat victory or capture
  const handleBattleVictory = (
    expGained: number,
    goldGained: number,
    captured?: boolean,
    capturedSoul?: BattleSoul
  ) => {
    const newGold = gold + goldGained;
    setGold(newGold);

    let updatedTeam = [...team];
    let updatedBox = [...box];
    let updatedDiscovered = { ...discoveredSouls };

    if (captured && capturedSoul) {
      if (updatedTeam.length < 6) {
        updatedTeam.push(capturedSoul);
      } else {
        updatedBox.push(capturedSoul);
      }
      updatedDiscovered[capturedSoul.name.toUpperCase()] = 'captured';
      setDiscoveredSouls(updatedDiscovered);
    }

    setTeam(updatedTeam);
    setBox(updatedBox);

    if (engineRef.current) {
      engineRef.current.onCombatVictory(goldGained);
    }

    saveGameState(updatedTeam, updatedBox, bag, newGold, questState, updatedDiscovered, discoveredGrass);
    setGameState('playing');
    setRivalSoul(null);
  };

  // Combat defeat: restore team HP and respawn in village
  const handleBattleDefeat = () => {
    const restoredTeam = team.map(soul => ({
      ...soul,
      hp: soul.maxHp,
    }));
    setTeam(restoredTeam);
    setActiveSoulIndex(0);

    if (engineRef.current) {
      engineRef.current.respawnAtVillage();
    }

    saveGameState(restoredTeam, box, bag, gold, questState, discoveredSouls, discoveredGrass);
    setGameState('playing');
    setRivalSoul(null);
  };

  // Flee combat
  const handleBattleFlee = () => {
    if (engineRef.current) {
      engineRef.current.onCombatFlee();
    }
    saveGameState(team, box, bag, gold, questState, discoveredSouls, discoveredGrass);
    setGameState('playing');
    setRivalSoul(null);
  };

  // Quick debug/demo button or B key trigger
  const handleTriggerCombatDemo = () => {
    if (engineRef.current) {
      engineRef.current.triggerGrassEncounter('RUNIKA');
    } else {
      const { soul, introText } = createRandomWildSoul('RUNIKA');
      setRivalSoul(soul);
      setBattleIntroText(introText);
      setGameState('combat');
    }
  };

  const handleRespawn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.respawnAtVillage();
    }
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-slate-950 select-none">
      <VFXOverlay />
      {/* 3D WebGL Canvas Container: blurred & darkened during combat */}
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full transition-all duration-500 ${
          gameState === 'combat' ? 'filter blur-md brightness-35 scale-105 pointer-events-none' : ''
        }`}
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* CSS-based ambient light filter reflecting time of day (isDay state) */}
      <div
        className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-1000 mix-blend-overlay z-10 ${
          isDay 
            ? 'bg-gradient-to-b from-amber-400/20 via-yellow-500/10 to-transparent' 
            : 'bg-gradient-to-b from-indigo-950/60 via-blue-950/40 to-slate-950/70'
        }`}
      />

      {/* Starter Soul Selection Modal at start of game */}
      {!starterChosen && !showSlotSelection && (
        <StarterSelectModal onSelect={handleSelectStarter} />
      )}

      {/* Slot Selection Modal at start of game */}
      {showSlotSelection && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="text-4xl text-[#fdf6e2] font-pixel mb-8 animate-pulse">SoulDolls</div>
          <SlotSelectionModal 
            onSelectSlot={(slot) => {
              setActiveSlot(slot);
              setShowSlotSelection(false);
            }} 
          />
        </div>
      )}

      {/* Main Game HUD (only when not in combat) */}
      {gameState !== 'combat' && starterChosen && (
        <GameHUD
          gameState={gameState}
          soulsCollected={soulsCollected}
          totalSouls={totalSouls}
          isDay={isDay}
          autoCycle={autoCycle}
          hp={hp}
          maxHp={maxHp}
          gold={gold}
          inventory={inventory}
          activeDialogue={activeDialogue}
          questState={questState}
          onStart={handleStart}
          onRestart={handleRestart}
          onToggleAudio={handleToggleAudio}
          lastCollectedSoul={lastCollectedSoul}
          allSouls={allSouls}
          playerPosAndRot={playerPosAndRot}
          lakeCenter={lakeCenter}
          grassPatches={grassPatches}
          discoveredGrass={discoveredGrass}
          fountains={fountains}
          onOpenLuminadex={() => setShowLuminadex(true)}
          onTriggerCombatDemo={handleTriggerCombatDemo}
          onVirtualKey={(code, isDown) => engineRef.current?.setVirtualKey(code, isDown)}
          onTriggerInteract={() => engineRef.current?.triggerInteract()}
          onTriggerAttack={() => engineRef.current?.triggerAttack()}
          onToggleSprint={() => {
            engineRef.current?.toggleSprint();
            setIsSprinting(engineRef.current?.isSprinting() ?? false);
          }}
          isSprinting={isSprinting}
          onRespawn={handleRespawn}
        />
      )}

      {/* Luminadex Modal (Tecla J) */}
      {showLuminadex && (
        <LuminadexModal
          discovered={discoveredSouls}
          onClose={() => setShowLuminadex(false)}
        />
      )}

      {/* Turn-based 9:16 Combat Screen */}
      {gameState === 'combat' && rivalSoul && (
        <BattleScreen
          team={team}
          activeSoulIndex={activeSoulIndex}
          rivalSoul={rivalSoul}
          bag={bag}
          onSwitchSoul={idx => setActiveSoulIndex(idx)}
          onUseBagItem={handleUseBagItem}
          onVictory={handleBattleVictory}
          onDefeat={handleBattleDefeat}
          onFlee={handleBattleFlee}
          initialMessage={battleIntroText}
        />
      )}
    </div>
  );
}
