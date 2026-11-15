import { ArrowRight, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Empty, KIND, LinkBtn, Sheet } from './ui';

export const openFocusItem = (openDrawer, f) =>
  openDrawer(f.kind === 'decision' ? 'decision' : f.kind === 'moving' ? 'project' : 'task', f.ref);

export default function FocusFeed({ focus }) {
  const { openDrawer, openFocusModal } = useApp();
  return (
    <Sheet>
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div
          role="button"
          tabIndex={0}
          onClick={openFocusModal}
          onKeyDown={(e) => e.key === 'Enter' && openFocusModal()}
          className="cursor-pointer group flex items-center gap-2 select-none"
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight group-hover:text-brand transition">My Focus</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20 group-hover:bg-brand group-hover:text-white transition">
                <Sparkles size={11} />
                <span>Voice Briefing</span>
              </span>
            </div>
            <p className="text-[13px] text-ink2">The work that needs your attention right now.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openFocusModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#174B3A] border border-emerald-200/80 text-xs font-semibold shadow-2xs hover:shadow-xs transition active:scale-95"
          title="Open Fancy Focus Voice Briefing"
        >
          <Volume2 size={13} className="text-brand animate-pulse" />
          <span>Pop Focus Audio</span>
        </button>
      </div>

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
        <div className="px-6 py-3.5 border-t border-line">
          <LinkBtn onClick={openFocusModal}>View all ({focus.length}) →</LinkBtn>
        </div>
      )}
    </Sheet>
  );
}
