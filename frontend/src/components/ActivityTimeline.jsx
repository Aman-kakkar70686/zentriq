import { useApp } from '../context/AppContext';
import { timeAgo } from '../lib/format';
import { Dot, LinkBtn, Sheet } from './ui';

export function ActivityLine({ a }) {
  return (
    <>
      {a.actor && <b className="font-semibold">{a.actor} </b>}
      {a.actor ? '' : <b className="font-semibold">{a.subject} </b>}
      {a.action}{a.actor && <b className="font-semibold"> {a.subject}</b>}{a.detail ? ` ${a.detail}` : ''}
    </>
  );
}

export default function ActivityTimeline({ activity = [], signal }) {
  const { openDrawer } = useApp();
  const safeSignal = signal || { level: 'ok', text: 'Team capacity looks healthy' };
  const list = Array.isArray(activity) ? activity : [];

  return (
    <Sheet className="mt-7">
      <div className="flex items-baseline gap-2.5 px-6 pt-5 pb-3">
        <h2 className="text-base font-semibold tracking-tight">What's Moving</h2>
        <LinkBtn className="ml-auto" onClick={() => openDrawer('activity')}>View activity →</LinkBtn>
      </div>
      <ul className="relative px-6 pb-2 before:content-[''] before:absolute before:left-[30px] before:top-4 before:bottom-6 before:w-px before:bg-line">
        {list.slice(0, 4).map((a) => (
          <li key={a.id} className="relative grid grid-cols-[14px_1fr_auto] gap-3.5 items-center py-2.5">
            <span className="w-2 h-2 rounded-full bg-sage ml-[3px] ring-4 ring-card" />
            <span className="text-sm"><ActivityLine a={a} /></span>
            <time className="text-[12.5px] text-mute whitespace-nowrap">{timeAgo(a.created_at || new Date().toISOString())}</time>
          </li>
        ))}
      </ul>
      <div className="px-6 py-3.5 border-t border-line">
        <button onClick={() => openDrawer('team')} className="flex items-center gap-2 text-[13px] font-medium hover:underline">
          <Dot className={safeSignal.level === 'warn' ? 'bg-amber' : 'bg-ok'} />{safeSignal.text} →
        </button>
      </div>
    </Sheet>
  );
}
