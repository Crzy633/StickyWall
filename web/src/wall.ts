export const categories = [
  { id: 'daily', label: '日常碎片', hint: '把平凡的一天，也好好收藏。' },
  { id: 'joy', label: '小小确幸', hint: '今天有什么，让你悄悄开心？' },
  { id: 'thoughts', label: '想说的话', hint: '那些没说出口的话，可以留在这里。' },
  { id: 'wishes', label: '许个心愿', hint: '写下来，也许好事正在路上。' },
] as const;

export type Category = typeof categories[number]['id'];
export const paperSizes = [
  { id: 'small', label: '短笺', lines: 6 },
  { id: 'medium', label: '方笺', lines: 9 },
  { id: 'large', label: '长笺', lines: 12 },
] as const;
export type PaperSize = typeof paperSizes[number]['id'];
export type Ink = { color: string; width: number; points: [number, number][] };
export type TextBlock = { x: number; y: number; width: number; size: number; color: string; text: string };
export type Layout = { x: number; y: number; width: number; height: number; color: 'yellow' | 'green' | 'pink' | 'blue'; kind: 'note' | 'photo'; parentId?: string; image?: string; texts: TextBlock[]; strokes: Ink[] };
export type Note = { id: string; content: string; author: string; category: Category; paperSize?: PaperSize | 'auto'; createdAt: string; layout: Layout; mine: boolean };
export type NotesPage = { notes: Note[]; nextCursor: string | null; headCursor: string | null; total: number };

export function compareNotes(a: Note, b: Note) {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || (BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0);
}

export function gap(a: Layout, b: Layout) {
  return Math.hypot(Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width), Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height));
}
export function overlaps(a: Layout, b: Layout) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
export function ancestors(layout: Layout, notes: Note[]) {
  const result = new Set<string>(); let id = layout.parentId;
  while (id && !result.has(id)) { result.add(id); id = notes.find(n => n.id === id)?.layout.parentId; }
  return result;
}
export function placementError(p: Layout, notes: Note[]) {
  if (!notes.length) return p.parentId || p.kind === 'photo' || Math.hypot(p.x + p.width / 2, p.y + p.height / 2) > 100 ? '把纸张中心放进圆圈里' : '';
  const ignored = ancestors(p, notes);
  if (p.parentId) {
    const n = notes.find(n => n.id === p.parentId);
    if (!n?.mine || n.layout.kind === 'photo') return '只能贴在自己的便签上';
    const q = n.layout;
    if (!overlaps(p, q) || (p.kind !== 'photo' && (p.y < q.y + q.height / 2 || p.y >= q.y + q.height)) || (p.x <= q.x && p.y <= q.y && p.x + p.width >= q.x + q.width && p.y + p.height >= q.y + q.height)) return '从原便签的下半部贴起，留出原便签';
  } else if (p.kind === 'photo') return '先选一张自己的便签';
  let connected = !!p.parentId;
  for (const n of notes) {
    if (ignored.has(n.id)) continue;
    const d = gap(p, n.layout);
    if (overlaps(p, n.layout) || d < 16) return '离其它便签太近了，留一点空隙';
    if (d <= Math.min(p.width, p.height, n.layout.width, n.layout.height) / 2) connected = true;
  }
  return connected ? '' : '离大家太远了，最多隔半张便签';
}
export type Camera = { x: number; y: number; zoom: number };
export function edgePanVelocity(point: { x: number; y: number }, viewport: { width: number; height: number }) {
  const maxSpeed = 1200;
  const axis = (position: number, size: number) => {
    const zone = Math.min(96, size / 4);
    if (zone <= 0) return 0;
    if (position < zone) return -maxSpeed * Math.min(1, (zone - position) / zone) ** 2;
    if (position > size - zone) return maxSpeed * Math.min(1, (position - size + zone) / zone) ** 2;
    return 0;
  };
  const x = axis(point.x, viewport.width), y = axis(point.y, viewport.height);
  const scale = Math.min(1, maxSpeed / Math.hypot(x, y));
  return { x: x * scale, y: y * scale };
}
export function wallBounds(notes: Note[]) {
  if (!notes.length) return { left: -240, top: -240, right: 240, bottom: 240 };
  return notes.reduce((b, { layout: p }) => ({ left: Math.min(b.left, p.x), top: Math.min(b.top, p.y), right: Math.max(b.right, p.x + p.width), bottom: Math.max(b.bottom, p.y + p.height) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
}
export function clampCamera(c: Camera, notes: Note[], viewport: { width: number; height: number }): Camera {
  const b = wallBounds(notes);
  const padding = 1000;
  const axis = (v: number, low: number, high: number, size: number) => {
    const lo = low - padding + size / (2 * c.zoom), hi = high + padding - size / (2 * c.zoom);
    return lo > hi ? (low + high) / 2 : Math.max(lo, Math.min(hi, v));
  };
  const result = { ...c, x: axis(c.x, b.left, b.right, viewport.width), y: axis(c.y, b.top, b.bottom, viewport.height) };
  const halfW = viewport.width / (2 * c.zoom), halfH = viewport.height / (2 * c.zoom);
  if (notes.length && !notes.some(({ layout: p }) => p.x + p.width + padding > result.x - halfW && p.x - padding < result.x + halfW && p.y + p.height + padding > result.y - halfH && p.y - padding < result.y + halfH)) {
    const nearest = notes.reduce((best, n) => Math.hypot(n.layout.x + n.layout.width / 2 - result.x, n.layout.y + n.layout.height / 2 - result.y) < Math.hypot(best.layout.x + best.layout.width / 2 - result.x, best.layout.y + best.layout.height / 2 - result.y) ? n : best).layout;
    result.x = axis(result.x, nearest.x, nearest.x + nearest.width, viewport.width);
    result.y = axis(result.y, nearest.y, nearest.y + nearest.height, viewport.height);
  }
  return result;
}

export function paperPosition(id: string, content = '') {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  const stable = (hash ^ (hash >>> 16)) >>> 0;
  const length = characterCount(content);
  const tilt = length > 180 ? .4 : length > 80 ? .65 : 1;
  // Tall, newline-heavy paper must stay upright so its corners cannot sweep into other notes.
  const upright = (content.match(/\n/g) || []).length > 10;
  return {
    rotation: upright ? 0 : ((stable % 81) - 40) / 10 * tilt,
    offset: (((stable >>> 6) % 45) - 22) * tilt,
    width: 82 + (stable >>> 12) % 13,
    drop: (stable >>> 18) % 55,
    height: 232 + (stable >>> 24) % 65,
    tape: stable % 3,
  };
}

export function mergeNotes(existing: Note[], incoming: Note[]) {
  const seen = new Set(existing.map(note => note.id));
  return [...existing, ...incoming.filter(note => !seen.has(note.id))];
}

export function characterCount(value: string) { return Array.from(value).length; }

export function noteDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options?.signal?.aborted) controller.abort();
  options?.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || '暂时连不上留言墙，请稍后再试。');
    }
    return await response.json();
  } catch (reason) {
    if (options?.signal?.aborted) throw reason;
    if (controller.signal.aborted) throw new Error('这次等待有点久，文字还在，请稍后再试。');
    if (reason instanceof TypeError) throw new Error('暂时连不上留言墙，请检查网络后重试。');
    throw reason;
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', abort);
  }
}
