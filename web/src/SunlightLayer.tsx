import { memo, useLayoutEffect, useRef } from 'react';
import { shadowBand, SHADOW_BAND_HEIGHT, SHADOW_BLEED, SHADOW_TILE_HEIGHT, visibleShadowBands, visibleShadowTiles } from './daylight';

function paintTile(surface: HTMLCanvasElement, column: number, row: number, resolution: number) {
  const size = SHADOW_TILE_HEIGHT + SHADOW_BLEED * 2;
  surface.width = surface.height = size * resolution;
  const ctx = surface.getContext('2d');
  if (!ctx) return;
  const left = column * SHADOW_TILE_HEIGHT - SHADOW_BLEED;
  const top = row * SHADOW_TILE_HEIGHT - SHADOW_BLEED;
  ctx.scale(resolution, resolution);
  ctx.translate(-left, -top);
  ctx.fillStyle = ctx.strokeStyle = '#52604b';

  for (const sourceColumn of visibleShadowBands(left, size)) {
    for (const sourceRow of visibleShadowBands(top, size)) {
      const band = shadowBand(sourceRow, sourceColumn);
      const originX = sourceColumn * SHADOW_BAND_HEIGHT;
      const originY = sourceRow * SHADOW_BAND_HEIGHT;
      ctx.save();
      ctx.translate(originX + SHADOW_BAND_HEIGHT * band.x, originY + band.y);
      ctx.rotate(band.angle);
      ctx.globalAlpha = band.strength;
      for (let edge = 0; edge < band.edgeCount; edge++) {
        ctx.fillRect(-900, edge * band.edgeSpacing, 1800, band.thickness);
      }
      ctx.restore();

      ctx.save();
      const side = band.branchSide, length = 620;
      ctx.translate(originX + SHADOW_BAND_HEIGHT * (side > 0 ? 1.02 : -.02), originY + band.branchY);
      ctx.rotate(band.angle * .4);
      ctx.globalAlpha = band.strength * .85;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-side * length * .35, 40, -side * length * .8, 210 * band.bend, -side * length, 380 * band.bend);
      ctx.stroke();
      for (const leaf of band.leaves) {
        const along = leaf.at / band.leaves.length;
        const x = -side * length * along, y = 380 * along * along * band.bend;
        const leafX = x + leaf.side * leaf.spread, leafY = y - leaf.spread * .6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(leafX, leafY); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(leafX, leafY, leaf.length, leaf.length * leaf.breadth, leaf.angle, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
}

const ShadowTile = memo(function ShadowTile({ column, row, resolution }: { column: number; row: number; resolution: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    // Paint before this world tile becomes visible; camera movement never waits for an observer or timer.
    paintTile(surface, column, row, resolution);
    return () => { surface.width = surface.height = 0; };
  }, [column, row, resolution]);
  return <div className="daylight-tile" style={{ left: column * SHADOW_TILE_HEIGHT, top: row * SHADOW_TILE_HEIGHT, width: SHADOW_TILE_HEIGHT, height: SHADOW_TILE_HEIGHT }}>
    <canvas ref={canvas} width={0} height={0} style={{ left: -SHADOW_BLEED, top: -SHADOW_BLEED, width: SHADOW_TILE_HEIGHT + SHADOW_BLEED * 2, height: SHADOW_TILE_HEIGHT + SHADOW_BLEED * 2 }} />
  </div>;
});

export default function SunlightLayer({ view, zoom }: { view: { x: number; y: number; width: number; height: number }; zoom: number }) {
  const resolution = Math.max(1 / 16, Math.min(.5, 2 ** Math.ceil(Math.log2(zoom))));
  return <div className="daylight" aria-hidden="true">{visibleShadowTiles(view).map(tile => <ShadowTile key={`${tile.column}:${tile.row}`} {...tile} resolution={resolution} />)}</div>;
}
