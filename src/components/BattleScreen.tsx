/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import seedrandom from 'seedrandom';
import { BattleSoul, BattleMove, SoulType, BagItem, ItemId } from '../types';
import { TYPE_COLORS, BASIC_STRUGGLE_MOVE, checkNewMoveOnLevelUp } from '../data/mobs';
import {
  calculateDamage,
  calculateExpGain,
  calculateCatchRate,
  chooseRivalMove,
  determineTurnOrder,
  attemptFlee,
} from '../battle/battleRules';
import { audioManager } from '../audio/audioManager';
import { vfxEngine } from '../core/vfxEngine';
import { shaderAttackEngine, ShaderAttackType } from '../core/shaderAttackVFX';
import { ShaderAttackCanvas } from './ShaderAttackCanvas';

// Finite State Machine Phases
export type BattlePhase =
  | 'INTRO'
  | 'IDLE' // Interactive menu (moves, bag, team, main)
  | 'PLAYER_ATTACK_ANIM'
  | 'PLAYER_ATTACK_IMPACT'
  | 'RIVAL_ATTACK_ANIM'
  | 'RIVAL_ATTACK_IMPACT'
  | 'ITEM_USE'
  | 'CAPTURE_SEQUENCE'
  | 'FLEE_ATTEMPT'
  | 'SWITCHING_SOUL'
  | 'PLAYER_FAINT'
  | 'RIVAL_FAINT'
  | 'VICTORY_EXP'
  | 'VICTORY_LEVELUP'
  | 'VICTORY_LEARN_MOVE'
  | 'BATTLE_END';

interface BattleScreenProps {
  team: BattleSoul[];
  activeSoulIndex: number;
  rivalSoul: BattleSoul;
  bag: BagItem[];
  onSwitchSoul: (newIndex: number) => void;
  onUseBagItem: (itemId: ItemId) => void;
  onVictory: (expGained: number, goldGained: number, captured?: boolean, capturedSoul?: BattleSoul) => void;
  onDefeat: () => void;
  onFlee: () => void;
  initialMessage?: string;
}

// ===================================================
// UNIFIED ELEMENTAL HIT ANIMATIONS & INDICATORS SYSTEM
// ===================================================
export interface ElementalAnimationConfig {
  keyframeClass: string;
  glowColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeGlow: string;
  badgeText: string;
  icon: string;
}

export const ELEMENTAL_HIT_CONFIGS: Record<SoulType, ElementalAnimationConfig> = {
  Fuego: {
    keyframeClass: 'animate-hit-fuego',
    glowColor: '#ef4444',
    badgeBg: 'rgba(185, 28, 28, 0.95)',
    badgeBorder: '#f97316',
    badgeGlow: 'rgba(239, 68, 68, 0.85)',
    badgeText: '#fee2e2',
    icon: '🔥',
  },
  Agua: {
    keyframeClass: 'animate-hit-agua',
    glowColor: '#38bdf8',
    badgeBg: 'rgba(3, 105, 161, 0.95)',
    badgeBorder: '#38bdf8',
    badgeGlow: 'rgba(56, 189, 248, 0.85)',
    badgeText: '#e0f2fe',
    icon: '🌊',
  },
  Planta: {
    keyframeClass: 'animate-hit-planta',
    glowColor: '#4ade80',
    badgeBg: 'rgba(21, 128, 61, 0.95)',
    badgeBorder: '#4ade80',
    badgeGlow: 'rgba(74, 222, 128, 0.85)',
    badgeText: '#dcfce7',
    icon: '🍃',
  },
  Rayo: {
    keyframeClass: 'animate-hit-rayo',
    glowColor: '#facc15',
    badgeBg: 'rgba(161, 98, 7, 0.95)',
    badgeBorder: '#facc15',
    badgeGlow: 'rgba(250, 204, 21, 0.9)',
    badgeText: '#fef9c3',
    icon: '⚡',
  },
  Sombra: {
    keyframeClass: 'animate-hit-sombra',
    glowColor: '#a855f7',
    badgeBg: 'rgba(109, 40, 217, 0.95)',
    badgeBorder: '#c084fc',
    badgeGlow: 'rgba(192, 132, 252, 0.9)',
    badgeText: '#f3e8ff',
    icon: '🌌',
  },
  Luz: {
    keyframeClass: 'animate-hit-luz',
    glowColor: '#fbbf24',
    badgeBg: 'rgba(180, 83, 9, 0.95)',
    badgeBorder: '#fbbf24',
    badgeGlow: 'rgba(251, 191, 36, 0.9)',
    badgeText: '#fef3c7',
    icon: '✨',
  },
};

export interface ActiveHitState {
  type: SoulType;
  damage: number;
  isCrit: boolean;
  multiplier: number;
}

const ElementalImpactBadge: React.FC<ActiveHitState & { target: 'player' | 'rival' }> = ({
  type,
  damage,
  isCrit,
  multiplier,
  target,
}) => {
  const cfg = ELEMENTAL_HIT_CONFIGS[type] || ELEMENTAL_HIT_CONFIGS.Agua;
  return (
    <div
      className={`absolute z-40 pointer-events-none flex flex-col items-center animate-impact-badge ${
        target === 'rival' ? '-top-12 -right-2 sm:-right-8' : '-top-12 -left-2 sm:-left-8'
      }`}
    >
      <div
        className="px-3 py-1 rounded-full border-2 flex items-center gap-1.5 shadow-2xl backdrop-blur-xs select-none"
        style={{
          backgroundColor: cfg.badgeBg,
          borderColor: cfg.badgeBorder,
          boxShadow: `0 0 20px ${cfg.badgeGlow}`,
          color: cfg.badgeText,
        }}
      >
        <span className="text-[13px]">{cfg.icon}</span>
        <span className="text-[11px] font-pixel font-bold">-{damage}</span>
      </div>

      {isCrit && (
        <span className="text-[8px] font-pixel font-black text-amber-300 drop-shadow-[0_0_8px_#f59e0b] tracking-wider mt-0.5">
          ★ CRÍTICO ★
        </span>
      )}
      {multiplier > 1.0 && !isCrit && (
        <span className="text-[7px] font-pixel font-bold text-emerald-300 drop-shadow-[0_0_6px_#10b981] tracking-wider mt-0.5">
          ▲ EFECTIVO ▲
        </span>
      )}
      {multiplier < 1.0 && (
        <span className="text-[7px] font-pixel text-slate-300 drop-shadow-[0_0_4px_#475569] tracking-wider mt-0.5">
          ▼ DÉBIL ▼
        </span>
      )}
    </div>
  );
};

// 2.5D Elemental Battle Pedestal with runic engravings and elemental effects
interface ElementalPedestalProps {
  color: string;
  type?: SoulType;
  isRival?: boolean;
  hitType?: SoulType | null;
}

const ElementalPedestal: React.FC<ElementalPedestalProps> = ({ color, type = 'Sombra', isRival, hitType }) => {
  const getThemeDetails = (t: SoulType) => {
    switch (t) {
      case 'Fuego':
        return { glow: 'rgba(239, 68, 68, 0.75)', accent: '#f97316', particleColor: '#fca5a5' };
      case 'Agua':
        return { glow: 'rgba(56, 189, 248, 0.75)', accent: '#0284c7', particleColor: '#bae6fd' };
      case 'Planta':
        return { glow: 'rgba(74, 222, 128, 0.75)', accent: '#16a34a', particleColor: '#bbf7d0' };
      case 'Rayo':
        return { glow: 'rgba(250, 204, 21, 0.8)', accent: '#eab308', particleColor: '#fef08a' };
      case 'Sombra':
        return { glow: 'rgba(168, 85, 247, 0.8)', accent: '#7c3aed', particleColor: '#e9d5ff' };
      case 'Luz':
      default:
        return { glow: 'rgba(251, 191, 36, 0.8)', accent: '#d97706', particleColor: '#fef3c7' };
    }
  };

  const theme = getThemeDetails(type);
  const hitGlow = hitType ? (ELEMENTAL_HIT_CONFIGS[hitType]?.glowColor || null) : null;

  return (
    <div
      className={`relative w-36 h-11 sm:w-44 sm:h-13 pointer-events-none flex items-center justify-center select-none transition-all duration-300 ${
        hitType ? 'scale-105' : ''
      }`}
      style={{
        filter: hitGlow ? `drop-shadow(0 0 16px ${hitGlow})` : undefined,
      }}
    >
      <div
        className="absolute w-[94%] h-5 rounded-full bg-black/75 blur-[2.5px]"
        style={{ transform: 'translateY(12px) scaleY(0.5)' }}
      />
      <div
        className="absolute w-[86%] h-6 rounded-full blur-[6px] opacity-75 animate-pulse-glow"
        style={{
          backgroundColor: hitGlow || theme.glow,
          transform: 'translateY(8px) scaleY(0.48)',
        }}
      />
      <svg
        viewBox="0 0 180 60"
        className="absolute inset-0 w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`pedestal-rad-${isRival ? 'rival' : 'player'}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="55%" stopColor={theme.accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0d0918" stopOpacity="0.9" />
          </radialGradient>
          <filter id={`runic-glow-${isRival ? 'rival' : 'player'}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <ellipse cx="90" cy="34" rx="78" ry="20" fill="#130e22" stroke="#251c3d" strokeWidth="2" />
        <ellipse
          cx="90"
          cy="30"
          rx="78"
          ry="19"
          fill={`url(#pedestal-rad-${isRival ? 'rival' : 'player'})`}
          stroke={color}
          strokeWidth="1.8"
          filter={`url(#runic-glow-${isRival ? 'rival' : 'player'})`}
        />
        <ellipse
          cx="90"
          cy="30"
          rx="68"
          ry="15.5"
          stroke={color}
          strokeWidth="1.2"
          strokeDasharray="6 4 12 4"
          opacity="0.9"
        />
        <ellipse cx="90" cy="30" rx="52" ry="11.5" stroke={theme.accent} strokeWidth="0.9" strokeDasharray="3 3" opacity="0.8" />
        <ellipse cx="90" cy="30" rx="32" ry="7" stroke={color} strokeWidth="0.8" opacity="0.7" />
        <circle cx="90" cy="14.5" r="1.6" fill="#ffffff" opacity="0.9" />
        <circle cx="90" cy="45.5" r="1.6" fill="#ffffff" opacity="0.9" />
        <circle cx="22" cy="30" r="1.8" fill={color} opacity="0.85" />
        <circle cx="158" cy="30" r="1.8" fill={color} opacity="0.85" />
        <circle cx="90" cy="30" r="2" fill={color} opacity="0.75" />
      </svg>
      <div
        className="absolute -top-2 w-24 h-6 rounded-t-full pointer-events-none opacity-35 blur-[2px]"
        style={{ background: `linear-gradient(to top, ${color} 0%, transparent 100%)` }}
      />
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <span
          className="absolute text-[11px] animate-bounce"
          style={{
            color: '#ffffff',
            textShadow: `0 0 5px ${color}`,
            left: '20%',
            top: isRival ? '10%' : '6%',
            animationDuration: '2.1s',
          }}
        >
          ✦
        </span>
        <span
          className="absolute text-[9px] animate-bounce"
          style={{
            color: theme.particleColor,
            textShadow: `0 0 5px ${color}`,
            right: '22%',
            top: '18%',
            animationDuration: '1.7s',
          }}
        >
          ✦
        </span>
        <span
          className="absolute text-[8px] animate-bounce"
          style={{
            color: color,
            textShadow: '0 0 5px #ffffff',
            left: '52%',
            bottom: '10%',
            animationDuration: '2.5s',
          }}
        >
          +
        </span>
      </div>
    </div>
  );
};

// Soul sprite drawer from cropped spritesheet
const SoulSpriteCanvas: React.FC<{
  spritesheet: string;
  frame: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  view: 'front' | 'back';
  hitType?: SoulType | null;
  isFainting?: boolean;
  isCapturing?: boolean;
}> = ({ spritesheet, frame, hitType, isFainting, isCapturing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = spritesheet;
    img.onload = () => {
      setLoaded(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = frame.w;
      canvas.height = frame.h;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, frame.w, frame.h);
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    };
  }, [spritesheet, frame]);

  const hitAnimClass = hitType ? (ELEMENTAL_HIT_CONFIGS[hitType]?.keyframeClass || 'animate-shake') : '';

  return (
    <div
      className={`relative select-none flex items-center justify-center transition-all duration-500 ${
        hitAnimClass
      } ${isFainting ? 'opacity-0 scale-75 transition-all duration-1000' : ''} ${
        isCapturing ? 'opacity-0 scale-25 transition-all duration-700' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className="battle-sprite-canvas h-[140px] sm:h-[180px] md:h-[220px] max-h-[30vh] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
        style={{
          imageRendering: 'pixelated',
          display: loaded ? 'block' : 'none',
        }}
      />
      {!loaded && (
        <div className="w-16 h-28 sm:w-24 sm:h-44 bg-slate-900/40 animate-pulse rounded-lg flex items-center justify-center text-[8px] font-pixel text-slate-400">
          ...
        </div>
      )}
    </div>
  );
};

// Reusable Pixel Frame
const PixelBox: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`pixel-frame p-3 rounded-sm ${className}`}>
    <div className="pixel-corner-tl" />
    <div className="pixel-corner-tr" />
    <div className="pixel-corner-bl" />
    <div className="pixel-corner-br" />
    {children}
  </div>
);

// Type Pill Badge
const TypeBadge: React.FC<{ type: SoulType }> = ({ type }) => {
  const styling = TYPE_COLORS[type] || TYPE_COLORS.Agua;
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-pixel uppercase font-bold tracking-wider shadow-sm"
      style={{
        backgroundColor: styling.bg,
        color: styling.text,
        border: `1.5px solid ${styling.border}`,
        boxShadow: `0 0 6px ${styling.glow}`,
      }}
    >
      {type}
    </span>
  );
};

// Smooth Health Bar
const HealthBar: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));

  let barColor = '#22c55e'; // Green
  let barGlow = 'rgba(34, 197, 94, 0.4)';
  if (pct <= 20) {
    barColor = '#ef4444'; // Red
    barGlow = 'rgba(239, 68, 68, 0.6)';
  } else if (pct <= 50) {
    barColor = '#eab308'; // Yellow
    barGlow = 'rgba(234, 179, 8, 0.5)';
  }

  return (
    <div className="w-full bg-[#0a0714] border-2 border-[#1e1730] h-2.5 sm:h-3.5 rounded-sm p-[1px] sm:p-[1.5px] overflow-hidden shadow-inner flex items-center">
      <div
        className="h-full rounded-xs transition-all duration-600 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: barColor,
          boxShadow: `0 0 6px ${barGlow}`,
        }}
      />
    </div>
  );
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  team,
  activeSoulIndex,
  rivalSoul: initialRivalSoul,
  bag,
  onSwitchSoul,
  onUseBagItem,
  onVictory,
  onDefeat,
  onFlee,
  initialMessage,
}) => {
  // 1. SEEDED PRNG: Deterministic and reproducible random numbers
  const prngRef = useRef<() => number>(seedrandom(`${initialRivalSoul.id}-${initialRivalSoul.name}-${Date.now()}`));
  const getRandom = useCallback(() => prngRef.current(), []);

  // 2. TIMEOUT CLEANUP REGISTRY: Every single setTimeout is tracked and cleared on unmount/reset
  const timerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearAllTimers = useCallback(() => {
    timerIdsRef.current.forEach(id => clearTimeout(id));
    timerIdsRef.current.clear();
  }, []);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number) => {
    const timerId = setTimeout(() => {
      timerIdsRef.current.delete(timerId);
      fn();
    }, delayMs);
    timerIdsRef.current.add(timerId);
    return timerId;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // 3. FSM STATE
  const [phase, setPhase] = useState<BattlePhase>('INTRO');
  const [mode, setMode] = useState<'main' | 'moves' | 'bag' | 'team' | 'textOnly'>('main');

  // Turn planning ref for two-step turn resolutions
  const turnPlanRef = useRef<{
    playerMove?: BattleMove;
    rivalMove?: BattleMove;
    step: 'first' | 'second' | 'finished';
  }>({ step: 'finished' });

  // Active Souls State
  const [activeIdx, setActiveIdx] = useState(activeSoulIndex);
  const activeSoul = team[activeIdx] || team[0];
  const [rivalSoul] = useState<BattleSoul>({ ...initialRivalSoul });

  // Combat Stats
  const [playerHp, setPlayerHp] = useState(activeSoul.hp);
  const [playerExp, setPlayerExp] = useState(activeSoul.exp);
  const [rivalHp, setRivalHp] = useState(initialRivalSoul.hp);

  // Sync active soul HP changes to team
  useEffect(() => {
    activeSoul.hp = playerHp;
  }, [playerHp, activeSoul]);

  const [message, setMessage] = useState(initialMessage || `¡${rivalSoul.name} acecha en la mazmorra con mirada desafiante!`);
  const [typedMessage, setTypedMessage] = useState('');

  // Animation states
  const [rivalIntro, setRivalIntro] = useState(true);
  const [playerIntro, setPlayerIntro] = useState(true);
  const [rivalHitState, setRivalHitState] = useState<ActiveHitState | null>(null);
  const [playerHitState, setPlayerHitState] = useState<ActiveHitState | null>(null);
  const [rivalFainting, setRivalFainting] = useState(false);
  const [playerFainting, setPlayerFainting] = useState(false);
  const [flashTypeColor, setFlashTypeColor] = useState<string | null>(null);

  // Capture sequence state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureShakeStep, setCaptureShakeStep] = useState(0);

  // Button navigation indexes
  const [selectedMainIdx, setSelectedMainIdx] = useState(0);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);

  // Is UI input locked? (Unlocked only when in IDLE phase)
  const isInputLocked = phase !== 'IDLE';

  // Resolve shader attack type for 3D visual FX
  const resolveShaderForMove = useCallback((m: BattleMove): ShaderAttackType | null => {
    if (m.shaderVfx) return m.shaderVfx;
    if (m.name.includes('Volcán') || m.name.includes('Magma') || m.type === 'Fuego') return 'lava';
    if (m.name.includes('Marino') || m.name.includes('Agua') || m.type === 'Agua') return 'water';
    if (m.name.includes('Cieno') || m.name.includes('Ácida') || m.type === 'Planta') return 'slime';
    if (m.name.includes('Singularidad') || m.name.includes('Vacío') || m.type === 'Sombra') return 'blackhole';
    return null;
  }, []);

  // 4. PP VALIDATION: Check moves with PP > 0 or fallback to struggle
  const getAvailableMoves = useCallback((): BattleMove[] => {
    const hasPP = activeSoul.moves.some(m => m.pp > 0);
    if (!hasPP) {
      return [BASIC_STRUGGLE_MOVE];
    }
    return activeSoul.moves;
  }, [activeSoul]);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    setTypedMessage('');
    const full = message;
    const interval = setInterval(() => {
      if (i < full.length) {
        setTypedMessage(prev => prev + full.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [message]);

  // Battle Intro Phase Transition
  useEffect(() => {
    audioManager.playBattleStart();
    scheduleTimer(() => setRivalIntro(false), 800);
    scheduleTimer(() => {
      setPlayerIntro(false);
      setPhase('IDLE');
    }, 950);
  }, [scheduleTimer]);

  // ==========================================
  // FSM ATTACK RESOLUTION PIPELINE
  // ==========================================

  // Starts player's attack animation and sets up impact timer
  const startPlayerAttack = useCallback(
    (move: BattleMove) => {
      setPhase('PLAYER_ATTACK_ANIM');
      setMessage(`¡${activeSoul.name} usó ${move.name}!`);
      audioManager.playAttackSound(move.type);
      setFlashTypeColor(TYPE_COLORS[move.type].glow);

      const shaderType = resolveShaderForMove(move);
      const flightDuration = shaderType ? 0.75 : 0.4;

      if (shaderType) {
        shaderAttackEngine.launchAttack(
          shaderType,
          { x: 28, y: 64 },
          { x: 74, y: 32 },
          flightDuration,
          () => {
            vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.72, window.innerHeight * 0.32);
          }
        );
      } else {
        vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.72, window.innerHeight * 0.32);
      }

      scheduleTimer(() => {
        resolvePlayerAttackImpact(move);
      }, Math.floor(flightDuration * 1000));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, resolveShaderForMove, scheduleTimer]
  );

  // Computes player's damage and checks if target fainted
  const resolvePlayerAttackImpact = useCallback(
    (move: BattleMove) => {
      setPhase('PLAYER_ATTACK_IMPACT');
      const result = calculateDamage(activeSoul, rivalSoul, move, getRandom);

      if (result.missed) {
        setFlashTypeColor(null);
        setMessage(`¡El ataque de ${activeSoul.name} falló!`);
        scheduleTimer(() => advanceTurnAfterAttack('player', rivalHp), 900);
        return;
      }

      // Unified Elemental Hit Trigger
      setRivalHitState({
        type: move.type,
        damage: result.damage,
        isCrit: result.isCrit,
        multiplier: result.multiplier,
      });
      vfxEngine.triggerScreenShake(result.isCrit ? 0.45 : 0.3);

      const newHp = Math.max(0, rivalHp - result.damage);
      setRivalHp(newHp);

      scheduleTimer(() => {
        setRivalHitState(null);
        setFlashTypeColor(null);

        let extraMsg = '';
        if (result.isCrit) extraMsg += ' ¡Golpe crítico!';
        if (result.multiplier > 1.0) extraMsg += ' ¡Es muy efectivo!';
        else if (result.multiplier < 1.0 && move.power > 0) extraMsg += ' No es muy efectivo…';

        if (extraMsg) {
          setMessage(extraMsg.trim());
          scheduleTimer(() => advanceTurnAfterAttack('player', newHp), 850);
        } else {
          scheduleTimer(() => advanceTurnAfterAttack('player', newHp), 550);
        }
      }, 550);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, rivalSoul, rivalHp, getRandom, scheduleTimer]
  );

  // Starts rival's attack animation and sets up impact timer
  const startRivalAttack = useCallback(
    (move: BattleMove) => {
      setPhase('RIVAL_ATTACK_ANIM');
      setMessage(`¡${rivalSoul.name} contraataca furioso con ${move.name}!`);
      audioManager.playAttackSound(move.type);
      setFlashTypeColor(TYPE_COLORS[move.type].glow);

      const shaderType = resolveShaderForMove(move);
      const flightDuration = shaderType ? 0.75 : 0.4;

      if (shaderType) {
        shaderAttackEngine.launchAttack(
          shaderType,
          { x: 74, y: 32 },
          { x: 28, y: 64 },
          flightDuration,
          () => {
            vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.35, window.innerHeight * 0.58);
          }
        );
      } else {
        vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.35, window.innerHeight * 0.58);
      }

      scheduleTimer(() => {
        resolveRivalAttackImpact(move);
      }, Math.floor(flightDuration * 1000));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rivalSoul, resolveShaderForMove, scheduleTimer]
  );

  // Computes rival's damage and checks if target fainted
  const resolveRivalAttackImpact = useCallback(
    (move: BattleMove) => {
      setPhase('RIVAL_ATTACK_IMPACT');
      const result = calculateDamage(rivalSoul, activeSoul, move, getRandom);

      if (result.missed) {
        setFlashTypeColor(null);
        setMessage(`¡El ataque de ${rivalSoul.name} falló!`);
        scheduleTimer(() => advanceTurnAfterAttack('rival', playerHp), 900);
        return;
      }

      // Unified Elemental Hit Trigger
      setPlayerHitState({
        type: move.type,
        damage: result.damage,
        isCrit: result.isCrit,
        multiplier: result.multiplier,
      });
      vfxEngine.triggerScreenShake(result.isCrit ? 0.45 : 0.3);

      const newHp = Math.max(0, playerHp - result.damage);
      setPlayerHp(newHp);
      activeSoul.hp = newHp;

      scheduleTimer(() => {
        setPlayerHitState(null);
        setFlashTypeColor(null);

        let extraMsg = '';
        if (result.isCrit) extraMsg += ' ¡Golpe crítico del rival!';
        if (result.multiplier > 1.0) extraMsg += ' ¡Es muy efectivo!';
        else if (result.multiplier < 1.0 && move.power > 0) extraMsg += ' No es muy efectivo…';

        if (extraMsg) {
          setMessage(extraMsg.trim());
          scheduleTimer(() => advanceTurnAfterAttack('rival', newHp), 850);
        } else {
          scheduleTimer(() => advanceTurnAfterAttack('rival', newHp), 550);
        }
      }, 550);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, rivalSoul, playerHp, getRandom, scheduleTimer]
  );

  // FSM advance logic between turn steps
  const advanceTurnAfterAttack = useCallback(
    (attacker: 'player' | 'rival', targetRemainingHp: number) => {
      if (attacker === 'player') {
        if (targetRemainingHp <= 0) {
          triggerRivalFaint();
          return;
        }

        if (turnPlanRef.current.step === 'first' && turnPlanRef.current.rivalMove) {
          turnPlanRef.current.step = 'second';
          scheduleTimer(() => {
            startRivalAttack(turnPlanRef.current.rivalMove!);
          }, 600);
        } else {
          // Both actions finished
          turnPlanRef.current.step = 'finished';
          setPhase('IDLE');
          setMode('main');
        }
      } else {
        if (targetRemainingHp <= 0) {
          triggerPlayerFaint(activeIdx);
          return;
        }

        if (turnPlanRef.current.step === 'first' && turnPlanRef.current.playerMove) {
          turnPlanRef.current.step = 'second';
          scheduleTimer(() => {
            startPlayerAttack(turnPlanRef.current.playerMove!);
          }, 600);
        } else {
          // Both actions finished
          turnPlanRef.current.step = 'finished';
          setPhase('IDLE');
          setMode('main');
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIdx, scheduleTimer, startPlayerAttack, startRivalAttack]
  );

  // ==========================================
  // FAINT & ENDGAME SEQUENCES
  // ==========================================

  // Rival Defeat & EXP / Level-Up Pipeline
  const triggerRivalFaint = useCallback(() => {
    setPhase('RIVAL_FAINT');
    setRivalFainting(true);
    audioManager.playFaint();
    setMessage(`¡${rivalSoul.name} fue derrotado!`);

    scheduleTimer(() => {
      setPhase('VICTORY_EXP');
      audioManager.playVictory();
      const expReward = calculateExpGain(rivalSoul.level);
      const goldReward = 20 + rivalSoul.level * 5;

      let nextExp = playerExp + expReward;
      let nextLevel = activeSoul.level;
      let nextMaxExp = activeSoul.maxExp;
      let leveledUp = false;

      if (nextExp >= nextMaxExp) {
        leveledUp = true;
        nextLevel++;
        nextExp -= nextMaxExp;
        nextMaxExp = Math.floor(nextMaxExp * 1.3);

        activeSoul.level = nextLevel;
        activeSoul.maxExp = nextMaxExp;
        activeSoul.maxHp += 3;
        activeSoul.attack += 2;
        activeSoul.defense += 1;
        activeSoul.speed += 2;
        activeSoul.hp = Math.min(activeSoul.maxHp, activeSoul.hp + 5);
      }

      setPlayerExp(nextExp);
      activeSoul.exp = nextExp;

      setMessage(`¡${activeSoul.name} ganó ${expReward} EXP y ${goldReward} de Oro!`);

      scheduleTimer(() => {
        if (leveledUp) {
          setPhase('VICTORY_LEVELUP');
          audioManager.playLevelUp();
          setMessage(`¡${activeSoul.name} subió al nivel ${activeSoul.level}!`);

          const newMove = checkNewMoveOnLevelUp(activeSoul);
          if (newMove) {
            scheduleTimer(() => {
              setPhase('VICTORY_LEARN_MOVE');
              if (activeSoul.moves.length < 4) {
                activeSoul.moves.push(newMove);
              } else {
                activeSoul.moves[activeSoul.moves.length - 1] = newMove;
              }
              setMessage(`¡${activeSoul.name} aprendió ${newMove.name}!`);
              scheduleTimer(() => {
                setPhase('BATTLE_END');
                onVictory(expReward, goldReward, false);
              }, 2000);
            }, 1800);
          } else {
            scheduleTimer(() => {
              setPhase('BATTLE_END');
              onVictory(expReward, goldReward, false);
            }, 2000);
          }
        } else {
          setPhase('BATTLE_END');
          onVictory(expReward, goldReward, false);
        }
      }, 1600);
    }, 1200);
  }, [activeSoul, playerExp, rivalSoul, scheduleTimer, onVictory]);

  // Player Faint Sequence
  const triggerPlayerFaint = useCallback(
    (faintedIdx: number) => {
      setPhase('PLAYER_FAINT');
      setPlayerFainting(true);
      audioManager.playFaint();
      setMessage(`¡${team[faintedIdx].name} cayó debilitada!`);

      scheduleTimer(() => {
        setPlayerFainting(false);
        const aliveSouls = team.filter(s => s.hp > 0);
        if (aliveSouls.length === 0) {
          setPhase('BATTLE_END');
          setMessage('Te quedaste sin fuerzas...');
          scheduleTimer(() => {
            onDefeat();
          }, 2000);
        } else {
          setMessage('Elige otra alma para continuar el combate.');
          setPhase('IDLE');
          setMode('team');
        }
      }, 1500);
    },
    [team, scheduleTimer, onDefeat]
  );

  // ==========================================
  // USER ACTIONS: MOVE, ITEM, SWITCH, FLEE
  // ==========================================

  // Execute Player Move (Strict PP enforcement)
  const executeMove = useCallback(
    (playerMove: BattleMove) => {
      if (isInputLocked) return;

      // Strict PP validation
      if (playerMove.id !== 'struggle' && playerMove.pp <= 0) {
        audioManager.playMenuBeep();
        setMessage(`¡No quedan PP para ${playerMove.name}!`);
        return;
      }

      setMode('textOnly');

      // Deduct player PP
      if (playerMove.id !== 'struggle') {
        playerMove.pp = Math.max(0, playerMove.pp - 1);
      }

      // Choose rival move with seeded PRNG and deduct rival PP
      const rivalMove = chooseRivalMove(rivalSoul, getRandom);
      if (rivalMove.id !== 'struggle') {
        rivalMove.pp = Math.max(0, rivalMove.pp - 1);
      }

      const playerFirst = determineTurnOrder(activeSoul, rivalSoul) === 'attacker';

      turnPlanRef.current = {
        playerMove,
        rivalMove,
        step: 'first',
      };

      if (playerFirst) {
        startPlayerAttack(playerMove);
      } else {
        startRivalAttack(rivalMove);
      }
    },
    [isInputLocked, rivalSoul, activeSoul, getRandom, startPlayerAttack, startRivalAttack]
  );

  // Handle Switch Soul
  const handleSwitchToSoul = useCallback(
    (newIdx: number) => {
      if (isInputLocked || newIdx === activeIdx) return;
      const targetSoul = team[newIdx];
      if (targetSoul.hp <= 0) {
        audioManager.playMenuBeep();
        setMessage(`¡${targetSoul.name} está debilitada y no puede luchar!`);
        return;
      }

      setPhase('SWITCHING_SOUL');
      setMode('textOnly');
      audioManager.playMenuBeep();

      setMessage(`¡Regresa, ${activeSoul.name}! ¡Adelante, ${targetSoul.name}!`);
      setPlayerIntro(true);

      scheduleTimer(() => {
        setActiveIdx(newIdx);
        setPlayerHp(targetSoul.hp);
        setPlayerExp(targetSoul.exp);
        setPlayerIntro(false);
        onSwitchSoul(newIdx);

        // Switching costs player's turn -> Rival attacks!
        scheduleTimer(() => {
          const rivalMove = chooseRivalMove(rivalSoul, getRandom);
          if (rivalMove.id !== 'struggle') {
            rivalMove.pp = Math.max(0, rivalMove.pp - 1);
          }
          turnPlanRef.current = {
            rivalMove,
            step: 'second',
          };
          startRivalAttack(rivalMove);
        }, 800);
      }, 700);
    },
    [isInputLocked, activeIdx, team, activeSoul, scheduleTimer, onSwitchSoul, rivalSoul, getRandom, startRivalAttack]
  );

  // Handle Use Item (Potion or Soul Crystal)
  const handleUseItem = useCallback(
    (item: BagItem) => {
      if (isInputLocked) return;

      if (item.count <= 0) {
        audioManager.playMenuBeep();
        setMessage(`¡No te quedan ${item.name}!`);
        return;
      }

      if (item.id === 'potion') {
        if (playerHp >= activeSoul.maxHp) {
          audioManager.playMenuBeep();
          setMessage(`¡${activeSoul.name} ya tiene toda su salud!`);
          return;
        }

        setPhase('ITEM_USE');
        setMode('textOnly');
        onUseBagItem('potion');

        const healAmount = 20;
        const healedHp = Math.min(activeSoul.maxHp, playerHp + healAmount);
        setPlayerHp(healedHp);
        activeSoul.hp = healedHp;
        audioManager.playCollectSoul();
        vfxEngine.triggerSkillVFX('heal', window.innerWidth * 0.35, window.innerHeight * 0.58);
        vfxEngine.showFloatingText(`+${healedHp - playerHp} HP`, 35, 58, '#34d399', 'text-2xl');
        setMessage(`¡Usaste Poción! ¡${activeSoul.name} recuperó ${healedHp - playerHp} HP!`);

        scheduleTimer(() => {
          const rivalMove = chooseRivalMove(rivalSoul, getRandom);
          if (rivalMove.id !== 'struggle') {
            rivalMove.pp = Math.max(0, rivalMove.pp - 1);
          }
          turnPlanRef.current = { rivalMove, step: 'second' };
          startRivalAttack(rivalMove);
        }, 1200);
      } else if (item.id === 'soul_crystal' || item.id === 'super_crystal') {
        // Capture Sequence via FSM
        setPhase('CAPTURE_SEQUENCE');
        setMode('textOnly');
        onUseBagItem(item.id);

        setMessage(`¡Lanzaste un ${item.name}!`);
        setIsCapturing(true);
        vfxEngine.triggerSkillVFX('capture', window.innerWidth * 0.72, window.innerHeight * 0.32);

        const catchMultiplier = item.catchBonus ?? (item.id === 'super_crystal' ? 1.8 : 1.0);
        const catchRate = calculateCatchRate(rivalSoul, catchMultiplier);

        scheduleTimer(() => {
          setCaptureShakeStep(1);
          audioManager.playCaptureShake();
        }, 700);

        scheduleTimer(() => {
          setCaptureShakeStep(2);
          audioManager.playCaptureShake();
        }, 1400);

        scheduleTimer(() => {
          setCaptureShakeStep(3);
          audioManager.playCaptureShake();
        }, 2100);

        scheduleTimer(() => {
          const isCaught = getRandom() < catchRate;

          if (isCaught) {
            setPhase('BATTLE_END');
            audioManager.playCaptureSuccess();
            setMessage(`¡Capturaste a ${rivalSoul.name}!`);
            scheduleTimer(() => {
              onVictory(calculateExpGain(rivalSoul.level), 30, true, { ...rivalSoul, hp: rivalSoul.maxHp });
            }, 2000);
          } else {
            setIsCapturing(false);
            setCaptureShakeStep(0);
            setMessage('¡Se liberó!');
            audioManager.playFaint();

            scheduleTimer(() => {
              const rivalMove = chooseRivalMove(rivalSoul, getRandom);
              if (rivalMove.id !== 'struggle') {
                rivalMove.pp = Math.max(0, rivalMove.pp - 1);
              }
              turnPlanRef.current = { rivalMove, step: 'second' };
              startRivalAttack(rivalMove);
            }, 1200);
          }
        }, 2800);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isInputLocked, playerHp, activeSoul, onUseBagItem, scheduleTimer, rivalSoul, getRandom, startRivalAttack, onVictory]
  );

  // Flee logic (Seeded PRNG)
  const handleFlee = useCallback(() => {
    if (isInputLocked) return;
    setPhase('FLEE_ATTEMPT');
    setMode('textOnly');

    const success = attemptFlee(getRandom);

    if (success) {
      audioManager.playRunAway();
      setMessage('¡Escapaste sin problemas!');
      scheduleTimer(() => {
        setPhase('BATTLE_END');
        onFlee();
      }, 1400);
    } else {
      setMessage('¡No pudiste huir! El rival aprovecha el momento.');
      scheduleTimer(() => {
        const rivalMove = chooseRivalMove(rivalSoul, getRandom);
        if (rivalMove.id !== 'struggle') {
          rivalMove.pp = Math.max(0, rivalMove.pp - 1);
        }
        turnPlanRef.current = { rivalMove, step: 'second' };
        startRivalAttack(rivalMove);
      }, 1200);
    }
  }, [isInputLocked, getRandom, scheduleTimer, onFlee, rivalSoul, startRivalAttack]);

  // Main Action button router
  const triggerMainAction = useCallback(
    (index: number) => {
      audioManager.playMenuBeep();
      if (index === 0) setMode('moves');
      else if (index === 1) setMode('bag');
      else if (index === 2) setMode('team');
      else if (index === 3) handleFlee();
    },
    [handleFlee]
  );

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputLocked) return;

      if (mode === 'main') {
        if (e.key === 'ArrowLeft') {
          audioManager.playMenuBeep();
          setSelectedMainIdx(prev => (prev === 0 ? 3 : prev - 1));
        } else if (e.key === 'ArrowRight') {
          audioManager.playMenuBeep();
          setSelectedMainIdx(prev => (prev === 3 ? 0 : prev + 1));
        } else if (e.key === 'Enter' || e.key === ' ') {
          triggerMainAction(selectedMainIdx);
        }
      } else if (mode === 'moves') {
        if (e.key === 'ArrowLeft') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev % 2 === 1 ? prev - 1 : prev));
        } else if (e.key === 'ArrowRight') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev % 2 === 0 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev >= 2 ? prev - 2 : prev));
        } else if (e.key === 'ArrowDown') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev <= 1 ? prev + 2 : prev));
        } else if (e.key === 'Enter' || e.key === ' ') {
          const usableMoves = getAvailableMoves();
          if (usableMoves[selectedMoveIdx]) {
            executeMove(usableMoves[selectedMoveIdx]);
          }
        } else if (e.key === 'Escape' || e.key === 'KeyQ') {
          setMode('main');
        }
      } else if (mode === 'bag') {
        if (e.key === 'ArrowUp') {
          audioManager.playMenuBeep();
          setSelectedItemIdx(prev => (prev > 0 ? prev - 1 : bag.length - 1));
        } else if (e.key === 'ArrowDown') {
          audioManager.playMenuBeep();
          setSelectedItemIdx(prev => (prev < bag.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (bag[selectedItemIdx]) {
            handleUseItem(bag[selectedItemIdx]);
          }
        } else if (e.key === 'Escape' || e.key === 'KeyQ') {
          setMode('main');
        }
      } else if (mode === 'team') {
        if (e.key === 'ArrowUp') {
          audioManager.playMenuBeep();
          setSelectedTeamIdx(prev => (prev > 0 ? prev - 1 : team.length - 1));
        } else if (e.key === 'ArrowDown') {
          audioManager.playMenuBeep();
          setSelectedTeamIdx(prev => (prev < team.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === ' ') {
          handleSwitchToSoul(selectedTeamIdx);
        } else if ((e.key === 'Escape' || e.key === 'KeyQ') && playerHp > 0) {
          setMode('main');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    selectedMainIdx,
    selectedMoveIdx,
    selectedItemIdx,
    selectedTeamIdx,
    isInputLocked,
    playerHp,
    bag,
    team,
    triggerMainAction,
    getAvailableMoves,
    executeMove,
    handleUseItem,
    handleSwitchToSoul,
  ]);

  const rivalTypeStyling = TYPE_COLORS[rivalSoul.type];
  const playerTypeStyling = TYPE_COLORS[activeSoul.type];

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto flex items-center justify-center bg-black/95 backdrop-blur-md z-50 p-0 sm:p-2">
      {/* 9:16 Responsive Container */}
      <div className="relative w-full max-w-[430px] min-h-[560px] h-full sm:h-[94dvh] max-h-[920px] bg-[#0c0916] border-0 sm:border-2 border-[#3b2a5a] shadow-[0_0_50px_rgba(139,92,246,0.3)] sm:rounded-md flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none font-pixel text-[#fdf6e2] pb-2 sm:pb-0">
        
        {/* DUNGEON BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src="/assets/aistudio/684566830_1793311950546470_0b6646bd.jpg"
            alt="Dungeon Arena"
            className="w-full h-full object-cover object-center"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="absolute inset-0 bg-[#0c0916]/25" />

          <div className="absolute inset-0 pointer-events-none animate-energy-flicker">
            <svg className="w-full h-full" viewBox="0 0 430 860" fill="none">
              <path
                d="M -10 320 Q 40 330 30 360 T 10 400 Q 60 410 45 440"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 0 6px #a855f7)"
              />
              <path
                d="M 440 280 Q 380 300 395 330 T 430 380"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                filter="drop-shadow(0 0 6px #a855f7)"
              />
            </svg>
          </div>

          {flashTypeColor && (
            <div
              className="absolute inset-0 z-30 transition-opacity duration-150"
              style={{
                backgroundColor: flashTypeColor,
                opacity: 0.35,
              }}
            />
          )}
        </div>

        {/* 3D WEBGL SHADER ATTACK CANVAS OVERLAY */}
        <ShaderAttackCanvas className="z-30 pointer-events-none" />

        {/* 1. TOP HEADER BAR: "Nv. N" and 3D Shader controls */}
        <div className="relative z-20 px-2 sm:px-3 pt-2 pb-0.5 flex items-center justify-between text-[10px] sm:text-xs shrink-0">
          <span className="text-[#fef3c7] font-bold tracking-wider drop-shadow-md">
            Nv. {activeSoul.level}
          </span>

          {/* Quick 3D Shader test bar */}
          <div className="flex items-center gap-1 bg-[#140e25]/90 border border-[#a855f7]/50 px-1.5 py-0.5 rounded shadow pointer-events-auto">
            <span className="text-[#a855f7] font-bold text-[8px] sm:text-[9px] uppercase tracking-wider hidden xs:inline">
              3D SHADERS:
            </span>
            <button
              onClick={() => {
                audioManager.playAttackSound('Fuego');
                shaderAttackEngine.launchAttack('lava', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Fuego', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('💥 MAGMA BURST', 74, 30, '#f97316', 'text-xl');
                });
              }}
              className="px-1.5 py-0.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 rounded text-[8px] sm:text-[9px] text-[#fee2e2] transition active:scale-95 cursor-pointer"
              title="Furia Volcánica (Lava)"
            >
              🌋 Lava
            </button>
            <button
              onClick={() => {
                audioManager.playAttackSound('Agua');
                shaderAttackEngine.launchAttack('water', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Agua', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('🌊 ORBE MARINO', 74, 30, '#38bdf8', 'text-xl');
                });
              }}
              className="px-1.5 py-0.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/60 rounded text-[8px] sm:text-[9px] text-[#e0f2fe] transition active:scale-95 cursor-pointer"
              title="Orbe Marino (Agua)"
            >
              💧 Agua
            </button>
            <button
              onClick={() => {
                audioManager.playAttackSound('Planta');
                shaderAttackEngine.launchAttack('slime', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Planta', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('🧪 CIENO ÁCIDO', 74, 30, '#4ade80', 'text-xl');
                });
              }}
              className="px-1.5 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 rounded text-[8px] sm:text-[9px] text-[#dcfce7] transition active:scale-95 cursor-pointer"
              title="Cieno Hirviente (Slime)"
            >
              🧪 Cieno
            </button>
            <button
              onClick={() => {
                audioManager.playAttackSound('Sombra');
                shaderAttackEngine.launchAttack('blackhole', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Sombra', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('🕳️ SINGULARIDAD', 74, 30, '#c084fc', 'text-xl');
                });
              }}
              className="px-1.5 py-0.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 rounded text-[8px] sm:text-[9px] text-[#f3e8ff] transition active:scale-95 cursor-pointer"
              title="Singularidad Umbría (Agujero Negro)"
            >
              🕳️ Vacío
            </button>
          </div>

          <span className="text-[#a855f7] font-black tracking-widest drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
            SOULDOLL
          </span>
        </div>

        {/* 2. RIVAL PANEL (TOP-LEFT) */}
        <div className="relative z-20 px-2.5 sm:px-3.5 pt-0.5 sm:pt-1.5 flex justify-start shrink-0">
          <PixelBox className="w-[170px] sm:w-[215px] p-2 sm:p-2.5 space-y-1 sm:space-y-1.5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] leading-tight">
              <span className="font-bold tracking-wide text-[#fdf6e2] truncate max-w-[105px] sm:max-w-[120px]">
                {rivalSoul.name}
              </span>
              <span className="text-[#fbbf24] text-[9px] sm:text-[10px]">Nv. {rivalSoul.level}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <TypeBadge type={rivalSoul.type} />
            </div>
            <div className="space-y-0.5 sm:space-y-1 pt-0.5">
              <div className="text-[8px] sm:text-[9px] text-[#fef3c7]/90 font-bold">HP:</div>
              <HealthBar current={rivalHp} max={rivalSoul.maxHp} />
            </div>
          </PixelBox>
        </div>

        {/* 3. CHARACTERS ARENA */}
        <div className="relative z-10 flex-1 flex flex-col justify-between px-2 sm:px-4 pt-1 pb-2 pointer-events-none min-h-0 overflow-visible">
          
          {/* RIVAL: TOP-RIGHT */}
          <div
            className={`self-end flex flex-col items-center mr-6 sm:mr-12 -mt-2 sm:-mt-6 transition-transform duration-700 relative ${
              rivalIntro ? 'translate-x-32 opacity-0' : 'translate-x-0 opacity-100'
            }`}
          >
            {rivalHitState && <ElementalImpactBadge {...rivalHitState} target="rival" />}
            <div className="animate-battle-bob flex flex-col items-center">
              <div className="relative z-10 flex items-center justify-center">
                <SoulSpriteCanvas
                  spritesheet={rivalSoul.spritesheet}
                  frame={rivalSoul.frameFront}
                  sheetSize={rivalSoul.sheetSize}
                  view="front"
                  hitType={rivalHitState?.type || null}
                  isFainting={rivalFainting}
                  isCapturing={isCapturing}
                />
              </div>
              <div className="relative z-0 -mt-6 sm:-mt-8 flex items-center justify-center">
                <ElementalPedestal
                  color={rivalTypeStyling.border}
                  type={rivalSoul.type}
                  isRival={true}
                  hitType={rivalHitState?.type || null}
                />
              </div>
            </div>
          </div>

          {/* CAPTURE CRYSTAL IN CENTER OF ARENA */}
          {isCapturing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div
                className={`text-4xl sm:text-5xl filter drop-shadow-[0_0_16px_#38bdf8] transition-transform duration-200 ${
                  captureShakeStep > 0 ? 'animate-shake' : ''
                }`}
              >
                💎
              </div>
            </div>
          )}

          {/* PLAYER: BOTTOM-LEFT */}
          <div
            className={`self-start flex flex-col items-center ml-8 sm:ml-16 mb-20 sm:mb-28 transition-all duration-700 relative ${
              playerIntro ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            {playerHitState && <ElementalImpactBadge {...playerHitState} target="player" />}
            <div className="animate-battle-bob-rev flex flex-col items-center">
              <div className="relative z-10 flex items-center justify-center">
                <SoulSpriteCanvas
                  spritesheet={activeSoul.spritesheet}
                  frame={activeSoul.frameBack}
                  sheetSize={activeSoul.sheetSize}
                  view="back"
                  hitType={playerHitState?.type || null}
                  isFainting={playerFainting}
                />
              </div>
              <div className="relative z-0 -mt-6 sm:-mt-8 flex items-center justify-center">
                <ElementalPedestal
                  color={playerTypeStyling.border}
                  type={activeSoul.type}
                  isRival={false}
                  hitType={playerHitState?.type || null}
                />
              </div>
            </div>
          </div>

        </div>

        {/* 4. PLAYER ACTIVE SOUL PANEL (BOTTOM-RIGHT) */}
        <div className="relative z-20 px-2.5 sm:px-3.5 pb-1 sm:pb-1.5 flex justify-end shrink-0">
          <PixelBox className="w-[185px] sm:w-[230px] p-2 sm:p-2.5 space-y-1 sm:space-y-1.5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] leading-tight">
              <span className="font-bold tracking-wide text-[#fdf6e2] truncate max-w-[120px] sm:max-w-[140px]">
                {activeSoul.name}
              </span>
              <span className="text-[#fbbf24] text-[9px] sm:text-[10px]">Nv. {activeSoul.level}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <TypeBadge type={activeSoul.type} />
            </div>
            <div className="space-y-0.5 sm:space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-[#fef3c7]/90 font-bold">
                <span>HP: {playerHp}/{activeSoul.maxHp}</span>
              </div>
              <HealthBar current={playerHp} max={activeSoul.maxHp} />
            </div>
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[7px] sm:text-[8px] text-[#38bdf8] font-bold">EXP:</span>
              <div className="flex-1 bg-[#0a0714] border border-[#1e1730] h-1.5 sm:h-2 rounded-xs p-[1px] overflow-hidden">
                <div
                  className="bg-[#38bdf8] h-full transition-all duration-500 shadow-[0_0_4px_#38bdf8]"
                  style={{ width: `${(playerExp / activeSoul.maxExp) * 100}%` }}
                />
              </div>
            </div>
          </PixelBox>
        </div>

        {/* 5. MESSAGE BOX & ACTION BUTTONS */}
        <div className="relative z-20 p-2 sm:p-3 space-y-1 sm:space-y-2 bg-[#0c0916]/95 border-t-2 border-[#2e204a] shrink-0">
          
          {/* Message Box */}
          <PixelBox className="min-h-[40px] sm:min-h-[56px] p-2 sm:p-2.5 flex items-center bg-[#130f22]">
            <p className="text-[9px] sm:text-[11px] leading-relaxed text-[#fef3c7] font-pixel tracking-normal">
              {typedMessage}
              {typedMessage.length < message.length && <span className="animate-pulse">_</span>}
            </p>
          </PixelBox>

          {/* Action Row: LUCHAR, VIAJES, ALMAS, HUIR */}
          {mode === 'main' && (
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
              {[
                { name: 'LUCHAR', color: '#ef4444', hoverBg: 'hover:bg-rose-950/60' },
                { name: 'VIAJES', color: '#facc15', hoverBg: 'hover:bg-amber-950/60' },
                { name: 'ALMAS', color: '#c084fc', hoverBg: 'hover:bg-purple-950/60' },
                { name: 'HUIR', color: '#38bdf8', hoverBg: 'hover:bg-cyan-950/60' },
              ].map((btn, idx) => {
                const isSelected = selectedMainIdx === idx;
                return (
                  <button
                    key={btn.name}
                    onClick={() => triggerMainAction(idx)}
                    onMouseEnter={() => setSelectedMainIdx(idx)}
                    disabled={isInputLocked}
                    className={`relative py-2 sm:py-3 px-1 rounded-sm border-2 text-[9px] sm:text-[11px] font-bold tracking-wider cursor-pointer transition-all duration-150 flex items-center justify-center min-h-[38px] ${
                      isSelected
                        ? 'border-[#c59b27] bg-[#22183c] scale-[1.03] shadow-[0_0_12px_rgba(197,155,39,0.5)]'
                        : 'border-[#4c1d95]/70 bg-[#160f29]'
                    } ${btn.hoverBg} ${isInputLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ color: btn.color }}
                  >
                    <div className="absolute top-0 left-0 w-1 h-1 bg-[#8b5cf6]" />
                    <div className="absolute top-0 right-0 w-1 h-1 bg-[#8b5cf6]" />
                    <div className="absolute bottom-0 left-0 w-1 h-1 bg-[#8b5cf6]" />
                    <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#8b5cf6]" />
                    {btn.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Moves Selection Panel */}
          {mode === 'moves' && (
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                {getAvailableMoves().map((move, idx) => {
                  const isSelected = selectedMoveIdx === idx;
                  const moveColor = TYPE_COLORS[move.type];
                  const hasPP = move.pp > 0 || move.id === 'struggle';
                  return (
                    <button
                      key={move.id}
                      onClick={() => executeMove(move)}
                      onMouseEnter={() => setSelectedMoveIdx(idx)}
                      disabled={!hasPP || isInputLocked}
                      className={`relative p-2 rounded-sm border-2 text-left transition-all ${
                        !hasPP || isInputLocked
                          ? 'opacity-40 border-slate-700 bg-slate-950/50 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#c59b27] bg-[#22183c] shadow-[0_0_10px_rgba(197,155,39,0.5)] cursor-pointer'
                          : 'border-[#4c1d95]/60 bg-[#160f29] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] mb-1">
                        <span className="font-bold text-[#fdf6e2] truncate max-w-[100px] flex items-center gap-1">
                          {move.name}
                          {move.shaderVfx && (
                            <span className="text-[7px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                              3D
                            </span>
                          )}
                        </span>
                        <span
                          className="px-1 py-0.2 rounded text-[8px]"
                          style={{ backgroundColor: moveColor.bg, color: moveColor.text }}
                        >
                          {move.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-[#cbd5e1]">
                        <span className={move.pp === 0 && move.id !== 'struggle' ? 'text-red-400 font-bold' : ''}>
                          PP: {move.pp}/{move.maxPp}
                        </span>
                        {move.power > 0 ? <span>Pot: {move.power}</span> : <span>Buff</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setMode('main')}
                disabled={isInputLocked}
                className="w-full py-1.5 text-[9px] text-[#94a3b8] hover:text-white bg-[#1a1330] hover:bg-[#251b44] border border-[#3b2a5a] rounded-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← [VOLVER AL MENÚ]
              </button>
            </div>
          )}

          {/* VIAJES / BAG PANEL */}
          {mode === 'bag' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] text-[#facc15] font-bold px-1">
                BOLSA DE VIAJE:
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[110px] overflow-y-auto pr-1">
                {bag.map((item, idx) => {
                  const isSelected = selectedItemIdx === idx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleUseItem(item)}
                      onMouseEnter={() => setSelectedItemIdx(idx)}
                      disabled={item.count <= 0 || isInputLocked}
                      className={`p-2 rounded-sm border flex items-center justify-between text-left transition ${
                        item.count <= 0 || isInputLocked
                          ? 'opacity-40 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#c59b27] bg-[#22183c] shadow-[0_0_8px_rgba(197,155,39,0.4)] cursor-pointer'
                          : 'border-[#3b2a5a] bg-[#160f29] cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="text-[9px] font-bold text-[#fef3c7]">{item.name}</div>
                        <div className="text-[7px] text-[#94a3b8]">{item.description}</div>
                      </div>
                      <div className="text-[10px] font-bold text-[#facc15] tabular-nums">
                        x{item.count}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setMode('main')}
                disabled={isInputLocked}
                className="w-full py-1.5 text-[9px] text-[#94a3b8] hover:text-white bg-[#1a1330] hover:bg-[#251b44] border border-[#3b2a5a] rounded-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← [VOLVER AL MENÚ]
              </button>
            </div>
          )}

          {/* ALMAS / TEAM PANEL */}
          {mode === 'team' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] text-[#c084fc] font-bold px-1 flex justify-between">
                <span>EQUIPO DE ALMAS ({team.length}/6):</span>
                {playerHp <= 0 && <span className="text-[#ef4444]">¡Elige alma de relevo!</span>}
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[120px] overflow-y-auto pr-1">
                {team.map((soul, idx) => {
                  const isCurrent = idx === activeIdx;
                  const isFainted = soul.hp <= 0;
                  const isSelected = selectedTeamIdx === idx;
                  const tStyling = TYPE_COLORS[soul.type];

                  return (
                    <button
                      key={soul.id}
                      onClick={() => handleSwitchToSoul(idx)}
                      onMouseEnter={() => setSelectedTeamIdx(idx)}
                      disabled={isFainted || isCurrent || isInputLocked}
                      className={`p-1.5 rounded-sm border flex items-center justify-between text-left transition ${
                        isCurrent
                          ? 'border-[#38bdf8] bg-[#0c233c] opacity-80 cursor-default'
                          : isFainted || isInputLocked
                          ? 'border-slate-800 bg-slate-950/60 opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#c59b27] bg-[#22183c] shadow-[0_0_8px_rgba(197,155,39,0.4)] cursor-pointer'
                          : 'border-[#3b2a5a] bg-[#160f29] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.2 rounded-full text-[7px] font-bold"
                          style={{ backgroundColor: tStyling.bg, color: tStyling.text }}
                        >
                          {soul.type}
                        </span>
                        <div>
                          <div className="text-[9px] font-bold text-[#fef3c7]">
                            {soul.name} <span className="text-[#facc15] text-[8px]">Nv. {soul.level}</span>
                          </div>
                          <div className="text-[7px] text-[#94a3b8]">
                            HP: {soul.hp}/{soul.maxHp}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent && <span className="text-[7px] text-[#38bdf8] font-bold">[ACTIVA]</span>}
                        {isFainted && <span className="text-[7px] text-[#ef4444] font-bold">[CAÍDA]</span>}
                        {!isCurrent && !isFainted && <span className="text-[7px] text-[#4ade80] font-bold">[ENVIAR]</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {playerHp > 0 && (
                <button
                  onClick={() => setMode('main')}
                  disabled={isInputLocked}
                  className="w-full py-1.5 text-[9px] text-[#94a3b8] hover:text-white bg-[#1a1330] hover:bg-[#251b44] border border-[#3b2a5a] rounded-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← [VOLVER AL MENÚ]
                </button>
              )}
            </div>
          )}

          {/* Navigation hints */}
          <div className="flex justify-between text-[7px] text-[#94a3b8]/70 px-1 pt-0.5">
            <span>[← / → / ↑ / ↓]: Navegar</span>
            <span>[ENTER / ESPACIO]: Elegir</span>
            {mode !== 'main' && playerHp > 0 && !isInputLocked && <span>[ESC]: Volver</span>}
          </div>

        </div>

      </div>

    </div>
  );
};
