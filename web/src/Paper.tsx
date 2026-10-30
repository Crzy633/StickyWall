import type { CSSProperties, ReactNode } from 'react';
import type { Layout, Note } from './wall';
import { noteDate } from './wall';

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <del key={i}>{part.slice(2, -2)}</del>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" onPointerDown={e => e.stopPropagation()}>{link[1]}</a>;
    return part;
  });
}

// React renders every user string as text; raw HTML and unsafe link schemes never execute.
export function RichText({ text }: { text: string }) {
  let code = false;
  return <>{text.split('\n').map((line, i) => {
    if (line.startsWith('```')) { code = !code; return null; }
    if (code) return <div className="code-line" key={i}>{line || '\u00a0'}</div>;
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) return <div role="heading" aria-level={heading[1].length + 1} className={`rich-heading h${heading[1].length}`} key={i}>{inline(heading[2])}</div>;
    if (line.startsWith('> ')) return <blockquote key={i}>{inline(line.slice(2))}</blockquote>;
    const list = line.match(/^(?:[-*] |\d+\. )(.*)/);
    return <div className={list ? 'rich-list' : undefined} key={i}>{list && <span aria-hidden="true">• </span>}{inline(list ? list[1] : line) || '\u00a0'}{!line && <br />}</div>;
  })}</>;
}

export function PaperContent({ layout, legacy = '' }: { layout: Layout; legacy?: string }) {
  return <>
    {layout.kind === 'photo' ? <img className="photo-image" src={layout.image} alt="用户贴上的照片" draggable={false} /> : <>
      {legacy && <div className="legacy-content"><RichText text={legacy} /></div>}
      {layout.texts?.map((t, i) => <div key={i} className="text-block" style={{ left: t.x, top: t.y, width: t.width, fontSize: t.size, color: t.color }}><RichText text={t.text} /></div>)}
      <svg className="ink-layer" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-label={layout.strokes?.length ? '手绘涂鸦' : undefined}>{layout.strokes?.map((s, i) => <polyline key={i} points={s.points.map(p => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />)}</svg>
    </>}
  </>;
}

export function Paper({ note, selected, onSelect }: { note: Note; selected: boolean; onSelect: () => void }) {
  const p = note.layout;
  return <article className={`wall-paper paper-${p.color} ${p.kind === 'photo' ? 'photo' : ''} ${selected ? 'is-selected' : ''}`} style={{ left: p.x, top: p.y, width: p.width, height: p.height } as CSSProperties} tabIndex={0} aria-label={`${note.mine ? '我的便签' : note.author || '匿名便签'}，${noteDate(note.createdAt)}`} onClick={onSelect} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(); } }}>
    <span className="paper-tape" aria-hidden="true" />
    <div className="paper-face"><PaperContent layout={p} legacy={note.content} /></div>
    <footer className="paper-signature"><span>{note.author || '一位路过的人'}</span>{note.mine && <span>我的</span>}</footer>
  </article>;
}
