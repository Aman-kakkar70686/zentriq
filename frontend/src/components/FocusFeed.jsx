import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Empty, KIND, LinkBtn, SectionHead, Sheet } from './ui';

export const openFocusItem = (openDrawer, f) =>
  openDrawer(f.kind === 'decision' ? 'decision' : f.kind === 'moving' ? 'project' : 'task', f.ref);

export default function FocusFeed({ focus }) {
  const { openDrawer } = useApp();
  return (
    <Sheet>
      <SectionHead title="My Focus" sub="The work that needs your attention right now." />
      {focus.length === 0 && <Empty title="Nothing needs you right now.">Clear skies.</Empty>}
      {focus.slice(0, 3).map((f) => {
        const k = KIND[f.kind];
        return (
          <button key={f.id} onClick={() => openFocusItem(openDrawer, f)} className="group w-full grid grid-cols-[4px_1fr] sm:grid-cols-[4px_96px_1fr_auto] gap-x-3.5 gap-y-1 items-center min-h-[80px] py-3 pr-6 border-t border-line text-left hover:bg-card2 transition-colors">
            <span className={`self-stretch rounded-r ${k.dot} row-span-2 sm:row-span-1`} />
            <span className={`text-[11.5px] font-semibold tracking-wide flex items-center gap-1.5 ${k.text}`}>
              <span className={`w-[7px] h-[7px] rounded-full ${k.dot}`} />{k.label}
            </span>
            <div className="min-w-0 col-start-2 sm:col-start-auto">
              <h3 className="text-[15px] font-semibold tracking-tight">{f.title}</h3>
              <small className="block truncate text-[12.5px] text-ink2">{[f.project, f.context, f.owner, f.meta].filter(Boolean).join(' · ')}</small>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-line text-[13px] font-medium whitespace-nowrap group-hover:border-brand group-hover:text-brand">
              {f.action} <ArrowRight size={13} />
            </span>
          </button>
        );
      })}
      {focus.length > 3 && (
        <div className="px-6 py-3.5 border-t border-line"><LinkBtn onClick={() => openDrawer('focus')}>View all ({focus.length}) →</LinkBtn></div>
      )}
    </Sheet>
  );
}
