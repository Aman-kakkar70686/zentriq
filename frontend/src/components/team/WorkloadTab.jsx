import { useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Gauge, HelpCircle, UserCheck, UserPlus, Users } from 'lucide-react';
import { Btn, Dot } from '../ui';

export default function WorkloadTab({ data, members = [], onOpenReassign }) {
  const workload = data?.workload || {};
  const workloadMembers = workload.members || [];
  const blockedTasks = workload.blocked_tasks || [];
  const unassignedTasks = workload.unassigned_tasks || [];

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* 1. Workload & Capacity Progress Overview */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Gauge size={17} className="text-brand" />
              <h3 className="text-sm font-semibold text-ink">Member Capacity & Workload Visualization</h3>
            </div>
            <p className="text-xs text-ink2 mt-0.5">Recommended limit: 5 active concurrent tasks per member</p>
          </div>
          <span className="text-xs text-ink2 bg-card2 px-2.5 py-1 rounded-md border border-line">
            Capacity limit: 5 tasks
          </span>
        </div>

        <div className="space-y-4">
          {workloadMembers.map((m) => {
            const count = m.count || 0;
            const limit = m.capacity_limit || 5;
            const pct = Math.min(Math.round((count / limit) * 100), 100);
            const isOverloaded = count >= 4;
            const isAvailable = count <= 1;

            const barColor = isOverloaded ? 'bg-amber' : isAvailable ? 'bg-ok' : 'bg-brand';

            return (
              <div key={m.id} className="p-3.5 rounded-xl border border-line bg-card2/60 hover:bg-card2 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <b className="text-sm font-semibold text-ink">{m.name}</b>
                    <span className="text-xs text-ink2">({m.designation || m.role})</span>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                      isOverloaded
                        ? 'bg-amber/10 text-amber border-amber/20'
                        : isAvailable
                        ? 'bg-ok/10 text-ok border-ok/20'
                        : 'bg-brand/10 text-brand border-brand/20'
                    }`}>
                      {isOverloaded ? 'Overloaded' : isAvailable ? 'Available' : 'Optimal'}
                    </span>
                  </div>

                  <span className="text-xs font-semibold tabular-nums text-ink">
                    {count} / {limit} tasks ({pct}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-line overflow-hidden mb-2.5">
                  <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
                </div>

                {/* Task quick-chips */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {m.tasks?.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onOpenReassign && onOpenReassign(t)}
                        title="Click to reassign this task"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-line bg-card hover:border-brand transition text-ink2 hover:text-ink font-medium"
                      >
                        <Dot className={t.is_blocked ? 'bg-amber' : 'bg-ok'} />
                        <span className="truncate max-w-[140px]">{t.title}</span>
                      </button>
                    ))}
                    {(!m.tasks || m.tasks.length === 0) && (
                      <span className="text-[11.5px] text-ink2 italic">No active tasks assigned</span>
                    )}
                  </div>

                  <span className="text-[11px] text-mute shrink-0 ml-2">Click task to reassign</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Blocked Tasks Section */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber" />
            <h3 className="text-sm font-semibold text-ink">Blocked Tasks ({blockedTasks.length})</h3>
          </div>
          <span className="text-xs text-amber font-medium">Reassignment or unblocking required</span>
        </div>

        <div className="divide-y divide-line">
          {blockedTasks.length > 0 ? (
            blockedTasks.map((t) => (
              <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dot className="bg-amber" />
                    <b className="text-xs font-semibold text-ink">{t.title}</b>
                    <span className="text-[11px] text-ink2 bg-card2 px-1.5 py-0.5 rounded border border-line">{t.project}</span>
                  </div>
                  <p className="text-[11.5px] text-amber mt-1 pl-4">
                    Reason: {t.blocked_reason || 'Dependencies pending'} · Assigned to {t.assignee || 'Unassigned'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pl-4 sm:pl-0">
                  <button
                    onClick={() => onOpenReassign && onOpenReassign(t)}
                    className="h-7 px-2.5 rounded-md border border-line bg-card hover:bg-hov text-xs font-medium text-ink transition inline-flex items-center gap-1"
                  >
                    <span>Reassign</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-xs text-ink2 text-center">No blocked tasks across team</p>
          )}
        </div>
      </div>

      {/* 3. Unassigned Tasks Section */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-ink">Unassigned Tasks ({unassignedTasks.length})</h3>
          </div>
          <span className="text-xs text-ink2">Ready to be delegated</span>
        </div>

        <div className="divide-y divide-line">
          {unassignedTasks.length > 0 ? (
            unassignedTasks.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dot className="bg-mute" />
                    <span className="text-xs font-semibold text-ink">{t.title}</span>
                    <span className="text-[11px] text-ink2 bg-card2 px-1.5 py-0.5 rounded border border-line">{t.project}</span>
                    <span className="text-[10px] uppercase font-semibold text-mute">Stage: {t.status}</span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenReassign && onOpenReassign(t)}
                  className="h-7 px-3 rounded-md bg-brand hover:bg-brandh text-white text-xs font-medium transition inline-flex items-center gap-1"
                >
                  <UserPlus size={12} />
                  <span>Assign</span>
                </button>
              </div>
            ))
          ) : (
            <p className="py-4 text-xs text-ink2 text-center">All open tasks are assigned to team members</p>
          )}
        </div>
      </div>
    </div>
  );
}
