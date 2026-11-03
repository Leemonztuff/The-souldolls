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
  onOpenSoulBag?: (tab?: 'team' | 'bag' | 'box') => void;
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
  onOpenSoulBag,
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

  // Inventory, Team, and Luminadex toggle via keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'KeyI' && !activeDialogue) {
        onOpenSoulBag?.('bag');
      } else if (e.code === 'KeyU' && !activeDialogue) {
        onOpenSoulBag?.('team');
      } else if (e.code === 'KeyJ' && !activeDialogue && onOpenLuminadex) {
        onOpenLuminadex();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeDialogue, onOpenLuminadex, onOpenSoulBag]);

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
      
      {/* TITLE SCREEN (Unslop Retro Grimoire Aesthetic) */}
      {gameState === 'title' && (
        <div
          className={`absolute inset-0 pointer-events-auto bg-[#07050d]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 transition-opacity duration-600 ${
            fadingOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="max-w-xl mx-auto space-y-6 animate-fade-in border-2 border-[#b4862a] bg-[#110c1f] p-6 sm:p-8 rounded-xs shadow-[0_0_50px_rgba(0,0,0,0.95)] relative">
            {/* Runic Corners */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />

            <div className="space-y-2">
              <div className="text-[10px] text-[#fbbf24] tracking-widest uppercase">
                ✦ CRÓNICAS DE LUMINATI ✦
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-widest text-[#fbbf24] drop-shadow-[0_4px_16px_rgba(251,191,36,0.4)]">
                SOULDOLLS
              </h1>
              <p className="text-[#38bdf8] text-[9px] sm:text-[10px] tracking-widest uppercase">
                2.5D Pixel-Art RPG · Coleccionismo de Almas & Combate Táctico
              </p>
            </div>

            <p className="text-[#cbd5e1] text-xs leading-relaxed max-w-md mx-auto">
              Explora aldeas místicas, habla con sus habitantes (E), purifica las almas en las Fuentes Sagradas y descubre espíritus salvajes en la hierba alta.
            </p>

            <div className="pt-2 flex flex-col items-center justify-center gap-2">
              <button
                onClick={handleStartClick}
                className="px-6 py-3 bg-[#24173d] hover:bg-[#342257] border-2 border-[#fbbf24] text-[#fef08a] font-bold shadow-[0_0_16px_rgba(251,191,36,0.35)] flex items-center gap-2.5 transition active:scale-95 cursor-pointer pointer-events-auto text-xs tracking-wider rounded-xs"
              >
                <span>⚔️</span>
                <span>PULSA PARA COMENZAR</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#2b1f40] text-[8px] text-[#94a3b8] flex flex-wrap justify-center gap-3">
              <span>WASD: Mover</span>
              <span>·</span>
              <span>E: Hablar / Cofres</span>
              <span>·</span>
              <span>U: Escuadrón</span>
              <span>·</span>
              <span>I: Bolsa</span>
              <span>·</span>
              <span>J: Luminadex</span>
              <span>·</span>
              <span>B: Combate</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP STATUS BAR (Zero-Pill Grounded RPG Header) */}
      {gameState === 'playing' && (
        <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between w-full z-20">
          
          {/* TOP-LEFT: Health, Gold, Soul Count */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Soul Count */}
              <div className="pointer-events-auto bg-[#0e091c]/95 border border-[#2b1f40] rounded-xs px-2 sm:px-2.5 py-1 shadow-lg flex items-center gap-1.5 text-[#38bdf8]">
                <span className="text-xs">🔮</span>
                <div>
                  <div className="text-[7px] uppercase tracking-wider text-[#94a3b8]">Almas</div>
                  <div className="text-[10px] sm:text-xs font-bold tabular-nums text-[#fdf6e2]">
                    {soulsCollected} <span className="text-[#64748b] text-[8px]">/ {totalSouls}</span>
                  </div>
                </div>
              </div>

              {/* Gold Counter */}
              <div className="pointer-events-auto bg-[#0e091c]/95 border border-[#2b1f40] rounded-xs px-2 sm:px-2.5 py-1 shadow-lg flex items-center gap-1.5 text-[#fbbf24]">
                <span className="text-xs">💰</span>
                <div>
                  <div className="text-[7px] uppercase tracking-wider text-[#94a3b8]">Oro</div>
                  <div className="text-[10px] sm:text-xs font-bold tabular-nums text-[#fdf6e2]">{gold}</div>
                </div>
              </div>
            </div>

            {/* Health Bar */}
            <div className="pointer-events-auto bg-[#0e091c]/95 border border-[#2b1f40] rounded-xs px-2 sm:px-2.5 py-1 shadow-lg flex items-center gap-2 w-36 sm:w-44">
              <span className="text-xs text-[#ef4444]">❤️</span>
              <div className="flex-1">
                <div className="flex justify-between text-[7px] sm:text-[8px] text-[#cbd5e1] mb-0.5">
                  <span>HP</span>
                  <span className="font-bold">{hp}/{maxHp}</span>
                </div>
                <div className="w-full bg-[#07050d] h-1.5 rounded-xs overflow-hidden border border-[#2b1f40]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hp / maxHp > 0.5 ? 'bg-[#22c55e]' : hp / maxHp > 0.2 ? 'bg-[#eab308]' : 'bg-[#ef4444]'
                    }`}
                    style={{ width: `${(hp / maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TOP-RIGHT: Circular Minimap, Day/Night toggle, Luminadex, Inventory, Audio */}
          <div className="flex items-start gap-1.5 sm:gap-2.5">
            <div className="flex flex-col items-end gap-1.5">
              {/* Circular Minimap */}
              <Minimap
                playerPos={playerPosAndRot}
                lakeCenter={lakeCenter}
                grassPatches={grassPatches}
                discoveredGrassIndexes={discoveredGrass}
                fountains={fountains}
              />

              <div className="flex items-center gap-1">
                <div className="pointer-events-auto bg-[#0e091c]/95 border border-[#2b1f40] rounded-xs px-2 py-0.5 shadow-md flex items-center gap-1 text-[#fdf6e2] text-[7px] sm:text-[8px]">
                  <span>{isDay ? '☀️' : '🌙'}</span>
                  <span className="font-bold">{isDay ? 'DÍA' : 'NOCHE'}</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (Clean RPG Navigation) */}
            <div className="flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
              {onTriggerCombatDemo && (
                <button
                  onClick={onTriggerCombatDemo}
                  className="bg-[#2A1F2D] hover:bg-[#3d2c41] border border-[#9B6BFF] px-2 py-1 sm:py-1.5 rounded-xs text-[#9B6BFF] shadow-lg flex items-center justify-center gap-1 transition cursor-pointer text-[8px] sm:text-[9px] font-bold"
                  title="Combate por Turnos [B]"
                >
                  ⚔️ VS
                </button>
              )}
              {onOpenSoulBag && (
                <button
                  onClick={() => onOpenSoulBag('team')}
                  className="bg-[#14101C] hover:bg-[#2A1F2D] border border-[#b4862a] px-2 py-1 sm:py-1.5 rounded-xs text-[#fbbf24] shadow-lg flex items-center justify-center gap-1 transition cursor-pointer text-[8px] sm:text-[9px] font-bold"
                  title="Equipo de Almas [U]"
                >
                  👥 ALMAS
                </button>
              )}
              {onOpenSoulBag && (
                <button
                  onClick={() => onOpenSoulBag('bag')}
                  className="bg-[#14101C] hover:bg-[#2A1F2D] border border-[#8A6A3B] px-2 py-1 sm:py-1.5 rounded-xs text-[#5FE3D2] shadow-lg flex items-center justify-center gap-1 transition cursor-pointer text-[8px] sm:text-[9px] font-bold"
                  title="Mochila / Suministros [I]"
                >
                  🎒 BOLSA
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
      {gameState === 'playing' && !activeDialogue && (
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

          {/* Action Buttons: [⚡ CORRER], [E] Interact & [ATK] Attack (Tactical Gamepad) */}
          <div className="flex flex-col gap-2 pointer-events-auto items-end">
            {/* SPRINT BUTTON */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onToggleSprint?.(); }}
              className={`w-12 h-12 rounded-xs border-2 flex flex-col items-center justify-center cursor-pointer touch-none transition-all shadow-md ${
                isSprinting
                  ? 'bg-[#2b1f40] border-[#facc15] text-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.5)] scale-105'
                  : 'bg-[#0e091c]/95 border-[#3b2a5a] text-[#cbd5e1]'
              }`}
            >
              <span className="text-xs">⚡</span>
              <span className="text-[6px] tracking-tight font-bold">CORRER</span>
            </button>

            {/* [E] INTERACT BUTTON */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onTriggerInteract?.(); }}
              className="w-13 h-13 rounded-xs bg-[#0e091c]/95 active:bg-[#164e63] border-2 border-[#38bdf8] active:scale-95 shadow-[0_0_12px_rgba(56,189,248,0.35)] flex flex-col items-center justify-center text-[#38bdf8] cursor-pointer touch-none transition-transform"
            >
              <span className="text-[12px] font-bold">E</span>
              <span className="text-[6px] tracking-tight">HABLAR</span>
            </button>

            {/* [ATK] ATTACK BUTTON */}
            <button
              onPointerDown={(e) => { e.preventDefault(); onTriggerAttack?.(); }}
              className="w-13 h-13 rounded-xs bg-[#0e091c]/95 active:bg-[#4c0519] border-2 border-[#f87171] active:scale-95 shadow-[0_0_12px_rgba(248,113,113,0.35)] flex flex-col items-center justify-center text-[#f87171] cursor-pointer touch-none transition-transform"
            >
              <span className="text-sm">🪓</span>
              <span className="text-[6px] tracking-tight">ATACAR</span>
            </button>
          </div>
        </div>
      )}

      {/* QUEST TRACKER (Grimoire Scroll Aesthetic) */}
      {gameState === 'playing' && questState !== 'none' && (
        <div className="absolute top-28 sm:top-32 left-2 sm:left-3 md:left-4 pointer-events-none bg-[#0e091c]/95 border-2 border-[#b4862a] rounded-xs p-2.5 sm:p-3 shadow-2xl max-w-[220px] sm:max-w-xs text-[8px] sm:text-[9px] text-[#fdf6e2] z-10">
          <div className="flex items-center justify-between border-b border-[#2b1f40] pb-1 mb-1.5">
            <span className="text-[#fbbf24] font-bold tracking-wider uppercase flex items-center gap-1">
              <span>📜</span>
              <span>MISIÓN PRINCIPAL</span>
            </span>
            {questState === 'completed' ? (
              <span className="text-[#4ade80] text-[7px] font-bold">✓ PURIFICADA</span>
            ) : (
              <span className="text-[#38bdf8] text-[7px] font-bold">EN CURSO</span>
            )}
          </div>
          <div className="text-[#cbd5e1] leading-relaxed text-[7px] sm:text-[8px]">
            {questState === 'active'
              ? 'Captura un alma de AGUA (Aquelle o Tomoe) en las corrientes sagradas y habla con el Anciano Kaelen.'
              : '¡Completada! Las aguas sagradas fluyen purificadas (+3 Cristales Superiores).'}
          </div>
        </div>
      )}

      {/* SOUL COLLECTION NOTIFICATION TOAST (Clean Trophy Card) */}
      {notification && (
        <div className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto bg-[#110c1f]/95 border-2 border-[#fbbf24] rounded-xs p-3 sm:p-4 shadow-[0_0_30px_rgba(0,0,0,0.95)] flex items-center gap-3 animate-fade-in z-40 max-w-sm w-[90vw] mx-2">
          <div className="w-10 h-10 bg-[#07050d] border border-[#fbbf24] rounded-xs flex items-center justify-center text-xl shrink-0">
            🔮
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[7px] text-[#fbbf24] font-bold uppercase tracking-wider">¡Esencia de Alma Rescatada!</div>
            <div className="font-bold text-[#fef3c7] text-xs truncate">{notification.name}</div>
            <div className="text-[8px] text-[#94a3b8] italic truncate">"{notification.title}"</div>
          </div>
        </div>
      )}

      {/* CONTROLS HINT FADE OUT */}
      {gameState === 'playing' && showControlsHint && (
        <div className="absolute top-20 sm:top-24 left-1/2 transform -translate-x-1/2 pointer-events-none bg-[#14101C]/80 border border-[#8A6A3B] text-[#F2E6C9] text-[8px] sm:text-[9px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xs shadow-md transition-opacity duration-1000 z-10 text-center max-w-[90vw]">
          WASD / D-Pad: Mover · SHIFT / ⚡: Correr · E: Hablar / Cofres · U: Almas · I: Bolsa · J: Luminadex
        </div>
      )}
    </div>
  );
};
