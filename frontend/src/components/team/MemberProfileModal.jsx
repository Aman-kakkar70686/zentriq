import { useState } from 'react';
import { Check, ExternalLink, Folder, GitBranch, Github, Mail, Shield, User, X } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Btn, Dot } from '../ui';
import { useApp } from '../../context/AppContext';

export default function MemberProfileModal({ member, isOpen, onClose, onUpdated, toast }) {
  const { openEmailComposer } = useApp() || {};
  const [role, setRole] = useState(member?.role || 'Developer');
  const [designation, setDesignation] = useState(member?.designation || '');
  const [skills, setSkills] = useState((member?.skills || []).join(', '));
  const [githubUsername, setGithubUsername] = useState(member?.github_username || '');
  const [availability, setAvailability] = useState(member?.availability_status || 'available');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  const initials = (member.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.patch(`/team/members/${member.id}`, {
        role,
        designation,
        skills,
        github_username: githubUsername.trim() || null,
        availability_status: availability,
      });

      if (toast) toast(`Updated ${member.name}'s profile`);
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  const statusColors = {
    available: 'bg-ok/10 text-ok border-ok/20',
    working: 'bg-brand/10 text-brand border-brand/20',
    overloaded: 'bg-amber/10 text-amber border-amber/20',
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-card border border-line rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand text-white font-semibold text-sm grid place-items-center">
              {initials}
            </div>
            <div>
              <h3 className="font-semibold text-base text-ink leading-tight">{member.name}</h3>
              <p className="text-[12.5px] text-ink2">{member.designation || member.role} {member.email && `· ${member.email}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {openEmailComposer && member.email && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openEmailComposer({
                    to: [member.email],
                    subject: `Message from Zentriq Team`,
                    message: `Hi ${member.name.split(' ')[0]},\n\n`,
                    contextTitle: `Team Member: ${member.name} (${member.designation || member.role})`,
                    emailType: 'direct',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title={`Send direct email to ${member.name}`}
              >
                <Mail size={13} className="text-brand" />
                <span>Send Email</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink2 hover:text-ink hover:bg-hov transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-card2 border border-line rounded-xl text-center">
            <div>
              <small className="block text-[11px] font-semibold tracking-wider text-mute uppercase">STATUS</small>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[availability] || statusColors.available}`}>
                {availability.charAt(0).toUpperCase() + availability.slice(1)}
              </span>
            </div>
            <div>
              <small className="block text-[11px] font-semibold tracking-wider text-mute uppercase">ACTIVE TASKS</small>
              <b className="block mt-1 text-base font-semibold text-ink">{member.active_tasks_count}</b>
            </div>
            <div>
              <small className="block text-[11px] font-semibold tracking-wider text-mute uppercase">PROJECTS</small>
              <b className="block mt-1 text-base font-semibold text-ink">{member.assigned_projects?.length || 0}</b>
            </div>
          </div>

          {/* Assigned Projects */}
          <div>
            <h4 className="text-[12px] font-semibold tracking-wider text-mute uppercase mb-2">ASSIGNED PROJECTS</h4>
            <div className="flex flex-wrap gap-1.5">
              {member.assigned_projects?.length > 0 ? (
                member.assigned_projects.map((proj) => (
                  <span key={proj} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-line text-xs font-medium text-ink">
                    <Folder size={12} className="text-brand" />
                    {proj}
                  </span>
                ))
              ) : (
                <span className="text-xs text-ink2">No active projects assigned</span>
              )}
            </div>
          </div>

          {/* Current Tasks */}
          <div>
            <h4 className="text-[12px] font-semibold tracking-wider text-mute uppercase mb-2">CURRENT TASKS ({member.tasks?.length || 0})</h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {member.tasks?.length > 0 ? (
                member.tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-card2 border border-line text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dot className={t.is_blocked ? 'bg-amber' : t.status === 'review' ? 'bg-sage' : 'bg-ok'} />
                      <span className="font-medium truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-line text-ink2">
                        {t.status}
                      </span>
                      {t.is_blocked && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber/15 text-amber">
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink2 italic">No tasks currently assigned</p>
              )}
            </div>
          </div>

          {/* Editable Profile Information */}
          <form id="edit-member-form" onSubmit={handleSave} className="space-y-3 pt-2 border-t border-line">
            <h4 className="text-[12px] font-semibold tracking-wider text-mute uppercase">EDIT PROFILE & MAPPING</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-ink2 mb-1">Role in Team</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-9 rounded-lg border border-line bg-card px-3 text-xs outline-none focus:border-brand"
                >
                  <option value="Developer">Developer</option>
                  <option value="QA Tester">QA Tester</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="Designer">Designer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink2 mb-1">Availability Status</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full h-9 rounded-lg border border-line bg-card px-3 text-xs outline-none focus:border-brand"
                >
                  <option value="available">Available</option>
                  <option value="working">Working (Optimal)</option>
                  <option value="overloaded">Overloaded</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">Official Designation</label>
              <input
                type="text"
                placeholder="e.g. Senior QA Automation Engineer"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full h-9 rounded-lg border border-line bg-card px-3 text-xs outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">Skills (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Cypress, Jest, PyTest, API Testing"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full h-9 rounded-lg border border-line bg-card px-3 text-xs outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">
                GitHub Username (maps commits & PRs)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. arjun-qa"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="w-full h-9 rounded-lg border border-line bg-card pl-8 pr-3 text-xs outline-none focus:border-brand font-mono"
                />
                <Github size={14} className="absolute left-2.5 top-2.5 text-ink2" />
              </div>
            </div>

            {error && (
              <p className="text-xs text-amber font-medium">{error}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-line bg-card2">
          <div className="flex items-center gap-1.5 text-xs text-ink2">
            <Mail size={13} />
            <span>{member.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn type="button" onClick={onClose} disabled={saving}>Cancel</Btn>
            <Btn type="submit" form="edit-member-form" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
