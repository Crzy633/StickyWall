import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { clampCamera, compareNotes, edgePanVelocity, placementError, request, wallBounds } from './wall';
import type { Camera, Layout, Note, NotesPage } from './wall';
import { Paper, PaperContent } from './Paper';
import Editor from './Editor';
import PlacementArea from './PlacementArea';
import SunlightLayer from './SunlightLayer';

function Icon({ name }: { name: 'plus' | 'minus' | 'image' | 'stack' | 'move' }) {
  const paths: Record<string, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>,
    stack: <><rect x="3" y="3" width="12" height="12" rx="1" /><path d="M9 15v6h12V9h-6" /></>,
    move: <path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4" />,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const freshPaper = (): Layout => ({ x: -160, y: -160, width: 320, height: 320, color: 'yellow', kind: 'note', texts: [{ x: 28, y: 38, width: 264, size: 21, color: '#474b3e', text: '' }], strokes: [] });
type Draft = { layout: Layout; author: string };
function savedDraft(): Draft {
  try { const value = JSON.parse(localStorage.getItem('wall-draft-v2') || 'null'); if (value?.layout?.kind && Array.isArray(value.layout.texts) && Array.isArray(value.layout.strokes)) return value; } catch { /* Storage can be blocked or full. */ }
  return { layout: freshPaper(), author: '' };
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [draft, setDraft] = useState<Draft>(savedDraft);
  const [phase, setPhase] = useState<'browse' | 'edit' | 'place'>('browse'), [selected, setSelected] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight }), [refresh, setRefresh] = useState(0);
  const wall = useRef<HTMLDivElement>(null), upload = useRef<HTMLInputElement>(null);
  const pan = useRef<{ x: number; y: number; camera: Camera } | null>(null);
  const edgeFrame = useRef<number | null>(null), placementPointer = useRef<{ id: number; clientX: number; clientY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<{ distance: number; camera: Camera; x: number; y: number } | null>(null);
  const initialized = useRef(false), liveNotes = useRef(notes), liveCamera = useRef(camera), dragged = useRef(false);
  liveNotes.current = notes; liveCamera.current = camera;
  const active = notes.find(n => n.id === selected), invalid = placementError(draft.layout, notes);
  const bounds = wallBounds(notes);
  const fitZoom = Math.min(1, Math.max(40, viewport.width - 100) / Math.max(1, bounds.right - bounds.left), Math.max(40, viewport.height - 180) / Math.max(1, bounds.bottom - bounds.top));
  const minimumZoom = Math.min(.25, fitZoom);

  const load = useCallback(async (signal: AbortSignal) => {
    const loaded: Note[] = []; let cursor: string | null = null;
    do {
      const page: NotesPage = await request(`/api/notes?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal });
      loaded.push(...page.notes); cursor = page.nextCursor;
    } while (cursor && !signal.aborted);
    if (signal.aborted) return;
    loaded.sort(compareNotes);
    setNotes(previous => [...new Map([...previous, ...loaded].map(n => [n.id, n])).values()].sort(compareNotes)); setError('');
    if (!initialized.current) {
      const first = loaded[0];
      if (first) setCamera(c => ({ ...c, x: first.layout.x + first.layout.width / 2, y: first.layout.y + first.layout.height / 2 }));
      initialized.current = true;
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    load(controller.signal).catch(reason => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load, refresh]);
  useEffect(() => {
    const controller = new AbortController(); let running = false;
    const tick = async () => {
      if (document.hidden || running) return; running = true;
      try { await load(controller.signal); } catch { /* Keep the confirmed wall while offline. */ } finally { running = false; }
    };
    const interval = window.setInterval(tick, 15000); document.addEventListener('visibilitychange', tick);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [load]);
  useEffect(() => {
    const timeout = setTimeout(() => { try { localStorage.setItem('wall-draft-v2', JSON.stringify(draft)); } catch { /* The in-memory draft remains usable. */ } }, 300);
    return () => clearTimeout(timeout);
  }, [draft]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (wall.current) observer.observe(wall.current); return () => observer.disconnect();
  }, []);
  useEffect(() => { setCamera(c => clampCamera(c, notes, viewport)); }, [notes, viewport]);
  useEffect(() => {
    const node = wall.current; if (!node) return;
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.wall-chrome, .editor-dialog')) return;
      e.preventDefault();
      setCamera(c => clampCamera(e.ctrlKey || e.metaKey ? { ...c, zoom: Math.max(minimumZoom, Math.min(1.8, c.zoom * Math.exp(-e.deltaY * .0004))) } : { ...c, x: c.x + e.deltaX / c.zoom, y: c.y + e.deltaY / c.zoom }, liveNotes.current, viewport));
    };
    node.addEventListener('wheel', wheel, { passive: false }); return () => node.removeEventListener('wheel', wheel);
  }, [viewport, minimumZoom]);

  useEffect(() => {
    window.addEventListener('blur', stopEdgePan);
    return () => { window.removeEventListener('blur', stopEdgePan); stopEdgePan(); };
  }, [phase, busy, viewport]);

  function stopEdgePan() {
    if (edgeFrame.current !== null) cancelAnimationFrame(edgeFrame.current);
    edgeFrame.current = null; placementPointer.current = null;
  }
  function updateEdgePan(e: PointerEvent<HTMLDivElement>) {
    const rect = wall.current!.getBoundingClientRect();
    const speed = edgePanVelocity({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport);
    if (e.altKey || (!speed.x && !speed.y)) { stopEdgePan(); return; }
    placementPointer.current = { id: e.pointerId, clientX: e.clientX, clientY: e.clientY };
    if (edgeFrame.current !== null) return;
    let previous = performance.now();
    const step = (time: number) => {
      const pointer = placementPointer.current;
      if (!pointer || document.hidden) { stopEdgePan(); return; }
      const bounds = wall.current!.getBoundingClientRect();
      const velocity = edgePanVelocity({ x: pointer.clientX - bounds.left, y: pointer.clientY - bounds.top }, viewport);
      const elapsed = Math.max(0, Math.min((time - previous) / 1000, .04)); previous = time;
      if (!elapsed) { edgeFrame.current = requestAnimationFrame(step); return; }
      const c = liveCamera.current;
      const next = clampCamera({ ...c, x: c.x + velocity.x * elapsed / c.zoom, y: c.y + velocity.y * elapsed / c.zoom }, liveNotes.current, viewport);
      if (next.x === c.x && next.y === c.y) { stopEdgePan(); return; }
      // Move the camera and recompute the paper under the same pointer in one frame.
      liveCamera.current = next; setCamera(next); positionAt(pointer);
      edgeFrame.current = requestAnimationFrame(step);
    };
    edgeFrame.current = requestAnimationFrame(step);
  }

  function home() {
    const b = wallBounds(notes);
    setCamera(clampCamera({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2, zoom: 1 }, notes, viewport));
  }
  function zoom(delta: number) { setCamera(c => clampCamera({ ...c, zoom: Math.max(minimumZoom, Math.min(1.8, c.zoom + delta)) }, notes, viewport)); }
  function worldPoint(e: { clientX: number; clientY: number }) {
    const rect = wall.current!.getBoundingClientRect(), c = liveCamera.current;
    return { x: (e.clientX - rect.left - viewport.width / 2) / c.zoom + c.x, y: (e.clientY - rect.top - viewport.height / 2) / c.zoom + c.y };
  }
  function positionAt(e: { clientX: number; clientY: number }) {
    const p = worldPoint(e); setDraft(d => ({ ...d, layout: { ...d.layout, x: Math.round(p.x - d.layout.width / 2), y: Math.round(p.y - d.layout.height / 2) } }));
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (phase === 'edit' || (e.target as HTMLElement).closest('.wall-chrome, a') || busy) return;
    dragged.current = false;
    ((e.target as Element).closest('.wall-paper') || e.currentTarget).setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { stopEdgePan(); const [a, b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), camera, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; pan.current = null; return; }
    if (phase === 'place' && e.button === 0 && !e.altKey) { positionAt(e); updateEdgePan(e); }
    else { pan.current = { x: e.clientX, y: e.clientY, camera }; setSelected(null); }
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (busy || phase === 'edit') return;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()], start = pinch.current;
      setCamera(clampCamera({ x: start.camera.x - ((a.x + b.x) / 2 - start.x) / start.camera.zoom, y: start.camera.y - ((a.y + b.y) / 2 - start.y) / start.camera.zoom, zoom: Math.max(minimumZoom, Math.min(1.8, start.camera.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, start.distance))) }, notes, viewport)); return;
    }
    if (pan.current) {
      const p = pan.current;
      if (!dragged.current && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 4) return;
      dragged.current = true;
      const next = clampCamera({ ...p.camera, x: p.camera.x - (e.clientX - p.x) / p.camera.zoom, y: p.camera.y - (e.clientY - p.y) / p.camera.zoom }, notes, viewport);
      // Discard movement beyond the boundary so reversing the drag responds immediately.
      pan.current = { x: e.clientX, y: e.clientY, camera: next };
      setCamera(next);
    }
    else if (phase === 'place' && pointers.current.has(e.pointerId) && !(e.target as HTMLElement).closest('.wall-chrome')) { positionAt(e); updateEdgePan(e); }
  }
  function up(e: PointerEvent<HTMLDivElement>) { if (placementPointer.current?.id === e.pointerId) stopEdgePan(); pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinch.current = null; pan.current = null; }

  function edit(parentId?: string, image?: string) {
    if (parentId || image) setDraft(d => ({ author: d.author, layout: { ...freshPaper(), ...(image ? { kind: 'photo', image, width: 240, height: 280, texts: [] } : {}), parentId } }));
    else setDraft(d => ({ ...d, layout: { ...d.layout, parentId: undefined, ...(d.layout.kind === 'photo' ? freshPaper() : {}) } }));
    setSelected(null); setPhase('edit'); setError('');
  }
  function ready() {
    const p = draft.layout, parent = notes.find(n => n.id === p.parentId)?.layout;
    let x = -p.width / 2, y = -p.height / 2;
    if (parent) { x = parent.x + 24; y = parent.y + parent.height / 2; }
    else if (notes.length) {
      // Suggest a starting cursor position; only the position confirmed by the visitor is saved.
      let found = false;
      for (const n of notes) {
        for (const q of [{ x: n.layout.x + n.layout.width + 32, y: n.layout.y }, { x: n.layout.x - p.width - 32, y: n.layout.y }, { x: n.layout.x, y: n.layout.y + n.layout.height + 32 }, { x: n.layout.x, y: n.layout.y - p.height - 32 }]) {
          if (!placementError({ ...p, ...q }, notes)) { x = q.x; y = q.y; found = true; break; }
        }
        if (found) break;
      }
    }
    setDraft(d => ({ ...d, layout: { ...d.layout, x, y } }));
    setCamera(c => clampCamera({ ...c, x: x + p.width / 2, y: y + p.height / 2, zoom: Math.max(.25, Math.min(c.zoom, (viewport.width - 40) / p.width, (viewport.height - 200) / p.height)) }, notes, viewport));
    setPhase('place');
  }
  async function publish() {
    if (invalid || busy || loading || error) return; setBusy(true);
    try {
      const result = await request<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ content: '', author: draft.author.trim(), layout: draft.layout }) });
      setNotes(previous => previous.some(n => n.id === result.id) ? previous : [...previous, result]); setSelected(result.id); setPhase('browse'); setNotice(''); setDraft({ author: draft.author, layout: freshPaper() });
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '没能贴上去，草稿还在');
      try { await load(new AbortController().signal); } catch { /* Retry keeps the draft in place. */ }
    } finally { setBusy(false); }
  }
  async function photo(file?: File) {
    if (!file || !active?.mine) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 3 * 1024 * 1024) { setNotice('请选择不超过 3MB 的 PNG 或 JPEG 照片'); return; }
    const parentId = active.id;
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); edit(parentId, data);
    } catch { setNotice('照片没能读取，请重新选择'); }
  }
  const view = { x: camera.x - viewport.width / (2 * camera.zoom), y: camera.y - viewport.height / (2 * camera.zoom), width: viewport.width / camera.zoom, height: viewport.height / camera.zoom };
  const visibleNotes = notes.filter(n => n.layout.x + n.layout.width > view.x - 60 && n.layout.x < view.x + view.width + 60 && n.layout.y + n.layout.height > view.y - 60 && n.layout.y < view.y + view.height + 60);
  const actionPaper = phase === 'place' ? draft.layout : active?.layout;
  const noteActionsPosition = actionPaper ? {
    left: Math.max(12, Math.min(viewport.width - 268, viewport.width / 2 + (actionPaper.x + actionPaper.width / 2 - camera.x) * camera.zoom - 128)),
    top: Math.max(88, Math.min(viewport.height - (phase === 'place' ? 136 : 190), viewport.height / 2 + (actionPaper.y + actionPaper.height - camera.y) * camera.zoom + (phase === 'place' ? 48 : 12))),
  } : undefined;
  return <main className={`infinite-wall ${phase === 'place' ? 'placing' : ''}`} ref={wall} aria-label="日光留言墙" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={e => {
    if (e.key === 'Escape' && !busy && phase !== 'edit') { stopEdgePan(); setPhase('browse'); setSelected(null); return; }
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Home') { e.preventDefault(); home(); }
    const step = e.shiftKey ? 50 : 10;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault(); const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (phase === 'place') setDraft(d => ({ ...d, layout: { ...d.layout, x: d.layout.x + dx, y: d.layout.y + dy } }));
      else setCamera(c => clampCamera({ ...c, x: c.x + dx, y: c.y + dy }, notes, viewport));
    }
    if (e.key === 'Enter' && phase === 'place') void publish();
  }} tabIndex={0}>
    <header className="wall-heading wall-chrome"><h1>日光留言墙</h1><span>{notes.length ? `${notes.length} 张纸笺` : '公共便利贴墙'}</span></header>
    <div className="world" style={{ transform: `translate(${viewport.width / 2 - camera.x * camera.zoom}px, ${viewport.height / 2 - camera.y * camera.zoom}px) scale(${camera.zoom})` }}>
      <SunlightLayer view={view} zoom={camera.zoom} />
      {phase === 'place' && <PlacementArea draft={draft.layout} notes={notes} view={view} />}
      {!notes.length && !loading && !error && <div className="origin-marker" aria-hidden="true"><span /><span /></div>}
      {visibleNotes.map(note => <Paper key={note.id} note={note} selected={selected === note.id} onSelect={() => { if (phase !== 'place' && !dragged.current) setSelected(note.id); }} />)}
      {phase === 'place' && <div className={`placement-ghost wall-paper paper-${draft.layout.color} ${draft.layout.kind === 'photo' ? 'photo' : ''} ${invalid ? 'invalid' : 'valid'}`} style={{ left: draft.layout.x, top: draft.layout.y, width: draft.layout.width, height: draft.layout.height }}><div className="paper-face"><PaperContent layout={draft.layout} /></div><span className="placement-badge" role="status">{invalid || '可以贴在这里'}</span></div>}
    </div>
    {(loading || error || !notes.length) && phase !== 'place' && <div className="wall-state wall-chrome" role={error ? 'alert' : 'status'}>{loading ? <p>正在展开留言墙…</p> : error ? <><h2>留言暂时没能送到</h2><p>{error}</p><button onClick={() => setRefresh(n => n + 1)}>重新加载</button></> : <><h2>贴下第一张</h2><p>从圆圈里开始。</p><button className="primary-button" onClick={() => edit()}>写一张便利贴<Icon name="plus" /></button></>}</div>}
    {active?.mine && active.layout.kind !== 'photo' && phase === 'browse' && visibleNotes.some(n => n.id === active.id) && <div className="note-actions wall-chrome" role="toolbar" aria-label="我的便签操作" style={noteActionsPosition}><button onClick={() => edit(active.id)}><Icon name="stack" />叠一张便签</button><button onClick={() => upload.current?.click()}><Icon name="image" />贴一张相片</button></div>}
    <input className="sr-only" type="file" ref={upload} accept="image/png,image/jpeg" aria-label="选择相片" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ''; }} tabIndex={-1} />
    <nav className="camera-tools wall-chrome" aria-label="镜头控制"><button aria-label="缩小" onClick={() => zoom(-.15)} disabled={camera.zoom <= minimumZoom}><Icon name="minus" /></button><output aria-label="缩放比例">{Math.round(camera.zoom * 100)}%</output><button aria-label="放大" onClick={() => zoom(.15)} disabled={camera.zoom >= 1.8}><Icon name="plus" /></button></nav>
    {phase === 'place' ? <div className="note-actions wall-chrome" role="toolbar" aria-label="放置操作" style={noteActionsPosition}><button disabled={busy} onClick={() => setPhase('edit')}>返回编辑</button><button disabled={busy} aria-label="取消放置，保留草稿" onClick={() => setPhase('browse')}>取消</button><button className="primary-button" disabled={!!invalid || busy || loading || !!error} onClick={() => void publish()}>{busy ? '正在贴上…' : '贴在这里'}</button></div> : <><p className="navigation-hint"><Icon name="move" />拖动墙面 · 双指缩放</p><button className="primary-button floating-compose wall-chrome" disabled={loading || !!error} onClick={() => edit()}><Icon name="plus" />贴一张</button></>}
    {notice && <div className="toast wall-chrome" role="status">{notice}</div>}
    {phase === 'edit' && <Editor layout={draft.layout} author={draft.author} setLayout={layout => setDraft(d => ({ ...d, layout }))} setAuthor={author => setDraft(d => ({ ...d, author }))} onClose={() => setPhase('browse')} onReady={ready} />}
  </main>;
}
