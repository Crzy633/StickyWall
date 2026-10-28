import { useLayoutEffect, useRef, useState } from 'react';
import { shadowBand, SHADOW_BAND_HEIGHT, SHADOW_BLEED, SHADOW_TILE_HEIGHT, visibleShadowBands } from './daylight';

function paintTile(surface: HTMLCanvasElement, width: number, index: number) {
  // Soft shadows need no high-DPI bitmap; nearby document tiles are painted once.
  surface.width = width + SHADOW_BLEED * 2;
  surface.height = SHADOW_TILE_HEIGHT + SHADOW_BLEED * 2;
  const ctx = surface.getContext('2d');
  if (!ctx) return;
  ctx.translate(SHADOW_BLEED, 0);
  ctx.fillStyle = '#52604b';
  ctx.strokeStyle = '#52604b';
  const worldTop = index * SHADOW_TILE_HEIGHT - SHADOW_BLEED;

  for (const bandIndex of visibleShadowBands(worldTop, surface.height)) {
    const band = shadowBand(bandIndex);
    const origin = bandIndex * SHADOW_BAND_HEIGHT - worldTop;
    const span = Math.min(1800, width * band.width);
    ctx.save();
    ctx.translate(width * band.x, origin + band.y);
    ctx.rotate(band.angle);
    ctx.globalAlpha = band.strength;
    for (let edge = 0; edge < band.edgeCount; edge++) {
      ctx.fillRect(-span / 2, edge * band.edgeSpacing, span, band.thickness);
    }
    ctx.restore();

    ctx.save();
    const side = band.branchSide;
    const length = Math.min(620, width * band.branchLength);
    ctx.translate(width * (side > 0 ? 1.02 : -.02), origin + band.branchY);
    ctx.rotate(band.angle * .4);
    ctx.globalAlpha = band.strength * .85;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-side * length * .35, 40, -side * length * .8, 210 * band.bend, -side * length, 380 * band.bend);
    ctx.stroke();
    for (const leaf of band.leaves) {
      const along = leaf.at / band.leaves.length;
      const x = -side * length * along;
      const y = 380 * along * along * band.bend;
      const leafX = x + leaf.side * leaf.spread;
      const leafY = y - leaf.spread * .6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(leafX, leafY);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(leafX, leafY, leaf.length, leaf.length * leaf.breadth, leaf.angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function ShadowTile({ index, width, height }: { index: number; width: number; height: number }) {
  const tile = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const target = tile.current;
    const surface = canvas.current;
    if (!target || !surface) return;
    let painted = false;
    const show = () => {
      if (!painted) { paintTile(surface, width, index); painted = true; }
    };
    const rect = target.getBoundingClientRect();
    if (rect.bottom >= -SHADOW_TILE_HEIGHT && rect.top <= window.innerHeight + SHADOW_TILE_HEIGHT) show();
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) show();
      else if (painted) {
        surface.width = 0;
        surface.height = 0;
        painted = false;
      }
    }, { rootMargin: SHADOW_TILE_HEIGHT + 'px 0px' });
    observer.observe(target);
    return () => { observer.disconnect(); surface.width = 0; surface.height = 0; };
  }, [index, width]);

  return <div ref={tile} className="daylight-tile" style={{ top: index * SHADOW_TILE_HEIGHT, height }}>
    <canvas ref={canvas} width={0} height={0} style={{ left: -SHADOW_BLEED, top: -SHADOW_BLEED, width: width + SHADOW_BLEED * 2, height: SHADOW_TILE_HEIGHT + SHADOW_BLEED * 2 }} />
  </div>;
}

export default function SunlightLayer() {
  const layer = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const root = layer.current?.parentElement;
    if (!root) return;
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      setWorld(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    return () => observer.disconnect();
  }, []);

  return <div ref={layer} className="daylight" aria-hidden="true">
    {Array.from({ length: Math.ceil(world.height / SHADOW_TILE_HEIGHT) }, (_, index) => <ShadowTile key={index} index={index} width={world.width} height={Math.min(SHADOW_TILE_HEIGHT, world.height - index * SHADOW_TILE_HEIGHT)} />)}
  </div>;
}

