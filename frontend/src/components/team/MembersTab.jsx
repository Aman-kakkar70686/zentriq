import { useState } from 'react';
import { ExternalLink, Filter, Folder, Github, Search, UserCheck, Users } from 'lucide-react';
import { Dot } from '../ui';

export default function MembersTab({ members = [], onSelectMember }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.designation || '').toLowerCase().includes(q) ||
      (m.skills || []).some((s) => s.toLowerCase().includes(q)) ||
      (m.github_username || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (roleFilter === 'DEV') return m.role.toLowerCase().includes('developer') || m.role.toLowerCase().includes('engineer') && !m.role.toLowerCase().includes('qa');
    if (roleFilter === 'QA') return m.role.toLowerCase().includes('qa') || m.role.toLowerCase().includes('tester');
    if (roleFilter === 'PM') return m.role.toLowerCase().includes('manager') || m.role.toLowerCase().includes('pm');
    return true;
  });

  const statusBadge = {
    available: 'bg-ok/10 text-ok border-ok/20',
    working: 'bg-brand/10 text-brand border-brand/20',
    overloaded: 'bg-amber/10 text-amber border-amber/20',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-line rounded-xl p-3.5 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search team members by name, designation, skill, or GitHub..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-card2 text-xs outline-none focus:border-brand"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-ink2" />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1 bg-card2 p-1 rounded-lg border border-line self-start sm:self-auto">
          {[
            ['ALL', 'All Members'],
            ['DEV', 'Developers'],
            ['QA', 'QA Testers'],
            ['PM', 'Management'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setRoleFilter(k)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                roleFilter === k
                  ? 'bg-card text-ink shadow-xs font-semibold'
                  : 'text-ink2 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map((m) => {
          const initials = (m.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

          return (
            <div
              key={m.id}
              onClick={() => onSelectMember && onSelectMember(m)}
              className="bg-card border border-line hover:border-brand/40 rounded-xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header row: Avatar, Info, Status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-side text-white font-bold text-sm grid place-items-center group-hover:bg-brand transition-colors">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-ink group-hover:text-brand transition-colors">{m.name}</h4>
                        <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${statusBadge[m.availability_status] || statusBadge.available}`}>
                          {m.availability_status}
                        </span>
                      </div>
                      <p className="text-xs text-ink2">{m.designation || m.role}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-card2 border border-line text-ink2">
                    {m.active_tasks_count} tasks
                  </span>
                </div>

                {/* Skills Chips */}
                <div className="mb-3.5">
                  <div className="flex flex-wrap gap-1">
                    {m.skills?.slice(0, 4).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-card2 border border-line/60 text-ink2">
                        {s}
                      </span>
                    ))}
                    {m.skills?.length > 4 && (
                      <span className="text-[10px] text-mute self-center">+{m.skills.length - 4}</span>
                    )}
                  </div>
                </div>

                {/* Assigned Projects */}
                <div className="mb-3.5">
                  <small className="block text-[10.5px] font-semibold text-mute uppercase tracking-wider mb-1">PROJECTS</small>
                  <div className="flex flex-wrap gap-1.5">
                    {m.assigned_projects?.map((proj) => (
                      <span key={proj} className="inline-flex items-center gap-1 text-[11px] text-ink font-medium px-2 py-0.5 rounded bg-line/40">
                        <Folder size={11} className="text-brand" />
                        <span>{proj}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Tasks Preview */}
                <div>
                  <small className="block text-[10.5px] font-semibold text-mute uppercase tracking-wider mb-1">ACTIVE TASKS</small>
                  <div className="space-y-1">
                    {m.tasks?.slice(0, 2).map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-[11.5px] py-1 px-2 rounded bg-card2 border border-line/60">
                        <div className="flex items-center gap-1.5 truncate">
                          <Dot className={t.is_blocked ? 'bg-amber' : t.status === 'review' ? 'bg-sage' : 'bg-ok'} />
                          <span className="truncate">{t.title}</span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-mute shrink-0 ml-2">
                          {t.status}
                        </span>
                      </div>
                    ))}
                    {m.tasks?.length > 2 && (
                      <span className="text-[11px] text-brand hover:underline font-medium block pt-0.5">
                        +{m.tasks.length - 2} more tasks...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: GitHub Link Status & Action */}
              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink2">
                <div className="flex items-center gap-1.5">
                  <Github size={13} className={m.github_connected ? 'text-ink' : 'text-mute'} />
                  {m.github_connected ? (
                    <span className="font-mono text-[11px] text-ink font-medium">@{m.github_username}</span>
                  ) : (
                    <span className="text-mute text-[11px]">GitHub unlinked</span>
                  )}
                </div>
                <span className="text-brand font-medium text-[11.5px] group-hover:underline inline-flex items-center gap-1">
                  View Profile →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="p-12 text-center text-ink2 bg-card border border-line rounded-xl">
          <Users size={28} className="mx-auto text-mute mb-2" />
          <p className="font-semibold text-ink text-sm">No team members match your filter</p>
          <p className="text-xs mt-1">Try clearing your search query or switching roles.</p>
        </div>
      )}
    </div>
  );
}
