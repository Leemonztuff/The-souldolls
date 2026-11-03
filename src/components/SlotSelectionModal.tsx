import React, { useState, useEffect } from 'react';
import { SaveManager } from '../save/saveManager';

interface SlotSelectionModalProps {
  onSelectSlot: (slot: number) => void;
}

export const SlotSelectionModal: React.FC<SlotSelectionModalProps> = ({ onSelectSlot }) => {
  const [slots, setSlots] = useState<any[]>([]);

  const refreshSlots = () => {
    setSlots([0, 1, 2].map(slot => ({
      index: slot,
      data: SaveManager.loadFromSlot(slot)
    })));
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  return (
    <div className="w-full max-w-md bg-[#1a1c2c] border-4 border-[#333c57] shadow-[0_0_0_4px_#10121c] p-6 font-pixel">
      <h2 className="text-2xl text-[#f4f4f4] mb-8 text-center uppercase tracking-widest shadow-text">Partidas Guardadas</h2>
      <div className="space-y-6">
        {slots.map(({ index, data }) => (
          <div key={index} className="relative group">
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={() => onSelectSlot(index)}
                className={`flex-1 p-4 text-left border-4 transition-all ${
                  data 
                    ? 'bg-[#29adff]/10 border-[#29adff] hover:bg-[#29adff]/20' 
                    : 'bg-[#333c57]/10 border-[#333c57] hover:bg-[#333c57]/20'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#f4f4f4] text-lg">Ranura {index + 1}</span>
                  {data && <span className="text-[#ffec27] text-xs">NIVEL {data.team?.[0]?.level || 1}</span>}
                </div>
                <div className="text-[#94b3c1] text-xs">
                  {data 
                    ? `Última vez: ${new Date(data.timestamp).toLocaleDateString()}` 
                    : 'Nueva Aventura'}
                </div>
              </button>

              {data && (
                <div className="flex md:flex-col gap-2">
                  <button
                    title="Exportar"
                    onClick={() => {
                      const json = SaveManager.exportSave(index);
                      if (json) {
                        const blob = new Blob([json], {type: 'application/json'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `souldolls_slot_${index + 1}.json`;
                        a.click();
                      }
                    }}
                    className="p-2 bg-[#5fcd19] border-4 border-[#30340f] hover:brightness-110 active:translate-y-1"
                  >
                    <div className="w-5 h-5 flex items-center justify-center text-white">↑</div>
                  </button>
                  <button
                    title="Borrar"
                    onClick={() => {
                      if(confirm('¿Borrar esta partida permanentemente?')) {
                        SaveManager.deleteSlot(index);
                        refreshSlots();
                      }
                    }}
                    className="p-2 bg-[#ff004d] border-4 border-[#30340f] hover:brightness-110 active:translate-y-1"
                  >
                    <div className="w-5 h-5 flex items-center justify-center text-white">×</div>
                  </button>
                </div>
              )}
            </div>
            {!data && (
               <button
                  onClick={() => {
                    const json = prompt('Pega el JSON de tu partida:');
                    if (json) {
                      try {
                        SaveManager.importSave(index, json);
                        refreshSlots();
                      } catch (e: any) {
                        alert(`Error al importar: ${e.message}`);
                      }
                    }
                  }}
                  className="mt-2 text-[10px] text-[#94b3c1] hover:text-[#f4f4f4] underline uppercase block w-full text-center"
               >
                 Importar Archivo
               </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
