import { useEffect, useState } from 'react';
import { Mail, Video, X } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { dueLabel, fmtDate, meetingTime, timeAgo, urgent } from '../lib/format';
import { ActivityLine } from './ActivityTimeline';
import { Btn, Dot, Empty, KIND, TeamsIcon } from './ui';

const STAGES = ['ideas', 'planned', 'building', 'review', 'ready', 'shipped'];
const LABEL = { ideas: 'Ideas', planned: 'Planned', building: 'Building', review: 'Review', ready: 'Ready', shipped: 'Shipped' };

function Row({ dot = 'bg-sage', title, sub, right, onClick, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`w-full flex items-center gap-3 text-left py-3 px-2 border-b border-line rounded-lg ${onClick ? 'hover:bg-card2' : ''}`}>
      <Dot className={dot} />
      <div className="flex-1 min-w-0"><b className="font-semibold block">{title}</b>{sub && <small className="block text-[12.5px] text-ink2">{sub}</small>}</div>
      {right}{children}
    </Tag>
  );
}

function useFetch(url, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    api.get(url).then((r) => live && setState({ data: r.data, error: '', loading: false }))
      .catch((e) => live && setState({ data: null, error: errMsg(e), loading: false }));
    return () => { live = false; };
  }, [url, tick, ...deps]);
  return { ...state, refetch: () => setTick((t) => t + 1) };
}

const Loading = ({ s }) => (s.loading ? <p className="p-4 text-ink2 text-sm">Loading…</p> : s.error ? <p className="p-4 text-amber text-sm">{s.error}</p> : null);

/* ---------- views ---------- */
function FocusList({ kind }) {
  const { data, openDrawer } = useApp();
  const list = data.focus.filter((f) => !kind || f.kind === kind);
  if (!list.length) return <Empty title="Nothing here.">All clear.</Empty>;
  return list.map((f) => (
    <Row key={f.id} dot={KIND[f.kind].dot} title={f.title} sub={[f.project, f.context, f.owner, f.meta].filter(Boolean).join(' · ')}
      right={<span className={`text-[11px] font-semibold ${KIND[f.kind].text}`}>{KIND[f.kind].label}</span>}
      onClick={() => openDrawer(f.kind === 'decision' ? 'decision' : f.kind === 'moving' ? 'project' : 'task', f.ref)} />
  ));
}

function TaskView({ id }) {
  const { reload, closeDrawer, toast, openDrawer, openEmailComposer } = useApp();
  const s = useFetch(`/tasks/${id}`);
  const [busy, setBusy] = useState(false);
  const t = s.data;
  const act = async (path, msg, close = true) => {
    setBusy(true);
    try { await api.post(`/tasks/${id}/${path}`); toast(msg); await reload(); close ? closeDrawer() : s.refetch(); }
    catch (e) { toast(errMsg(e)); } finally { setBusy(false); }
  };
  if (!t) return <Loading s={s} />;
  const canResolve = t.is_blocked || t.status === 'review';
  return (
    <div className="p-2">
      <h4 className="text-xl font-semibold tracking-tight">{t.title}</h4>
      <p className="text-[13px] text-ink2 mt-1">{t.project} · {LABEL[t.status]} · {t.priority} priority</p>
      {t.is_blocked && <p className="mt-3 text-sm"><Dot className="bg-amber mr-2" />Blocked by {t.blocked_reason} ({t.blocked_days} day{t.blocked_days === 1 ? '' : 's'})</p>}
      <dl className="mt-4 text-sm grid grid-cols-[100px_1fr] gap-y-2">
        <dt className="text-ink2">Assignee</dt><dd>{t.assignee || 'Unassigned'}</dd>
        <dt className="text-ink2">Due</dt><dd>{t.due_date ? fmtDate(t.due_date) : 'No deadline'}</dd>
      </dl>
      {t.description && <p className="mt-4 text-sm text-ink2">{t.description}</p>}
      <div className="flex flex-wrap gap-2 mt-5">
        {canResolve && <Btn variant="primary" disabled={busy} onClick={() => act('resolve', t.is_blocked ? 'Marked unblocked' : 'Approved')}>{t.is_blocked ? 'Mark unblocked' : 'Approve'}</Btn>}
        {t.status !== 'shipped' && <Btn disabled={busy} onClick={() => act('advance', `Moved to ${LABEL[STAGES[STAGES.indexOf(t.status) + 1]]}`, false)}>Move to {LABEL[STAGES[STAGES.indexOf(t.status) + 1]]} →</Btn>}
        <Btn disabled={busy} onClick={() => act('snooze', 'Snoozed until tomorrow')}>Snooze until tomorrow</Btn>
        <Btn onClick={() => {
          openEmailComposer({
            to: t.assignee_email ? [t.assignee_email] : (t.assignee ? [t.assignee] : []),
            subject: `Regarding Task: ${t.title}`,
            message: `Hi ${t.assignee || 'there'},\n\nFollowing up on task "${t.title}" in project ${t.project}.\n\nPriority: ${t.priority}\nStatus: ${LABEL[t.status]}\nDue Date: ${t.due_date ? fmtDate(t.due_date) : 'N/A'}\n\nPlease review and let me know if you need any assistance.\n`,
            projectId: t.project_id,
            relatedTaskId: t.id,
            contextTitle: `Task: ${t.title} (${t.project})`,
            emailType: 'task_assigned',
          });
        }}>
          <Mail size={13} className="mr-1.5 inline" /> Send Email
        </Btn>
      </div>
    </div>
  );
}

function DecisionView({ id }) {
  const { data, reload, closeDrawer, toast } = useApp();
  const d = data.decisions.find((x) => x.id === id);
  const [busy, setBusy] = useState(false);
  if (!d) return <Empty title="This decision is already made.">It no longer needs you.</Empty>;
  const pick = async (option) => {
    setBusy(true);
    try { await api.post(`/decisions/${d.id}/decide`, { option }); toast(`Decision recorded: ${option}`); await reload(); closeDrawer(); }
    catch (e) { toast(errMsg(e)); setBusy(false); }
  };
  return (
    <div className="p-2">
      <h4 className="text-xl font-semibold tracking-tight">{d.title}</h4>
      <p className="text-[13px] text-ink2 mt-1">{d.project}</p>
      <p className="mt-4 text-sm"><span className="text-ink2">Decision required:</span> {d.question}</p>
      <div className="flex flex-wrap gap-2 mt-5">{d.options.map((o) => <Btn key={o} variant="primary" disabled={busy} onClick={() => pick(o)}>{o}</Btn>)}</div>
    </div>
  );
}

function StageView({ stage }) {
  const { reload, toast } = useApp();
  const s = useFetch(`/tasks?stage=${stage}`);
  if (!s.data) return <Loading s={s} />;
  const next = STAGES[STAGES.indexOf(stage) + 1];
  const move = async (t) => {
    try { await api.post(`/tasks/${t.id}/advance`); toast(`${t.title} → ${LABEL[next]}`); await reload(); s.refetch(); } catch (e) { toast(errMsg(e)); }
  };
  if (!s.data.length) return <Empty>No tasks in this stage.</Empty>;
  return s.data.map((t) => (
    <Row key={t.id} dot={t.is_blocked ? 'bg-amber' : 'bg-sage'} title={t.title} sub={`${t.project}${t.assignee ? ' · ' + t.assignee : ''}`}
      right={next && <Btn onClick={() => move(t)}>Move to {LABEL[next]} →</Btn>} />
  ));
}

function TasksView() {
  const { openDrawer } = useApp();
  const s = useFetch('/tasks');
  if (!s.data) return <Loading s={s} />;
  return STAGES.map((st) => {
    const list = s.data.filter((t) => t.status === st);
    return list.length ? (
      <div key={st} className="mb-3">
        <h5 className="text-xs font-semibold tracking-widest text-ink2 px-2 pt-2">{LABEL[st].toUpperCase()} · {list.length}</h5>
        {list.map((t) => <Row key={t.id} title={t.title} sub={`${t.project}${t.assignee ? ' · ' + t.assignee : ''}`} onClick={() => openDrawer('task', t.id)} dot={t.is_blocked ? 'bg-amber' : 'bg-sage'} />)}
      </div>
    ) : null;
  });
}

function ProjectView({ id }) {
  const p = useApp().data.projects.find((x) => x.id === id);
  if (!p) return <Empty>Project not found.</Empty>;
  return (
    <div className="p-2">
      <p className={`text-[11.5px] font-semibold tracking-wide ${p.status === 'At Risk' ? 'text-amber' : 'text-ok'}`}>{p.status.toUpperCase()}</p>
      <h4 className="text-xl font-semibold tracking-tight mt-1">{p.progress}% complete</h4>
      <div className="h-[5px] bg-hov rounded-full overflow-hidden my-3"><i className="block h-full bg-brand" style={{ width: `${p.progress}%` }} /></div>
      <p className="text-sm my-1"><b>Momentum:</b> {p.momentum_label}</p>
      <p className="text-sm my-1"><b>This week:</b> {p.note}</p>
      <p className="text-sm my-1"><b>Tasks:</b> {p.shipped} of {p.tasks} shipped</p>
      {p.end_date && <p className="text-sm my-1"><b>Deadline:</b> {fmtDate(p.end_date)}</p>}
    </div>
  );
}

function TeamView() {
  const { data } = useApp();
  const rawTeam = data?.team;
  const members = Array.isArray(rawTeam?.members) ? rawTeam.members : Array.isArray(rawTeam) ? rawTeam : [];
  const signal = rawTeam?.signal || { level: 'ok', text: 'Team capacity looks healthy' };
  const limit = rawTeam?.limit || 8;
  const cls = { active: 'bg-ink border-ink', upcoming: 'border-mute', blocked: 'bg-amber border-amber', review: 'bg-sage border-sage' };
  return (
    <div>
      {members.map((m) => {
        const dots = Array.isArray(m?.dots) ? m.dots : [];
        return (
          <div key={m.id} className="flex items-center gap-3 py-3 px-2 border-b border-line">
            <b className="w-14 font-semibold">{m.name}</b>
            <div className="flex-1 flex flex-wrap gap-1.5">{dots.map((d, i) => <i key={i} className={`w-[11px] h-[11px] rounded-full border-[1.5px] ${cls[d] || cls.active}`} />)}</div>
            <span className="text-[13px] text-mute">{m.count ?? dots.length} / {limit}</span>
          </div>
        );
      })}
      <p className="p-2 mt-2 text-[13px] text-ink2"><Dot className={`mr-2 ${signal?.level === 'warn' ? 'bg-amber' : 'bg-ok'}`} />{signal?.text || 'Team capacity looks healthy'}</p>
      <p className="px-2 text-xs text-mute">Filled = active · outline = upcoming · amber = blocked · sage = in review</p>
    </div>
  );
}

function MeetingsView() {
  const { setCreateType, closeDrawer, openEmailComposer, openInAppMeeting } = useApp();
  const s = useFetch('/meetings');
  return (
    <div>
      <div className="p-2"><Btn variant="primary" onClick={() => { closeDrawer(); setCreateType('meeting'); }}>Schedule meeting</Btn></div>
      {!s.data ? <Loading s={s} /> : s.data.length === 0 ? <Empty>No upcoming meetings.</Empty> :
        s.data.map((m) => (
          <Row
            key={m.id}
            title={m.title}
            sub={`${meetingTime(m.starts_at)} · ${m.participants} participants${m.location ? ' · ' + m.location : ''}`}
            right={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const emails = (m.attendees || []).map((a) => a.email).filter(Boolean);
                    openEmailComposer({
                      to: emails,
                      subject: `Meeting Notice: ${m.title}`,
                      message: `Hi team,\n\nRegarding our scheduled meeting "${m.title}":\n\nDate & Time: ${meetingTime(m.starts_at)}\n${m.agenda ? `Agenda:\n${m.agenda}\n\n` : ''}${m.location ? `Location / Link: ${m.location}\n\n` : ''}`,
                      relatedMeetingId: m.id,
                      contextTitle: `Meeting: ${m.title}`,
                      emailType: 'meeting_invitation',
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-ink2 hover:text-ink hover:bg-card2 rounded-md transition border border-line"
                  title="Email meeting attendees"
                >
                  <Mail size={12} className="text-brand" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDrawer();
                    openInAppMeeting(m);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-brand/10 text-brand hover:bg-brand/20 rounded-md transition"
                  title="Join In-App Video Call"
                >
                  <Video size={12} />
                  <span>Join In-App</span>
                </button>
              </div>
            }
          />
        ))}
    </div>
  );
}

function AnalyticsView() {
  const { data } = useApp();
  const max = Math.max(...data.flow.map((f) => f.count), 1);
  return (
    <div className="p-2">
      <h5 className="text-xs font-semibold tracking-widest text-ink2 mb-2">TASKS BY STAGE</h5>
      {data.flow.map((f) => (
        <div key={f.key} className="flex items-center gap-3 mb-2 text-sm">
          <span className="w-20 text-ink2">{f.label}</span>
          <div className="flex-1 h-[6px] bg-hov rounded-full overflow-hidden"><i className="block h-full bg-sage" style={{ width: `${(f.count / max) * 100}%` }} /></div>
          <span className="w-6 text-right tabular-nums">{f.count}</span>
        </div>
      ))}
      <h5 className="text-xs font-semibold tracking-widest text-ink2 mt-6 mb-2">PROJECT PROGRESS</h5>
      {data.projects.map((p) => (
        <div key={p.id} className="flex items-center gap-3 mb-2 text-sm">
          <span className="w-36 truncate">{p.name}</span>
          <div className="flex-1 h-[6px] bg-hov rounded-full overflow-hidden"><i className="block h-full bg-brand" style={{ width: `${p.progress}%` }} /></div>
          <span className="w-10 text-right tabular-nums">{p.progress}%</span>
        </div>
      ))}
    </div>
  );
}

function AccountView() {
  const { user, logout } = useAuth();
  return (
    <div className="p-2">
      <p className="font-semibold text-lg">{user?.name}</p>
      <p className="text-sm text-ink2">{user?.email}</p>
      <Btn className="mt-5" onClick={logout}>Log out</Btn>
    </div>
  );
}

const HelpView = () => (
  <div className="p-2 text-sm space-y-3">
    <p className="text-ink2">Keyboard shortcuts</p>
    {[['⌘K / Ctrl+K', 'Open the command palette'], ['/', 'Open the command palette'], ['C', 'Open quick create'], ['Esc', 'Close any panel']].map(([k, d]) => (
      <div key={k} className="flex justify-between border-b border-line pb-2"><kbd className="font-sans text-xs border border-line rounded px-1.5 bg-card2">{k}</kbd><span>{d}</span></div>
    ))}
  </div>
);

/* ---------- shell ---------- */
export default function Drawer() {
  const { drawer, closeDrawer, data, openDrawer } = useApp();
  if (!drawer || !data) return null;
  const { type, id } = drawer;
  const views = {
    focus: ['My Focus', <FocusList />],
    blocked: ['Blocked work', <FocusList kind="blocked" />],
    task: ['Task', <TaskView id={id} key={id} />],
    decision: ['Decision', <DecisionView id={id} />],
    decisions: [`Decisions waiting · ${(data?.decisions || []).length}`, (data?.decisions || []).length
      ? (data.decisions).map((d) => <Row key={d.id} dot="bg-brand" title={d.title} sub={d.question} onClick={() => openDrawer('decision', d.id)} />)
      : <Empty title="You're all caught up.">No decisions waiting for you.</Empty>],
    stage: [`${LABEL[id] || 'Stage'} tasks`, <StageView stage={id} key={id} />],
    tasks: ['All tasks', <TasksView />],
    deadlines: ['Deadlines', (data?.deadlines || []).map((d) => (
      <Row key={d.id} dot={urgent(d.days) ? 'bg-amber' : 'bg-mute'} title={d.title} sub={d.project} onClick={() => openDrawer('task', d.id)}
        right={<span className="text-right text-sm"><span className="block">{fmtDate(d.due_date)}</span><small className={urgent(d.days) ? 'text-amber' : 'text-mute'}>{dueLabel(d.days)}</small></span>} />))],
    projects: ['Projects', (data?.projects || []).map((p) => <Row key={p.id} dot={p.status === 'At Risk' ? 'bg-amber' : 'bg-ok'} title={p.name} sub={`${p.status}${p.end_date ? ' · Due ' + fmtDate(p.end_date) : ''}`} right={<span className="text-sm text-ink2">{p.progress}%</span>} onClick={() => openDrawer('project', p.id)} />)],
    project: [(data?.projects || []).find((p) => p.id === id)?.name || 'Project', <ProjectView id={id} />],
    team: ['Team · Capacity', <TeamView />],
    meetings: ['Meetings', <MeetingsView />],
    analytics: ['Analytics', <AnalyticsView />],
    activity: ["What's Moving", (data?.activity || []).map((a) => <Row key={a.id} title={<ActivityLine a={a} />} right={<span className="text-xs text-mute">{timeAgo(a.created_at)}</span>} />)],
    account: ['Account', <AccountView />],
    help: ['Help', <HelpView />],
  };
  const [title, body] = views[type] || ['', null];
  return (
    <>
      <div className="fixed inset-0 bg-ink/30 z-50" onClick={closeDrawer} />
      <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[440px] bg-card border-l border-line z-50 flex flex-col shadow-[-8px_0_24px_rgba(36,41,35,.08)]" aria-label={title}>
        <div className="flex items-center justify-between pl-5 pr-3 py-3.5 border-b border-line">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <button onClick={closeDrawer} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg text-ink2 hover:bg-hov"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{body}</div>
      </aside>
    </>
  );
}
