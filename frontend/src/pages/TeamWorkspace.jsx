import { useEffect, useState } from 'react';
import { Activity, Bug, CheckSquare, Gauge, GitBranch, Github, Layers, RefreshCw, ShieldCheck, UserCheck, Users } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useApp } from '../context/AppContext';
import CommandPalette from '../components/CommandPalette';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';

import TeamOverviewTab from '../components/team/TeamOverviewTab';
import MembersTab from '../components/team/MembersTab';
import WorkloadTab from '../components/team/WorkloadTab';
import GitHubTab from '../components/team/GitHubTab';
import QATestingTab from '../components/team/QATestingTab';
import MemberProfileModal from '../components/team/MemberProfileModal';
import ReassignTaskModal from '../components/team/ReassignTaskModal';

export default function TeamWorkspace() {
  const { teamTab, setTeamTab, toast, reload: reloadGlobal } = useApp();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [activeProfileMember, setActiveProfileMember] = useState(null);
  const [reassignTask, setReassignTask] = useState(null);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const res = await api.get('/team/workspace');
      setTeamData(res.data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const handleGlobalRefresh = async () => {
    await fetchWorkspace();
    await reloadGlobal();
  };

  const tabs = [
    { key: 'overview', label: 'Team Overview', icon: Users, badge: null },
    { key: 'members', label: 'Members', icon: UserCheck, badge: teamData?.overview?.total_members },
    { key: 'workload', label: 'Workload & Availability', icon: Gauge, badge: teamData?.workload?.blocked_tasks?.length ? `${teamData.workload.blocked_tasks.length} blocked` : null },
    { key: 'github', label: 'GitHub Activity', icon: Github, badge: teamData?.github?.is_connected ? 'Live' : null },
    { key: 'qa', label: 'QA & Testing', icon: ShieldCheck, badge: teamData?.qa?.bugs_awaiting_fixes?.length ? `${teamData.qa.bugs_awaiting_fixes.length} bugs` : null },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-56">
        <TopBar />
        <main className="max-w-[1240px] px-4 lg:px-10 pt-7 pb-24">
          {/* Header Title & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-mute">WORKSPACE</span>
                <span className="text-mute">/</span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-brand">TEAM & QUALITY</span>
              </div>
              <h1 className="text-[28px] font-semibold text-ink tracking-tight">Team Workspace</h1>
              <p className="text-[14.5px] text-ink2 mt-0.5">
                Directory, workload visualization, real GitHub development activity, and QA testing pipeline.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleGlobalRefresh}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title="Refresh team workspace"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-brand' : 'text-ink2'} />
                <span>Sync Data</span>
              </button>
            </div>
          </div>

          {/* Top Sub-Navigation Tabs */}
          <div className="border-b border-line mb-7 overflow-x-auto scrollbar-none">
            <nav className="flex space-x-1 sm:space-x-2 -mb-px min-w-max" aria-label="Team Workspace Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = teamTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setTeamTab(tab.key)}
                    className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-[13px] font-medium transition-all ${
                      isActive
                        ? 'border-brand text-brand font-semibold'
                        : 'border-transparent text-ink2 hover:text-ink hover:border-line'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-brand' : 'text-ink2'} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-brand/10 text-brand'
                          : 'bg-card2 border border-line text-ink2'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-card border border-amber/30 text-amber text-xs font-medium">
              Could not load team workspace: {error}
            </div>
          )}

          {/* Loading State */}
          {loading && !teamData && (
            <div className="py-20 text-center text-ink2 text-sm">
              <RefreshCw size={24} className="mx-auto text-brand animate-spin mb-3" />
              <p>Loading Team Workspace…</p>
            </div>
          )}

          {/* Tab Views */}
          {teamData && (
            <>
              {teamTab === 'overview' && (
                <TeamOverviewTab
                  data={teamData}
                  onSelectTab={(k) => setTeamTab(k)}
                  onSelectMember={(m) => setActiveProfileMember(m)}
                />
              )}

              {teamTab === 'members' && (
                <MembersTab
                  members={teamData.members}
                  onSelectMember={(m) => setActiveProfileMember(m)}
                />
              )}

              {teamTab === 'workload' && (
                <WorkloadTab
                  data={teamData}
                  members={teamData.members}
                  onOpenReassign={(t) => setReassignTask(t)}
                />
              )}

              {teamTab === 'github' && (
                <GitHubTab
                  data={teamData}
                  members={teamData.members}
                  toast={toast}
                />
              )}

              {teamTab === 'qa' && (
                <QATestingTab
                  data={teamData}
                  onReload={handleGlobalRefresh}
                  toast={toast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Shared Modals & Drawers */}
      <QuickCreate />
      <Drawer />
      <CommandPalette />
      <Toast />

      {/* Team Modals */}
      <MemberProfileModal
        member={activeProfileMember}
        isOpen={Boolean(activeProfileMember)}
        onClose={() => setActiveProfileMember(null)}
        onUpdated={handleGlobalRefresh}
        toast={toast}
      />

      <ReassignTaskModal
        task={reassignTask}
        members={teamData?.members || []}
        isOpen={Boolean(reassignTask)}
        onClose={() => setReassignTask(null)}
        onReassigned={handleGlobalRefresh}
        toast={toast}
      />
    </div>
  );
}
