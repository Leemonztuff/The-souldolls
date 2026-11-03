import React, { useState, useEffect, useRef } from 'react';
import { BattleSoul, BagItem, SoulType, BattleMove } from '../types';
import { TYPE_COLORS } from '../data/mobs';
import { audioManager } from '../audio/audioManager';

interface SoulBagModalProps {
  initialTab?: 'team' | 'bag' | 'box';
  team: BattleSoul[];
  box: BattleSoul[];
  bag: BagItem[];
  gold: number;
  onClose: () => void;
  onUpdateTeam: (newTeam: BattleSoul[]) => void;
  onUpdateBox: (newBox: BattleSoul[]) => void;
  onUpdateBag: (newBag: BagItem[]) => void;
}

const ELEMENTAL_ICONS: Record<SoulType, string> = {
  Fuego: '🔥',
  Agua: '🌊',
  Planta: '🌿',
  Rayo: '⚡',
  Sombra: '🔮',
  Luz: '✨',
};

// Mini canvas sprite renderer with crisp pixel-art scaling
const SoulSpritePreview: React.FC<{
  spritesheet: string;
  frame: { x: number; y: number; w: number; h: number };
  className?: string;
}> = ({ spritesheet, frame, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = spritesheet;
    img.onload = () => {
      canvas.width = frame.w;
      canvas.height = frame.h;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, frame.w, frame.h);
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    };
  }, [spritesheet, frame]);

  return (
    <canvas
      ref={canvasRef}
      className={`object-contain select-none pointer-events-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export const SoulBagModal: React.FC<SoulBagModalProps> = ({
  initialTab = 'team',
  team,
  box,
  bag,
  gold,
  onClose,
  onUpdateTeam,
  onUpdateBox,
  onUpdateBag,
}) => {
  const [tab, setTab] = useState<'team' | 'bag' | 'box'>(initialTab);
  const [selectedSoulIdx, setSelectedSoulIdx] = useState(0);
  const [selectedBoxIdx, setSelectedBoxIdx] = useState(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [bagFilter, setBagFilter] = useState<'all' | 'heal' | 'capture'>('all');
  const [itemTargetMode, setItemTargetMode] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Active inspected soul
  const activeSoul: BattleSoul | undefined = tab === 'team' ? team[selectedSoulIdx] : box[selectedBoxIdx];

  // Feedback banner dismiss timer
  useEffect(() => {
    if (feedbackNotice) {
      const timer = setTimeout(() => setFeedbackNotice(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackNotice]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyI') {
        e.preventDefault();
        audioManager.playMenuBeep();
        onClose();
      } else if (e.code === 'Digit1') {
        setTab('team');
        audioManager.playMenuBeep();
      } else if (e.code === 'Digit2') {
        setTab('bag');
        audioManager.playMenuBeep();
      } else if (e.code === 'Digit3') {
        setTab('box');
        audioManager.playMenuBeep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Team management: Move soul to Leader (Slot 0)
  const handleMakeLeader = (idx: number) => {
    if (idx === 0 || idx >= team.length) return;
    audioManager.playMenuBeep();
    const newTeam = [...team];
    const [moved] = newTeam.splice(idx, 1);
    newTeam.unshift(moved);
    onUpdateTeam(newTeam);
    setSelectedSoulIdx(0);
    setFeedbackNotice(`¡${moved.name} ahora es el líder del escuadrón!`);
  };

  // Team management: Move Up / Down
  const handleReorder = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= team.length) return;
    audioManager.playMenuBeep();
    const newTeam = [...team];
    const temp = newTeam[idx];
    newTeam[idx] = newTeam[targetIdx];
    newTeam[targetIdx] = temp;
    onUpdateTeam(newTeam);
    setSelectedSoulIdx(targetIdx);
  };

  // Deposit soul to Box
  const handleDepositToBox = (idx: number) => {
    if (team.length <= 1) {
      setFeedbackNotice('No puedes depositar tu última alma activa.');
      return;
    }
    audioManager.playMenuBeep();
    const newTeam = [...team];
    const [deposited] = newTeam.splice(idx, 1);
    const newBox = [...box, deposited];
    onUpdateTeam(newTeam);
    onUpdateBox(newBox);
    setSelectedSoulIdx(Math.max(0, idx - 1));
    setFeedbackNotice(`¡${deposited.name} fue guardada en el Almacén!`);
  };

  // Withdraw soul from Box to Team
  const handleWithdrawFromBox = (idx: number) => {
    if (idx >= box.length) return;
    if (team.length >= 6) {
      setFeedbackNotice('El escuadrón ya tiene el máximo de 6 almas.');
      return;
    }
    audioManager.playMenuBeep();
    const newBox = [...box];
    const [withdrawn] = newBox.splice(idx, 1);
    const newTeam = [...team, withdrawn];
    onUpdateBox(newBox);
    onUpdateTeam(newTeam);
    setSelectedBoxIdx(Math.max(0, idx - 1));
    setFeedbackNotice(`¡${withdrawn.name} se unió a tu escuadrón!`);
  };

  // Swap soul between Box and selected Team slot
  const handleSwapWithTeam = (boxIdx: number) => {
    if (boxIdx >= box.length || selectedSoulIdx >= team.length) return;
    audioManager.playMenuBeep();
    const newBox = [...box];
    const newTeam = [...team];
    const temp = newBox[boxIdx];
    newBox[boxIdx] = newTeam[selectedSoulIdx];
    newTeam[selectedSoulIdx] = temp;
    onUpdateBox(newBox);
    onUpdateTeam(newTeam);
    setFeedbackNotice(`¡Intercambio realizado: ${temp.name} por ${newBox[boxIdx].name}!`);
  };

  // Use Healing Item on Soul
  const handleUseItemOnSoul = (soulIdx: number) => {
    const currentItem = filteredBag[selectedItemIdx];
    if (!currentItem || currentItem.count <= 0) return;
    const targetSoul = team[soulIdx];
    if (!targetSoul) return;

    if (currentItem.effect === 'heal') {
      const healAmount = currentItem.healAmount || 20;
      if (targetSoul.hp >= targetSoul.maxHp) {
        setFeedbackNotice(`¡${targetSoul.name} ya tiene los puntos de salud al máximo!`);
        return;
      }

      audioManager.playLevelUp();
      const nextHp = Math.min(targetSoul.maxHp, targetSoul.hp + healAmount);
      const restored = nextHp - targetSoul.hp;

      const newTeam = team.map((s, idx) => (idx === soulIdx ? { ...s, hp: nextHp } : s));
      onUpdateTeam(newTeam);

      const newBag = bag.map(item => {
        if (item.id === currentItem.id) {
          return { ...item, count: item.count - 1 };
        }
        return item;
      });
      onUpdateBag(newBag);

      setFeedbackNotice(`¡${targetSoul.name} recuperó +${restored} HP!`);
      setItemTargetMode(false);
    }
  };

  // Filter bag items
  const filteredBag = bag.filter(item => {
    if (bagFilter === 'heal') return item.effect === 'heal';
    if (bagFilter === 'capture') return item.effect === 'capture';
    return true;
  });

  const activeItem = filteredBag[selectedItemIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#07050d]/92 backdrop-blur-md font-pixel select-none">
      <div className="relative w-full max-w-5xl bg-[#110c1f] border-3 border-[#b4862a] shadow-[0_0_60px_rgba(0,0,0,0.95)] rounded-sm flex flex-col max-h-[96dvh] overflow-hidden text-[#fdf6e2]">
        
        {/* Runic Corner Accents */}
        <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />

        {/* 1. TOP HEADER BAR (Brave Frontier Reference Layout Style) */}
        <div className="px-4 py-3 border-b-2 border-[#2b1f40] bg-[#160f29] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[#fbbf24] text-sm">✦</span>
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-wider text-[#fbbf24] uppercase">
                SoulDolls · Codex de Unidades & Invocaciones
              </h1>
              <div className="text-[8px] text-[#94a3b8] mt-0.5">
                Jugador: Guardián · Rango: Maestro de Almas
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 bg-[#090612] border border-[#b4862a] rounded-xs text-[9px] text-[#fbbf24] font-bold shadow-inner">
              💰 {gold} Oro
            </div>
            <button
              onClick={() => {
                audioManager.playMenuBeep();
                onClose();
              }}
              className="px-3 py-1 bg-[#24173d] hover:bg-[#342257] border border-[#b4862a] text-[9px] text-[#fef3c7] transition active:scale-95 cursor-pointer rounded-xs"
            >
              [ESC] CERRAR
            </button>
          </div>
        </div>

        {/* 2. SEGMENTED NAVIGATION TABS */}
        <div className="px-4 pt-2.5 pb-2 bg-[#0e0a1a] border-b border-[#2b1f40] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 bg-[#07050d] p-1 border border-[#2b1f40] rounded-xs">
            <button
              onClick={() => {
                setTab('team');
                audioManager.playMenuBeep();
              }}
              className={`px-3 py-1.5 text-[8px] sm:text-[9px] font-bold tracking-wider uppercase transition cursor-pointer rounded-xs flex items-center gap-1.5 ${
                tab === 'team'
                  ? 'bg-[#2b1d47] text-[#fef08a] border border-[#b4862a] shadow-[0_0_8px_rgba(180,134,42,0.3)]'
                  : 'text-[#94a3b8] hover:text-[#fdf6e2] border border-transparent'
              }`}
            >
              <span>⚔️</span>
              <span>ESCUADRÓN ({team.length}/6)</span>
            </button>

            <button
              onClick={() => {
                setTab('bag');
                audioManager.playMenuBeep();
              }}
              className={`px-3 py-1.5 text-[8px] sm:text-[9px] font-bold tracking-wider uppercase transition cursor-pointer rounded-xs flex items-center gap-1.5 ${
                tab === 'bag'
                  ? 'bg-[#2b1d47] text-[#fef08a] border border-[#b4862a] shadow-[0_0_8px_rgba(180,134,42,0.3)]'
                  : 'text-[#94a3b8] hover:text-[#fdf6e2] border border-transparent'
              }`}
            >
              <span>🎒</span>
              <span>BOLSA ({bag.reduce((acc, i) => acc + i.count, 0)})</span>
            </button>

            <button
              onClick={() => {
                setTab('box');
                audioManager.playMenuBeep();
              }}
              className={`px-3 py-1.5 text-[8px] sm:text-[9px] font-bold tracking-wider uppercase transition cursor-pointer rounded-xs flex items-center gap-1.5 ${
                tab === 'box'
                  ? 'bg-[#2b1d47] text-[#fef08a] border border-[#b4862a] shadow-[0_0_8px_rgba(180,134,42,0.3)]'
                  : 'text-[#94a3b8] hover:text-[#fdf6e2] border border-transparent'
              }`}
            >
              <span>📦</span>
              <span>ALMACÉN ({box.length})</span>
            </button>
          </div>

          <div className="text-[8px] text-[#64748b] hidden sm:block">
            Atajos: [1] Escuadrón · [2] Bolsa · [3] Almacén
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackNotice && (
          <div className="px-4 py-1.5 bg-[#1e1b4b] border-b border-[#4338ca] text-[9px] text-[#a5b4fc] text-center font-bold animate-fade-in shrink-0">
            {feedbackNotice}
          </div>
        )}

        {/* 3. MAIN CONTENT (Brave Frontier Reference Split Layout) */}
        <div className="flex-1 overflow-hidden p-3.5 sm:p-4.5 bg-[#0e091c]">
          
          {/* TAB 1: ESCUADRÓN */}
          {tab === 'team' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full overflow-hidden">
              
              {/* Left Column: Party Slots */}
              <div className="md:col-span-4 flex flex-col gap-1.5 overflow-y-auto pr-1">
                <div className="text-[8px] text-[#94a3b8] font-bold uppercase tracking-wider mb-0.5">
                  MIEMBROS ACTIVOS (SLOT #1 = LÍDER):
                </div>

                {team.map((soul, idx) => {
                  const isSelected = selectedSoulIdx === idx;
                  const isLeader = idx === 0;
                  const hpPercent = Math.max(0, Math.min(100, (soul.hp / soul.maxHp) * 100));
                  const tStyling = TYPE_COLORS[soul.type];

                  return (
                    <div
                      key={soul.id || idx}
                      onClick={() => {
                        setSelectedSoulIdx(idx);
                        audioManager.playMenuBeep();
                      }}
                      className={`p-2 rounded-xs border transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#b4862a] bg-[#24173d] shadow-[0_0_10px_rgba(180,134,42,0.4)]'
                          : 'border-[#2d2042] bg-[#140e26] hover:bg-[#1b1333]'
                      }`}
                    >
                      <div className="w-10 h-11 bg-[#090612] border border-[#2d2042] rounded-xs flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                        <SoulSpritePreview
                          spritesheet={soul.spritesheet}
                          frame={soul.frameFront}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[9px] mb-0.5">
                          <span className="font-bold text-[#fef3c7] truncate flex items-center gap-1">
                            {isLeader && <span className="text-[#fbbf24] text-[8px]">★</span>}
                            {soul.name}
                          </span>
                          <span className="text-[#fbbf24] text-[8px] tabular-nums font-bold">
                            Nv. {soul.level}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[7px] mb-1">
                          <span style={{ color: tStyling.text }} className="font-bold">
                            {ELEMENTAL_ICONS[soul.type]} {soul.type}
                          </span>
                          <span className="text-[#64748b]">·</span>
                          <span className={soul.hp <= 0 ? 'text-red-400 font-bold' : 'text-[#cbd5e1]'}>
                            HP: {soul.hp}/{soul.maxHp}
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-[#090612] border border-[#2b1f40] rounded-xs overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              hpPercent > 50 ? 'bg-[#22c55e]' : hpPercent > 20 ? 'bg-[#eab308]' : 'bg-[#ef4444]'
                            }`}
                            style={{ width: `${hpPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: Math.max(0, 6 - team.length) }).map((_, emptyIdx) => (
                  <div
                    key={`empty-${emptyIdx}`}
                    className="p-2.5 rounded-xs border border-dashed border-[#2b1f40] bg-[#0c0817]/40 flex items-center justify-center text-[8px] text-[#475569]"
                  >
                    + Ranura Disponible ({team.length + emptyIdx + 1}/6)
                  </div>
                ))}
              </div>

              {/* Right Column: Brave Frontier Styled Unit Dossier */}
              {activeSoul ? (
                <div className="md:col-span-8 bg-[#140e26] border border-[#2d2042] rounded-xs p-3.5 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3">
                    
                    {/* Top Unit Header & Sprite Arena Box */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-[#0a0614] p-3 border border-[#2b1f40] rounded-xs">
                      {/* Left side info */}
                      <div className="md:col-span-7 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h2 className="text-sm font-bold text-[#fbbf24] tracking-wide">{activeSoul.name}</h2>
                              <span className="text-xs">★★★</span>
                            </div>
                            <div className="text-[8px] text-[#38bdf8] mt-0.5">
                              Clase: <span className="font-bold text-[#fef3c7]">Guardián de Almas ({activeSoul.type})</span>
                            </div>
                          </div>
                        </div>

                        {/* Level & EXP Progress Bar */}
                        <div className="space-y-1 pt-1 border-t border-[#1e1533]">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#fef3c7]">Nv. {activeSoul.level}/40</span>
                            <span className="text-[#94a3b8]">{activeSoul.exp} / {activeSoul.maxExp} EXP</span>
                          </div>
                          <div className="w-full bg-[#07050d] h-2.5 border border-[#2b1f40] rounded-xs overflow-hidden p-[1px]">
                            <div
                              className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-xs transition-all duration-300"
                              style={{ width: `${Math.min(100, (activeSoul.exp / activeSoul.maxExp) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right side sprite showcase */}
                      <div className="md:col-span-5 bg-[#120a21] border border-[#b4862a]/40 rounded-xs flex flex-col items-center justify-center p-2 relative shadow-inner">
                        <SoulSpritePreview
                          spritesheet={activeSoul.spritesheet}
                          frame={activeSoul.frameFront}
                          className="h-28 sm:h-32 object-contain"
                        />
                        <div className="absolute top-1 right-1 text-[7px] bg-[#090612]/90 px-1.5 py-0.5 border border-[#b4862a] text-[#fbbf24] rounded-xs font-bold">
                          {ELEMENTAL_ICONS[activeSoul.type]} {activeSoul.type}
                        </div>
                      </div>
                    </div>

                    {/* 4 Stat Boxes (HP, ATK, DEF, REC) - Brave Frontier Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-[#103422] border-2 border-[#15803d] p-2 rounded-xs flex flex-col justify-between shadow-md">
                        <span className="text-[8px] font-bold text-[#86efac] uppercase tracking-wider">HP (Salud)</span>
                        <span className="text-sm font-black text-[#fef3c7] tabular-nums mt-1">{activeSoul.hp + 1200}</span>
                      </div>
                      <div className="bg-[#4c0519] border-2 border-[#b91c1c] p-2 rounded-xs flex flex-col justify-between shadow-md">
                        <span className="text-[8px] font-bold text-[#fca5a5] uppercase tracking-wider">ATK (Ataque)</span>
                        <span className="text-sm font-black text-[#fef3c7] tabular-nums mt-1">{activeSoul.attack * 10 + 200}</span>
                      </div>
                      <div className="bg-[#1e3a8a] border-2 border-[#1d4ed8] p-2 rounded-xs flex flex-col justify-between shadow-md">
                        <span className="text-[8px] font-bold text-[#93c5fd] uppercase tracking-wider">DEF (Defensa)</span>
                        <span className="text-sm font-black text-[#fef3c7] tabular-nums mt-1">{activeSoul.defense * 10 + 150}</span>
                      </div>
                      <div className="bg-[#78350f] border-2 border-[#d97706] p-2 rounded-xs flex flex-col justify-between shadow-md">
                        <span className="text-[8px] font-bold text-[#fde047] uppercase tracking-wider">REC (Recuperación)</span>
                        <span className="text-sm font-black text-[#fef3c7] tabular-nums mt-1">{activeSoul.speed * 20 + 100}</span>
                      </div>
                    </div>

                    {/* Leader Skill Box */}
                    <div className="bg-[#0a0614] border border-[#2b1f40] p-2.5 rounded-xs space-y-1">
                      <div className="text-[8px] font-bold text-[#fbbf24] uppercase flex items-center gap-1">
                        <span>🚩 LIDERAZGO ALQUÍMICO</span>
                      </div>
                      <div className="text-[9px] font-bold text-[#fef3c7]">Resonancia de la Sombra</div>
                      <div className="text-[8px] text-[#cbd5e1] leading-relaxed">
                        15% de bonificación al poder de ataque elemental de todas las almas en el escuadrón activo.
                      </div>
                    </div>

                    {/* Brave Burst (Ultimate Move) */}
                    <div className="bg-[#0a0614] border border-[#2b1f40] p-2.5 rounded-xs space-y-1">
                      <div className="text-[8px] font-bold text-[#38bdf8] uppercase flex items-center justify-between">
                        <span>✨ BRAVE BURST (HABILIDAD SUPREMA)</span>
                        <span className="text-[#fbbf24]">Costo: 20 CC</span>
                      </div>
                      <div className="text-[9px] font-bold text-[#fef3c7]">
                        {activeSoul.moves[0]?.name || 'Impacto Rúnico'} Lv. 1
                      </div>
                      <div className="text-[8px] text-[#cbd5e1] leading-relaxed">
                        {activeSoul.moves[0]?.description || 'Ataque devastador elemental con probabilidad de debilitar al rival.'}
                      </div>
                    </div>

                    {/* Quick Party Actions */}
                    <div className="flex gap-2 pt-1">
                      {selectedSoulIdx !== 0 && (
                        <button
                          onClick={() => handleMakeLeader(selectedSoulIdx)}
                          className="flex-1 py-1.5 bg-[#2b1f40] hover:bg-[#3d2c5c] border border-[#fbbf24] text-[#fef08a] text-[8px] font-bold rounded-xs transition cursor-pointer"
                        >
                          ★ ESTABLECER COMO LÍDER
                        </button>
                      )}
                      {team.length > 1 && (
                        <button
                          onClick={() => handleDepositToBox(selectedSoulIdx)}
                          className="py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-[8px] font-bold rounded-xs transition cursor-pointer"
                        >
                          📦 GUARDAR EN ALMACÉN
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              ) : (
                <div className="md:col-span-8 flex items-center justify-center text-[9px] text-[#64748b]">
                  Selecciona una SoulDoll para inspeccionar su dossier.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOLSA */}
          {tab === 'bag' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full overflow-hidden">
              <div className="md:col-span-5 flex flex-col gap-2 overflow-y-auto pr-1">
                <div className="flex items-center gap-1 bg-[#090612] p-1 border border-[#2b1f40] rounded-xs">
                  <button
                    onClick={() => setBagFilter('all')}
                    className={`flex-1 py-1 text-[7px] font-bold uppercase rounded-xs transition ${
                      bagFilter === 'all' ? 'bg-[#2b1d47] text-[#fef08a] border border-[#b4862a]' : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setBagFilter('heal')}
                    className={`flex-1 py-1 text-[7px] font-bold uppercase rounded-xs transition ${
                      bagFilter === 'heal' ? 'bg-[#2b1d47] text-[#fef08a] border border-[#b4862a]' : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    Pociones
                  </button>
                  <button
                    onClick={() => setBagFilter('capture')}
                    className={`flex-1 py-1 text-[7px] font-bold uppercase rounded-xs transition ${
                      bagFilter === 'capture' ? 'bg-[#2b1d47] text-[#fef08a] border border-[#b4862a]' : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    Cristales
                  </button>
                </div>

                {filteredBag.length === 0 ? (
                  <div className="text-center py-10 text-[8px] text-[#64748b] italic">
                    No hay objetos en esta categoría.
                  </div>
                ) : (
                  filteredBag.map((item, idx) => {
                    const isSelected = selectedItemIdx === idx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItemIdx(idx);
                          setItemTargetMode(false);
                          audioManager.playMenuBeep();
                        }}
                        className={`p-2.5 rounded-xs border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[#b4862a] bg-[#24173d] shadow-[0_0_10px_rgba(180,134,42,0.4)]'
                            : 'border-[#2d2042] bg-[#140e26] hover:bg-[#1b1333]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">
                            {item.effect === 'heal' ? '🧪' : '💎'}
                          </span>
                          <div>
                            <div className="text-[9px] font-bold text-[#fef3c7]">{item.name}</div>
                            <div className="text-[7px] text-[#38bdf8]">
                              {item.effect === 'heal' ? 'Restaura Salud' : 'Captura de Almas'}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] font-bold text-[#fbbf24] tabular-nums">
                          x{item.count}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {activeItem ? (
                <div className="md:col-span-7 bg-[#140e26] border border-[#2b1f40] rounded-xs p-4 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-[#2b1f40] pb-3">
                      <div className="w-12 h-12 bg-[#090612] border border-[#b4862a] rounded-xs flex items-center justify-center text-2xl shadow-inner">
                        {activeItem.effect === 'heal' ? '🧪' : '💎'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#fef3c7]">{activeItem.name}</div>
                        <div className="text-[8px] text-[#fbbf24] font-bold mt-0.5">
                          Cantidad disponible: x{activeItem.count}
                        </div>
                      </div>
                    </div>

                    <div className="text-[8px] sm:text-[9px] text-[#cbd5e1] leading-relaxed bg-[#0a0614] p-3 border border-[#2b1f40] rounded-xs">
                      {activeItem.description}
                    </div>

                    {activeItem.effect === 'heal' && !itemTargetMode && (
                      <div className="pt-2">
                        <button
                          onClick={() => setItemTargetMode(true)}
                          disabled={activeItem.count <= 0}
                          className="w-full py-2.5 bg-[#2b1f40] hover:bg-[#3d2c5c] border border-[#fbbf24] text-[#fef08a] text-[9px] font-bold rounded-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          🧪 SELECCIONAR ALMA PARA RESTAURAR SALUD
                        </button>
                      </div>
                    )}

                    {activeItem.effect === 'heal' && itemTargetMode && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[8px] text-[#fbbf24] font-bold">
                          ELIGE ALMA DEL ESCUADRÓN PARA APLICAR (+{activeItem.healAmount || 20} HP):
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {team.map((s, sIdx) => (
                            <button
                              key={s.id || sIdx}
                              onClick={() => handleUseItemOnSoul(sIdx)}
                              disabled={s.hp >= s.maxHp}
                              className={`p-2 rounded-xs border text-left flex items-center justify-between text-[8px] transition ${
                                s.hp >= s.maxHp
                                  ? 'border-[#2d2042] bg-[#0c0817] opacity-50 cursor-not-allowed'
                                  : 'border-[#3b2a5a] bg-[#1e1533] hover:border-[#fbbf24] hover:bg-[#2b1d47] cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#fef3c7]">{s.name}</span>
                                <span className="text-[#94a3b8]">Nv. {s.level}</span>
                              </div>
                              <div className="text-[#cbd5e1]">
                                HP: <span className={s.hp < s.maxHp ? 'text-amber-300 font-bold' : 'text-emerald-400'}>{s.hp}/{s.maxHp}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setItemTargetMode(false)}
                          className="w-full py-1 text-[8px] text-[#94a3b8] hover:text-white bg-[#0e0a1a] border border-[#2b1f40] rounded-xs cursor-pointer mt-1"
                        >
                          Cancelar selección
                        </button>
                      </div>
                    )}

                    {activeItem.effect === 'capture' && (
                      <div className="text-[8px] text-[#38bdf8] bg-[#0c1f30] p-2.5 border border-[#0284c7]/50 rounded-xs">
                        ℹ️ Los cristales se lanzan en la pantalla de combate [B] contra almas salvajes para aprisionar su esencia y unirlas a tu equipo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="md:col-span-7 flex items-center justify-center text-[9px] text-[#64748b]">
                  Selecciona un objeto de la bolsa.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALMACÉN */}
          {tab === 'box' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full overflow-hidden">
              <div className="md:col-span-5 flex flex-col gap-1.5 overflow-y-auto pr-1">
                <div className="text-[8px] text-[#94a3b8] font-bold uppercase tracking-wider mb-0.5">
                  ALMAS EN RESERVA ({box.length}):
                </div>

                {box.length === 0 ? (
                  <div className="text-center py-12 text-[8px] text-[#64748b] italic bg-[#0c0817]/40 p-4 border border-dashed border-[#2b1f40] rounded-xs">
                    El almacén está vacío. Cuando tu escuadrón de 6 almas esté lleno, las nuevas almas capturadas se transferirán automáticamente aquí.
                  </div>
                ) : (
                  box.map((soul, bIdx) => {
                    const isSelected = selectedBoxIdx === bIdx;
                    const tStyling = TYPE_COLORS[soul.type];
                    return (
                      <div
                        key={soul.id || bIdx}
                        onClick={() => {
                          setSelectedBoxIdx(bIdx);
                          audioManager.playMenuBeep();
                        }}
                        className={`p-2.5 rounded-xs border transition cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-[#b4862a] bg-[#24173d] shadow-[0_0_10px_rgba(180,134,42,0.4)]'
                            : 'border-[#2d2042] bg-[#140e26] hover:bg-[#1b1333]'
                        }`}
                      >
                        <div className="w-10 h-11 bg-[#090612] border border-[#2d2042] rounded-xs flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                          <SoulSpritePreview
                            spritesheet={soul.spritesheet}
                            frame={soul.frameFront}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="font-bold text-[#fef3c7] truncate">{soul.name}</span>
                            <span className="text-[#fbbf24] text-[8px] font-bold">Nv. {soul.level}</span>
                          </div>
                          <div className="text-[7px]" style={{ color: tStyling.text }}>
                            {ELEMENTAL_ICONS[soul.type]} {soul.type} · HP: {soul.hp}/{soul.maxHp}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {box[selectedBoxIdx] ? (
                <div className="md:col-span-7 bg-[#140e26] border border-[#2b1f40] rounded-xs p-4 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-[#2b1f40] pb-3">
                      <div className="w-14 h-16 bg-[#090612] border border-[#b4862a] rounded-xs flex items-center justify-center p-1 shadow-inner">
                        <SoulSpritePreview
                          spritesheet={box[selectedBoxIdx].spritesheet}
                          frame={box[selectedBoxIdx].frameFront}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#fef3c7]">{box[selectedBoxIdx].name}</div>
                        <div className="text-[8px] text-[#fbbf24] font-bold mt-0.5">
                          Nv. {box[selectedBoxIdx].level} · {box[selectedBoxIdx].type}
                        </div>
                        <div className="text-[7px] text-[#94a3b8] mt-0.5">
                          HP: {box[selectedBoxIdx].hp}/{box[selectedBoxIdx].maxHp} · Ataque: {box[selectedBoxIdx].attack}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {team.length < 6 ? (
                        <button
                          onClick={() => handleWithdrawFromBox(selectedBoxIdx)}
                          className="w-full py-2.5 bg-[#103422] hover:bg-[#14472d] border border-[#4ade80] text-[#86efac] text-[9px] font-bold rounded-xs transition cursor-pointer"
                        >
                          ➕ RETIRAR AL ESCUADRÓN ({team.length + 1}/6)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSwapWithTeam(selectedBoxIdx)}
                          className="w-full py-2.5 bg-[#2b1f40] hover:bg-[#3d2c5c] border border-[#fbbf24] text-[#fef08a] text-[9px] font-bold rounded-xs transition cursor-pointer"
                        >
                          🔄 INTERCAMBIAR CON {team[selectedSoulIdx]?.name || 'LÍDER'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-7 flex items-center justify-center text-[9px] text-[#64748b]">
                  {box.length === 0 ? 'No hay almas en el almacén.' : 'Selecciona un alma del almacén.'}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4. FOOTER */}
        <div className="px-4 py-2 border-t border-[#2b1f40] bg-[#0c0817] flex items-center justify-between text-[7px] text-[#94a3b8] shrink-0">
          <span>[ESC / I]: Cerrar Menú</span>
          <span>[1]: Escuadrón · [2]: Bolsa · [3]: Almacén</span>
          <span className="hidden sm:inline">SoulDolls Grimoire Engine v2.5</span>
        </div>

      </div>
    </div>
  );
};
