import { useApp } from '../context/AppContext';

export default function Metrics({ metrics }) {
  const { openDrawer } = useApp();
  const m = metrics || {};
  const items = [
    ['Pending decisions', m.decisions ?? 0, 'decisions'],
    ['Active blockers', m.blockers ?? 0, 'blocked'],
    ['Upcoming deadlines', m.deadlines ?? 0, 'deadlines'],
    ['Active tasks', m.active_tasks ?? 0, 'tasks'],
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4 mt-7">
      {items.map(([label, n, view]) => (
        <button key={label} onClick={() => openDrawer(view)} className="text-left bg-card border border-line rounded-xl px-5 py-4 hover:bg-card2 hover:border-[#D2D1C6] transition-colors">
          <span className="text-[13px] text-ink2">{label}</span>
          <span className="block mt-2 text-3xl font-semibold tracking-tight tabular-nums leading-none">{n}</span>
        </button>
      ))}
    </div>
  );
}
