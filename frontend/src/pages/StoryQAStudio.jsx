import { useEffect, useState } from 'react';
import {
  FileCheck2,
  Folder,
  Layers,
  ListChecks,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import api, { errMsg } from '../api/client';
import { listPRDs } from '../api/ai';
import { getOverviewMetrics } from '../api/storiesQa';
import { useApp } from '../context/AppContext';
import CommandPalette from '../components/CommandPalette';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';

import StudioOverviewTab from '../components/studio/StudioOverviewTab';
import UserStoriesTab from '../components/studio/UserStoriesTab';
import AcceptanceCriteriaTab from '../components/studio/AcceptanceCriteriaTab';
import EdgeCasesTab from '../components/studio/EdgeCasesTab';
import QATestCasesTab from '../components/studio/QATestCasesTab';
import TraceabilityTab from '../components/studio/TraceabilityTab';

export default function StoryQAStudio() {
  const { toast, reload: reloadGlobal } = useApp();

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'stories' | 'criteria' | 'edge-cases' | 'qa-tests' | 'traceability'

  // Global Project & PRD Selection
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [prds, setPrds] = useState([]);
  const [selectedPrd, setSelectedPrd] = useState(null);

  // Overview metrics & data
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial Data Load
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch projects
      const res = await api.get('/projects');
      const projList = res.data || [];
      setProjects(projList);

      const activeProj = projList[0] || null;
      setSelectedProject(activeProj);

      if (activeProj) {
        // Fetch PRDs for project
        const prdList = await listPRDs(activeProj.id);
        setPrds(prdList);
        const activePrd = prdList[0] || null;
        setSelectedPrd(activePrd);

        // Fetch overview metrics
        const metrics = await getOverviewMetrics({
          project_id: activeProj.id,
          prd_id: activePrd?.id || null,
        });
        setOverviewData(metrics);
      }
      setError('');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update PRDs and metrics when selected project changes
  const handleProjectChange = async (projId) => {
    const proj = projects.find((p) => String(p.id) === String(projId));
    if (!proj) return;
    setSelectedProject(proj);
    try {
      setLoading(true);
      const prdList = await listPRDs(proj.id);
      setPrds(prdList);
      const activePrd = prdList[0] || null;
      setSelectedPrd(activePrd);

      const metrics = await getOverviewMetrics({
        project_id: proj.id,
        prd_id: activePrd?.id || null,
      });
      setOverviewData(metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update metrics when selected PRD changes
  const handlePrdChange = async (prdId) => {
    const prd = prds.find((p) => String(p.id) === String(prdId));
    setSelectedPrd(prd || null);
    try {
      const metrics = await getOverviewMetrics({
        project_id: selectedProject?.id,
        prd_id: prd?.id || null,
      });
      setOverviewData(metrics);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGlobalRefresh = async () => {
    if (selectedProject?.id) {
      const metrics = await getOverviewMetrics({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
      });
      setOverviewData(metrics);
    }
    await reloadGlobal();
    if (toast) toast('Synchronized with live database');
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Layers, badge: null },
    { key: 'stories', label: 'User Stories', icon: FileCheck2, badge: overviewData?.metrics?.total_user_stories },
    { key: 'criteria', label: 'Acceptance Criteria', icon: ListChecks, badge: overviewData?.metrics?.total_acceptance_criteria },
    { key: 'edge-cases', label: 'Edge Cases', icon: ShieldAlert, badge: overviewData?.metrics?.total_edge_cases },
    { key: 'qa-tests', label: 'QA Test Cases', icon: Play, badge: overviewData?.metrics?.total_qa_test_cases },
    { key: 'traceability', label: 'Traceability', icon: ShieldCheck, badge: `${overviewData?.metrics?.requirement_coverage_pct || 0}%` },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="lg:ml-56">
        <TopBar />
        <main className="max-w-[1300px] px-4 lg:px-10 pt-7 pb-24">
          {/* Header & Subtitle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-mute">
                  AI WORKSPACE
                </span>
                <span className="text-mute">/</span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-brand">
                  STORY & QA STUDIO
                </span>
              </div>
              <h1 className="text-[28px] font-semibold text-ink tracking-tight flex items-center gap-2.5">
                <span>AI Story & QA Studio</span>
              </h1>
              <p className="text-[14.5px] text-ink2 mt-0.5">
                Transform approved requirements into development-ready stories and test-ready scenarios.
              </p>
            </div>

            {/* Project & PRD Selectors Header Area */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-2 bg-card border border-line rounded-xl px-3 py-1.5 shadow-2xs">
                <Folder size={14} className="text-brand shrink-0" />
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-ink outline-none cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {prds.length > 0 && (
                <div className="flex items-center gap-2 bg-card border border-line rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-ink2 uppercase">PRD:</span>
                  <select
                    value={selectedPrd?.id || ''}
                    onChange={(e) => handlePrdChange(e.target.value)}
                    className="bg-transparent text-xs font-medium text-ink outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    {prds.map((prd) => (
                      <option key={prd.id} value={prd.id}>
                        {prd.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleGlobalRefresh}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title="Refresh studio records"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-brand' : 'text-ink2'} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Secondary Sub-navigation Tabs */}
          <div className="border-b border-line mb-7 overflow-x-auto scrollbar-none">
            <nav className="flex space-x-1 sm:space-x-2 -mb-px min-w-max" aria-label="Studio Submodules">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-[13px] font-medium transition-all ${
                      isActive
                        ? 'border-brand text-brand font-semibold'
                        : 'border-transparent text-ink2 hover:text-ink hover:border-line'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-brand' : 'text-ink2'} />
                    <span>{tab.label}</span>
                    {tab.badge != null && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-brand/10 text-brand'
                            : 'bg-card2 border border-line text-ink2'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-card border border-amber/30 text-amber text-xs font-medium">
              Studio Notice: {error}
            </div>
          )}

          {/* Submodule View Content */}
          {activeTab === 'overview' && (
            <StudioOverviewTab
              overviewData={overviewData}
              loading={loading}
              onNavigateTab={(tabKey) => setActiveTab(tabKey)}
              selectedProject={selectedProject}
              selectedPrd={selectedPrd}
              onRefresh={handleGlobalRefresh}
            />
          )}

          {activeTab === 'stories' && (
            <UserStoriesTab
              projects={projects}
              selectedProject={selectedProject}
              setSelectedProject={setSelectedProject}
              prds={prds}
              selectedPrd={selectedPrd}
              setSelectedPrd={setSelectedPrd}
              toast={toast}
            />
          )}

          {activeTab === 'criteria' && (
            <AcceptanceCriteriaTab
              selectedProject={selectedProject}
              selectedPrd={selectedPrd}
              toast={toast}
            />
          )}

          {activeTab === 'edge-cases' && (
            <EdgeCasesTab
              selectedProject={selectedProject}
              selectedPrd={selectedPrd}
              toast={toast}
            />
          )}

          {activeTab === 'qa-tests' && (
            <QATestCasesTab
              selectedProject={selectedProject}
              selectedPrd={selectedPrd}
              toast={toast}
            />
          )}

          {activeTab === 'traceability' && (
            <TraceabilityTab
              selectedProject={selectedProject}
              selectedPrd={selectedPrd}
              onNavigateTab={(tabKey) => setActiveTab(tabKey)}
              toast={toast}
            />
          )}
        </main>
      </div>

      <Drawer />
      <QuickCreate />
      <CommandPalette />
      <Toast />
    </div>
  );
}

