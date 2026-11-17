import { useApp } from '../context/AppContext';
import { Dot, Sheet, SectionHead } from './ui';

export default function ProductFlow({ flow = [], bottleneck }) {
  const { openDrawer } = useApp();
  const list = Array.isArray(flow) ? flow : [];
  return (
    <Sheet className="mt-7">
      <SectionHead title="Product Flow" sub="Click a stage to see its tasks." />
      <div className="grid grid-cols-3 gap-2 px-4 pb-3 lg:flex lg:items-start lg:px-6">
        {list.map((s, i) => {
          const hot = s.label === bottleneck;
          return (
            <div key={s.key} className="contents lg:flex lg:flex-1 lg:items-start">
              <button onClick={() => openDrawer('stage', s.key)} aria-label={`${s.count} ${s.label}`} className="lg:w-28 lg:flex-none text-center rounded-[10px] py-2 hover:bg-hov transition-colors">
                <div className={`text-2xl font-semibold tracking-tight tabular-nums leading-tight ${hot ? 'text-amber' : ''}`}>{s.count}</div>
                <div className="text-[11px] font-semibold tracking-widest text-ink2">{s.label.toUpperCase()}</div>
                <div className="flex flex-wrap justify-center gap-[3px] mt-1.5 min-h-[7px]">
                  {Array.from({ length: Math.min(s.count, 12) }).map((_, j) => <i key={j} className={`w-[7px] h-[7px] rounded-full ${hot ? 'bg-amber' : 'bg-sage'}`} />)}
                </div>
              </button>
              {i < list.length - 1 && <div className="hidden lg:block flex-1 min-w-4 h-px bg-line mt-[22px]" />}
            </div>
          );
        })}
      </div>
      {bottleneck && (
        <div className="px-6 pb-5 text-[13px] text-ink2 flex items-center gap-2"><Dot className="bg-amber" /><span>⚠ <b className="font-semibold text-ink">{bottleneck}</b> is currently the bottleneck.</span></div>
      )}
    </Sheet>
  );
}
