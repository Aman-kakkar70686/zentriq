import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useApp } from '../context/AppContext';

export default function CommandPalette() {
  const {
    paletteOpen, setPaletteOpen, openDrawer, setCreateType, data,
    navigateToCopilot, navigateToPrdHistory, navigateToRequirementIntelligence,
    navigateToEmailCenter, openEmailComposer, navigateToProjects
  } = useApp();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [tasks, setTasks] = useState([]);

  useEffect(() => { if (paletteOpen) { setQ(''); setSel(0); api.get('/tasks').then((r) => setTasks(r.data)).catch(() => {}); } }, [paletteOpen]);

  const cmds = useMemo(() => [
    { l: 'Project Workspace', h: 'Workspace', run: () => (navigateToProjects ? navigateToProjects() : openDrawer('projects')) },
    { l: 'AI PM Copilot', h: 'AI Workspace', run: () => navigateToCopilot() },
    { l: 'Requirement Intelligence', h: 'AI Workspace', run: () => navigateToRequirementIntelligence() },
    { l: 'Analyse PRD Requirements', h: 'AI Quality', run: () => navigateToRequirementIntelligence() },
    { l: 'PRD History', h: 'AI Workspace', run: () => navigateToPrdHistory() },
    { l: 'Generate PRD with Gemini', h: 'AI Action', run: () => navigateToCopilot() },
    { l: 'Email & Notification Center', h: 'Communication', run: () => navigateToEmailCenter() },
    { l: 'Compose Email', h: 'Action', run: () => openEmailComposer() },
    ...[['Overview', null], ['My Focus', 'focus'], ['Decision Center', 'decisions'], ['Deadline Radar', 'deadlines'], ['Team capacity', 'team'], ['Analytics', 'analytics']]
      .map(([l, v]) => ({ l, h: 'Go to', run: () => (v ? openDrawer(v) : window.scrollTo({ top: 0, behavior: 'smooth' })) })),
    ...(data?.projects || []).map((p) => ({ l: p.name, h: 'Project', run: () => (navigateToProjects ? navigateToProjects(p.id) : openDrawer('project', p.id)) })),
    ...[['project', 'New Project'], ['task', 'New Task'], ['decision', 'New Decision'], ['meeting', 'Schedule Meeting']].map(([k, l]) => ({ l, h: 'Create', run: () => setCreateType(k) })),
    ...tasks.map((t) => ({ l: t.title, h: 'Task', run: () => openDrawer('task', t.id) })),
  ], [data, tasks, navigateToCopilot, navigateToPrdHistory, navigateToRequirementIntelligence, navigateToProjects]);

  if (!paletteOpen) return null;
  const list = cmds.filter((c) => c.l.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  const run = (c) => { setPaletteOpen(false); c?.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % Math.max(list.length, 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s - 1 + list.length) % Math.max(list.length, 1)); }
    if (e.key === 'Enter') run(list[sel]);
  };
  return (
    <div className="fixed inset-0 z-[60] bg-ink/30 flex justify-center items-start pt-[14vh]" onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}>
      <div className="w-[min(560px,92vw)] bg-card rounded-2xl border border-line shadow-2xl overflow-hidden" role="dialog" aria-label="Command palette">
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder="Search tasks, projects, people or actions..." className="w-full px-5 py-4 text-base outline-none border-b border-line bg-transparent" />
        <ul className="p-1.5 max-h-80 overflow-auto">
          {list.length === 0 && <li className="px-3 py-2 text-ink2">No matches</li>}
          {list.map((c, i) => (
            <li key={c.h + c.l + i} onMouseEnter={() => setSel(i)} onClick={() => run(c)} className={`flex px-3 py-2.5 rounded-lg cursor-pointer ${i === sel ? 'bg-brands text-brand' : ''}`}>{c.l}<small className="ml-auto text-mute">{c.h}</small></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
