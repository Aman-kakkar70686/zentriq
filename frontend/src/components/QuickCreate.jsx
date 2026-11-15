import { useEffect, useState } from 'react';
import { Check, Plus, Video, X } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useApp } from '../context/AppContext';
import { Btn } from './ui';

const MENU = [['project', 'New Project'], ['task', 'New Task'], ['decision', 'New Decision'], ['meeting', 'Schedule Meeting']];
const field = 'w-full h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-brand';

function FormField({ label, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-[13px] font-medium text-ink2">{label}</label>}
      <div className="text-ink">{children}</div>
    </div>
  );
}

function getNowDateTimeString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getUpcomingDateTime(hoursAhead = 1) {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CreateModal({ type, onClose }) {
  const { reload, toast } = useApp();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [v, setV] = useState({ priority: 'medium', status: 'planned' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  useEffect(() => {
    api.get('/projects').then((r) => { setProjects(r.data); setV((x) => ({ ...x, project_id: r.data[0]?.id })); });
    api.get('/users').then((r) => {
      setUsers(r.data);
      const aman = r.data.find((u) => u.email === 'amankakkar70686@gmail.com' || u.name?.toLowerCase().includes('aman'));
      if (aman) {
        setV((x) => ({
          ...x,
          assignee_id: x.assignee_id || String(aman.id),
        }));
      }
    });

    if (type === 'meeting') {
      setV((x) => ({
        ...x,
        starts_at: x.starts_at || getUpcomingDateTime(1),
        ends_at: x.ends_at || getUpcomingDateTime(2),
        attendee_ids: x.attendee_ids || [],
      }));
    }
  }, [type]);

  const nn = (x) => (x === '' || x === undefined ? null : x);
  const build = {
    project: () => ['/projects', { name: v.name, description: nn(v.description), start_date: nn(v.start_date), end_date: nn(v.end_date) }],
    task: () => ['/tasks', { title: v.title, description: nn(v.description), project_id: Number(v.project_id), assignee_id: v.assignee_id ? Number(v.assignee_id) : null, priority: v.priority, status: v.status, due_date: nn(v.due_date) }],
    decision: () => ['/decisions', { project_id: Number(v.project_id), title: v.title, question: v.question, options: (v.options || '').split(',').map((s) => s.trim()).filter(Boolean), proposal: nn(v.proposal) }],
    meeting: () => {
      // Auto-generate built-in Zentriq video room without requiring external apps
      let link = v.custom_link?.trim();
      if (!link) {
        const cleanTitle = (v.title || 'call').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);
        link = `https://meet.jit.si/zentriq-${cleanTitle}-${Math.random().toString(36).substring(2, 8)}`;
      }

      const selectedAttendees = (v.attendee_ids && v.attendee_ids.length > 0) ? v.attendee_ids : [];
      const startsAt = v.starts_at || getUpcomingDateTime(1);
      const endsAt = v.ends_at || getUpcomingDateTime(2);

      return ['/meetings', {
        title: v.title.trim(),
        description: nn(v.description),
        starts_at: startsAt,
        ends_at: nn(endsAt),
        agenda: nn(v.description) || nn(v.title),
        location: link,
        notes: nn(v.description),
        attendee_ids: selectedAttendees,
        participants: selectedAttendees.length || 1,
        teams_link: link,
      }];
    },
  }[type];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');

    if (type === 'meeting') {
      if (!v.title?.trim()) {
        setError('Please enter a meeting title / topic.');
        setBusy(false);
        return;
      }
      const now = new Date();
      const start = new Date(v.starts_at);
      if (start.getTime() < now.getTime() - 60000) {
        setError('Meeting cannot be scheduled in the past. Please select a present or future date and time.');
        setBusy(false);
        return;
      }
      if (v.ends_at && new Date(v.ends_at).getTime() <= start.getTime()) {
        setError('Meeting end time must be after the start time.');
        setBusy(false);
        return;
      }
      if (!v.attendee_ids || v.attendee_ids.length === 0) {
        setError('Please add at least one attendee for the meeting.');
        setBusy(false);
        return;
      }
    }

    try {
      const [url, body] = build();
      await api.post(url, body);
      toast(type === 'meeting' ? 'Meeting scheduled successfully!' : 'Created');
      await reload();
      onClose();
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  const attendeeIds = v.attendee_ids || [];
  const selectedAttendees = users.filter((u) => attendeeIds.includes(u.id));
  const availableUsers = users.filter((u) => !attendeeIds.includes(u.id));

  const addAttendee = (userId) => {
    if (!userId) return;
    const id = Number(userId);
    if (!attendeeIds.includes(id)) {
      setV((prev) => ({
        ...prev,
        attendee_ids: [...(prev.attendee_ids || []), id],
      }));
    }
  };

  const removeAttendee = (userId) => {
    setV((prev) => ({
      ...prev,
      attendee_ids: (prev.attendee_ids || []).filter((id) => id !== userId),
    }));
  };

  const projSelect = (
    <FormField label="Project">
      <select className={field} value={v.project_id || ''} onChange={set('project_id')} required>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </FormField>
  );

  const titles = { project: 'New project', task: 'New task', decision: 'New decision', meeting: 'Schedule meeting' };

  return (
    <div className="fixed inset-0 z-[55] bg-ink/30 grid place-items-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md bg-card rounded-xl border border-line p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between"><h3 className="font-semibold text-lg tracking-tight">{titles[type]}</h3><button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
        {type === 'project' && <>
          <FormField label="Name"><input className={field} value={v.name || ''} onChange={set('name')} required /></FormField>
          <FormField label="Description"><textarea className={`${field} h-20 py-2`} value={v.description || ''} onChange={set('description')} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start date"><input type="date" className={field} onChange={set('start_date')} /></FormField>
            <FormField label="End date"><input type="date" className={field} onChange={set('end_date')} /></FormField>
          </div>
        </>}
        {type === 'task' && <>
          <FormField label="Title"><input className={field} value={v.title || ''} onChange={set('title')} required /></FormField>
          {projSelect}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Assignee"><select className={field} value={v.assignee_id || ''} onChange={set('assignee_id')}><option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></FormField>
            <FormField label="Priority"><select className={field} value={v.priority} onChange={set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></FormField>
            <FormField label="Stage"><select className={field} value={v.status} onChange={set('status')}>{['ideas', 'planned', 'building', 'review', 'ready', 'shipped'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></FormField>
            <FormField label="Due date"><input type="date" className={field} onChange={set('due_date')} /></FormField>
          </div>
          {v.assignee_id && (
            <div className="p-2.5 bg-card2 border border-line rounded-lg text-xs text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand shrink-0"></span>
              <span>
                Task notification email will be dispatched to <strong>{users.find((u) => String(u.id) === String(v.assignee_id))?.email || 'assignee'}</strong> via Resend.
              </span>
            </div>
          )}
        </>}
        {type === 'decision' && <>
          {projSelect}
          <FormField label="Title"><input className={field} value={v.title || ''} onChange={set('title')} required /></FormField>
          <FormField label="Question"><input className={field} placeholder="REST vs GraphQL" value={v.question || ''} onChange={set('question')} required /></FormField>
          <FormField label="Options (comma separated)"><input className={field} placeholder="REST, GraphQL" value={v.options || ''} onChange={set('options')} required /></FormField>
          <FormField label="Proposal (optional)"><input className={field} value={v.proposal || ''} onChange={set('proposal')} /></FormField>
        </>}
        {type === 'meeting' && <>
          <FormField label="Meeting Title / Topic">
            <input
              className={field}
              placeholder="e.g. Sprint Review or Product Architecture Sync"
              value={v.title || ''}
              onChange={set('title')}
              required
            />
          </FormField>
          <FormField label="Description / Context (Optional)">
            <textarea
              className={`${field} h-20 py-2 resize-none`}
              placeholder="Brief description or context of the session..."
              value={v.description || ''}
              onChange={set('description')}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Starts at">
              <input
                type="datetime-local"
                className={field}
                min={getNowDateTimeString()}
                value={v.starts_at || ''}
                onChange={set('starts_at')}
                required
              />
            </FormField>
            <FormField label="Ends at">
              <input
                type="datetime-local"
                className={field}
                min={v.starts_at || getNowDateTimeString()}
                value={v.ends_at || ''}
                onChange={set('ends_at')}
              />
            </FormField>
          </div>
          
          {/* Meeting Attendees Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[13px] text-ink2 font-medium">Meeting Attendees</label>
              <span className="text-[11px] text-mute font-medium">{selectedAttendees.length} selected</span>
            </div>

            {/* Selected Attendees List / Chips */}
            {selectedAttendees.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-card2 border border-line rounded-xl min-h-[42px] items-center">
                {selectedAttendees.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-line text-xs font-medium text-ink shadow-sm"
                  >
                    <span className="w-4 h-4 rounded-full bg-brand/10 text-brand text-[10px] font-bold grid place-items-center shrink-0">
                      {att.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                    <span>{att.name}</span>
                    <span className="text-[11px] text-ink2 font-mono">({att.email})</span>
                    <button
                      type="button"
                      onClick={() => removeAttendee(att.id)}
                      className="text-mute hover:text-red-500 ml-1 p-0.5 rounded hover:bg-red-50 transition"
                      title={`Remove ${att.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-card2 border border-dashed border-line rounded-xl text-xs text-ink2 text-center">
                No attendees added yet. Select team members below to invite them.
              </div>
            )}

            {/* Add Attendee Dropdown */}
            {availableUsers.length > 0 ? (
              <div className="flex items-center gap-2">
                <select
                  className={`${field} text-xs`}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addAttendee(e.target.value);
                  }}
                >
                  <option value="">+ Add team member as attendee...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.email} ({u.role || u.designation || 'Team'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-[11px] text-mute">All team members have been added.</p>
            )}

            {selectedAttendees.length > 0 && (
              <p className="text-[11px] text-mute flex items-center gap-1">
                <Check size={12} className="text-ok" />
                Automatic invitation email will be delivered to {selectedAttendees.length} attendee(s) upon scheduling.
              </p>
            )}
          </div>

          {/* Built-In Zentriq Video Room (Zero External Apps Needed) */}
          <div className="p-3.5 bg-brand/5 border border-brand/20 rounded-xl space-y-2 mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-brand" />
                <span className="text-[13px] font-semibold text-ink">Built-In Zentriq Video Room</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 flex items-center gap-1">
                <Check size={11} /> Auto-Generated
              </span>
            </div>
            <p className="text-[11.5px] text-ink2 leading-relaxed">
              Instant in-app video room will be created automatically. You and your attendees can join directly inside Zentriq without needing MS Teams or external apps.
            </p>

            <div className="pt-1 border-t border-brand/10">
              <label className="inline-flex items-center gap-2 text-xs text-ink2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={v.use_custom_link || false}
                  onChange={(e) => setV({ ...v, use_custom_link: e.target.checked })}
                  className="rounded border-line text-brand focus:ring-brand"
                />
                <span>Use custom link instead (e.g. Teams / Zoom)</span>
              </label>

              {v.use_custom_link && (
                <div className="mt-2">
                  <input
                    type="url"
                    className={`${field} font-mono text-[12px] h-8`}
                    placeholder="https://teams.microsoft.com/... or https://zoom.us/..."
                    value={v.custom_link || ''}
                    onChange={set('custom_link')}
                  />
                </div>
              )}
            </div>
          </div>
        </>}
        {error && <p className="text-sm text-amber">{error}</p>}
        <div className="flex justify-end gap-2 pt-1"><Btn type="button" onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy}>{busy ? 'Saving…' : type === 'meeting' ? 'Schedule Meeting' : 'Create'}</Btn></div>
      </form>
    </div>
  );
}

export default function QuickCreate() {
  const { fabOpen, setFabOpen, createType, setCreateType } = useApp();
  return (
    <>
      <div className="fixed right-5 bottom-5 z-40" onClick={(e) => e.stopPropagation()}>
        <div className={`absolute right-0 bottom-14 w-48 bg-card border border-line rounded-xl p-1.5 shadow-lg origin-bottom-right transition duration-200 ${fabOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          {MENU.map(([k, label]) => (
            <button key={k} onClick={() => { setFabOpen(false); setCreateType(k); }} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium hover:bg-hov text-left"><Plus size={15} />{label}</button>
          ))}
        </div>
        <button onClick={() => setFabOpen(!fabOpen)} aria-label="Quick create" className={`w-11 h-11 rounded-full bg-brand hover:bg-brandh text-white grid place-items-center shadow-md transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}><Plus size={20} strokeWidth={2} /></button>
      </div>
      {createType && <CreateModal type={createType} onClose={() => setCreateType(null)} />}
    </>
  );
}
