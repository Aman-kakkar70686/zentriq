import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Empty, LinkBtn, SectionHead, Sheet } from './ui';

export default function DecisionCenter({ decisions }) {
  const { openDrawer } = useApp();
  return (
    <Sheet id="decisions">
      <SectionHead title="Decision Center" sub="Waiting for you." />
      {decisions.length === 0 && <Empty title="You're all caught up.">No decisions waiting for you.</Empty>}
      {decisions.slice(0, 3).map((d) => (
        <button key={d.id} onClick={() => openDrawer('decision', d.id)} className="w-full flex items-center gap-3 min-h-[80px] px-6 border-t border-line text-left hover:bg-card2 group">
          <div className="flex-1 min-w-0">
            <b className="font-semibold">{d.title}</b>
            <small className="block text-[12.5px] text-ink2 truncate">{d.question}</small>
          </div>
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-line text-[13px] font-medium group-hover:border-brand group-hover:text-brand">Review <ArrowRight size={13} /></span>
        </button>
      ))}
      <div className="px-6 py-3.5 border-t border-line"><LinkBtn onClick={() => openDrawer('decisions')}>View all decisions →</LinkBtn></div>
    </Sheet>
  );
}
