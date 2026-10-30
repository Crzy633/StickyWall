export const SHADOW_BAND_HEIGHT = 1800;
export const SHADOW_TILE_HEIGHT = 1280;
export const SHADOW_BLEED = 32;
const SHADOW_REACH = 1800;

export function visibleShadowBands(start: number, length: number) {
  const first = Math.floor((start - SHADOW_REACH) / SHADOW_BAND_HEIGHT);
  const last = Math.floor((start + length + SHADOW_REACH) / SHADOW_BAND_HEIGHT);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export function visibleShadowTiles(view: { x: number; y: number; width: number; height: number }) {
  const left = Math.floor(view.x / SHADOW_TILE_HEIGHT) - 1;
  const right = Math.floor((view.x + view.width) / SHADOW_TILE_HEIGHT) + 1;
  const top = Math.floor(view.y / SHADOW_TILE_HEIGHT) - 1;
  const bottom = Math.floor((view.y + view.height) / SHADOW_TILE_HEIGHT) + 1;
  const columns = right - left + 1, count = columns * (bottom - top + 1);
  // At distant overview scales the fine shadow detail is omitted rather than allocating unbounded canvases.
  if (count > 144) return [];
  return Array.from({ length: count }, (_, i) => ({ column: left + i % columns, row: top + Math.floor(i / columns) }));
}

export function shadowBand(index: number, column = 0) {
  let state = (Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(column, 0x85ebca6b) ^ 0x41c6ce57) || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  return {
    x: .15 + random() * .7,
    y: 320 + random() * 600,
    angle: -.65 + random() * .3,
    width: 1.4 + random() * .6,
    edgeCount: random() > .8 ? 2 : 1,
    edgeSpacing: 340 + random() * 240,
    thickness: 25 + random() * 24,
    strength: .6 + random() * .3,
    branchSide: random() > .5 ? 1 : -1,
    branchY: 80 + random() * 900,
    branchLength: .6 + random() * .3,
    bend: .75 + random() * .5,
    leaves: Array.from({ length: 12 + Math.floor(random() * 7) }, (_, leafIndex) => ({
      at: leafIndex + .2 + random() * .6,
      side: random() > .5 ? 1 : -1,
      spread: 22 + random() * 46,
      length: 30 + random() * 36,
      breadth: .22 + random() * .2,
      angle: -.9 + random() * 1.8,
    })),
  };
}
