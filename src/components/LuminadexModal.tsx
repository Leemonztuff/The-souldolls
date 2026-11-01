import React, { useState, useEffect, useRef } from 'react';
import { LUMINADEX_ENTRIES, TYPE_COLORS, LuminadexEntry } from '../data/mobs';
import { audioManager } from '../audio/audioManager';

interface LuminadexModalProps {
  discovered: Record<string, 'seen' | 'captured'>;
  onClose: () => void;
}

export const LuminadexModal: React.FC<LuminadexModalProps> = ({ discovered, onClose }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedEntry: LuminadexEntry = LUMINADEX_ENTRIES[selectedIdx];
  const status = discovered[selectedEntry.name.toUpperCase()] || 'none';
  const isSeen = status === 'seen' || status === 'captured';
  const isCaptured = status === 'captured';

  // Counts
  const totalEntries = LUMINADEX_ENTRIES.length;
  const seenCount = LUMINADEX_ENTRIES.filter(e => discovered[e.name.toUpperCase()] === 'seen' || discovered[e.name.toUpperCase()] === 'captured').length;
  const capturedCount = LUMINADEX_ENTRIES.filter(e => discovered[e.name.toUpperCase()] === 'captured').length;

  // Keyboard navigation: ArrowUp/Down to navigate, Escape/J to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        audioManager.playMenuBeep();
        setSelectedIdx(prev => (prev > 0 ? prev - 1 : totalEntries - 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        audioManager.playMenuBeep();
        setSelectedIdx(prev => (prev < totalEntries - 1 ? prev + 1 : 0));
      } else if (e.code === 'Escape' || e.code === 'KeyJ') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalEntries, onClose]);

  // Render sprite preview in canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isSeen) {
      // Draw mysterious silhouette
      ctx.fillStyle = '#2A1F2D';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8A6A3B';
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', canvas.width / 2, canvas.height / 2);
      return;
    }

    const img = new Image();
    img.src = selectedEntry.spritesheet;
    img.onload = () => {
      canvas.width = selectedEntry.frameFront.w;
      canvas.height = selectedEntry.frameFront.h;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isCaptured) {
        // Draw black silhouette if only seen
        ctx.drawImage(
          img,
          selectedEntry.frameFront.x,
          selectedEntry.frameFront.y,
          selectedEntry.frameFront.w,
          selectedEntry.frameFront.h,
          0,
          0,
          selectedEntry.frameFront.w,
          selectedEntry.frameFront.h
        );
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#5FE3D266';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        // Full color sprite
        ctx.drawImage(
          img,
          selectedEntry.frameFront.x,
          selectedEntry.frameFront.y,
          selectedEntry.frameFront.w,
          selectedEntry.frameFront.h,
          0,
          0,
          selectedEntry.frameFront.w,
          selectedEntry.frameFront.h
        );
      }
    };
  }, [selectedEntry, isSeen, isCaptured]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#14101C]/85 backdrop-blur-sm select-none font-pixel">
      <div className="relative w-full max-w-3xl bg-[#14101C] border-3 border-[#E8B84A] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_0_2px_#2A1F2D] rounded-sm p-3.5 sm:p-5 md:p-6 text-[#F2E6C9] flex flex-col max-h-[95dvh] overflow-hidden">
        {/* Four Purple Angled Corners */}
        <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-[#9B6BFF] border border-[#c084fc]" />
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#9B6BFF] border border-[#c084fc]" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-[#9B6BFF] border border-[#c084fc]" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#9B6BFF] border border-[#c084fc]" />

        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b-2 border-[#8A6A3B] pb-2 sm:pb-3 mb-2.5 sm:mb-4 shrink-0">
          <div>
            <div className="text-[11px] sm:text-xs md:text-sm font-bold text-[#E8B84A] tracking-wider flex items-center gap-2">
              <span>✦</span>
              <span>LUMINADEX · REGISTRO DE ALMAS</span>
            </div>
            <div className="text-[8px] sm:text-[9px] text-[#5FE3D2] mt-0.5 sm:mt-1 tracking-tight">
              Vistas: {seenCount}/{totalEntries} · Capturadas: {capturedCount}/{totalEntries}
            </div>
          </div>
          <button
            onClick={() => {
              audioManager.playMenuBeep();
              onClose();
            }}
            className="px-2.5 sm:px-3 py-1 bg-[#2A1F2D] hover:bg-[#3d2c41] border border-[#E8B84A] text-[8px] sm:text-[9px] text-[#F2E6C9] cursor-pointer transition rounded-xs"
          >
            [X] CERRAR
          </button>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 overflow-y-auto flex-1 pr-1">
          {/* LEFT LIST: Soul Index List (5 columns, scrollable on mobile) */}
          <div className="md:col-span-5 flex flex-col gap-1.5 max-h-[140px] md:max-h-none overflow-y-auto pr-1">
            {LUMINADEX_ENTRIES.map((entry, idx) => {
              const entryStatus = discovered[entry.name.toUpperCase()] || 'none';
              const entrySeen = entryStatus === 'seen' || entryStatus === 'captured';
              const entryCaptured = entryStatus === 'captured';
              const isSelected = idx === selectedIdx;

              return (
                <div
                  key={entry.num}
                  onClick={() => {
                    audioManager.playMenuBeep();
                    setSelectedIdx(idx);
                  }}
                  className={`p-2.5 border cursor-pointer transition-all flex items-center justify-between text-[10px] rounded-xs ${
                    isSelected
                      ? 'bg-[#2A1F2D] border-[#E8B84A] shadow-[0_0_8px_rgba(232,184,74,0.4)] text-[#F2E6C9]'
                      : 'bg-[#181224] border-[#8A6A3B]/50 hover:border-[#E8B84A]/70 text-[#F2E6C9]/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#8A6A3B] text-[9px]">{entry.num}</span>
                    <span className="font-bold tracking-wide">
                      {entrySeen ? entry.name : '?????????'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px]">
                    {entryCaptured ? (
                      <span className="text-[#E8B84A] font-bold" title="Capturada">
                        ★
                      </span>
                    ) : entrySeen ? (
                      <span className="text-[#5FE3D2]" title="Vista">
                        👁
                      </span>
                    ) : (
                      <span className="text-[#8A6A3B]">?</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT PANEL: Selected Soul Details (7 columns) */}
          <div className="md:col-span-7 bg-[#2A1F2D]/60 border border-[#8A6A3B] p-4 rounded-xs flex flex-col justify-between">
            {/* Top row: Number, Name, Type */}
            <div className="flex items-start justify-between border-b border-[#8A6A3B]/60 pb-3">
              <div>
                <div className="text-[9px] text-[#8A6A3B]">{selectedEntry.num}</div>
                <div className="text-sm font-bold text-[#E8B84A] tracking-wider mt-0.5">
                  {isSeen ? selectedEntry.name : 'DESCONOCIDA'}
                </div>
                <div className="text-[8px] text-[#5FE3D2] italic mt-0.5">
                  {isSeen ? `"${selectedEntry.title}"` : 'Sin registros de avistamiento'}
                </div>
              </div>

              {isSeen && (
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-wider"
                    style={{
                      backgroundColor: TYPE_COLORS[selectedEntry.type].bg,
                      color: TYPE_COLORS[selectedEntry.type].text,
                      border: `1px solid ${TYPE_COLORS[selectedEntry.type].border}`,
                    }}
                  >
                    {selectedEntry.type}
                  </span>
                  <span className="text-[8px] text-[#E8B84A]">
                    {isCaptured ? '★ REGISTRADA' : '👁 AVISTADA'}
                  </span>
                </div>
              )}
            </div>

            {/* Middle: Canvas sprite + Stats */}
            <div className="py-4 flex flex-col md:flex-row items-center gap-4">
              <div className="w-28 h-36 bg-[#14101C] border border-[#8A6A3B] flex items-center justify-center p-2 relative shadow-inner rounded-xs">
                <canvas
                  ref={canvasRef}
                  className="max-h-32 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                {!isCaptured && isSeen && (
                  <span className="absolute bottom-1 right-1 text-[7px] text-[#5FE3D2] bg-[#14101C]/90 px-1 border border-[#5FE3D2]/40">
                    SILUETA
                  </span>
                )}
              </div>

              {/* Stats column */}
              <div className="flex-1 w-full space-y-2 text-[9px]">
                <div>
                  <div className="flex justify-between text-[#F2E6C9] mb-0.5">
                    <span>HP BASE</span>
                    <span>{isCaptured ? selectedEntry.baseHp : '??'}</span>
                  </div>
                  <div className="w-full bg-[#14101C] h-2 rounded-xs overflow-hidden border border-[#8A6A3B]/40">
                    <div
                      className="bg-[#22c55e] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseHp / 50) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#F2E6C9] mb-0.5">
                    <span>ATAQUE</span>
                    <span>{isCaptured ? selectedEntry.baseAtk : '??'}</span>
                  </div>
                  <div className="w-full bg-[#14101C] h-2 rounded-xs overflow-hidden border border-[#8A6A3B]/40">
                    <div
                      className="bg-[#ef4444] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseAtk / 30) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#F2E6C9] mb-0.5">
                    <span>DEFENSA</span>
                    <span>{isCaptured ? selectedEntry.baseDef : '??'}</span>
                  </div>
                  <div className="w-full bg-[#14101C] h-2 rounded-xs overflow-hidden border border-[#8A6A3B]/40">
                    <div
                      className="bg-[#3b82f6] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseDef / 30) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#F2E6C9] mb-0.5">
                    <span>VELOCIDAD</span>
                    <span>{isCaptured ? selectedEntry.baseSpd : '??'}</span>
                  </div>
                  <div className="w-full bg-[#14101C] h-2 rounded-xs overflow-hidden border border-[#8A6A3B]/40">
                    <div
                      className="bg-[#eab308] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseSpd / 30) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Lore description */}
            <div className="border-t border-[#8A6A3B]/60 pt-3">
              <div className="text-[8px] text-[#8A6A3B] uppercase mb-1">REGISTRO MÍSTICO:</div>
              <p className="text-[9px] leading-relaxed text-[#F2E6C9]/90 min-h-[38px]">
                {isCaptured
                  ? selectedEntry.lore
                  : isSeen
                  ? 'Has avistado esta alma en el bosque o mazmorra, pero aún debes capturarla para descifrar su naturaleza completa.'
                  : 'Alma desconocida. Explora los claros de hierba alta y las ruinas para encontrarla.'}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER CONTROLS HINT */}
        <div className="mt-3 pt-2 border-t border-[#8A6A3B]/40 flex items-center justify-between text-[8px] text-[#8A6A3B]">
          <span>↑↓: NAVEGAR LISTA</span>
          <span>J / ESC: CERRAR REGISTRO</span>
        </div>
      </div>
    </div>
  );
};
