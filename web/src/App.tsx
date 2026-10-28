import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode, RefObject } from 'react';
import { categories, characterCount, mergeNotes, noteDate, paperPosition, paperSizes, request } from './wall';
import type { Category, Note, NotesPage, PaperSize } from './wall';
import SunlightLayer from './SunlightLayer';

function Icon({ name, size = 20 }: { name: 'sun' | 'plus' | 'arrow' | 'close' | 'check' | 'refresh'; size?: number }) {
  const paths: Record<string, ReactNode> = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6.1a8 8 0 0 1 13.3 3M4.6 14.9a8 8 0 0 0 13.3 3" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function useWritingWidth(paper: RefObject<HTMLElement | null>, enabled = true) {
  const [width, setWidth] = useState(224);
  useLayoutEffect(() => {
    const node = paper.current;
    if (!node || !enabled) return;
    const update = (value: number) => { if (value > 0) setWidth(previous => previous === value ? previous : value); };
    const style = getComputedStyle(node);
    update(node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [paper, enabled]);
  return Math.min(19, width / 224 * 19);
}

function StickyNote({ note }: { note: Note }) {
  const paper = useRef<HTMLElement>(null);
  const size = paperSizes.find(item => item.id === note.paperSize);
  const writingFont = useWritingWidth(paper, !!size);
  const position = paperPosition(note.id, note.content);
  const tilt = size ? 4 / size.lines : 1;
  const category = categories.find(item => item.id === note.category)!;
  return <article ref={paper} className={`note paper-${note.category} tape-${position.tape}${size ? ' sized-note' : ''}`} style={{ '--rotation': `${position.rotation * tilt}deg`, '--offset': `${position.offset * tilt}px`, '--paper-width': `${position.width}%`, '--paper-drop': `${position.drop}px`, '--paper-height': `${position.height}px`, '--writing-font': `${writingFont}px`, '--writing-lines': size?.lines } as CSSProperties}>
    <span className="paper-tape" aria-hidden="true" />
    <span className="note-category"><span className="category-dot" />{category.label}</span>
    <p className={`note-content${size ? ' paper-writing' : characterCount(note.content) > 180 ? ' long-note' : ''}`}>{note.content}</p>
    <footer className="note-footer"><span className="note-author">{note.author || '一位路过的人'}</span><time dateTime={note.createdAt}>{noteDate(note.createdAt)}</time></footer>
  </article>;
}

function Composer({ open, onClose, onPublished }: { open: boolean; onClose: () => void; onPublished: (note: Note) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const paper = useRef<HTMLFormElement>(null);
  const writing = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const lastAccepted = useRef('');
  const selection = useRef({ start: 0, end: 0 });
  const composing = useRef(false);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<Category>('daily');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>('medium');
  const [capacityNotice, setCapacityNotice] = useState('');
  const [fitsPaper, setFitsPaper] = useState(true);
  const [usedLines, setUsedLines] = useState(0);
  const writingFont = useWritingWidth(paper);
  const size = paperSizes.find(item => item.id === paperSize)!;
  const count = characterCount(content);
  const errorMessage = error || (count > 500 ? '纸笺最多写 500 字，请稍微精简一下。' : characterCount(author.trim()) > 24 ? '称呼最多 24 字，请稍微缩短一点。' : '');

  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
      dialog.current?.querySelector('textarea')?.focus();
    }
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  function measure(value: string, targetSize = paperSize) {
    const limit = paperSizes.find(item => item.id === targetSize)!.lines;
    if (value.length > 1000 || characterCount(value) > 500) return { fits: false, lines: limit + 1 };
    const area = writing.current;
    const copy = mirror.current;
    if (!area || !copy) return { fits: true, lines: 0 };
    copy.style.width = `${area.clientWidth}px`;
    // The sentinel preserves a final blank line, just as the textarea does.
    copy.textContent = value + '\u200b';
    const lineHeight = parseFloat(getComputedStyle(copy).lineHeight);
    const lines = value ? Math.ceil((copy.scrollHeight - 1) / lineHeight) : 0;
    return { fits: lines <= limit, lines };
  }

  function recheck() {
    if (composing.current) return;
    const result = measure(writing.current?.value || '');
    setFitsPaper(result.fits); setUsedLines(result.lines);
    if (!result.fits) setCapacityNotice('当前文字放不下了，换大一号或少写一点。');
  }

  useLayoutEffect(() => { if (open) recheck(); }, [content, paperSize, writingFont, open]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const check = () => { if (active) recheck(); };
    void document.fonts.ready.then(check);
    document.fonts.addEventListener('loadingdone', check);
    return () => { active = false; document.fonts.removeEventListener('loadingdone', check); };
  }, [open, paperSize, writingFont]);

  function acceptContent(value: string, area: HTMLTextAreaElement) {
    const result = measure(value);
    const previous = lastAccepted.current;
    const previousResult = measure(previous);
    const improving = !previousResult.fits && (characterCount(value) < characterCount(previous) || result.lines < previousResult.lines);
    if (result.fits || improving) {
      if (result.fits && value !== previous) setCapacityNotice('');
      lastAccepted.current = value;
      setContent(value); setFitsPaper(result.fits); setUsedLines(result.lines);
    } else {
      setContent(previous); area.value = previous;
      area.setSelectionRange(Math.min(selection.current.start, previous.length), Math.min(selection.current.end, previous.length));
      area.scrollTop = 0;
      setCapacityNotice(characterCount(value) > 500 ? '最多写 500 字，原文已保留。' : '这张纸写满了，换大一号或少写一点。');
    }
  }

  function chooseSize(next: PaperSize) {
    if (composing.current) return;
    if (!measure(content, next).fits) {
      setCapacityNotice('这张纸装不下当前文字，已保留原尺寸。');
      return;
    }
    setPaperSize(next); setCapacityNotice(''); setFitsPaper(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || composing.current || !content.trim() || count > 500 || characterCount(author.trim()) > 24) return;
    if (!measure(content).fits) { recheck(); return; }
    setBusy(true);
    setError('');
    try {
      const note = await request<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ content: content.trim(), author: author.trim(), category, paperSize }) });
      lastAccepted.current = ''; setContent(''); setAuthor(''); setUsedLines(0); setCapacityNotice(''); setFitsPaper(true);
      onPublished(note); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '没能贴上去，文字还在，请再试一次。'); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="composer-dialog" aria-labelledby="composer-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} onClose={onClose} onClick={event => { if (event.target === dialog.current && !busy) onClose(); }}>
    <div className="paper-sizes" role="radiogroup" aria-label="便签纸尺寸">{paperSizes.map(item => <label key={item.id} className="paper-size-option"><input className="sr-only" type="radio" name="paper-size" value={item.id} checked={paperSize === item.id} onChange={() => chooseSize(item.id)} disabled={busy} /><span>{item.label}<small>{item.lines} 行</small></span></label>)}</div>
    <p id="paper-capacity" className="capacity-notice" role="status" hidden={!capacityNotice}>{capacityNotice}</p>
    <form ref={paper} onSubmit={submit} className={`composer paper-${category}`} style={{ '--writing-font': `${writingFont}px`, '--writing-lines': size.lines } as CSSProperties}>
      <span className="paper-tape composer-tape" aria-hidden="true" />
      <button className="icon-button composer-close" type="button" onClick={onClose} disabled={busy} aria-label="收起纸笺，保留草稿"><Icon name="close" /></button>
      <h2 id="composer-title" className="sr-only">写一张便利贴</h2>
      <label className="note-category composer-category"><span className="category-dot" /><select aria-label="留言分类" value={category} onChange={event => setCategory(event.target.value as Category)} disabled={busy}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Icon name="arrow" size={12} /></label>
      <label className="sr-only" htmlFor="note-content">留言内容</label>
      <textarea ref={writing} id="note-content" className="paper-writing" autoFocus
        placeholder={categories.find(item => item.id === category)!.hint} value={content}
        onBeforeInput={event => { if (!composing.current) selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
        onPaste={event => { selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
        onCompositionStart={event => { selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; composing.current = true; }}
        onCompositionEnd={event => { composing.current = false; acceptContent(event.currentTarget.value, event.currentTarget); }}
        onChange={event => { if (composing.current) setContent(event.currentTarget.value); else acceptContent(event.currentTarget.value, event.currentTarget); }}
        onScroll={event => { event.currentTarget.scrollTop = 0; }} disabled={busy} required
        aria-invalid={!fitsPaper || count > 500} aria-describedby="content-count content-error paper-capacity" />
      <div ref={mirror} className="paper-writing paper-measure" aria-hidden="true" />
      <div className="writing-bottom"><span id="content-count">{usedLines}/{size.lines} 行 · {count} 字</span></div>
      <p id="content-error" className="form-error" role="alert" hidden={!errorMessage}>{errorMessage}</p>
      <div className="composer-actions"><div className="composer-author"><label className="sr-only" htmlFor="note-author">署名（选填）</label><input id="note-author" placeholder="署名（选填）" value={author} onChange={event => setAuthor(event.target.value)} disabled={busy} aria-describedby="author-help" /><span id="author-help" className="sr-only">最多 24 字；留空将匿名发布</span></div><button className="primary-button" disabled={busy || !fitsPaper || !content.trim() || count > 500 || characterCount(author.trim()) > 24} type="submit">{busy ? '正在贴上…' : '贴上墙'}<Icon name="arrow" size={16} /></button></div>
    </form>
  </dialog>;
}

export default function App() {
  const [selected, setSelected] = useState<Category | 'all'>('all');
  const [notes, setNotes] = useState<Note[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [headCursor, setHeadCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [pending, setPending] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const wall = useRef<HTMLDivElement>(null);
  const nextPage = useRef<HTMLDivElement>(null);
  const pageRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const filterKey = selected === 'all' ? categories.map(item => item.id).join(',') : selected;
  const query = `categories=${filterKey}&limit=12`;

  useEffect(() => {
    const controller = new AbortController();
    pageRequest.current?.abort(); pageRequest.current = null;
    requestVersion.current++;
    setError(''); setPageError(''); setPending(0); setNotes([]); setHeadCursor(null); setNextCursor(null); setLoadingMore(false);
    setLoading(true);
    request<NotesPage>(`/api/notes?${query}`, { signal: controller.signal }).then(page => {
      if (controller.signal.aborted) return;
      setNotes(page.notes); setNextCursor(page.nextCursor); setHeadCursor(page.headCursor);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '留言暂时没能送到，请重试。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); pageRequest.current?.abort(); pageRequest.current = null; };
  }, [filterKey, refresh, query]);

  useEffect(() => {
    if (loading || error) return;
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState === 'hidden') return;
      try {
        if (headCursor) {
          const result = await request<{ count: number }>(`/api/notes/updates?after=${encodeURIComponent(headCursor)}&categories=${filterKey}`, { signal: controller.signal });
          setPending(result.count);
        } else {
          const page = await request<NotesPage>(`/api/notes?${query}`, { signal: controller.signal });
          setPending(page.total);
        }
      } catch { /* Polling is silent; the existing wall remains readable. */ }
    }
    const interval = window.setInterval(check, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { controller.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [filterKey, headCursor, loading, error, query]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || pageRequest.current) return;
    const version = requestVersion.current;
    const controller = new AbortController();
    pageRequest.current = controller;
    setLoadingMore(true); setPageError('');
    try {
      const page = await request<NotesPage>(`/api/notes?${query}&cursor=${encodeURIComponent(nextCursor)}`, { signal: controller.signal });
      if (controller.signal.aborted || requestVersion.current !== version) return;
      setNotes(previous => mergeNotes(previous, page.notes)); setNextCursor(page.nextCursor);
    } catch (reason) { if (!controller.signal.aborted && requestVersion.current === version) setPageError(reason instanceof Error ? reason.message : '没能加载更多，请再试一次。'); }
    finally {
      if (pageRequest.current === controller) pageRequest.current = null;
      if (!controller.signal.aborted && requestVersion.current === version) setLoadingMore(false);
    }
  }, [nextCursor, loading, query]);

  useEffect(() => {
    const target = nextPage.current;
    if (!target || loading || loadingMore || pageError || !nextCursor) return;
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (active && entries.some(entry => entry.isIntersecting)) void loadMore();
    }, { rootMargin: '800px 0px' });
    observer.observe(target);
    return () => { active = false; observer.disconnect(); };
  }, [loadMore, loading, loadingMore, nextCursor, pageError]);

  const openComposer = useCallback(() => setComposerOpen(true), []);
  function selectCategory(category: Category | 'all') {
    setSelected(category);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function published() {
    setSelected('all'); setRefresh(value => value + 1); setNotice('你的心情已经贴上墙，愿它遇见温柔的回应。');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function showNewNotes() {
    setRefresh(value => value + 1);
    wall.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  return <>
    <a className="skip-link" href="#wall">跳到留言墙</a>
    <SunlightLayer />
    <button className="primary-button floating-compose" onClick={openComposer}><Icon name="plus" size={20} />贴一张</button>
    <main aria-label="日光留言墙">
      <section id="wall" ref={wall} className="wall-section" aria-label="公共便利贴墙">
        <div className="wall-toolbar"><div className="filters" role="radiogroup" aria-label="选择想看的留言分类"><label className="filter-option all-option"><input className="sr-only" type="radio" name="wall-category" value="all" checked={selected === 'all'} onChange={() => selectCategory('all')} /><span className={`filter-all${selected === 'all' ? ' active' : ''}`}><span className="filter-mark">{selected === 'all' && <Icon name="check" size={12} />}</span>全部看看</span></label>{categories.map(item => <label key={item.id} className="filter-option"><input className="sr-only" type="radio" name="wall-category" value={item.id} checked={selected === item.id} onChange={() => selectCategory(item.id)} /><span className={`filter-button color-${item.id}${selected === item.id ? ' selected' : ''}`}><span className="filter-mark">{selected === item.id ? <Icon name="check" size={12} /> : <span className="category-dot" />}</span>{item.label}</span></label>)}</div></div>
        {loading ? <div className="wall-grid skeleton-wall" role="status" aria-label="正在加载便利贴">{[0, 1, 2, 3].map(index => <div className={`paper-placeholder placeholder-${index}`} key={index}><span /><span /><span /></div>)}</div> : error ? <div className="wall-state" role="alert"><Icon name="sun" size={36} /><h2>留言暂时没能送到</h2><p>{error}</p><button className="quiet-button" onClick={() => setRefresh(value => value + 1)}><Icon name="refresh" size={17} />再试一次</button></div> : notes.length ? <div className="wall-grid">{notes.map(note => <StickyNote key={note.id} note={note} />)}</div> : <div className="wall-state"><Icon name="sun" size={42} /><h2>这里，等一份新的心情</h2><p>墙上还没有这类留言，来留下第一张纸笺。</p><button className="quiet-button" onClick={openComposer}>写下第一张<Icon name="arrow" size={17} /></button></div>}
        {!loading && !error && notes.length > 0 && nextCursor && <div ref={nextPage} className="wall-bottom" aria-busy={loadingMore}>{loadingMore && <span role="status">正在拾起更多纸笺…</span>}{pageError && <><p className="form-error" role="alert">{pageError}</p><button className="quiet-button" onClick={() => void loadMore()}>重试加载<Icon name="refresh" size={16} /></button></>}</div>}
      </section>
    </main>
    {pending > 0 && <button className="new-notes" onClick={showNewNotes}><span className="notification-dot" />有 {pending} 张新纸笺，去看看<Icon name="arrow" size={16} /></button>}
    {notice && <div className="toast" role="status"><Icon name="check" size={18} />{notice}</div>}
    <Composer open={composerOpen} onClose={() => setComposerOpen(false)} onPublished={published} />
  </>;
}
