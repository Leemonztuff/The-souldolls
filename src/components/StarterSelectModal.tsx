import React, { useState } from 'react';
import { BattleSoul, SoulType } from '../types';
import { getStarterSouls, TYPE_COLORS } from '../data/mobs';
import { audioManager } from '../audio/audioManager';

interface StarterSelectModalProps {
  onSelect: (soul: BattleSoul) => void;
}

export const StarterSelectModal: React.FC<StarterSelectModalProps> = ({ onSelect }) => {
  const starters = getStarterSouls();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const current = starters[selectedIndex];
  const typeStyling = TYPE_COLORS[current.type];

  const handleSelect = (idx: number) => {
    audioManager.playMenuBeep();
    setSelectedIndex(idx);
  };

  const handleConfirm = () => {
    audioManager.playCollectSoul();
    onSelect(current);
  };

  return (
    <div className="fixed inset-0 pointer-events-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 font-pixel text-[#fdf6e2] select-none">
      <div className="pixel-frame w-full max-w-[440px] bg-[#0c0916] p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-[0_0_40px_rgba(139,92,246,0.4)] animate-fade-in flex flex-col justify-between max-h-[95dvh] overflow-y-auto">
        
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xs md:text-sm text-[#fef3c7] tracking-wider font-bold">
            ELIGE TU ALMA INICIAL
          </h2>
          <p className="text-[8px] text-[#94a3b8]">
            Cada alma posee un vínculo elemental único.
          </p>
        </div>

        {/* 3 Starter Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {starters.map((starter, idx) => {
            const isSel = selectedIndex === idx;
            const sTypeColor = TYPE_COLORS[starter.type];
            return (
              <button
                key={starter.name}
                onClick={() => handleSelect(idx)}
                className={`p-2 rounded-sm border-2 text-center transition-all cursor-pointer ${
                  isSel
                    ? 'border-[#c59b27] bg-[#22183c] scale-105 shadow-[0_0_12px_rgba(197,155,39,0.5)]'
                    : 'border-[#3b2a5a] bg-[#160f29] hover:bg-[#1f153a]'
                }`}
              >
                <div className="text-[9px] font-bold text-[#fef3c7] truncate">{starter.name}</div>
                <div
                  className="mt-1 inline-block px-1.5 py-0.5 rounded-full text-[7px] font-bold"
                  style={{ backgroundColor: sTypeColor.bg, color: sTypeColor.text }}
                >
                  {starter.type}
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview & Stats Card */}
        <div className="bg-[#130f22] border border-[#2e204a] p-3 rounded-sm flex items-center gap-4">
          
          {/* Sprite Preview with Magic Circle */}
          <div className="relative w-28 h-36 flex flex-col items-center justify-center">
            {/* Base Magic Circle */}
            <div
              className="absolute bottom-2 w-20 h-8 rounded-full border border-dashed animate-pulse-glow"
              style={{
                borderColor: typeStyling.border,
                backgroundColor: `${typeStyling.border}22`,
                boxShadow: `0 0 10px ${typeStyling.border}`,
                transform: 'rotateX(60deg)',
              }}
            />
            {/* Sprite */}
            <div
              className="relative w-20 h-28 bg-no-repeat bg-center animate-battle-bob"
              style={{
                backgroundImage: `url(${current.spritesheet})`,
                backgroundPosition: `-${current.frameFront.x}px -${current.frameFront.y}px`,
                imageRendering: 'pixelated',
                transform: 'scale(0.85)',
              }}
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1.5 text-[8px] text-[#cbd5e1]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#fef3c7]">{current.name}</span>
              <span className="text-[#facc15]">Nv. {current.level}</span>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between"><span>HP:</span><span className="text-white font-bold">{current.maxHp}</span></div>
              <div className="flex justify-between"><span>Ataque:</span><span className="text-white font-bold">{current.attack}</span></div>
              <div className="flex justify-between"><span>Defensa:</span><span className="text-white font-bold">{current.defense}</span></div>
              <div className="flex justify-between"><span>Velocidad:</span><span className="text-white font-bold">{current.speed}</span></div>
            </div>

            <div className="pt-1 border-t border-[#2a1e42]">
              <span className="text-[7px] text-[#94a3b8] block mb-0.5">Movimientos:</span>
              <div className="space-y-0.5">
                {current.moves.map(m => (
                  <div key={m.id} className="flex justify-between text-[7px] text-[#fde68a]">
                    <span>• {m.name}</span>
                    <span className="text-[#94a3b8]">PP {m.maxPp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#f59e0b] hover:to-[#d97706] text-black font-bold text-[10px] tracking-wider rounded-sm shadow-lg shadow-amber-500/20 border border-[#fef3c7]/60 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          CONFIRMAR ELECCIÓN
        </button>

      </div>
    </div>
  );
};
