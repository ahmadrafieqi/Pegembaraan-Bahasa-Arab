import React, { useEffect, useRef } from 'react';
import {
  GameProgressState,
  NPC_LOCATIONS,
  STAGE1_OBJECTS,
  STAGE2_CARDS,
  STAGE3_SENTENCES,
} from '../game/curriculum';
import { MinimapSnapshot } from '../game/WorldCanvas';

interface MinimapProps {
  snapshot: MinimapSnapshot;
  progress: GameProgressState;
  onOpenWorldMap: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  snapshot,
  progress,
  onOpenWorldMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Zone strips
    ctx.fillStyle = '#334155';
    ctx.fillRect(8, 6, w - 16, 38);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(8, 44, w - 16, 32);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(8, 76, w - 16, 34);

    // Main cobblestone path
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(w / 2 - 4, 6, 8, h - 12);

    const toMapX = (wx: number) => ((wx + 35) / 70) * (w - 16) + 8;
    const toMapY = (wz: number) => ((wz + 95) / 145) * (h - 12) + 6;

    // NPCs (gold)
    Object.values(NPC_LOCATIONS).forEach((loc) => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(toMapX(loc.x), toMapY(loc.z), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Stage 1 Objects
    STAGE1_OBJECTS.forEach((obj) => {
      const done = Object.prototype.hasOwnProperty.call(progress.s1Answered, obj.id);
      ctx.fillStyle = done ? (progress.s1Answered[obj.id] ? '#34d399' : '#94a3b8') : '#38bdf8';
      ctx.beginPath();
      ctx.arc(toMapX(obj.pos.x), toMapY(obj.pos.z), 2.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Stage 2 Cards (uncollected)
    STAGE2_CARDS.forEach((card) => {
      if (progress.s2Collected[card.id]) return;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(toMapX(card.pos.x), toMapY(card.pos.z), 2.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Stage 3 Sentences
    STAGE3_SENTENCES.forEach((sent) => {
      const done = Object.prototype.hasOwnProperty.call(progress.s3Answered, sent.id);
      ctx.fillStyle = done ? (progress.s3Answered[sent.id] ? '#34d399' : '#94a3b8') : '#a78bfa';
      ctx.beginPath();
      ctx.arc(toMapX(sent.pos.x), toMapY(sent.pos.z), 2.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player marker
    const px = toMapX(snapshot.playerX);
    const py = toMapY(snapshot.playerZ);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(px, py, 2.7, 0, Math.PI * 2);
    ctx.fill();
  }, [snapshot, progress]);

  let zoneLabel = 'Singgahsana';
  if (snapshot.playerZ > 16) zoneLabel = 'Kampung';
  else if (snapshot.playerZ > -22) zoneLabel = 'Hutan';
  else if (snapshot.playerZ > -61) zoneLabel = 'Istana';

  return (
    <button
      type="button"
      onClick={onOpenWorldMap}
      title="Klik untuk buka Peta Dunia (M)"
      className="relative rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg cursor-pointer block focus-visible:outline-2 focus-visible:outline-amber-300"
    >
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        className="block bg-slate-900 w-[108px] h-[108px] sm:w-[126px] sm:h-[126px]"
      />
      <div className="absolute bottom-1 left-1.5 right-1.5 flex justify-between items-center text-[10px] font-bold text-amber-200 pointer-events-none bg-slate-950/60 px-1.5 py-0.5 rounded-md">
        <span>{zoneLabel}</span>
        <span>[M]</span>
      </div>
    </button>
  );
};
