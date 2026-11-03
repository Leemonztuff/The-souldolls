import React, { useState, useEffect } from 'react';
import { GameState, SoulDoll, InventoryItem, GrassPatch } from '../types';
import { Minimap } from './Minimap';
import { FountainData } from '../world/worldGen';
// lucide-react replaced with emojis for debugging
import { audioManager } from '../audio/audioManager';

interface GameHUDProps {
  gameState: GameState;
  soulsCollected: number;
  totalSouls: number;
  isDay: boolean;
  autoCycle: boolean;
  hp: number;
  maxHp: number;
  gold: number;
  inventory: InventoryItem[];
  activeDialogue: { name: string; text: string } | null;
  questState: 'none' | 'active' | 'completed';
  onStart: () => void;
  onRestart: () => void;
  onToggleAudio: () => boolean;
  lastCollectedSoul: SoulDoll | null;
  allSouls: SoulDoll[];
  playerPosAndRot?: { x: number; z: number; rotation: number };
  lakeCenter?: { x: number; z: number };
  grassPatches?: GrassPatch[];
  discoveredGrass?: number[];
  fountains?: FountainData[];
  onOpenLuminadex?: () => void;
  onTriggerCombatDemo?: () => void;
  onVirtualKey?: (code: string, isDown: boolean) => void;
  onTriggerInteract?: () => void;
  onTriggerAttack?: () => void;
  onToggleSprint?: () => void;
  isSprinting?: boolean;
  onRespawn?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  soulsCollected,
  totalSouls,
  isDay,
  autoCycle,
  hp,
  maxHp,
  gold,
  inventory,
  activeDialogue,
  questState,
  onStart,
  onRestart,
  onToggleAudio,
  lastCollectedSoul,
  allSouls,
  playerPosAndRot = { x: 0, z: 0, rotation: 0 },
  lakeCenter = { x: 100, z: -80 },
  grassPatches = [],
  discoveredGrass = [],
  fountains = [
    { x: -64, z: -62, radius: 3.5 },
    { x: 82, z: 8, radius: 3.5 },
    { x: 8, z: 72, radius: 3.5 },
  ],
  onOpenLuminadex,
  onTriggerCombatDemo,
  onVirtualKey,
  onTriggerInteract,
  onTriggerAttack,
  onToggleSprint,
  isSprinting = false,
  onRespawn,
}) => {
  const [showControlsHint, setShowControlsHint] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showInventory, setShowInventory] = useState(false);
  const [notification, setNotification] = useState<SoulDoll | null>(null);
  const [fadingOut, setFadingOut] = useState(false);

  // Typewriter effect state for dialogue
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControlsHint(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (lastCollectedSoul) {
      setNotification(lastCollectedSoul);
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastCollectedSoul]);

  // Inventory and Luminadex toggle via keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'KeyI' && !activeDialogue) {
        setShowInventory(prev => !prev);
      }
      if (e.code === 'KeyJ' && !activeDialogue && onOpenLuminadex) {
        onOpenLuminadex();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeDialogue, onOpenLuminadex]);

  // Typewriter effect with typewriter blip audio
  useEffect(() => {
    if (!activeDialogue) {
      setDisplayedText('');
      return;
    }
    let i = 0;
    setDisplayedText('');
    const fullText = activeDialogue.text;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(prev => prev + fullText.charAt(i));
        if (i % 2 === 0) {
          audioManager.playTextBlip();
        }
        i++;
      } else {
        clearInterval(interval);
      }
    }, 22);
    return () => clearInterval(interval);
  }, [activeDialogue]);

  const handleStartClick = () => {
    setFadingOut(true);
    setTimeout(() => {
      onStart();
    }, 600);
  };

  const handleAudioClick = () => {
    const res = onToggleAudio();
    setAudioEnabled(res);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden font-pixel select-none">
      
      {/* TITLE SCREEN */}
      {gameState === 'title' && (
        <div
          className={`absolute inset-0 pointer-events-auto bg-[#0b1026]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 transition-opacity duration-600 ${
            fadingOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            <div className="flex justify-center mb-2">
              <span className="text-5xl animate-pulse">✨</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-black tracking-widest text-[#E8B84A] drop-shadow-[0_4px_16px_rgba(232,184,74,0.5)]">
                SOULDOLLS
              </h1>
              <p className="text-[#5FE3D2] text-[10px] md:text-xs tracking-widest uppercase">
                2.5D RPG · Coleccionismo de Almas & Combate por Turnos
              </p>
            </div>

            <p className="text-[#F2E6C9] text-xs md:text-sm max-w-md mx-auto leading-relaxed">
              Explora las aldeas, habla con sus habitantes (E), bendice a tu equipo en las Fuentes Sagradas y descubre las almas salvajes en la hierba alta.
            </p>

            <div className="pt-4 flex flex-col items-center justify-center gap-4">
              <button
                onClick={handleStartClick}
                className="px-6 py-3.5 bg-[#E8B84A] hover:bg-[#f6c860] border-2 border-[#8A6A3B] text-[#14101C] font-bold shadow-lg shadow-amber-500/25 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto text-xs tracking-wider animate-bounce rounded-sm"
              >
                ▶️
                Pulsa cualquier tecla para empezar
              </button>
            </div>

            <div className="pt-6 border-t border-[#2A1F2D] text-[9px] text-[#8A6A3B] space-y-1">
              <p>WASD: Mover · E: Hablar / Fuente / Cofre · J: Luminadex · I: Mochila · B: Combate</p>
            </div>
          </div>
        </div>
      )}

      {/* TOP STATUS BAR */}
      {gameState === 'playing' && (
        <div className="p-2 sm:p-3 md:p-5 flex items-start justify-between w-full z-20">
          
          {/* TOP-LEFT: Health, Gold, Soul Count */}
          <div className="flex flex-col gap-1.5 sm:gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Soul Count */}
              <div className="pointer-events-auto bg-[#14101C]/90 border border-[#8A6A3B] rounded-xs px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg flex items-center gap-1.5 sm:gap-2 text-[#5FE3D2]">
                <span className="text-sm animate-spin" style={{ animationDuration: '6s' }}>✨</span>
                <div>
                  <div className="text-[7px] sm:text-[8px] uppercase tracking-wider text-[#5FE3D2]/80">Almas</div>
                  <div className="text-xs sm:text-sm font-bold tabular-nums text-[#F2E6C9]">
                    {soulsCollected} <span className="text-[#5FE3D2]/60 text-[8px] sm:text-[9px]">/ {totalSouls}</span>
                  </div>
                </div>
              </div>

              {/* Gold Counter */}
              <div className="pointer-events-auto bg-[#14101C]/90 border border-[#8A6A3B] rounded-xs px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg flex items-center gap-1.5 sm:gap-2 text-[#E8B84A]">
                <span className="text-sm">💰</span>
                <div>
                  <div className="text-[7px] sm:text-[8px] uppercase tracking-wider text-[#E8B84A]/80">Oro</div>
                  <div className="text-xs sm:text-sm font-bold tabular-nums text-[#F2E6C9]">{gold}</div>
                </div>
              </div>
            </div>

            {/* Health Bar */}
            <div className="pointer-events-auto bg-[#14101C]/90 border border-[#8A6A3B] rounded-xs px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg flex items-center gap-1.5 sm:gap-2.5 w-36 sm:w-44">
              <span className="text-sm text-[#ef4444]">❤️</span>
              <div className="flex-1">
                <div className="flex justify-between text-[7px] sm:text-[8px] text-[#F2E6C9] mb-0.5 sm:mb-1">
                  <span>HP</span>
                  <span>{hp}/{maxHp}</span>
                </div>
                <div className="w-full bg-[#2A1F2D] h-1.5 sm:h-2 rounded-xs overflow-hidden border border-[#8A6A3B]/40">
                  <div
                    className="bg-[#22c55e] h-full transition-all duration-300"
                    style={{ width: `${(hp / maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TOP-RIGHT: Circular Minimap, Day/Night toggle, Luminadex, Inventory, Audio */}
          <div className="flex items-start gap-1.5 sm:gap-3">
            <div className="flex flex-col items-end gap-1.5 sm:gap-2">
              {/* Circular Minimap */}
              <Minimap
                playerPos={playerPosAndRot}
                lakeCenter={lakeCenter}
                grassPatches={grassPatches}
                discoveredGrassIndexes={discoveredGrass}
                fountains={fountains}
              />

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="pointer-events-auto bg-[#14101C]/90 border border-[#8A6A3B] rounded-xs px-2 py-0.5 sm:px-2.5 sm:py-1 shadow-lg flex items-center gap-1 text-[#F2E6C9] text-[8px] sm:text-[9px]">
                  {isDay ? <span>☀️</span> : <span>🌙</span>}
                  <span>{isDay ? 'DÍA' : 'NOCHE'}</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
              {onTriggerCombatDemo && (
                <button
                  onClick={onTriggerCombatDemo}
                  className="bg-[#2A1F2D] hover:bg-[#3d2c41] border border-[#9B6BFF] px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xs text-[#9B6BFF] shadow-lg flex items-center justify-center gap-0.5 transition cursor-pointer text-[8px] sm:text-[9px] font-bold animate-pulse"
                  title="Combate por Turnos [B]"
                >
                  ⚔️ VS
                </button>
              )}
              {onOpenLuminadex && (
                <button
                  onClick={onOpenLuminadex}
                  className="bg-[#14101C] hover:bg-[#2A1F2D] border border-[#E8B84A] p-1.5 sm:p-2 rounded-xs text-[#E8B84A] shadow-lg flex items-center justify-center transition cursor-pointer"
                  title="Luminadex [J]"
                >
                  📖
                </button>
              )}
              <button
                onClick={() => setShowInventory(true)}
                className="bg-[#14101C] hover:bg-[#2A1F2D] border border-[#8A6A3B] p-1.5 sm:p-2 rounded-xs text-[#F2E6C9] shadow-lg flex items-center justify-center transition cursor-pointer text-[8px] sm:text-[9px] font-bold text-[#5FE3D2]"
                title="Mochila / Inventario [I]"
              >
                INV
              </button>
              <button
                onClick={handleAudioClick}
                className="bg-[#14101C] hover:bg-[#2A1F2D] border border-[#8A6A3B] p-1.5 sm:p-2 rounded-xs text-[#F2E6C9] shadow-lg transition cursor-pointer"
                title="Audio [M]"
              >
                {audioEnabled ? <span>🔊</span> : <span>🔇</span>}
              </button>
              {onRespawn && (
                <button
                  onClick={onRespawn}
                  className="bg-[#14101C] hover:bg-[#2A1F2D] border border-[#ef4444] p-1.5 sm:p-2 rounded-xs text-[#ef4444] shadow-lg flex items-center justify-center transition cursor-pointer text-[8px] sm:text-[9px] font-bold"
                  title="Desatascar / Teletransportar a Villa Marioneta"
                >
                  🔄
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RPG DIALOGUE BOX WITH COMBAT PIXEL FRAME */}
      {activeDialogue && (
        <div
          onClick={onTriggerInteract}
          className="absolute bottom-20 md:bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-auto max-w-xl w-[92vw] px-2 sm:px-4 z-40 animate-fade-in select-none cursor-pointer"
        >
          <div className="relative pixel-frame p-3.5 sm:p-4 md:p-5 text-left space-y-2 bg-[#14101C] shadow-[0_0_25px_rgba(0,0,0,0.95)]">
            <div className="pixel-corner-tl" />
            <div className="pixel-corner-tr" />
            <div className="pixel-corner-bl" />
            <div className="pixel-corner-br" />

            <div className="flex items-center justify-between border-b border-[#8A6A3B]/60 pb-1.5 sm:pb-2">
              <span className="text-[10px] md:text-[11px] font-bold text-[#E8B84A] tracking-wider uppercase">
                {activeDialogue.name}
              </span>
              <span className="text-[8px] text-[#5FE3D2] animate-pulse">
                [TOCAR / E] CONTINUAR ▼
              </span>
            </div>
            <p className="text-[#F2E6C9] text-xs sm:text-sm leading-relaxed min-h-[44px] tracking-tight">
              {displayedText}
            </p>
          </div>
        </div>
      )}

      {/* MOBILE TOUCH CONTROLS (8-DIRECTIONAL VIRTUAL D-PAD & ACTION BUTTONS) */}
      {gameState === 'playing' && !activeDialogue && !showInventory && (
        <div className="fixed bottom-4 inset-x-3 pointer-events-none z-30 flex items-end justify-between select-none md:hidden pb-6 sm:pb-3">
          {/* 8-Directional Virtual D-Pad */}
          <div className="relative w-36 h-36 pointer-events-auto">
            {/* Center Hub */}
            <div className="absolute top-12 left-12 w-12 h-12 bg-[#14101C]/85 border border-[#8A6A3B]/60 rounded-xs flex items-center justify-center shadow-inner">
              <div className="w-3.5 h-3.5 bg-[#8A6A3B]/50 rounded-full" />
            </div>

            {/* UP */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onVirtualKey?.('KeyW', true); }}
              onPointerUp={(e) => { e.preventDefault(); onVirtualKey?.('KeyW', false); }}
              onPointerCancel={(e) => { e.preventDefault(); onVirtualKey?.('KeyW', false); }}
              className="absolute top-0 left-12 w-12 h-12 bg-[#14101C]/90 active:bg-[#E8B84A]/30 border-2 border-[#8A6A3B] active:border-[#E8B84A] rounded-t-sm flex items-center justify-center text-[#F2E6C9] active:text-[#E8B84A] text-xs shadow-md transition-all touch-none"
            >
              ▲
            </button>

            {/* DOWN */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onVirtualKey?.('KeyS', true); }}
              onPointerUp={(e) => { e.preventDefault(); onVirtualKey?.('KeyS', false); }}
              onPointerCancel={(e) => { e.preventDefault(); onVirtualKey?.('KeyS', false); }}
              className="absolute bottom-0 left-12 w-12 h-12 bg-[#14101C]/90 active:bg-[#E8B84A]/30 border-2 border-[#8A6A3B] active:border-[#E8B84A] rounded-b-sm flex items-center justify-center text-[#F2E6C9] active:text-[#E8B84A] text-xs shadow-md transition-all touch-none"
            >
              ▼
            </button>

            {/* LEFT */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onVirtualKey?.('KeyA', true); }}
              onPointerUp={(e) => { e.preventDefault(); onVirtualKey?.('KeyA', false); }}
              onPointerCancel={(e) => { e.preventDefault(); onVirtualKey?.('KeyA', false); }}
              className="absolute top-12 left-0 w-12 h-12 bg-[#14101C]/90 active:bg-[#E8B84A]/30 border-2 border-[#8A6A3B] active:border-[#E8B84A] rounded-l-sm flex items-center justify-center text-[#F2E6C9] active:text-[#E8B84A] text-xs shadow-md transition-all touch-none"
            >
              ◀
            </button>

            {/* RIGHT */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onVirtualKey?.('KeyD', true); }}
              onPointerUp={(e) => { e.preventDefault(); onVirtualKey?.('KeyD', false); }}
              onPointerCancel={(e) => { e.preventDefault(); onVirtualKey?.('KeyD', false); }}
              className="absolute top-12 right-0 w-12 h-12 bg-[#14101C]/90 active:bg-[#E8B84A]/30 border-2 border-[#8A6A3B] active:border-[#E8B84A] rounded-r-sm flex items-center justify-center text-[#F2E6C9] active:text-[#E8B84A] text-xs shadow-md transition-all touch-none"
            >
              ▶
            </button>

            {/* TOP-LEFT DIAGONAL */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyW', true);
                onVirtualKey?.('KeyA', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyW', false);
                onVirtualKey?.('KeyA', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyW', false);
                onVirtualKey?.('KeyA', false);
              }}
              className="absolute top-0 left-0 w-12 h-12 bg-[#14101C]/75 active:bg-[#E8B84A]/25 border border-[#8A6A3B]/50 active:border-[#E8B84A] rounded-tl-sm flex items-center justify-center text-[#F2E6C9]/60 active:text-[#E8B84A] text-[9px] shadow-sm transition-all touch-none"
            >
              ↖
            </button>

            {/* TOP-RIGHT DIAGONAL */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyW', true);
                onVirtualKey?.('KeyD', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyW', false);
                onVirtualKey?.('KeyD', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyW', false);
                onVirtualKey?.('KeyD', false);
              }}
              className="absolute top-0 right-0 w-12 h-12 bg-[#14101C]/75 active:bg-[#E8B84A]/25 border border-[#8A6A3B]/50 active:border-[#E8B84A] rounded-tr-sm flex items-center justify-center text-[#F2E6C9]/60 active:text-[#E8B84A] text-[9px] shadow-sm transition-all touch-none"
            >
              ↗
            </button>

            {/* BOTTOM-LEFT DIAGONAL */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyS', true);
                onVirtualKey?.('KeyA', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyS', false);
                onVirtualKey?.('KeyA', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyS', false);
                onVirtualKey?.('KeyA', false);
              }}
              className="absolute bottom-0 left-0 w-12 h-12 bg-[#14101C]/75 active:bg-[#E8B84A]/25 border border-[#8A6A3B]/50 active:border-[#E8B84A] rounded-bl-sm flex items-center justify-center text-[#F2E6C9]/60 active:text-[#E8B84A] text-[9px] shadow-sm transition-all touch-none"
            >
              ↙
            </button>

            {/* BOTTOM-RIGHT DIAGONAL */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyS', true);
                onVirtualKey?.('KeyD', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyS', false);
                onVirtualKey?.('KeyD', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onVirtualKey?.('KeyS', false);
                onVirtualKey?.('KeyD', false);
              }}
              className="absolute bottom-0 right-0 w-12 h-12 bg-[#14101C]/75 active:bg-[#E8B84A]/25 border border-[#8A6A3B]/50 active:border-[#E8B84A] rounded-br-sm flex items-center justify-center text-[#F2E6C9]/60 active:text-[#E8B84A] text-[9px] shadow-sm transition-all touch-none"
            >
              ↘
            </button>
          </div>

          {/* Action Buttons: [⚡ CORRER], [E] Interact & [ATK] Axe */}
          <div className="flex flex-col gap-2 pointer-events-auto items-end">
            {/* SPRINT BUTTON */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onToggleSprint?.(); }}
              className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer touch-none transition-all shadow-md ${
                isSprinting
                  ? 'bg-[#facc15]/30 border-[#facc15] text-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-105'
                  : 'bg-[#14101C]/90 border-[#8A6A3B] text-[#F2E6C9]/80 active:bg-[#facc15]/20'
              }`}
            >
              <span className="text-xs">⚡</span>
              <span className="text-[5px] tracking-tighter font-bold">CORRER</span>
            </button>

            {/* [E] INTERACT BUTTON */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onTriggerInteract?.(); }}
              className="w-13 h-13 rounded-full bg-[#14101C]/95 active:bg-[#5FE3D2]/30 border-2 border-[#5FE3D2] active:scale-95 shadow-[0_0_12px_rgba(95,227,210,0.4)] flex flex-col items-center justify-center text-[#5FE3D2] cursor-pointer touch-none transition-transform"
            >
              <span className="text-[11px] font-bold">E</span>
              <span className="text-[6px] tracking-tighter">HABLAR</span>
            </button>

            {/* [ATK] ATTACK BUTTON */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onTriggerAttack?.(); }}
              className="w-13 h-13 rounded-full bg-[#14101C]/95 active:bg-[#ef4444]/30 border-2 border-[#ef4444] active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.4)] flex flex-col items-center justify-center text-[#ef4444] cursor-pointer touch-none transition-transform"
            >
              <span className="text-sm">🪓</span>
              <span className="text-[6px] tracking-tighter">ATACAR</span>
            </button>
          </div>
        </div>
      )}

      {/* QUEST TRACKER */}
      {gameState === 'playing' && questState !== 'none' && (
        <div className="absolute top-32 sm:top-36 left-2 sm:left-3 md:left-5 pointer-events-none bg-[#14101C]/90 border border-[#8A6A3B] rounded-xs p-2.5 sm:p-3 shadow-lg max-w-[220px] sm:max-w-xs text-[8px] sm:text-[9px] text-[#F2E6C9] z-10">
          <div className="text-[#E8B84A] font-bold mb-1 flex items-center gap-1">
            <span>MISIÓN:</span>
            {questState === 'completed' ? (
              <span className="text-[#22c55e]">¡COMPLETADA!</span>
            ) : (
              <span className="text-[#5FE3D2]">ALMA DE AGUA</span>
            )}
          </div>
          <div className="text-[#F2E6C9]/90 leading-normal text-[7px] sm:text-[8px]">
            {questState === 'active'
              ? '• Captura un alma de AGUA (Aquelle o Tomoe) y habla con el Anciano Kaelen.'
              : '• ¡Completada! Las corrientes sagradas fluyen en armonía (+3 Cristales Superiores).'}
          </div>
        </div>
      )}

      {/* FLOATING SOUL COLLECTION NOTIFICATION TOAST */}
      {notification && (
        <div className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto bg-[#14101C]/95 border-2 border-[#E8B84A] rounded-xs p-3 sm:p-4 shadow-2xl flex items-center gap-3 sm:gap-4 animate-bounce z-40 max-w-sm w-[90vw] mx-2">
            <span className="text-xl">✨</span>
          <div className="flex-1 text-left">
            <div className="text-[8px] sm:text-[9px] text-[#5FE3D2]">¡Alma Rescatada!</div>
            <div className="font-bold text-[#F2E6C9] text-xs">{notification.name}</div>
            <div className="text-[8px] sm:text-[9px] text-[#8A6A3B] italic">"{notification.title}"</div>
          </div>
        </div>
      )}

      {/* CONTROLS HINT FADE OUT */}
      {gameState === 'playing' && showControlsHint && (
        <div className="absolute top-20 sm:top-24 left-1/2 transform -translate-x-1/2 pointer-events-none bg-[#14101C]/80 border border-[#8A6A3B] text-[#F2E6C9] text-[8px] sm:text-[9px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xs shadow-md transition-opacity duration-1000 z-10 text-center max-w-[90vw]">
          WASD / D-Pad: Mover · SHIFT / ⚡: Correr · E: Hablar / Cofres · J: Luminadex · I: Mochila
        </div>
      )}

      {/* INVENTORY MODAL */}
      {showInventory && (
        <div className="fixed inset-0 pointer-events-auto bg-[#14101C]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="relative bg-[#14101C] border-3 border-[#E8B84A] rounded-xs max-w-md w-full max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden animate-fade-in p-3.5 sm:p-4">
            <div className="pixel-corner-tl" />
            <div className="pixel-corner-tr" />
            <div className="pixel-corner-bl" />
            <div className="pixel-corner-br" />

            <div className="border-b border-[#8A6A3B] pb-2.5 mb-2.5 flex items-center justify-between shrink-0">
              <div className="text-[11px] sm:text-xs font-bold text-[#E8B84A] tracking-wider">
                MOCHILA DEL HÉROE ({inventory.length} items)
              </div>
              <button
                onClick={() => setShowInventory(false)}
                className="text-[8px] sm:text-[9px] text-[#F2E6C9] px-2 py-1 bg-[#2A1F2D] border border-[#8A6A3B] rounded-xs cursor-pointer"
              >
                [X] CERRAR
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {inventory.length === 0 ? (
                <div className="text-center py-8 text-[#8A6A3B] text-[8px] sm:text-[9px]">
                  Mochila vacía. Abre cofres en las aldeas y el lago para conseguir objetos.
                </div>
              ) : (
                inventory.map(item => (
                  <div key={item.id} className="p-2 sm:p-2.5 bg-[#2A1F2D]/60 border border-[#8A6A3B]/60 rounded-xs flex items-center gap-2.5 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#14101C] border border-[#8A6A3B] rounded-xs flex items-center justify-center text-xs">
                      📦
                    </div>
                    <div className="flex-1 text-[8px] sm:text-[9px]">
                      <div className="font-bold text-[#F2E6C9]">{item.name}</div>
                      <div className="text-[#5FE3D2]">{item.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
