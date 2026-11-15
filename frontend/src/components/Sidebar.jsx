import { Calendar, CheckCircle2, ChevronDown, ChevronRight, ChevronLeft, FileCheck2, Folder, HelpCircle, History, LayoutGrid, LineChart, Mail, Route, Settings, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Dot, Logo } from './ui';

function Item({ icon: Icon, label, count, onClick, active }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-sm font-medium transition-colors ${active ? 'bg-sage/25 text-[#F7F6F2]' : 'text-[#B9BDB2] hover:bg-white/10 hover:text-[#F7F6F2]'}`}>
      <Icon size={16} strokeWidth={1.75} />
      {label}
      {count != null && <span className="ml-auto text-xs text-[#8E9488]">{count}</span>}
    </button>
  );
}

const Group = ({ children }) => <div className="text-xs font-medium text-[#8E9488] px-2.5 pt-4 pb-1">{children}</div>;

export default function Sidebar() {
  const {
    data, openDrawer, menuOpen, setMenuOpen,
    currentView, teamTab, teamExpanded, setTeamExpanded,
    selectedProjectId, projectWorkspaceTab,
    sidebarCollapsed, setSidebarCollapsed, toggleSidebar,
    navigateToProjects, navigateToTeam, navigateToOverview,
    navigateToCopilot, navigateToPrdHistory,
    navigateToRequirementIntelligence, navigateToStoryQA,
    navigateToEvaluation, evaluationTab,
    navigateToEmailCenter
  } = useApp();
  const { user } = useAuth();
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Floating Arrow Tab to slide the sidebar back onto the screen */}
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed left-0 top-20 z-50 bg-[#174B3A] text-white hover:bg-[#1f634d] px-2.5 py-3 rounded-r-xl shadow-2xl border border-l-0 border-white/20 flex items-center gap-2 transition-all hover:pl-3.5 group animate-in slide-in-from-left duration-200"
          title="Open sidebar navigation options"
        >
          <ChevronRight size={18} className="text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-xs font-semibold tracking-wide pr-1 hidden sm:inline">Menu</span>
        </button>
      )}

      {menuOpen && <div className="fixed inset-0 bg-ink/30 z-30 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-side z-40 flex flex-col px-2.5 pt-4 pb-2 overflow-y-auto transition-transform duration-300 ease-in-out shadow-2xl ${
        sidebarCollapsed ? '-translate-x-full' : (menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }`}>
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-2.5 text-[#F7F6F2] font-bold text-base tracking-tight"><Logo /> Zentriq</div>
          {/* Arrow button to slide sidebar out of the screen */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-lg text-[#8E9488] hover:text-[#F7F6F2] hover:bg-white/10 transition"
            title="Collapse sidebar (Expand to full-screen)"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <Group>Workspace</Group>
        <Item
          icon={LayoutGrid}
          label="Overview"
          active={currentView === 'overview'}
          onClick={() => {
            navigateToOverview();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <Item icon={Target} label="My Focus" count={data?.focus?.length} onClick={() => openDrawer('focus')} />
        <Item
          icon={Folder}
          label="Projects"
          count={data?.projects?.length}
          active={currentView === 'projects' && projectWorkspaceTab !== 'roadmap'}
          onClick={() => {
            navigateToProjects(null, 'sprints');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        
        {/* Expandable Team Workspace Section */}
        <div className="space-y-0.5">
          <div className={`flex items-center w-full rounded-lg transition-colors ${
            currentView === 'team' ? 'bg-sage/25 text-[#F7F6F2]' : 'text-[#B9BDB2] hover:bg-white/10 hover:text-[#F7F6F2]'
          }`}>
            <button
              onClick={() => {
                if (currentView !== 'team') {
                  navigateToTeam('overview');
                } else {
                  setTeamExpanded(!teamExpanded);
                }
              }}
              className="flex items-center gap-2.5 flex-1 px-2.5 py-1.5 text-left text-sm font-medium"
            >
              <Users size={16} strokeWidth={1.75} />
              <span>Team</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTeamExpanded(!teamExpanded);
              }}
              className="p-1.5 pr-2.5 text-[#8E9488] hover:text-[#F7F6F2] transition"
              title={teamExpanded ? "Collapse Team" : "Expand Team"}
            >
              <ChevronRight size={14} className={`transition-transform duration-200 ${teamExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Sub-navigation tabs inside expandable Team section */}
          {teamExpanded && (
            <div className="pl-5 pr-1 py-1 space-y-0.5 border-l border-white/10 ml-4 animate-in fade-in duration-150">
              {[
                ['overview', 'Team Overview'],
                ['members', 'Members'],
                ['workload', 'Workload & Availability'],
                ['github', 'GitHub Activity'],
                ['qa', 'QA & Testing'],
              ].map(([key, label]) => {
                const isSubActive = currentView === 'team' && teamTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => navigateToTeam(key)}
                    className={`block w-full text-left px-2 py-1 rounded text-xs font-medium transition ${
                      isSubActive
                        ? 'text-white bg-white/15 font-semibold'
                        : 'text-[#8E9488] hover:text-[#F7F6F2] hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Item
          icon={Route}
          label="Roadmap"
          active={currentView === 'projects' && projectWorkspaceTab === 'roadmap'}
          onClick={() => {
            setSidebarCollapsed(true); // Automatically remove sidebar and show arrow
            const targetId = selectedProjectId || (data?.projects?.[0]?.id || 1);
            navigateToProjects(targetId, 'roadmap');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        
        <Group>AI Workspace</Group>
        <Item
          icon={Sparkles}
          label="AI PM Copilot"
          active={currentView === 'copilot'}
          onClick={() => {
            navigateToCopilot();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <Item
          icon={ShieldCheck}
          label="Requirement Intelligence"
          active={currentView === 'requirement-intelligence'}
          onClick={() => {
            navigateToRequirementIntelligence();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <Item
          icon={FileCheck2}
          label="User Stories & QA"
          active={currentView === 'story-qa-studio'}
          onClick={() => {
            navigateToStoryQA();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <div>
          <Item
            icon={LineChart}
            label="AI Evaluation"
            active={currentView === 'ai-evaluation'}
            onClick={() => {
              navigateToEvaluation('overview');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          {currentView === 'ai-evaluation' && (
            <div className="pl-5 pr-1 py-1 space-y-0.5 border-l border-white/10 ml-4 animate-in fade-in duration-150">
              {[
                ['overview', 'Evaluation Overview'],
                ['benchmark', 'Benchmark Dataset'],
                ['runs', 'Evaluation Runs'],
                ['quality', 'Quality Analysis'],
                ['showcase', 'Placement Showcase'],
              ].map(([key, label]) => {
                const isSubActive = evaluationTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => navigateToEvaluation(key)}
                    className={`block w-full text-left px-2 py-1 rounded text-xs font-medium transition ${
                      isSubActive
                        ? 'text-white bg-white/15 font-semibold'
                        : 'text-[#8E9488] hover:text-[#F7F8F5] hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Item
          icon={History}
          label="PRD History"
          active={currentView === 'prd-history'}
          onClick={() => {
            navigateToPrdHistory();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <div className="flex-1" />
        <Item icon={Settings} label="Settings" onClick={() => openDrawer('account')} />
        <Item icon={HelpCircle} label="Help" onClick={() => openDrawer('help')} />
        <button onClick={() => openDrawer('account')} className="mt-2 flex items-center gap-2.5 w-full px-2.5 py-2 border-t border-white/10 rounded-lg text-left text-[#F7F6F2] hover:bg-white/10">
          <span className="w-7 h-7 rounded-full bg-line text-ink grid place-items-center text-[11px] font-semibold">{initials}</span>
          <span className="flex-1 text-sm font-medium truncate">{user?.name}</span>
          <ChevronDown size={14} className="text-[#8E9488]" />
        </button>
      </aside>
    </>
  );
}
