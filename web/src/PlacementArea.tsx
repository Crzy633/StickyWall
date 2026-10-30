import { ancestors } from './wall';
import type { Layout, Note } from './wall';

export default function PlacementArea({ draft, notes, view }: { draft: Layout; notes: Note[]; view: { x: number; y: number; width: number; height: number } }) {
  const ignored = ancestors(draft, notes);
  const parent = notes.find(n => n.id === draft.parentId)?.layout;
  const shape = (p: Layout, r: number) => ({ x: p.x - draft.width - r, y: p.y - draft.height - r, width: p.width + draft.width + 2 * r, height: p.height + draft.height + 2 * r, rx: r });
  // The mask is the feasible region for the paper's top-left corner, translated to its centre for pointing.
  return <svg className="placement-map" style={{ left: view.x, top: view.y, width: view.width, height: view.height }} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} aria-hidden="true">
    <defs>
      <mask id="buildable" maskUnits="userSpaceOnUse" x={view.x - draft.width} y={view.y - draft.height} width={view.width + draft.width * 2} height={view.height + draft.height * 2}>
        {!notes.length ? <circle cx={-draft.width / 2} cy={-draft.height / 2} r={100} fill="white" /> : parent ? <rect x={parent.x - draft.width + 1} y={draft.kind === 'photo' ? parent.y - draft.height + 1 : parent.y + parent.height / 2} width={parent.width + draft.width - 2} height={draft.kind === 'photo' ? parent.height + draft.height - 2 : parent.height / 2 - 1} fill="white" /> : notes.map(n => <rect key={n.id} {...shape(n.layout, Math.min(draft.width, draft.height, n.layout.width, n.layout.height) / 2)} fill="white" />)}
        {notes.filter(n => !ignored.has(n.id)).map(n => <rect key={n.id} {...shape(n.layout, 16)} fill="black" />)}
        {parent && <rect x={parent.x + parent.width - draft.width} y={parent.y + parent.height - draft.height} width={Math.max(0, draft.width - parent.width)} height={Math.max(0, draft.height - parent.height)} fill="black" />}
      </mask>
      <mask id="unbuildable" maskUnits="userSpaceOnUse" x={view.x} y={view.y} width={view.width} height={view.height}>
        <rect x={view.x} y={view.y} width={view.width} height={view.height} fill="white" />
        <g transform={`translate(${draft.width / 2} ${draft.height / 2})`}><rect x={view.x - draft.width} y={view.y - draft.height} width={view.width + draft.width * 2} height={view.height + draft.height * 2} fill="black" mask="url(#buildable)" /></g>
      </mask>
    </defs>
    <rect x={view.x} y={view.y} width={view.width} height={view.height} fill="#33382e" fillOpacity=".4" mask="url(#unbuildable)" />
    {!notes.length && <circle cx="0" cy="0" r="100" className="origin-circle" />}
  </svg>;
}
