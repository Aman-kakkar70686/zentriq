import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Code, Folder, Layers, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { timeAgo } from '../../lib/format';
import { Dot } from '../ui';

export default function TeamOverviewTab({ data, onSelectTab, onSelectMember }) {
  const overview = data?.overview || {};
  const members = data?.members || [];
  const roles = overview.role_counts || {};
  const avail = overview.availability || {};
  const allocations = overview.project_allocations || [];
  const attention = overview.attention_required || [];
  const activities = overview.recent_activity || [];

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* 1. Header Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">TOTAL TEAM</span>
            <Users size={16} className="text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{overview.total_members || members.length}</span>
            <span className="text-xs text-ink2">Active profiles</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">DEVELOPERS</span>
            <Code size={16} className="text-[#355E3B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{roles.Developers || 0}</span>
            <span className="text-xs text-ink2">Engineering</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">QA & TESTERS</span>
            <ShieldCheck size={16} className="text-sage" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{roles['QA Testers'] || 0}</span>
            <span className="text-xs text-ink2">Quality assurance</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">MANAGEMENT</span>
            <UserCheck size={16} className="text-ink" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{roles['Product Managers'] || 1}</span>
            <span className="text-xs text-ink2">Product & Delivery</span>
          </div>
        </div>
      </div>

      {/* 2. Availability & Capacity Status Grid */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Team Capacity & Availability Status</h3>
            <p className="text-xs text-ink2 mt-0.5">Real-time availability based on active task allocations</p>
          </div>
          <button
            onClick={() => onSelectTab('workload')}
            className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1"
          >
            <span>Inspect Workload</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border border-ok/20 bg-ok/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ok animate-pulse"></span>
              <div>
                <b className="block text-sm font-semibold text-ink">Available</b>
                <small className="text-[11.5px] text-ink2">Ready for task pickup</small>
              </div>
            </div>
            <span className="text-lg font-bold text-ok">{avail.available || 0}</span>
          </div>

          <div className="p-3.5 rounded-lg border border-brand/20 bg-brands/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand"></span>
              <div>
                <b className="block text-sm font-semibold text-ink">Working (Optimal)</b>
                <small className="text-[11.5px] text-ink2">Active within capacity limit</small>
              </div>
            </div>
            <span className="text-lg font-bold text-brand">{avail.working || 0}</span>
          </div>

          <div className="p-3.5 rounded-lg border border-amber/30 bg-amber/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber"></span>
              <div>
                <b className="block text-sm font-semibold text-ink">Overloaded</b>
                <small className="text-[11.5px] text-amber font-medium">Attention needed</small>
              </div>
            </div>
            <span className="text-lg font-bold text-amber">{avail.overloaded || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. Members Requiring Attention & Project Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Requiring Attention */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber" />
              <h3 className="text-sm font-semibold text-ink">Members Requiring Attention</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber/10 text-amber font-medium">
              {attention.length} flagged
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {attention.length > 0 ? (
              attention.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMember && onSelectMember(members.find((x) => x.id === m.id))}
                  className="p-3 rounded-lg border border-line bg-card2 hover:bg-hov transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-xs font-semibold text-ink">{m.name}</b>
                      <span className="text-[11px] text-ink2">({m.role})</span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {m.reasons.map((r, i) => (
                        <li key={i} className="text-[11.5px] text-amber flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-amber shrink-0"></span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTab('workload');
                    }}
                    className="shrink-0 text-[11px] font-medium text-brand hover:underline px-2 py-1 rounded border border-line bg-card"
                  >
                    Reassign →
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-ink2 text-xs">
                <CheckCircle2 size={24} className="mx-auto text-ok mb-2 opacity-80" />
                <span>All team members have balanced workloads and no active blockers!</span>
              </div>
            )}
          </div>
        </div>

        {/* Project-wise Allocation */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-brand" />
              <h3 className="text-sm font-semibold text-ink">Project-Wise Allocation</h3>
            </div>
            <span className="text-xs text-ink2">{allocations.length} Active Projects</span>
          </div>

          <div className="space-y-3 flex-1">
            {allocations.map((p) => (
              <div key={p.id} className="p-3 rounded-lg border border-line bg-card2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{p.name}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-line/60 text-ink2">
                    {p.open_tasks_count} active tasks
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {p.members.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-card border border-line text-ink2 font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Recent Team Activity */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-ink">Recent Team Activity</h3>
          </div>
          <span className="text-xs text-ink2">Live audit stream</span>
        </div>

        <div className="divide-y divide-line">
          {activities.length > 0 ? (
            activities.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Dot className={a.kind === 'completed' ? 'bg-ok' : a.kind === 'blocked' ? 'bg-amber' : 'bg-brand'} />
                  <span className="font-semibold text-ink">{a.actor}</span>
                  <span className="text-ink2">{a.action}</span>
                  <b className="font-medium text-ink truncate">{a.subject}</b>
                  {a.detail && <span className="text-mute truncate">({a.detail})</span>}
                </div>
                <span className="text-mute text-[11px] shrink-0">{timeAgo(a.created_at)}</span>
              </div>
            ))
          ) : (
            <p className="py-4 text-xs text-ink2 text-center">No recent team logs recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
