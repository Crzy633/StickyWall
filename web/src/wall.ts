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
export type Note = { id: string; content: string; author: string; category: Category; paperSize?: PaperSize | 'auto'; createdAt: string };
export type NotesPage = { notes: Note[]; nextCursor: string | null; headCursor: string | null; total: number };

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
