import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterCount, mergeNotes, paperPosition, request } from './wall.ts';
import type { Note } from './wall.ts';
import { shadowBand, SHADOW_BAND_HEIGHT, visibleShadowBands } from './daylight.ts';

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
