import React, { useState, useEffect, useRef } from 'react';
import { BattleSoul, BattleMove, SoulType, BagItem, ItemId } from '../types';
import { TYPE_COLORS, BASIC_STRUGGLE_MOVE, checkNewMoveOnLevelUp } from '../data/mobs';
import { calculateDamage, calculateExpGain, calculateCatchRate, chooseRivalMove, determineTurnOrder } from '../battle/battleRules';
import { audioManager } from '../audio/audioManager';
import { vfxEngine } from '../core/vfxEngine';

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

// 2.5D Elemental Battle Pedestal with runic engravings and elemental effects
interface ElementalPedestalProps {
  color: string;
  type?: SoulType;
  isRival?: boolean;
}

const ElementalPedestal: React.FC<ElementalPedestalProps> = ({ color, type = 'Sombra', isRival }) => {
  // Elemental theme accents
  const getThemeDetails = (t: SoulType) => {
    switch (t) {
      case 'Fuego':
        return {
          glow: 'rgba(239, 68, 68, 0.75)',
          accent: '#f97316',
          particleColor: '#fca5a5',
        };
      case 'Agua':
        return {
          glow: 'rgba(56, 189, 248, 0.75)',
          accent: '#0284c7',
          particleColor: '#bae6fd',
        };
      case 'Planta':
        return {
          glow: 'rgba(74, 222, 128, 0.75)',
          accent: '#16a34a',
          particleColor: '#bbf7d0',
        };
      case 'Rayo':
        return {
          glow: 'rgba(250, 204, 21, 0.8)',
          accent: '#eab308',
          particleColor: '#fef08a',
        };
      case 'Sombra':
        return {
          glow: 'rgba(168, 85, 247, 0.8)',
          accent: '#7c3aed',
          particleColor: '#e9d5ff',
        };
      case 'Luz':
      default:
        return {
          glow: 'rgba(251, 191, 36, 0.8)',
          accent: '#d97706',
          particleColor: '#fef3c7',
        };
    }
  };

  const theme = getThemeDetails(type);

  return (
    <div className="relative w-36 h-11 sm:w-44 sm:h-13 pointer-events-none flex items-center justify-center select-none">
      {/* 1. Deep Dungeon Floor Ambient Occlusion Shadow */}
      <div
        className="absolute w-[94%] h-5 rounded-full bg-black/75 blur-[2.5px]"
        style={{ transform: 'translateY(12px) scaleY(0.5)' }}
      />

      {/* 2. Soft Elemental Floor Underglow */}
      <div
        className="absolute w-[86%] h-6 rounded-full blur-[6px] opacity-75 animate-pulse-glow"
        style={{
          backgroundColor: theme.glow,
          transform: 'translateY(8px) scaleY(0.48)',
        }}
      />

      {/* 3. 2.5D Isometric Stone Pedestal Platform (SVG with Depth & Runes) */}
      <svg
        viewBox="0 0 180 60"
        className="absolute inset-0 w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial power gradient for the inner platform disc */}
          <radialGradient id={`pedestal-rad-${isRival ? 'rival' : 'player'}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="55%" stopColor={theme.accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0d0918" stopOpacity="0.9" />
          </radialGradient>
          {/* Filter for glowing runic inscriptions */}
          <filter id={`runic-glow-${isRival ? 'rival' : 'player'}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 3D Extrusion Lip / Stone Rim Depth */}
        <ellipse
          cx="90"
          cy="34"
          rx="78"
          ry="20"
          fill="#130e22"
          stroke="#251c3d"
          strokeWidth="2"
        />

        {/* Top Disc Plate with Radial Elemental Energy */}
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

        {/* Outer Runic Border Inscriptions (Concentric Ring with Cardinal Notches) */}
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

        {/* Secondary Inner Disc Arc */}
        <ellipse
          cx="90"
          cy="30"
          rx="52"
          ry="11.5"
          stroke={theme.accent}
          strokeWidth="0.9"
          strokeDasharray="3 3"
          opacity="0.8"
        />

        {/* Center Runic Star Geometric Lines */}
        <ellipse
          cx="90"
          cy="30"
          rx="32"
          ry="7"
          stroke={color}
          strokeWidth="0.8"
          opacity="0.7"
        />

        {/* 4 Cardinal Runes (North, South, East, West) */}
        <circle cx="90" cy="14.5" r="1.6" fill="#ffffff" opacity="0.9" />
        <circle cx="90" cy="45.5" r="1.6" fill="#ffffff" opacity="0.9" />
        <circle cx="22" cy="30" r="1.8" fill={color} opacity="0.85" />
        <circle cx="158" cy="30" r="1.8" fill={color} opacity="0.85" />

        {/* Center Point */}
        <circle cx="90" cy="30" r="2" fill={color} opacity="0.75" />
      </svg>

      {/* 4. Subtle Rising Light Beam from Pedestal */}
      <div
        className="absolute -top-2 w-24 h-6 rounded-t-full pointer-events-none opacity-35 blur-[2px]"
        style={{
          background: `linear-gradient(to top, ${color} 0%, transparent 100%)`,
        }}
      />

      {/* 5. Floating Sparkles & Elemental Particles */}
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

// Backwards-compatible alias for MagicCircle
const MagicCircle = ElementalPedestal;


// Soul sprite drawer from cropped spritesheet
const SoulSpriteCanvas: React.FC<{
  spritesheet: string;
  frame: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  view: 'front' | 'back';
  isHit?: boolean;
  isFainting?: boolean;
  isCapturing?: boolean;
}> = ({ spritesheet, frame, isHit, isFainting, isCapturing }) => {
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

  return (
    <div
      className={`relative select-none flex items-center justify-center transition-all duration-500 ${
        isHit ? 'animate-shake animate-flash-hit' : ''
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
  // Active Souls State
  const [activeIdx, setActiveIdx] = useState(activeSoulIndex);
  const activeSoul = team[activeIdx] || team[0];
  const [rivalSoul, setRivalSoul] = useState<BattleSoul>({ ...initialRivalSoul });

  // Combat Stats
  const [playerHp, setPlayerHp] = useState(activeSoul.hp);
  const [playerExp, setPlayerExp] = useState(activeSoul.exp);
  const [rivalHp, setRivalHp] = useState(initialRivalSoul.hp);

  // Sync active soul HP changes to team
  useEffect(() => {
    activeSoul.hp = playerHp;
  }, [playerHp, activeSoul]);

  const [message, setMessage] = useState(initialMessage || `¡${rivalSoul.name} acecha en la oscura mazmorra con mirada desafiante!`);
  const [typedMessage, setTypedMessage] = useState('');
  const [mode, setMode] = useState<'main' | 'moves' | 'bag' | 'team' | 'textOnly'>('main');

  // Animation states
  const [rivalIntro, setRivalIntro] = useState(true);
  const [playerIntro, setPlayerIntro] = useState(true);
  const [rivalHit, setRivalHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [rivalFainting, setRivalFainting] = useState(false);
  const [playerFainting, setPlayerFainting] = useState(false);
  const [flashTypeColor, setFlashTypeColor] = useState<string | null>(null);

  // Capture sequence state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureShakeStep, setCaptureShakeStep] = useState(0); // 0, 1, 2, 3

  // Button navigation indexes
  const [selectedMainIdx, setSelectedMainIdx] = useState(0); // 0: LUCHAR, 1: VIAJES, 2: ALMAS, 3: HUIR
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);

  // Processing lock
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);

  // When active soul changes (via switch)
  const handleSwitchToSoul = (newIdx: number) => {
    if (newIdx === activeIdx) return;
    const targetSoul = team[newIdx];
    if (targetSoul.hp <= 0) {
      setMessage(`¡${targetSoul.name} está debilitada y no puede luchar!`);
      return;
    }

    setIsProcessingTurn(true);
    setMode('textOnly');
    audioManager.playMenuBeep();

    setMessage(`¡Regresa, ${activeSoul.name}! ¡Adelante, ${targetSoul.name}!`);
    setPlayerIntro(true);

    setTimeout(() => {
      setActiveIdx(newIdx);
      setPlayerHp(targetSoul.hp);
      setPlayerExp(targetSoul.exp);
      setPlayerIntro(false);
      onSwitchSoul(newIdx);

      // Rival gets turn because switching costs the turn
      setTimeout(() => {
        const rivalMove = rivalSoul.moves[Math.floor(Math.random() * rivalSoul.moves.length)];
        runRivalAttack(rivalMove, targetSoul.hp, (remainingPlayerHp) => {
          if (remainingPlayerHp <= 0) {
            handleActiveSoulFaint(newIdx);
          } else {
            setIsProcessingTurn(false);
            setMode('main');
          }
        });
      }, 1000);
    }, 700);
  };

  // Intro battle animation
  useEffect(() => {
    audioManager.playBattleStart();
    const t1 = setTimeout(() => setRivalIntro(false), 800);
    const t2 = setTimeout(() => setPlayerIntro(false), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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
    }, 18);
    return () => clearInterval(interval);
  }, [message]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessingTurn) return;

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
  }, [mode, selectedMainIdx, selectedMoveIdx, selectedItemIdx, selectedTeamIdx, isProcessingTurn, playerHp, rivalHp, bag, team]);

  // Main Action handler
  const triggerMainAction = (index: number) => {
    audioManager.playMenuBeep();
    if (index === 0) {
      setMode('moves');
    } else if (index === 1) {
      setMode('bag');
    } else if (index === 2) {
      setMode('team');
    } else if (index === 3) {
      handleFlee();
    }
  };

  // Get usable moves or fallback to Struggle if 0 PP on all
  const getAvailableMoves = (): BattleMove[] => {
    const hasPP = activeSoul.moves.some(m => m.pp > 0);
    if (!hasPP) {
      return [BASIC_STRUGGLE_MOVE];
    }
    return activeSoul.moves;
  };

  // Flee logic (70% success)
  const handleFlee = () => {
    setIsProcessingTurn(true);
    setMode('textOnly');
    const success = Math.random() < 0.70;

    if (success) {
      audioManager.playRunAway();
      setMessage('¡Escapaste sin problemas!');
      setTimeout(() => {
        onFlee();
      }, 1400);
    } else {
      setMessage('¡No pudiste huir! El rival aprovecha el momento.');
      setTimeout(() => {
        const rivalMove = rivalSoul.moves[Math.floor(Math.random() * rivalSoul.moves.length)];
        runRivalAttack(rivalMove, playerHp, (remainingPlayerHp) => {
          if (remainingPlayerHp <= 0) {
            handleActiveSoulFaint(activeIdx);
          } else {
            setIsProcessingTurn(false);
            setMode('main');
          }
        });
      }, 1200);
    }
  };

  // Use Bag Item (Potion / Soul Crystal)
  const handleUseItem = (item: BagItem) => {
    if (isProcessingTurn) return;

    if (item.count <= 0) {
      setMessage(`¡No te quedan ${item.name}!`);
      return;
    }

    if (item.id === 'potion') {
      if (playerHp >= activeSoul.maxHp) {
        setMessage(`¡${activeSoul.name} ya tiene toda su salud!`);
        return;
      }

      setIsProcessingTurn(true);
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

      // Using an item consumes turn -> Rival attacks!
      setTimeout(() => {
        const rivalMove = rivalSoul.moves[Math.floor(Math.random() * rivalSoul.moves.length)];
        runRivalAttack(rivalMove, healedHp, (remainingPlayerHp) => {
          if (remainingPlayerHp <= 0) {
            handleActiveSoulFaint(activeIdx);
          } else {
            setIsProcessingTurn(false);
            setMode('main');
          }
        });
      }, 1200);
    } else if (item.id === 'soul_crystal' || item.id === 'super_crystal') {
      // Capture attempt
      setIsProcessingTurn(true);
      setMode('textOnly');
      onUseBagItem(item.id);

      setMessage(`¡Lanzaste un ${item.name}!`);
      setIsCapturing(true);
      vfxEngine.triggerSkillVFX('capture', window.innerWidth * 0.72, window.innerHeight * 0.32);

      const catchMultiplier = item.catchBonus ?? (item.id === 'super_crystal' ? 1.8 : 1.0);
      const catchRate = calculateCatchRate(rivalSoul, catchMultiplier);

      // Shakes sequence (1, 2, 3)
      setTimeout(() => {
        setCaptureShakeStep(1);
        audioManager.playCaptureShake();
      }, 700);

      setTimeout(() => {
        setCaptureShakeStep(2);
        audioManager.playCaptureShake();
      }, 1400);

      setTimeout(() => {
        setCaptureShakeStep(3);
        audioManager.playCaptureShake();
      }, 2100);

      // Roll capture success
      setTimeout(() => {
        const isCaught = Math.random() < catchRate;

        if (isCaught) {
          audioManager.playCaptureSuccess();
          setMessage(`¡Capturaste a ${rivalSoul.name}!`);
          setTimeout(() => {
            onVictory(calculateExpGain(rivalSoul.level), 30, true, { ...rivalSoul, hp: rivalSoul.maxHp });
          }, 2000);
        } else {
          // Breaks free
          setIsCapturing(false);
          setCaptureShakeStep(0);
          setMessage('¡Se liberó!');
          audioManager.playFaint();

          // Rival takes their turn
          setTimeout(() => {
            const rivalMove = rivalSoul.moves[Math.floor(Math.random() * rivalSoul.moves.length)];
            runRivalAttack(rivalMove, playerHp, (remainingPlayerHp) => {
              if (remainingPlayerHp <= 0) {
                handleActiveSoulFaint(activeIdx);
              } else {
                setIsProcessingTurn(false);
                setMode('main');
              }
            });
          }, 1200);
        }
      }, 2800);
    }
  };

  // Turn resolution
  const executeMove = (playerMove: BattleMove) => {
    if (isProcessingTurn) return;

    if (playerMove.pp <= 0 && playerMove.id !== 'struggle') {
      setMessage(`¡No quedan PP para ${playerMove.name}!`);
      return;
    }

    setIsProcessingTurn(true);
    setMode('textOnly');

    // Deduct PP
    if (playerMove.id !== 'struggle') {
      playerMove.pp = Math.max(0, playerMove.pp - 1);
    }

    const random = Math.random;
    const rivalMove = chooseRivalMove(rivalSoul, random);
    const playerFirst = determineTurnOrder(activeSoul, rivalSoul) === 'attacker';

    if (playerFirst) {
      runPlayerAttack(playerMove, (remainingRivalHp) => {
        if (remainingRivalHp <= 0) {
          handleRivalDefeat();
        } else {
          setTimeout(() => {
            runRivalAttack(rivalMove, remainingRivalHp, (remainingPlayerHp) => {
              if (remainingPlayerHp <= 0) {
                handleActiveSoulFaint(activeIdx);
              } else {
                setIsProcessingTurn(false);
                setMode('main');
              }
            });
          }, 1000);
        }
      });
    } else {
      runRivalAttack(rivalMove, rivalHp, (remainingPlayerHp) => {
        if (remainingPlayerHp <= 0) {
          handleActiveSoulFaint(activeIdx);
        } else {
          setTimeout(() => {
            runPlayerAttack(playerMove, (remainingRivalHp) => {
              if (remainingRivalHp <= 0) {
                handleRivalDefeat();
              } else {
                setIsProcessingTurn(false);
                setMode('main');
              }
            });
          }, 1000);
        }
      });
    }
  };

  const runPlayerAttack = (move: BattleMove, onDone: (remainingHp: number) => void) => {
    setMessage(`¡${activeSoul.name} usó ${move.name}!`);
    audioManager.playAttackSound(move.type);
    setFlashTypeColor(TYPE_COLORS[move.type].glow);
    vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.72, window.innerHeight * 0.32);

    setTimeout(() => {
      const result = calculateDamage(activeSoul, rivalSoul, move, Math.random);

      if (result.missed) {
        setFlashTypeColor(null);
        setMessage(`¡El ataque de ${activeSoul.name} falló!`);
        setTimeout(() => onDone(rivalHp), 900);
        return;
      }

      setRivalHit(true);
      const newHp = Math.max(0, rivalHp - result.damage);
      setRivalHp(newHp);
      vfxEngine.showFloatingText(`-${result.damage}`, 72, 32, TYPE_COLORS[move.type].border, result.isCrit ? 'text-3xl' : 'text-xl');

      setTimeout(() => {
        setRivalHit(false);
        setFlashTypeColor(null);

        let extraMsg = '';
        if (result.isCrit) {
          extraMsg += ' ¡Golpe crítico!';
        }
        if (result.multiplier > 1.0) {
          extraMsg += ' ¡Es muy efectivo!';
        } else if (result.multiplier < 1.0 && move.power > 0) {
          extraMsg += ' No es muy efectivo…';
        }

        if (extraMsg) {
          setMessage(extraMsg.trim());
          setTimeout(() => onDone(newHp), 900);
        } else {
          setTimeout(() => onDone(newHp), 600);
        }
      }, 450);
    }, 400);
  };

  const runRivalAttack = (move: BattleMove, currentTargetHp: number, onDone: (remainingHp: number) => void) => {
    setMessage(`¡${rivalSoul.name} contraataca furioso con ${move.name}!`);
    audioManager.playAttackSound(move.type);
    setFlashTypeColor(TYPE_COLORS[move.type].glow);
    vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.35, window.innerHeight * 0.58);

    setTimeout(() => {
      const result = calculateDamage(rivalSoul, activeSoul, move, Math.random);

      if (result.missed) {
        setFlashTypeColor(null);
        setMessage(`¡El ataque de ${rivalSoul.name} falló!`);
        setTimeout(() => onDone(currentTargetHp), 900);
        return;
      }

      setPlayerHit(true);
      const newHp = Math.max(0, currentTargetHp - result.damage);
      setPlayerHp(newHp);
      activeSoul.hp = newHp;
      vfxEngine.showFloatingText(`-${result.damage}`, 35, 58, TYPE_COLORS[move.type].border, result.isCrit ? 'text-3xl' : 'text-xl');

      setTimeout(() => {
        setPlayerHit(false);
        setFlashTypeColor(null);

        let extraMsg = '';
        if (result.isCrit) {
          extraMsg += ' ¡Golpe crítico del rival!';
        }
        if (result.multiplier > 1.0) {
          extraMsg += ' ¡Es muy efectivo!';
        } else if (result.multiplier < 1.0 && move.power > 0) {
          extraMsg += ' No es muy efectivo…';
        }

        if (extraMsg) {
          setMessage(extraMsg.trim());
          setTimeout(() => onDone(newHp), 900);
        } else {
          setTimeout(() => onDone(newHp), 600);
        }
      }, 450);
    }, 400);
  };

  // Active soul fainted
  const handleActiveSoulFaint = (faintedIdx: number) => {
    setPlayerFainting(true);
    audioManager.playFaint();
    setMessage(`¡${team[faintedIdx].name} cayó debilitada!`);

    setTimeout(() => {
      setPlayerFainting(false);
      // Check if any other soul in team is alive
      const aliveSouls = team.filter(s => s.hp > 0);
      if (aliveSouls.length === 0) {
        // Entire team wiped out!
        setMessage('Te quedaste sin fuerzas...');
        setTimeout(() => {
          onDefeat();
        }, 2000);
      } else {
        // Must choose replacement
        setMessage('Elige otra alma para continuar el combate.');
        setIsProcessingTurn(false);
        setMode('team');
      }
    }, 1500);
  };

  // Rival Defeated & EXP Gain & Level Up
  const handleRivalDefeat = () => {
    setRivalFainting(true);
    audioManager.playFaint();
    setMessage(`¡${rivalSoul.name} fue derrotado!`);

    setTimeout(() => {
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

      setTimeout(() => {
        if (leveledUp) {
          audioManager.playLevelUp();
          setMessage(`¡${activeSoul.name} subió al nivel ${activeSoul.level}!`);

          // Check new move at level 5, 10, 15
          const newMove = checkNewMoveOnLevelUp(activeSoul);
          if (newMove) {
            setTimeout(() => {
              if (activeSoul.moves.length < 4) {
                activeSoul.moves.push(newMove);
              } else {
                activeSoul.moves[activeSoul.moves.length - 1] = newMove;
              }
              setMessage(`¡${activeSoul.name} aprendió ${newMove.name}!`);
              setTimeout(() => {
                onVictory(expReward, goldReward, false);
              }, 2000);
            }, 1800);
          } else {
            setTimeout(() => {
              onVictory(expReward, goldReward, false);
            }, 2000);
          }
        } else {
          onVictory(expReward, goldReward, false);
        }
      }, 1600);
    }, 1200);
  };

  const rivalTypeStyling = TYPE_COLORS[rivalSoul.type];
  const playerTypeStyling = TYPE_COLORS[activeSoul.type];

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto flex items-center justify-center bg-black/95 backdrop-blur-md z-50 p-0 sm:p-2">
      
      {/* 9:16 Responsive Container */}
      <div className="relative w-full max-w-[430px] min-h-[560px] h-full sm:h-[94dvh] max-h-[920px] bg-[#0c0916] border-0 sm:border-2 border-[#3b2a5a] shadow-[0_0_50px_rgba(139,92,246,0.3)] sm:rounded-md flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none font-pixel text-[#fdf6e2] pb-2 sm:pb-0">
        
        {/* DUNGEON BACKGROUND (Authentic pixel-art dungeon arena from user asset) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src="/assets/aistudio/684566830_1793311950546470_0b6646bd.jpg"
            alt="Dungeon Arena"
            className="w-full h-full object-cover object-center"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Subtle dark overlay for UI readability */}
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

        {/* 1. TOP HEADER BAR: "Nv. N" and "SOULDOLL" */}
        <div className="relative z-20 px-3 pt-2 pb-0.5 sm:px-4 sm:pt-3 flex items-center justify-between text-[10px] sm:text-xs shrink-0">
          <span className="text-[#fef3c7] font-bold tracking-wider drop-shadow-md">
            Nv. {activeSoul.level}
          </span>
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
          
          {/* RIVAL: TOP-RIGHT (Front View) - Positioned higher up over its enhanced elemental pedestal */}
          <div
            className={`self-end flex flex-col items-center mr-6 sm:mr-12 -mt-2 sm:-mt-6 transition-transform duration-700 ${
              rivalIntro ? 'translate-x-32 opacity-0' : 'translate-x-0 opacity-100'
            }`}
          >
            <div className="animate-battle-bob flex flex-col items-center">
              <div className="relative z-10 flex items-center justify-center">
                <SoulSpriteCanvas
                  spritesheet={rivalSoul.spritesheet}
                  frame={rivalSoul.frameFront}
                  sheetSize={rivalSoul.sheetSize}
                  view="front"
                  isHit={rivalHit}
                  isFainting={rivalFainting}
                  isCapturing={isCapturing}
                />
              </div>
              <div className="relative z-0 -mt-6 sm:-mt-8 flex items-center justify-center">
                <ElementalPedestal
                  color={rivalTypeStyling.border}
                  type={rivalSoul.type}
                  isRival={true}
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

          {/* PLAYER: BOTTOM-LEFT (Back View) - Positioned higher up above dialogue box with enhanced pedestal */}
          <div
            className={`self-start flex flex-col items-center ml-8 sm:ml-16 mb-20 sm:mb-28 transition-all duration-700 ${
              playerIntro ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            <div className="animate-battle-bob-rev flex flex-col items-center">
              <div className="relative z-10 flex items-center justify-center">
                <SoulSpriteCanvas
                  spritesheet={activeSoul.spritesheet}
                  frame={activeSoul.frameBack}
                  sheetSize={activeSoul.sheetSize}
                  view="back"
                  isHit={playerHit}
                  isFainting={playerFainting}
                />
              </div>
              <div className="relative z-0 -mt-6 sm:-mt-8 flex items-center justify-center">
                <ElementalPedestal
                  color={playerTypeStyling.border}
                  type={activeSoul.type}
                  isRival={false}
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
                    className={`relative py-2 sm:py-3 px-1 rounded-sm border-2 text-[9px] sm:text-[11px] font-bold tracking-wider cursor-pointer transition-all duration-150 flex items-center justify-center min-h-[38px] ${
                      isSelected
                        ? 'border-[#c59b27] bg-[#22183c] scale-[1.03] shadow-[0_0_12px_rgba(197,155,39,0.5)]'
                        : 'border-[#4c1d95]/70 bg-[#160f29]'
                    } ${btn.hoverBg}`}
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
                      disabled={!hasPP}
                      className={`relative p-2 rounded-sm border-2 text-left cursor-pointer transition-all ${
                        !hasPP
                          ? 'opacity-40 border-slate-700 bg-slate-950/50 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#c59b27] bg-[#22183c] shadow-[0_0_10px_rgba(197,155,39,0.5)]'
                          : 'border-[#4c1d95]/60 bg-[#160f29]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] mb-1">
                        <span className="font-bold text-[#fdf6e2] truncate max-w-[100px]">
                          {move.name}
                        </span>
                        <span
                          className="px-1 py-0.2 rounded text-[8px]"
                          style={{ backgroundColor: moveColor.bg, color: moveColor.text }}
                        >
                          {move.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-[#cbd5e1]">
                        <span>PP: {move.pp}/{move.maxPp}</span>
                        {move.power > 0 ? <span>Pot: {move.power}</span> : <span>Buff</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setMode('main')}
                className="w-full py-1.5 text-[9px] text-[#94a3b8] hover:text-white bg-[#1a1330] hover:bg-[#251b44] border border-[#3b2a5a] rounded-sm cursor-pointer transition"
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
                      disabled={item.count <= 0}
                      className={`p-2 rounded-sm border flex items-center justify-between text-left cursor-pointer transition ${
                        item.count <= 0
                          ? 'opacity-40 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#c59b27] bg-[#22183c] shadow-[0_0_8px_rgba(197,155,39,0.4)]'
                          : 'border-[#3b2a5a] bg-[#160f29]'
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
                className="w-full py-1.5 text-[9px] text-[#94a3b8] hover:text-white bg-[#1a1330] hover:bg-[#251b44] border border-[#3b2a5a] rounded-sm cursor-pointer transition"
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
                      disabled={isFainted || isCurrent}
                      className={`p-1.5 rounded-sm border flex items-center justify-between text-left cursor-pointer transition ${
                        isCurrent
                          ? 'border-[#38bdf8] bg-[#0c233c] opacity-80 cursor-default'
                          : isFainted
                          ? 'border-slate-800 bg-slate-950/60 opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#c59b27] bg-[#22183c] shadow-[0_0_8px_rgba(197,155,39,0.4)]'
                          : 'border-[#3b2a5a] bg-[#160f29]'
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
                  className="w-full py-1.5 text-[9px] text-[#94a3b8] hover:text-white bg-[#1a1330] hover:bg-[#251b44] border border-[#3b2a5a] rounded-sm cursor-pointer transition"
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
            {mode !== 'main' && playerHp > 0 && <span>[ESC]: Volver</span>}
          </div>

        </div>

      </div>

    </div>
  );
};
