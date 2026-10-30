import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterCount, clampCamera, compareNotes, edgePanVelocity, gap, mergeNotes, paperPosition, placementError, request } from './wall.ts';
import type { Layout, Note } from './wall.ts';
import { shadowBand, SHADOW_BAND_HEIGHT, SHADOW_TILE_HEIGHT, visibleShadowBands, visibleShadowTiles } from './daylight.ts';

test('paper placement stays the same across reload, filtering and pagination', () => {
  const placement = paperPosition('12345');
  assert.deepEqual(paperPosition('12345'), placement);
  assert.ok(Math.abs(placement.rotation) <= 4);
  assert.ok(Math.abs(placement.offset) <= 22);
  assert.ok(placement.width >= 82 && placement.width <= 94);
  assert.ok(placement.drop >= 0 && placement.drop <= 54);
  assert.notDeepEqual(paperPosition('12346'), placement);
});

test('neighbouring notes vary in angle, width and spacing without shuffling the input', () => {
  const ids = Array.from({ length: 100 }, (_, index) => String(100 - index));
  const positions = ids.map(id => paperPosition(id));
  assert.ok(new Set(positions.map(item => item.rotation)).size > 30);
  assert.ok(new Set(positions.map(item => item.width)).size >= 8);
  assert.ok(new Set(positions.map(item => item.drop)).size > 20);
  assert.ok(positions.some(item => item.rotation < -2));
  assert.ok(positions.some(item => item.rotation > 2));
  assert.equal(ids[0], '100');
  assert.equal(ids.at(-1), '1');
});

test('very tall notes stay upright while long paragraphs retain a gentle tilt', () => {
  const ordinary = paperPosition('18');
  const paragraph = paperPosition('18', '暖'.repeat(500));
  const tall = paperPosition('18', '字\n'.repeat(250));
  assert.equal(tall.rotation, 0);
  assert.ok(Math.abs(paragraph.rotation) <= 1.6);
  assert.equal(tall.width, ordinary.width);
  assert.equal(tall.drop, ordinary.drop);
  assert.equal(tall.tape, ordinary.tape);
});

test('overlapping cursor pages preserve chronological order and do not duplicate notes', () => {
  const note = (id: string) => ({ id } as Note);
  assert.deepEqual(mergeNotes([note('9'), note('8')], [note('8'), note('7')]).map(n => n.id), ['9', '8', '7']);
});

test('limits count Unicode code points consistently with Go', () => {
  assert.equal(characterCount('今天☀️很好🌻'), 7);
  assert.equal(characterCount('🌻'.repeat(500)), 500);
});

const paper = (x = -160, y = -160): Layout => ({ x, y, width: 320, height: 320, color: 'yellow', kind: 'note', texts: [], strokes: [] });
const root = { id: '1', mine: true, layout: paper() } as Note;
test('placement preview enforces origin, Euclidean spacing and connected growth', () => {
  assert.equal(placementError(paper(), []), '');
  assert.notEqual(placementError(paper(-59, -160), []), '');
  for (const x of [176, 192, 320]) assert.equal(placementError(paper(x, -160), [root]), '');
  for (const x of [159, 160, 175, 321]) assert.notEqual(placementError(paper(x, -160), [root]), '');
  assert.equal(placementError(paper(260, 260), [root]), '');
  assert.notEqual(placementError(paper(280, 280), [root]), '');
  assert.equal(gap(paper(260, 260), root.layout), Math.hypot(100, 100));
  const small = { ...paper(241, -160), width: 160 };
  assert.notEqual(placementError(small, [root]), '');
});
test('stack previews require ownership, the lower half and room around neighbours', () => {
  const p = { ...paper(-120, 0), parentId: '1' };
  assert.equal(placementError(p, [root]), '');
  assert.notEqual(placementError(p, [{ ...root, mine: false }]), '');
  assert.notEqual(placementError({ ...p, y: -1 }, [root]), '');
  assert.notEqual(placementError({ ...p, y: 160 }, [root]), '');
  assert.notEqual(placementError(p, [root, { id: '2', mine: false, layout: paper(200, 0) } as Note]), '');
  assert.notEqual(placementError({ ...paper(192), kind: 'photo' }, [root]), '');
  assert.notEqual(placementError({ ...root.layout, kind: 'photo', parentId: '1' }, [root]), '');
  assert.equal(placementError({ ...p, kind: 'photo', y: -120 }, [root]), '');
});

test('stack order compares instants rather than fractional timestamp strings and keeps large IDs exact', () => {
  const n = (id: string, createdAt: string) => ({ id, createdAt } as Note);
  const parent = n('9007199254740992', '2026-10-30T01:00:00Z');
  const child = n('9007199254740993', '2026-10-30T01:00:00.001Z');
  assert.deepEqual([child, parent].sort(compareNotes), [parent, child]);
  assert.ok(compareNotes(parent, { ...child, createdAt: parent.createdAt }) < 0);
  assert.equal(compareNotes(parent, parent), 0);
});
test('edge panning accelerates towards each screen edge and stops in the centre', () => {
  const viewport = { width: 1000, height: 800 };
  assert.deepEqual(edgePanVelocity({ x: 500, y: 400 }, viewport), { x: 0, y: 0 });
  assert.deepEqual(edgePanVelocity({ x: 96, y: 704 }, viewport), { x: 0, y: 0 });
  assert.deepEqual(edgePanVelocity({ x: 0, y: 400 }, viewport), { x: -1200, y: 0 });
  assert.deepEqual(edgePanVelocity({ x: 1000, y: 400 }, viewport), { x: 1200, y: 0 });
  assert.deepEqual([96, 72, 48, 24, 0].map(distance => edgePanVelocity({ x: 1000 - distance, y: 400 }, viewport).x), [0, 75, 300, 675, 1200]);
  for (const point of [{ x: 0, y: 0 }, { x: 1000, y: 800 }, { x: -100, y: 900 }]) {
    const velocity = edgePanVelocity(point, viewport);
    assert.ok(Math.abs(Math.hypot(velocity.x, velocity.y) - 1200) < 1e-9);
    assert.equal(Math.sign(velocity.x), point.x < 500 ? -1 : 1);
    assert.equal(Math.sign(velocity.y), point.y < 400 ? -1 : 1);
  }
  assert.deepEqual(edgePanVelocity({ x: 0, y: 0 }, { width: 0, height: 0 }), { x: 0, y: 0 });
});

test('camera allows 1000px of surrounding wall while bounding remote empty areas', () => {
  assert.deepEqual(clampCamera({ x: 100000, y: -100000, zoom: 1 }, [root], { width: 2800, height: 2400 }), { x: 0, y: 0, zoom: 1 });
  assert.deepEqual(clampCamera({ x: 100000, y: -100000, zoom: 1 }, [root], { width: 800, height: 800 }), { x: 760, y: -760, zoom: 1 });
  const c = clampCamera({ x: 100000, y: -100000, zoom: 1 }, [root], { width: 390, height: 600 });
  assert.equal(c.x, 965); assert.equal(c.y, -860);
  const corner = clampCamera({ x: 10000, y: 10000, zoom: 1 }, [root, { ...root, id: '2', layout: paper(10000, -160) }, { ...root, id: '3', layout: paper(-160, 10000) }], { width: 390, height: 600 });
  assert.ok(corner.x < 1500 || corner.y < 1500, 'remote empty corners must remain bounded near a note');
});

test('an offline publish returns an actionable message', async context => {
  context.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(request('/api/notes', { method: 'POST' }), { message: '暂时连不上留言墙，请检查网络后重试。' });
});

test('a stalled publish times out so the composer can be used again', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  context.mock.method(globalThis, 'fetch', (_path: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const pending = request('/api/notes', { method: 'POST' });
  context.mock.timers.tick(12000);
  await assert.rejects(pending, { message: '这次等待有点久，文字还在，请稍后再试。' });
});

test('the same world position keeps its shadows regardless of scroll direction', () => {
  const original = shadowBand(21);
  shadowBand(22);
  shadowBand(2);
  assert.deepEqual(shadowBand(21), original);
});

test('shadows are stable in both world axes, including negative coordinates', () => {
  assert.deepEqual(shadowBand(-3, -7), shadowBand(-3, -7));
  assert.notDeepEqual(shadowBand(-3, -7), shadowBand(-3, -6));
  assert.notDeepEqual(shadowBand(-3, -7), shadowBand(-2, -7));
  assert.ok(visibleShadowBands(-4000, 600).every(index => index < 0));
});

test('world shadow tiles preload every viewport edge and stay allocated across a tile boundary', () => {
  const before = visibleShadowTiles({ x: 0, y: 0, width: 600, height: 600 });
  assert.ok(before.some(t => t.column === -1 && t.row === -1));
  assert.ok(before.some(t => t.column === 1 && t.row === 1));
  const left = visibleShadowTiles({ x: SHADOW_TILE_HEIGHT - 1, y: -10, width: 600, height: 600 });
  const right = visibleShadowTiles({ x: SHADOW_TILE_HEIGHT, y: -10, width: 600, height: 600 });
  for (const column of [0, 1, 2]) {
    assert.ok(left.some(t => t.column === column && t.row === 0));
    assert.ok(right.some(t => t.column === column && t.row === 0));
  }
  assert.ok(before.length <= 144);
  assert.deepEqual(visibleShadowTiles({ x: -1e6, y: -1e6, width: 2e6, height: 2e6 }), []);
});

test('deep page shadows do not reuse a small repeating tile', () => {
  const patterns = Array.from({ length: 1000 }, (_, index) => JSON.stringify(shadowBand(index)));
  assert.equal(new Set(patterns).size, 1000);
  assert.notDeepEqual(shadowBand(2), shadowBand(100002));
});

test('shadow rendering stays bounded and keeps neighbouring bands across boundaries', () => {
  const before = visibleShadowBands(SHADOW_BAND_HEIGHT - 1, 1000);
  const after = visibleShadowBands(SHADOW_BAND_HEIGHT, 1000);
  assert.ok(before.includes(0) && after.includes(0));
  assert.ok(before.includes(1) && after.includes(1));
  const deep = visibleShadowBands(SHADOW_BAND_HEIGHT * 100000, 1000);
  assert.ok(deep.length <= 6);
  assert.ok(deep.includes(100000));
  assert.ok(deep[0] > 99990);
});
