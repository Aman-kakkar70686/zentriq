import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SectionHead, Sheet } from './ui';

const arrows = { up: ArrowUp, down: ArrowDown, flat: Minus };

export default function ProjectPulse({ projects = [] }) {
  const { openDrawer, navigateToProjects } = useApp();
  const list = Array.isArray(projects) ? projects : [];
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  return (
    <Sheet>
      <SectionHead
        title="Project Pulse"
        action="View projects →"
        onAction={() => (navigateToProjects ? navigateToProjects() : openDrawer('projects'))}
      />
      {list.map((p) => {
        const Arrow = (p?.momentum && arrows[p.momentum]) || Minus;
        return (
          <button
            key={p.id}
            onClick={() => (navigateToProjects ? navigateToProjects(p.id) : openDrawer('project', p.id))}
            className="w-full grid grid-cols-[1fr_72px] sm:grid-cols-[minmax(0,1.5fr)_1fr_84px] gap-x-4 gap-y-2 items-center px-6 py-4 border-t border-line text-left hover:bg-card2 transition-colors"
          >
            <div className="min-w-0"><b className="font-semibold block truncate">{p.name}</b><small className="block text-[12.5px] text-ink2">{p.note}</small></div>
            <div className="hidden sm:block h-[5px] rounded-full bg-hov overflow-hidden"><i className="block h-full bg-brand rounded-full transition-[width] duration-700 ease-out" style={{ width: on ? `${p.progress}%` : 0 }} /></div>
            <div className="text-right">
              <b className="font-semibold flex items-center justify-end gap-1 tabular-nums"><Arrow size={13} className="text-mute" />{p.progress}%</b>
              <small className={`text-[12.5px] ${p.status === 'At Risk' ? 'text-amber' : 'text-ok'}`}>{p.status}</small>
            </div>
          </button>
        );
      })}
    </Sheet>
  );
}
