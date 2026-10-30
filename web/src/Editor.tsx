import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Layout, TextBlock } from './wall';
import { PaperContent, RichText } from './Paper';

export default function Editor({ layout, author, setLayout, setAuthor, onClose, onReady }: { layout: Layout; author: string; setLayout: (p: Layout) => void; setAuthor: (a: string) => void; onClose: () => void; onReady: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<'text' | 'draw'>('text');
  const [preview, setPreview] = useState(false);
  const [selected, setSelected] = useState<number | null>(layout.texts.length ? 0 : null);
  const [ink, setInk] = useState('#474b3e');
  const [brush, setBrush] = useState(3);
  const gesture = useRef<{ kind: 'draw' | 'text'; index: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const current = useRef(layout); current.current = layout;
  useEffect(() => { dialog.current?.showModal(); }, []);
  useLayoutEffect(() => {
    paper.current?.querySelectorAll('textarea').forEach(node => { node.style.height = 'auto'; node.style.height = `${node.scrollHeight}px`; });
  }, [layout.texts, preview]);
  useEffect(() => {
    const node = frame.current; if (!node) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, (node.clientWidth - 32) / layout.width, (node.clientHeight - 40) / layout.height)));
    observer.observe(node); return () => observer.disconnect();
  }, [layout.width, layout.height]);
  const text = selected === null ? null : layout.texts[selected];
  function updateText(value: Partial<TextBlock>) {
    setLayout({ ...layout, texts: layout.texts.map((t, i) => i === selected ? { ...t, ...value } : t) });
  }
  function resize(width: number, height: number) {
    const sx = width / layout.width, sy = height / layout.height;
    setLayout({ ...layout, width, height, texts: layout.texts.map(t => {
      const x = Math.min(width - 20, t.x * sx);
      return { ...t, x, y: Math.min(height - 20, t.y * sy), width: Math.min(width - x, Math.max(20, t.width * sx)), size: Math.max(12, Math.min(48, t.size * Math.min(sx, sy))) };
    }), strokes: layout.strokes.map(s => ({ ...s, points: s.points.map(([x, y]) => [Math.min(width, x * sx), Math.min(height, y * sy)]) })) });
  }
  function point(e: PointerEvent) {
    const rect = paper.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(layout.width, (e.clientX - rect.left) / scale)), y: Math.max(0, Math.min(layout.height, (e.clientY - rect.top) / scale)) };
  }
  function addText(x = 28, y = 32) {
    if (layout.texts.length >= 100) return;
    x = Math.min(x, layout.width - 48); y = Math.min(y, layout.height - 48);
    setLayout({ ...layout, texts: [...layout.texts, { x, y, width: Math.min(230, layout.width - x - 12), size: 20, color: ink, text: '' }] });
    setSelected(layout.texts.length); setMode('text'); setPreview(false);
  }
  function start(e: PointerEvent<HTMLDivElement>) {
    if (preview || layout.kind === 'photo' || e.button !== 0 || e.target !== e.currentTarget) return;
    const p = point(e);
    if (mode === 'text') { addText(p.x, p.y); return; }
    if (layout.strokes.length >= 300) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { kind: 'draw', index: layout.strokes.length, ...p, startX: p.x, startY: p.y };
    setLayout({ ...layout, strokes: [...layout.strokes, { color: ink, width: brush, points: [[p.x, p.y], [p.x + .01 > layout.width ? p.x : p.x + .01, p.y]] }] });
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current; if (!g) return;
    const p = point(e), value = current.current;
    if (g.kind === 'draw') {
      if (value.strokes.reduce((n, s) => n + s.points.length, 0) >= 30000) return;
      setLayout({ ...value, strokes: value.strokes.map((s, i) => i === g.index ? { ...s, points: [...s.points, [p.x, p.y]] } : s) });
    } else {
      setLayout({ ...value, texts: value.texts.map((t, i) => i === g.index ? { ...t, x: Math.max(0, Math.min(value.width - t.width, g.startX + p.x - g.x)), y: Math.max(0, Math.min(value.height - 32, g.startY + p.y - g.y)) } : t) });
    }
  }
  const empty = layout.kind !== 'photo' && !layout.texts.some(t => t.text.trim()) && !layout.strokes.length;
  const count = layout.texts.reduce((sum, t) => sum + Array.from(t.text).length, 0);
  return <dialog ref={dialog} className="editor-dialog" aria-labelledby="editor-title" onCancel={onClose}>
    <header className="editor-heading"><h2 id="editor-title">{layout.kind === 'photo' ? '贴一张相片' : '写一张便利贴'}</h2><button className="icon-button" onClick={onClose} aria-label="关闭并保留草稿"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></header>
    <div className="editor-body">
      <section className="editor-workspace" aria-label="纸张编辑区">
        <div className="editor-tabs"><button aria-pressed={!preview} onClick={() => setPreview(false)}>编辑</button><button aria-pressed={preview} onClick={() => setPreview(true)}>预览</button></div>
        <div className="editor-frame" ref={frame}><div style={{ width: layout.width * scale, height: layout.height * scale }}><div ref={paper} className={`editor-paper paper-${layout.color} ${mode === 'draw' && !preview ? 'drawing' : ''} ${layout.kind === 'photo' ? 'photo' : ''}`} style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }} onPointerDown={start} onPointerMove={move} onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }}>
          {preview || layout.kind === 'photo' ? <PaperContent layout={layout} /> : <>
            <svg className="ink-layer" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">{layout.strokes.map((s, i) => <polyline key={i} points={s.points.map(p => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />)}</svg>
            {layout.texts.map((t, i) => <div key={i} className={`editable-text ${selected === i ? 'active' : ''}`} style={{ left: t.x, top: t.y, width: t.width, fontSize: t.size, color: t.color, pointerEvents: mode === 'draw' ? 'none' : undefined }}>
              <button className="text-handle" aria-label={`移动文字块 ${i + 1}`} onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setSelected(i); const p = point(e); gesture.current = { kind: 'text', index: i, ...p, startX: t.x, startY: t.y }; }} onKeyDown={e => { const d = e.shiftKey ? 10 : 1; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setSelected(i); setLayout({ ...layout, texts: layout.texts.map((t, j) => j !== i ? t : { ...t, x: Math.max(0, Math.min(layout.width - t.width, t.x + (e.key === 'ArrowRight' ? d : e.key === 'ArrowLeft' ? -d : 0))), y: Math.max(0, Math.min(layout.height - 32, t.y + (e.key === 'ArrowDown' ? d : e.key === 'ArrowUp' ? -d : 0))) }) }); } }}>移动</button>
              <textarea aria-label={`文字块 ${i + 1}`} value={t.text} placeholder="写在这里…" onFocus={() => setSelected(i)} onChange={e => setLayout({ ...layout, texts: layout.texts.map((t, j) => j === i ? { ...t, text: e.target.value } : t) })} maxLength={10000} spellCheck={false} />
            </div>)}
          </>}
        </div></div></div>
        <p className="editor-tip">{layout.kind === 'photo' ? '调整相片尺寸，然后选择贴放位置' : preview ? '预览已渲染的文字和涂鸦' : mode === 'draw' ? '在纸上按住并拖动来画画' : '点纸面添加文字，拖动「移动」调整位置'}</p>
      </section>
      <aside className="editor-controls">
        <fieldset><legend>{layout.kind === 'photo' ? '相片尺寸' : '纸张'}</legend>{layout.kind !== 'photo' && <div className="swatches">{(['yellow', 'green', 'pink', 'blue'] as const).map((color, i) => <button key={color} className={`swatch paper-${color}`} aria-label={['麦芽黄', '嫩叶绿', '浅陶粉', '雾水蓝'][i]} aria-pressed={layout.color === color} onClick={() => setLayout({ ...layout, color })}>{layout.color === color && <span aria-hidden="true">✓</span>}</button>)}</div>}
          <label>宽度 <output>{Math.round(layout.width)}</output><input aria-label="纸张宽度" type="range" min="160" max="560" value={layout.width} onChange={e => resize(+e.target.value, layout.height)} /></label>
          <label>高度 <output>{Math.round(layout.height)}</output><input aria-label="纸张高度" type="range" min="160" max="640" value={layout.height} onChange={e => resize(layout.width, +e.target.value)} /></label>
        </fieldset>
        {layout.kind !== 'photo' && <>
          <fieldset><legend>写字与涂鸦</legend><div className="tool-row"><button aria-pressed={mode === 'text'} onClick={() => { setMode('text'); setPreview(false); }}>文字</button><button aria-pressed={mode === 'draw'} onClick={() => { setMode('draw'); setPreview(false); }}>画笔</button><label className="ink-picker">墨色<input aria-label="墨色" type="color" value={ink} onChange={e => { setInk(e.target.value); if (text && mode === 'text') updateText({ color: e.target.value }); }} /></label></div>
          {mode === 'draw' ? <><label>笔宽 <output>{brush}</output><input type="range" aria-label="笔宽" min="1" max="20" value={brush} onChange={e => setBrush(+e.target.value)} /></label><button disabled={!layout.strokes.length} onClick={() => setLayout({ ...layout, strokes: layout.strokes.slice(0, -1) })}>撤回一笔</button></> : <><button onClick={() => addText()}>添加文字块</button>{text && <><label>字号 <output>{Math.round(text.size)}</output><input aria-label="字号" type="range" min="12" max="48" value={text.size} onChange={e => updateText({ size: +e.target.value })} /></label><label>文字宽度<input aria-label="文字宽度" type="range" min="20" max={Math.floor(layout.width - text.x)} value={text.width} onChange={e => updateText({ width: +e.target.value })} /></label><button onClick={() => { setLayout({ ...layout, texts: layout.texts.filter((_, i) => i !== selected) }); setSelected(null); }}>删除选中文字</button></>}</>}
          </fieldset>
          <details><summary>文字样式怎么写</summary><p>支持 Markdown：<br />**粗体** · *斜体* · ~~划掉~~<br /># 标题 · - 列表 · &gt; 引用<br />`行内代码` · 三个反引号的代码块<br />[链接文字](https://example.com)</p><div className="format-example"><RichText text={'**粗体** 和 *斜体*\n> 一段引用'} /></div></details>
        </>}
        <label>署名（选填）<input className="author-input" value={author} maxLength={48} onChange={e => setAuthor(e.target.value)} placeholder="一位路过的人" /></label>
        {(count > 10000 || Array.from(author).length > 24) && <p role="alert" className="error">文字最多 10000 字，署名最多 24 字</p>}
      </aside>
    </div>
    <footer className="editor-footer"><button className="primary-button editor-next" onClick={onReady} disabled={empty || count > 10000 || Array.from(author).length > 24}>选个位置贴上去 <span aria-hidden="true">→</span></button></footer>
  </dialog>;
}
