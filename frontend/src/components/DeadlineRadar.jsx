import { useApp } from '../context/AppContext';
import { dueLabel, fmtDate, urgent } from '../lib/format';
import { Empty, SectionHead, Sheet } from './ui';

export default function DeadlineRadar({ deadlines, count }) {
  const { openDrawer } = useApp();
  return (
    <Sheet>
      <SectionHead title="Deadline Radar" sub={`${count} deadlines this week`} action="View all →" onAction={() => openDrawer('deadlines')} />
      {deadlines.length === 0 && <Empty>No upcoming deadlines.</Empty>}
      {deadlines.slice(0, 5).map((d) => (
        <button key={d.id} onClick={() => openDrawer('task', d.id)} className="w-full flex items-center justify-between gap-3 px-6 py-4 border-t border-line text-left hover:bg-card2 transition-colors">
          <div className="min-w-0"><b className="font-semibold block truncate">{d.title}</b><small className="text-[12.5px] text-ink2">{d.project}</small></div>
          <div className="text-right shrink-0"><span className="font-medium block">{fmtDate(d.due_date)}</span><small className={`text-[12.5px] font-medium ${urgent(d.days) ? 'text-amber' : 'text-mute'}`}>{dueLabel(d.days)}</small></div>
        </button>
      ))}
    </Sheet>
  );
}
