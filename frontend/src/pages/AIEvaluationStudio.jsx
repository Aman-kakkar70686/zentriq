import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart2,
  CheckCircle2,
  FileCheck2,
  Filter,
  Folder,
  Layers,
  LineChart,
  Play,
  Presentation,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import api, { errMsg } from '../api/client';
import {
  getOverviewMetrics,
  listBenchmarkDatasets,
  runEvaluation,
} from '../api/evaluation';
import { useApp } from '../context/AppContext';
import CommandPalette from '../components/CommandPalette';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';

import EvaluationOverviewTab from '../components/evaluation/EvaluationOverviewTab';
import BenchmarkLabTab from '../components/evaluation/BenchmarkLabTab';
import EvaluationRunsTab from '../components/evaluation/EvaluationRunsTab';
import QualityAnalysisTab from '../components/evaluation/QualityAnalysisTab';
import PlacementShowcaseTab from '../components/evaluation/PlacementShowcaseTab';

export default function AIEvaluationStudio() {
  const { toast, reload: reloadGlobal, evaluationTab, setEvaluationTab } = useApp();

  // Active Sub-tab: 'overview' | 'benchmark' | 'runs' | 'quality' | 'showcase'
  const [activeTab, setActiveTab] = useState(evaluationTab || 'overview');

  // Sync with context if evaluationTab changes externally
  useEffect(() => {
    if (evaluationTab) {
      setActiveTab(evaluationTab);
    }
  }, [evaluationTab]);

  // Global Project & Dataset Selection
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);

  // Overview metrics & data
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Run Evaluation Modal state
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [evalModel, setEvalModel] = useState('gemini-2.5-flash');
  const [evalArtifactType, setEvalArtifactType] = useState('all');
  const [runningEval, setRunningEval] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [evalResultSuccess, setEvalResultSuccess] = useState(null);

  // Initial Data Load
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      const projList = res.data || [];
      setProjects(projList);

      const activeProj = projList[0] || null;
      setSelectedProject(activeProj);

      if (activeProj) {
        // Fetch benchmark datasets
        const dList = await listBenchmarkDatasets({ project_id: activeProj.id });
        setDatasets(dList);
        const activeDs = dList[0] || null;
        setSelectedDataset(activeDs);

        // Fetch overview metrics
        const metrics = await getOverviewMetrics({
          project_id: activeProj.id,
          dataset_id: activeDs?.id || null,
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

  const refreshOverview = async () => {
    try {
      setLoading(true);
      const metrics = await getOverviewMetrics({
        project_id: selectedProject?.id || null,
        dataset_id: selectedDataset?.id || null,
      });
      setOverviewData(metrics);
      toast('Evaluation metrics refreshed.');
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRun = async (e) => {
    e.preventDefault();
    if (!selectedProject || !selectedDataset) {
      setEvalError('Please select a project and benchmark dataset.');
      return;
    }

    try {
      setRunningEval(true);
      setEvalError('');
      setEvalResultSuccess(null);

      const res = await runEvaluation({
        project_id: selectedProject.id,
        dataset_id: selectedDataset.id,
        artifact_type: evalArtifactType,
        model_name: evalModel,
        prompt_version: 'v1.1.0-ground-truth-tuned',
      });

      setEvalResultSuccess(res);
      toast(`Evaluation run ${res.run_key} completed with F1: ${res.f1}%!`);
      await refreshOverview();
    } catch (err) {
      setEvalError(err.message || 'Evaluation run failed.');
    } finally {
      setRunningEval(false);
    }
  };

  const subNavItems = [
    { key: 'overview', label: 'Evaluation Overview', icon: LineChart },
    { key: 'benchmark', label: 'Benchmark Dataset', icon: Layers },
    { key: 'runs', label: 'Evaluation Runs', icon: Activity },
    { key: 'quality', label: 'Quality Analysis', icon: ShieldAlert },
    { key: 'showcase', label: 'Placement Showcase', icon: Presentation },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#202923] font-sans antialiased">
      {/* Global Zentriq Sidebar */}
      <Sidebar />

      {/* Main Studio Viewport */}
      <div className="lg:ml-56 min-h-screen flex flex-col min-w-0">
        <TopBar />

        {/* Studio Page Header */}
        <header className="bg-white border-b border-[#E5EAE5] px-6 lg:px-10 py-4 shrink-0 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-[#78847C] mb-1">
                <span>Zentriq</span>
                <span>/</span>
                <span>AI Workspace</span>
                <span>/</span>
                <span className="font-semibold text-[#174B3A]">AI Evaluation</span>
              </div>

              {/* Title & Description */}
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-[#202923]">
                  AI Evaluation & Intelligence
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DCE9DF] text-[#174B3A]">
                  Benchmark Lab
                </span>
              </div>
              <p className="text-xs text-[#78847C] mt-0.5">
                Measure AI Quality. Validate Results. Improve Product Intelligence.
              </p>
            </div>

            {/* Global Context Pickers & Action */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Project Picker */}
              <div className="flex items-center gap-1.5 bg-[#F7F8F5] border border-[#E5EAE5] rounded-xl px-2.5 py-1.5 text-xs">
                <Folder size={14} className="text-[#174B3A]" />
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const p = projects.find((proj) => proj.id === Number(e.target.value));
                    setSelectedProject(p);
                  }}
                  className="bg-transparent border-none text-[#202923] font-semibold text-xs focus:outline-hidden cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Dataset Picker */}
              <div className="flex items-center gap-1.5 bg-[#F7F8F5] border border-[#E5EAE5] rounded-xl px-2.5 py-1.5 text-xs">
                <Layers size={14} className="text-[#2F765A]" />
                <select
                  value={selectedDataset?.id || ''}
                  onChange={(e) => {
                    const d = datasets.find((ds) => ds.id === Number(e.target.value));
                    setSelectedDataset(d);
                  }}
                  className="bg-transparent border-none text-[#202923] font-semibold text-xs focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Primary Action: Run Evaluation */}
              <button
                onClick={() => {
                  setEvalError('');
                  setEvalResultSuccess(null);
                  setRunModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#174B3A] hover:bg-[#2F765A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Play size={13} className="fill-white" />
                Run Evaluation
              </button>
            </div>
          </div>

          {/* Secondary Submodule Navigation */}
          <nav className="flex items-center gap-1 mt-4 pt-3 border-t border-[#E5EAE5] overflow-x-auto">
            {subNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    if (setEvaluationTab) setEvaluationTab(item.key);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[#174B3A] text-white shadow-xs'
                      : 'text-[#78847C] hover:text-[#202923] hover:bg-[#F7F8F5]'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        {/* Studio Tab Workspace */}
        <main className="flex-1 px-4 lg:px-10 py-6 max-w-[1400px] w-full">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <EvaluationOverviewTab
              overviewData={overviewData}
              loading={loading}
              onRefresh={refreshOverview}
              onRunEvaluation={() => setRunModalOpen(true)}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                if (setEvaluationTab) setEvaluationTab(tab);
              }}
            />
          )}

          {activeTab === 'benchmark' && (
            <BenchmarkLabTab selectedProject={selectedProject} />
          )}

          {activeTab === 'runs' && (
            <EvaluationRunsTab
              selectedProject={selectedProject}
              onRunEvaluation={() => setRunModalOpen(true)}
            />
          )}

          {activeTab === 'quality' && (
            <QualityAnalysisTab selectedProject={selectedProject} />
          )}

          {activeTab === 'showcase' && (
            <PlacementShowcaseTab overviewData={overviewData} />
          )}
        </main>
      </div>

      {/* Run Evaluation Modal */}
      {runModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-[#E5EAE5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#DCE9DF] text-[#174B3A] grid place-items-center">
                  <Play size={15} className="fill-[#174B3A]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#202923]">Execute Benchmark Evaluation</h3>
                  <p className="text-[11px] text-[#78847C]">Run Gemini AI against approved ground truth samples</p>
                </div>
              </div>
              <button
                onClick={() => setRunModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#F7F8F5] text-[#78847C] grid place-items-center"
              >
                <X size={16} />
              </button>
            </div>

            {evalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} />
                {evalError}
              </div>
            )}

            {evalResultSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-xs text-green-900">
                <div className="flex items-center gap-2 font-bold text-sm text-green-800">
                  <CheckCircle2 size={16} />
                  Evaluation Run Completed!
                </div>
                <p>Run Key: <strong>{evalResultSuccess.run_key}</strong></p>
                <div className="grid grid-cols-3 gap-2 pt-1 font-semibold text-center">
                  <div className="p-2 bg-white rounded-lg border border-green-200">
                    <span className="text-[10px] text-green-700 block">F1 Score</span>
                    <span className="text-base text-green-900 font-bold">{evalResultSuccess.f1}%</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-green-200">
                    <span className="text-[10px] text-green-700 block">Precision</span>
                    <span className="text-base text-green-900 font-bold">{evalResultSuccess.precision}%</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-green-200">
                    <span className="text-[10px] text-green-700 block">Recall</span>
                    <span className="text-base text-green-900 font-bold">{evalResultSuccess.recall}%</span>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setRunModalOpen(false);
                      setActiveTab('runs');
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#174B3A] text-white text-xs font-bold"
                  >
                    View in Runs Log →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteRun} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#202923] mb-1">Target Benchmark Dataset</label>
                  <p className="p-2.5 rounded-lg bg-[#F7F8F5] border border-[#E5EAE5] font-semibold text-[#202923]">
                    {selectedDataset?.name || 'Zentriq Core Suite'} ({selectedDataset?.approved_samples || 8} approved ground truth samples)
                  </p>
                  <span className="text-[10px] text-[#78847C] block mt-1">
                    * Only samples with 'approved' status will be evaluated against ground truth.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#202923] mb-1">Model</label>
                    <select
                      value={evalModel}
                      onChange={(e) => setEvalModel(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#E5EAE5] bg-white font-semibold text-[#202923] focus:outline-hidden focus:border-[#174B3A]"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Production)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fallback)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#202923] mb-1">Artifact Scope</label>
                    <select
                      value={evalArtifactType}
                      onChange={(e) => setEvalArtifactType(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#E5EAE5] bg-white font-semibold text-[#202923] focus:outline-hidden focus:border-[#174B3A]"
                    >
                      <option value="all">All Development Artifacts</option>
                      <option value="user_story">User Stories Only</option>
                      <option value="acceptance_criteria">Acceptance Criteria Only</option>
                      <option value="qa_test_case">QA Test Cases Only</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5EAE5] text-[11px] text-[#78847C] space-y-1">
                  <p className="font-semibold text-[#202923]">Evaluation Protocol:</p>
                  <p>• Temperature: 0.2 (Deterministic verification)</p>
                  <p>• Metrics: Precision, Recall, F1, JSON Schema Validity, Traceability</p>
                  <p>• Audit: Every sample result persisted in database with TP/FP/FN</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAE5]">
                  <button
                    type="button"
                    onClick={() => setRunModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E5EAE5] text-xs font-semibold text-[#78847C]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={runningEval}
                    className="px-5 py-2 rounded-xl bg-[#174B3A] hover:bg-[#2F765A] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
                  >
                    {runningEval && <RefreshCw size={13} className="animate-spin" />}
                    {runningEval ? 'Evaluating Gemini Outputs...' : 'Start Benchmark Run'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global Utilities */}
      <Drawer />
      <QuickCreate />
      <CommandPalette />
      <Toast />
    </div>
  );
}

