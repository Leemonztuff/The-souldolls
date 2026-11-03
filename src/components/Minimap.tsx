import React, { useEffect, useRef } from 'react';
import { GrassPatch } from '../types';

interface MinimapProps {
  playerPos: { x: number; z: number; rotation: number };
  lakeCenter: { x: number; z: number };
  grassPatches: GrassPatch[];
  discoveredGrassIndexes?: number[];
  villages?: { name: string; x: number; z: number }[];
  fountains?: { x: number; z: number }[];
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  lakeCenter,
  grassPatches,
  discoveredGrassIndexes = [],
  villages = [
    { name: 'Villa Marioneta', x: 0, z: 0 },
    { name: 'Torre Antigua', x: 85, z: 10 },
    { name: 'Santuario del Bosque', x: -65, z: -65 },
  ],
  fountains = [
    { x: -2.0, z: -1.0 },
    { x: 82, z: 8 },
    { x: -64, z: -62 },
  ],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 110;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;

    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;

    // Scale: world coordinates (-180 to 180) mapped to minimap
    // Minimap is centered on the player (radar style) or world map
    // Centering on player gives classic RPG navigation feel!
    // World map scale: 1 world unit = 0.45 pixels (showing ~110 units radius around player)
    const zoom = 0.48;

    const toMapX = (wx: number) => centerX + (wx - playerPos.x) * zoom;
    const toMapY = (wz: number) => centerY + (wz - playerPos.z) * zoom;

    ctx.clearRect(0, 0, size, size);

    // Save clip for circular minimap
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
    ctx.clip();

    // 1. Dark terrain background (Crypt Ink)
    ctx.fillStyle = '#14101C';
    ctx.fillRect(0, 0, size, size);

    // Grid lines for tactical pixel feel
    ctx.strokeStyle = '#2A1F2D';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // 2. Dirt Trail / Path
    ctx.strokeStyle = '#8A6A3B';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let wx = -180; wx <= 180; wx += 6) {
      const wz = Math.sin(wx * 0.03) * 35 + Math.cos(wx * 0.01) * 20;
      const mx = toMapX(wx);
      const my = toMapY(wz);
      if (wx === -180) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.stroke();

    // 3. Lake (Agua mística)
    const lakeMapX = toMapX(lakeCenter.x);
    const lakeMapY = toMapY(lakeCenter.z);
    const lakeRadius = 26 * zoom;

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(lakeMapX, lakeMapY, lakeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Tall Grass Patches (Hierba Alta)
    grassPatches.forEach((patch, idx) => {
      // Show discovered grass patches or patches within radar range
      const distToPlayer = Math.hypot(patch.x - playerPos.x, patch.z - playerPos.z);
      const isDiscovered = discoveredGrassIndexes.includes(idx) || distToPlayer < 75;

      if (isDiscovered) {
        const gx = toMapX(patch.x);
        const gy = toMapY(patch.z);
        const gr = Math.max(2, patch.radius * zoom);

        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // 5. Villages Markers
    villages.forEach(v => {
      const vx = toMapX(v.x);
      const vy = toMapY(v.z);

      ctx.fillStyle = '#E8B84A';
      ctx.fillRect(vx - 2.5, vy - 2.5, 5, 5);

      ctx.strokeStyle = '#8A6A3B';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx - 2.5, vy - 2.5, 5, 5);
    });

    // 6. Healing Fountains Markers (Ki Cyan pulsing dot)
    fountains.forEach(f => {
      const fx = toMapX(f.x);
      const fy = toMapY(f.z);

      ctx.fillStyle = '#5FE3D2';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 7. Player Indicator (Center of Minimap, rotated)
    ctx.save();
    ctx.translate(centerX, centerY);
    // Note: player rotation in 3D scene (facing angle)
    ctx.rotate(-playerPos.rotation + Math.PI);

    // Player Direction Arrow
    ctx.fillStyle = '#5FE3D2';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#F2E6C9';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();

    ctx.restore();

    // 8. Outer Gold / Bronze Circular Frame & Compass North
    ctx.strokeStyle = '#E8B84A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#8A6A3B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal Points
    ctx.fillStyle = '#E8B84A';
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', centerX, 3);
  }, [playerPos, lakeCenter, grassPatches, discoveredGrassIndexes, villages, fountains]);

  return (
    <div className="relative pointer-events-auto select-none flex flex-col items-center">
      <div className="relative p-0.5 rounded-full border-2 border-[#b4862a] shadow-[0_0_16px_rgba(180,134,42,0.35)] bg-[#0c0817]">
        <canvas ref={canvasRef} className="w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] block rounded-full" />
      </div>
      <div className="mt-1 px-2 py-0.5 bg-[#0e091c]/95 border border-[#2b1f40] rounded-xs text-[7px] font-pixel text-[#cbd5e1] shadow-sm tabular-nums">
        X: {Math.round(playerPos.x)} · Z: {Math.round(playerPos.z)}
      </div>
    </div>
  );
};
