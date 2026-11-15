import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, User, UserCheck, X } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Btn } from '../ui';

export default function ReassignTaskModal({ task, members = [], isOpen, onClose, onReassigned, toast }) {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(task?.assignee_id ? String(task.assignee_id) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !task) return null;

  const currentMember = members.find((m) => m.id === task.assignee_id);
  const targetMember = members.find((m) => String(m.id) === String(selectedAssigneeId));

  const handleConfirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const newId = selectedAssigneeId ? Number(selectedAssigneeId) : null;
      await api.post(`/team/tasks/${task.id}/reassign`, {
        assignee_id: newId,
      });

      const newName = targetMember ? targetMember.name : 'Unassigned';
      if (toast) toast(`Task "${task.title}" reassigned to ${newName}`);
      if (onReassigned) await onReassigned();
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-card border border-line rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <UserCheck size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-ink leading-tight">Reassign Task</h3>
              <p className="text-[12px] text-ink2">PM Workload & Assignment Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink2 hover:text-ink hover:bg-hov transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Task Info */}
          <div className="p-3.5 bg-card2 border border-line rounded-xl space-y-1">
            <small className="block text-[11px] font-semibold tracking-wider text-mute uppercase">TASK DETAILS</small>
            <b className="block text-ink font-semibold text-[13.5px]">{task.title}</b>
            <div className="flex items-center gap-2 text-xs text-ink2">
              <span>{task.project || 'Project Task'}</span>
              <span>·</span>
              <span className="capitalize">{task.status}</span>
              {task.is_blocked && <span className="text-amber font-medium">· Blocked</span>}
            </div>
          </div>

          {/* Transfer Visualization */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-card">
            <div className="text-left">
              <small className="block text-[10.5px] font-semibold text-mute uppercase">CURRENT OWNER</small>
              <span className="text-xs font-semibold text-ink">{currentMember?.name || 'Unassigned'}</span>
            </div>
            <ArrowRight size={16} className="text-brand shrink-0 mx-2" />
            <div className="text-right">
              <small className="block text-[10.5px] font-semibold text-mute uppercase">NEW OWNER</small>
              <span className="text-xs font-semibold text-brand">{targetMember?.name || 'Unassigned'}</span>
            </div>
          </div>

          {/* Select Assignee */}
          <div>
            <label className="block text-[12.5px] font-medium text-ink mb-1.5">
              Choose New Assignee:
            </label>
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="w-full h-9 rounded-lg border border-line bg-card px-3 text-xs outline-none focus:border-brand"
            >
              <option value="">Leave Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role || m.designation}) — {m.active_tasks_count} active tasks ({m.availability_status})
                </option>
              ))}
            </select>
          </div>

          {/* Target Workload Alert */}
          {targetMember && (
            <div className="p-2.5 rounded-lg bg-card2 border border-line text-xs text-ink2 flex items-center justify-between">
              <span>{targetMember.name}'s current workload:</span>
              <span className={`font-semibold ${
                targetMember.active_tasks_count >= 4 ? 'text-amber' : 'text-ok'
              }`}>
                {targetMember.active_tasks_count} / 5 tasks
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Btn type="button" onClick={onClose} disabled={busy}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? 'Reassigning…' : 'Confirm Reassignment'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
