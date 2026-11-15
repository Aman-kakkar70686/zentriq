import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  History,
  Key,
  Layers,
  Lightbulb,
  ListOrdered,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import {
  analysePRDRequirements,
  applyAcceptedSuggestions,
  compareAnalyses,
  getAnalysisDetail,
  listPRDAnalyses,
  listPRDs,
  reviewIssue
} from '../api/ai';
import { useApp } from '../context/AppContext';
import CommandPalette from '../components/CommandPalette';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';
import ApiKeySettingsModal from '../components/ai/ApiKeySettingsModal';
import BenchmarkEvaluationModal from '../components/ai/BenchmarkEvaluationModal';
import ScoreComparisonModal from '../components/ai/ScoreComparisonModal';

export default function RequirementIntelligence() {
  const { data, toast, activePrd, setActivePrd, navigateToCopilot, reload } = useApp();

  // Project & PRD Selection
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [availablePrds, setAvailablePrds] = useState([]);
  const [selectedPrdId, setSelectedPrdId] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [previousAnalyses, setPreviousAnalyses] = useState([]);
  const [error, setError] = useState('');

  // Dashboard Tab & Filter State
  const [activeTab, setActiveTab] = useState('missing'); // 'missing' | 'ambiguous' | 'conflicting' | 'incomplete'
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Inline Review
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [applyingChanges, setApplyingChanges] = useState(false);

  // Initialize selected project
  useEffect(() => {
    if (data?.projects?.length > 0 && !selectedProjectId) {
      setSelectedProjectId(data.projects[0].id.toString());
    }
  }, [data, selectedProjectId]);

  // Fetch PRDs for the selected project
  useEffect(() => {
    if (!selectedProjectId) return;
    listPRDs(Number(selectedProjectId))
      .then((list) => {
        setAvailablePrds(list);
        if (list.length > 0) {
          if (activePrd && list.some((p) => p.id === activePrd.id)) {
            setSelectedPrdId(activePrd.id.toString());
          } else if (!selectedPrdId || !list.some((p) => p.id === Number(selectedPrdId))) {
            setSelectedPrdId(list[0].id.toString());
          }
        } else {
          setSelectedPrdId('');
          setCurrentAnalysis(null);
        }
      })
      .catch((e) => console.error('Error fetching PRDs:', e));
  }, [selectedProjectId, activePrd]);

  // Load previous analyses when selected PRD changes
  useEffect(() => {
    if (!selectedPrdId) {
      setCurrentAnalysis(null);
      setPreviousAnalyses([]);
      return;
    }
    listPRDAnalyses(Number(selectedPrdId))
      .then((analyses) => {
        setPreviousAnalyses(analyses);
        if (analyses.length > 0) {
          // Load the latest analysis
          getAnalysisDetail(analyses[0].id).then((full) => {
            setCurrentAnalysis(full);
          });
        } else {
          setCurrentAnalysis(null);
        }
      })
      .catch((e) => console.error('Error loading PRD analyses:', e));
  }, [selectedPrdId]);

  const selectedPrd = availablePrds.find((p) => p.id === Number(selectedPrdId));

  // 8 REAL ANALYSIS STAGES (Module 1)
  const analysisStages = [
    '1. Reading PRD and parsing functional statements...',
    '2. Identifying requirements, actors, and scope boundaries...',
    '3. Checking completeness for missing permissions, errors, and flows...',
    '4. Detecting ambiguity and subjective, untestable phrases...',
    '5. Checking contradictions and conflicting constraints...',
    '6. Evaluating testability and acceptance criteria rigor...',
    '7. Calculating deterministic quality score (0-100)...',
    '8. Preparing actionable recommendations for engineering review...',
  ];

  const handleAnalyse = async () => {
    if (!selectedPrdId) {
      setError('Please select a PRD to analyze.');
      return;
    }

    setError('');
    setAnalyzing(true);
    setAnalysisStep(1);

    const stepTimer = setInterval(() => {
      setAnalysisStep((prev) => (prev < 8 ? prev + 1 : prev));
    }, 1400);

    try {
      const response = await analysePRDRequirements({
        prdId: Number(selectedPrdId),
        modelName: selectedModel,
      });

      clearInterval(stepTimer);
      setAnalysisStep(8);
      setCurrentAnalysis(response);
      toast('Requirement Intelligence analysis completed!');

      // Check if we can trigger comparison with previous run
      const updatedAnalyses = await listPRDAnalyses(Number(selectedPrdId));
      setPreviousAnalyses(updatedAnalyses);

      if (updatedAnalyses.length >= 2) {
        try {
          const comp = await compareAnalyses(updatedAnalyses[1].id, updatedAnalyses[0].id);
          setComparisonData(comp);
        } catch (e) {
          console.warn('Could not auto-generate comparison:', e);
        }
      }
    } catch (err) {
      clearInterval(stepTimer);
      setError(err.message || 'Failed to analyze requirements. Please verify your Gemini API key.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReviewIssue = async (issueId, reviewStatus, note = '') => {
    try {
      const res = await reviewIssue(issueId, {
        review_status: reviewStatus,
        suggested_improvement: reviewStatus === 'edited' ? editedText : null,
        resolution_note: note || `Marked as ${reviewStatus}`,
      });

      // Update in local state
      setCurrentAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          issues: prev.issues.map((i) =>
            i.id === issueId
              ? {
                  ...i,
                  review_status: res.review_status,
                  suggested_improvement: res.suggested_improvement,
                  resolution_note: res.resolution_note,
                }
              : i
          ),
        };
      });

      setEditingIssueId(null);
      toast(`Issue marked as ${reviewStatus}`);
    } catch (err) {
      toast('Review action failed: ' + err.message);
    }
  };

  const handleApplyAllAccepted = async () => {
    const acceptedIssues = currentAnalysis?.issues?.filter((i) => i.review_status === 'accepted') || [];
    if (acceptedIssues.length === 0) {
      toast('No accepted suggestions to apply. Please accept suggestions first.');
      return;
    }

    setApplyingChanges(true);
    try {
      const res = await applyAcceptedSuggestions(currentAnalysis.analysis_id || currentAnalysis.id, {
        issue_ids: acceptedIssues.map((i) => i.id),
      });

      toast(res.message);

      // Reload analysis detail & reload projects
      const updated = await getAnalysisDetail(currentAnalysis.analysis_id || currentAnalysis.id);
      setCurrentAnalysis(updated);
      await reload();
    } catch (err) {
      toast('Failed to apply suggestions: ' + err.message);
    } finally {
      setApplyingChanges(false);
    }
  };

  const handleOpenComparison = async () => {
    if (previousAnalyses.length < 2) {
      toast('At least two analysis runs are needed to compare quality scores.');
      return;
    }
    try {
      const comp = await compareAnalyses(previousAnalyses[1].id, previousAnalyses[0].id);
      setComparisonData(comp);
      setComparisonModalOpen(true);
    } catch (e) {
      toast('Comparison error: ' + e.message);
    }
  };

  // Filter issues based on active tab, severity, status, and search query
  const displayedIssues = (currentAnalysis?.issues || []).filter((iss) => {
    if (iss.issue_type !== activeTab) return false;
    if (severityFilter !== 'ALL' && iss.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && iss.review_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        iss.explanation?.toLowerCase().includes(q) ||
        iss.suggested_improvement?.toLowerCase().includes(q) ||
        iss.requirement_reference?.toLowerCase().includes(q) ||
        iss.original_text?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const acceptedCount = (currentAnalysis?.issues || []).filter((i) => i.review_status === 'accepted').length;

  const scoreBadgeColor = (label) => {
    if (label === 'Excellent') return 'bg-ok/15 text-ok border-ok/30';
    if (label === 'Good') return 'bg-brand/10 text-brand border-brand/20';
    if (label === 'Needs Improvement') return 'bg-amber/15 text-amber border-amber/30';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const severityBadgeColor = (sev) => {
    if (sev === 'Critical') return 'bg-red-50 text-red-700 border-red-200';
    if (sev === 'High') return 'bg-amber/15 text-amber border-amber/30';
    if (sev === 'Medium') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-56">
        <TopBar />
        <main className="max-w-[1340px] px-4 lg:px-10 pt-7 pb-24">
          {/* Header Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-mute">AI WORKSPACE</span>
                <span className="text-mute">/</span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-brand flex items-center gap-1">
                  <ShieldCheck size={12} /> REQUIREMENT INTELLIGENCE
                </span>
              </div>
              <h1 className="text-[28px] font-semibold text-ink tracking-tight flex items-center gap-2.5">
                <span>AI Requirement Intelligence & Quality Engine</span>
              </h1>
              <p className="text-[14.5px] text-ink2 mt-0.5">
                Detect missing, ambiguous, conflicting, and incomplete requirements with deterministic quality scoring (0–100).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setEvalModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title="Run empirical benchmark test suite"
              >
                <Award size={14} className="text-brand" />
                <span>Benchmark Evaluation</span>
              </button>

              {previousAnalyses.length >= 2 && (
                <button
                  type="button"
                  onClick={handleOpenComparison}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                  title="Compare latest analysis runs"
                >
                  <TrendingUp size={14} className="text-ok" />
                  <span>Compare Runs</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setKeyModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title="Configure Gemini API credentials"
              >
                <Key size={14} className="text-ink2" />
                <span>API Key</span>
              </button>
            </div>
          </div>

          {/* PROJECT & PRD SELECTOR BAR */}
          <div className="p-5 rounded-2xl bg-card border border-line shadow-xs mb-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* 1. Project Selector */}
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  1. Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-card2 text-xs font-medium text-ink focus:outline-hidden focus:border-brand"
                >
                  {data?.projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. PRD Selector */}
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  2. Target PRD for Quality Analysis
                </label>
                <select
                  value={selectedPrdId}
                  onChange={(e) => setSelectedPrdId(e.target.value)}
                  disabled={availablePrds.length === 0}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-card2 text-xs font-medium text-ink focus:outline-hidden focus:border-brand disabled:opacity-60"
                >
                  {availablePrds.length === 0 ? (
                    <option value="">No PRDs found in this project</option>
                  ) : (
                    availablePrds.map((prd) => (
                      <option key={prd.id} value={prd.id}>
                        {prd.title || prd.feature_name} (v{prd.content?.version || '1.0.0'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 3. Primary Analyse Button */}
              <div className="md:col-span-3">
                <button
                  id="btn-analyse-requirements"
                  type="button"
                  onClick={handleAnalyse}
                  disabled={analyzing || !selectedPrdId}
                  className="w-full h-10 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      <span>{currentAnalysis ? 'Re-analyse PRD' : 'Analyse Requirements'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Analysis Failed: </span>
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* REAL PROCESSING STAGES DISPLAY (Module 1) */}
          {analyzing && (
            <div className="p-6 rounded-2xl bg-card border border-brand/30 shadow-xs mb-8 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand font-semibold text-xs">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing Requirement Intelligence Pipeline...</span>
                </div>
                <span className="text-xs font-mono font-bold text-brand">
                  Stage {analysisStep} of 8
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(analysisStep / 8) * 100}%` }}
                />
              </div>

              {/* Stages List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                {analysisStages.map((stage, idx) => {
                  const isDone = analysisStep > idx + 1;
                  const isCurrent = analysisStep === idx + 1;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-[11px] transition-all flex items-center gap-2 ${
                        isDone
                          ? 'bg-ok/10 border-ok/30 text-ok font-medium'
                          : isCurrent
                          ? 'bg-brand/10 border-brand/40 text-brand font-semibold animate-pulse'
                          : 'bg-card2 border-line text-mute'
                      }`}
                    >
                      {isDone ? (
                        <Check size={12} className="shrink-0 text-ok" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-current text-[9px] grid place-items-center shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <span className="truncate">{stage.slice(3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REQUIREMENT INTELLIGENCE DASHBOARD (Module 6, 7) */}
          {currentAnalysis && !analyzing ? (
            <div className="space-y-8 animate-in fade-in">
              {/* TOP METRIC CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Overall Quality Score (0-100) */}
                <div className="col-span-2 sm:col-span-1 p-5 rounded-2xl bg-card border border-line shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-mute uppercase tracking-wider">Quality Score</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${scoreBadgeColor(currentAnalysis.score_label)}`}>
                      {currentAnalysis.score_label}
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-ink">{currentAnalysis.overall_score}</span>
                      <span className="text-sm font-semibold text-mute">/ 100</span>
                    </div>
                    {/* Linear score meter */}
                    <div className="w-full bg-line rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          currentAnalysis.overall_score >= 75
                            ? 'bg-ok'
                            : currentAnalysis.overall_score >= 60
                            ? 'bg-amber'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${currentAnalysis.overall_score}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-ink2">Calculated application-side via rubric</span>
                </div>

                {/* 2. Missing Requirements Count */}
                <div
                  onClick={() => setActiveTab('missing')}
                  className={`p-5 rounded-2xl bg-card border transition cursor-pointer shadow-xs ${
                    activeTab === 'missing' ? 'border-brand ring-2 ring-brand/10' : 'border-line hover:border-brand/40'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Missing
                  </span>
                  <span className="text-3xl font-extrabold text-amber">
                    {currentAnalysis.issue_summary?.missing_count || 0}
                  </span>
                  <span className="text-[11px] text-ink2 block mt-1">Omissions & blindspots</span>
                </div>

                {/* 3. Ambiguous Requirements Count */}
                <div
                  onClick={() => setActiveTab('ambiguous')}
                  className={`p-5 rounded-2xl bg-card border transition cursor-pointer shadow-xs ${
                    activeTab === 'ambiguous' ? 'border-brand ring-2 ring-brand/10' : 'border-line hover:border-brand/40'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Ambiguous
                  </span>
                  <span className="text-3xl font-extrabold text-ink">
                    {currentAnalysis.issue_summary?.ambiguous_count || 0}
                  </span>
                  <span className="text-[11px] text-ink2 block mt-1">Vague, subjective terms</span>
                </div>

                {/* 4. Conflicting Requirements Count */}
                <div
                  onClick={() => setActiveTab('conflicting')}
                  className={`p-5 rounded-2xl bg-card border transition cursor-pointer shadow-xs ${
                    activeTab === 'conflicting' ? 'border-brand ring-2 ring-brand/10' : 'border-line hover:border-brand/40'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Conflicting
                  </span>
                  <span className="text-3xl font-extrabold text-red-600">
                    {currentAnalysis.issue_summary?.conflicting_count || 0}
                  </span>
                  <span className="text-[11px] text-ink2 block mt-1">Direct contradictions</span>
                </div>

                {/* 5. Incomplete Requirements Count */}
                <div
                  onClick={() => setActiveTab('incomplete')}
                  className={`p-5 rounded-2xl bg-card border transition cursor-pointer shadow-xs ${
                    activeTab === 'incomplete' ? 'border-brand ring-2 ring-brand/10' : 'border-line hover:border-brand/40'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Incomplete
                  </span>
                  <span className="text-3xl font-extrabold text-ink2">
                    {currentAnalysis.issue_summary?.incomplete_count || 0}
                  </span>
                  <span className="text-[11px] text-ink2 block mt-1">Lacking AC / triggers</span>
                </div>
              </div>

              {/* QUALITY BREAKDOWN ACROSS 6 CATEGORIES (Module 6) */}
              <div className="bg-card border border-line rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">Quality Score Breakdown (100 Points Rubric)</h3>
                    <p className="text-xs text-ink2">Deterministic score derived from validated defect detection</p>
                  </div>

                  {/* Severity badges */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                      Critical: {currentAnalysis.issue_summary?.by_severity?.Critical || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber/15 text-amber text-[10px] font-bold border border-amber/30">
                      High: {currentAnalysis.issue_summary?.by_severity?.High || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 text-[10px] font-bold border border-yellow-200">
                      Medium: {currentAnalysis.issue_summary?.by_severity?.Medium || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      Low: {currentAnalysis.issue_summary?.by_severity?.Low || 0}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(currentAnalysis.category_scores || {}).map(([key, cat]) => {
                    const titles = {
                      completeness: '1. Completeness',
                      clarity: '2. Clarity',
                      testability: '3. Testability',
                      feasibility: '4. Feasibility',
                      consistency: '5. Consistency',
                      risk_dependencies: '6. Risk & Dependencies',
                    };
                    return (
                      <div key={key} className="p-4 rounded-xl border border-line bg-card2 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink uppercase tracking-wide">
                            {titles[key] || key}
                          </span>
                          <span className="text-xs font-mono font-bold text-brand">
                            {cat.score} / {cat.max_score} pts
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand h-1.5 rounded-full"
                            style={{ width: `${(cat.score / cat.max_score) * 100}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-ink2 leading-relaxed">{cat.explanation}</p>

                        {cat.recommendations?.length > 0 && (
                          <div className="pt-1.5 border-t border-line/60">
                            <span className="text-[10px] font-semibold text-mute uppercase block mb-1">
                              Recommendation
                            </span>
                            <span className="text-[11px] text-ink font-medium leading-snug block">
                              {cat.recommendations[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* REQUIREMENT ANALYSIS SECTION: 4 TABS + FILTER BAR (Module 7 & 8) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Tabs */}
                  <div className="border-b border-line sm:border-0 flex space-x-2">
                    {[
                      { id: 'missing', label: 'Missing Requirements', count: currentAnalysis.issue_summary?.missing_count },
                      { id: 'ambiguous', label: 'Ambiguous Phrases', count: currentAnalysis.issue_summary?.ambiguous_count },
                      { id: 'conflicting', label: 'Conflicting Rules', count: currentAnalysis.issue_summary?.conflicting_count },
                      { id: 'incomplete', label: 'Incomplete Specs', count: currentAnalysis.issue_summary?.incomplete_count },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                            isActive
                              ? 'bg-brand text-white shadow-xs'
                              : 'bg-card border border-line text-ink2 hover:text-ink hover:bg-card2'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            isActive ? 'bg-white/20 text-white' : 'bg-canvas text-mute'
                          }`}>
                            {tab.count || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Apply Accepted Suggestions Button */}
                  {acceptedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyAllAccepted}
                      disabled={applyingChanges}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-ok hover:bg-ok/90 text-white text-xs font-semibold transition shadow-xs disabled:opacity-60 cursor-pointer self-start sm:self-center"
                    >
                      {applyingChanges ? <RefreshCw size={13} className="animate-spin" /> : <FileCheck2 size={14} />}
                      <span>Apply {acceptedCount} Accepted Suggestions to PRD</span>
                    </button>
                  )}
                </div>

                {/* Filter and Search Toolbar */}
                <div className="p-3.5 rounded-xl bg-card border border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search detected issues..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-card2 text-xs text-ink placeholder:text-mute focus:outline-hidden focus:border-brand"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-mute font-medium">Severity:</span>
                      <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-line bg-card2 text-xs font-semibold text-ink"
                      >
                        <option value="ALL">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-mute font-medium">Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-line bg-card2 text-xs font-semibold text-ink"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="edited">Edited</option>
                        <option value="rejected">Rejected</option>
                        <option value="needs_clarification">Needs Clarification</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ISSUE CARDS LIST */}
                {displayedIssues.length === 0 ? (
                  <div className="p-8 text-center bg-card border border-line rounded-2xl space-y-2">
                    <CheckCircle2 size={24} className="mx-auto text-ok" />
                    <h4 className="text-sm font-semibold text-ink">No Issues Found for Current Filter</h4>
                    <p className="text-xs text-ink2">No {activeTab} requirement defects matched your search/severity criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedIssues.map((iss) => (
                      <div
                        key={iss.id}
                        className={`p-5 rounded-2xl border transition shadow-xs space-y-3.5 ${
                          iss.review_status === 'accepted'
                            ? 'bg-ok/5 border-ok/40'
                            : iss.review_status === 'resolved'
                            ? 'bg-canvas border-line opacity-75'
                            : iss.review_status === 'rejected'
                            ? 'bg-red-50/50 border-red-200'
                            : iss.review_status === 'needs_clarification'
                            ? 'bg-amber/5 border-amber/30'
                            : 'bg-card border-line hover:border-brand/40'
                        }`}
                      >
                        {/* Issue Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${severityBadgeColor(iss.severity)}`}>
                              {iss.severity} Severity
                            </span>
                            {iss.category && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-canvas border border-line text-ink2">
                                {iss.category}
                              </span>
                            )}
                            {iss.requirement_reference && (
                              <span className="text-xs font-semibold text-brand font-mono">
                                Ref: {iss.requirement_reference}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              iss.review_status === 'accepted'
                                ? 'bg-ok/15 text-ok'
                                : iss.review_status === 'resolved'
                                ? 'bg-brand/10 text-brand'
                                : iss.review_status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : iss.review_status === 'needs_clarification'
                                ? 'bg-amber/20 text-amber'
                                : 'bg-card2 text-mute border border-line'
                            }`}>
                              {iss.review_status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* ORIGINAL REQUIREMENT & DETECTED AMBIGUITY */}
                        {iss.original_text && (
                          <div className="p-3.5 rounded-xl border border-line bg-card2 text-xs">
                            <span className="text-[10px] font-semibold text-mute uppercase tracking-wider block mb-1">
                              Original PRD Statement
                            </span>
                            <p className="text-ink font-medium leading-relaxed">
                              {iss.original_text}
                            </p>
                            {iss.ambiguous_phrase && (
                              <div className="mt-2 text-xs text-amber flex items-center gap-1.5 font-medium">
                                <AlertTriangle size={13} />
                                <span>Ambiguous Phrase Identified: </span>
                                <code className="bg-amber/15 px-1.5 py-0.5 rounded font-mono font-bold text-amber">
                                  "{iss.ambiguous_phrase}"
                                </code>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CONFLICT STATEMENTS (Module 4) */}
                        {iss.conflict_requirement_b && (
                          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 text-xs space-y-2">
                            <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider block">
                              Conflicting Statements Detected
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-ink">
                              <div className="p-2.5 rounded-lg bg-card border border-red-200">
                                <span className="font-mono text-[10px] text-mute block mb-0.5">
                                  Statement A ({iss.requirement_reference || 'Ref A'}):
                                </span>
                                <p className="font-medium">{iss.original_text}</p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-card border border-red-200">
                                <span className="font-mono text-[10px] text-mute block mb-0.5">
                                  Statement B ({iss.conflict_ref_b || 'Ref B'}):
                                </span>
                                <p className="font-medium">{iss.conflict_requirement_b}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MISSING ELEMENTS (Module 5) */}
                        {iss.missing_elements?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-mute font-medium">Missing Elements:</span>
                            {iss.missing_elements.map((el, eIdx) => (
                              <span key={eIdx} className="px-2 py-0.5 rounded-md bg-canvas border border-line text-[10px] font-semibold text-ink2">
                                ✕ {el}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* EXPLANATION & WHY IT MATTERS */}
                        <div className="space-y-1.5 text-xs text-ink">
                          <p className="leading-relaxed">
                            <b className="font-semibold text-ink">Explanation: </b>
                            {iss.explanation}
                          </p>
                          {iss.why_it_matters && (
                            <p className="leading-relaxed text-ink2">
                              <b className="font-semibold text-ink">Why It Matters: </b>
                              {iss.why_it_matters}
                            </p>
                          )}
                          {iss.evidence && (
                            <p className="text-[11px] text-mute font-mono">
                              Evidence: {iss.evidence}
                            </p>
                          )}
                        </div>

                        {/* SUGGESTED REQUIREMENT / IMPROVEMENT */}
                        <div className="p-3.5 rounded-xl border border-brand/20 bg-brand/5 text-xs space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand flex items-center gap-1">
                            <Sparkles size={12} /> AI Recommendation / Proposed Requirement
                          </span>

                          {editingIssueId === iss.id ? (
                            <div className="space-y-2 pt-1">
                              <textarea
                                rows={3}
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-brand bg-card text-xs text-ink focus:outline-hidden"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingIssueId(null)}
                                  className="h-7 px-3 rounded-lg border border-line bg-card text-xs text-ink"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewIssue(iss.id, 'edited')}
                                  className="h-7 px-3 rounded-lg bg-brand text-white text-xs font-medium"
                                >
                                  Save Edit
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-ink font-medium leading-relaxed">
                              {iss.suggested_improvement}
                            </p>
                          )}
                        </div>

                        {/* CLARIFICATION QUESTION */}
                        {iss.clarification_question && (
                          <div className="p-3 rounded-xl border border-amber/30 bg-amber/5 text-xs text-ink flex items-start gap-2">
                            <HelpCircle size={14} className="text-amber shrink-0 mt-0.5" />
                            <div>
                              <b className="font-semibold text-amber">PM Clarification Question: </b>
                              <span>{iss.clarification_question}</span>
                            </div>
                          </div>
                        )}

                        {/* HUMAN-IN-THE-LOOP ACTION BUTTONS (Module 8) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReviewIssue(iss.id, 'accepted')}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-ok/15 hover:bg-ok/25 text-ok text-[11px] font-semibold transition"
                              title="Accept suggestion to incorporate into PRD"
                            >
                              <Check size={12} />
                              <span>Accept</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingIssueId(iss.id);
                                setEditedText(iss.suggested_improvement);
                              }}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-line bg-card hover:bg-hov text-ink text-[11px] font-medium transition"
                              title="Edit suggested requirement before accepting"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReviewIssue(iss.id, 'needs_clarification')}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-amber/30 bg-amber/5 hover:bg-amber/10 text-amber text-[11px] font-medium transition"
                              title="Mark for stakeholder clarification"
                            >
                              <HelpCircle size={12} />
                              <span>Needs Clarification</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt('Optional rejection reason:');
                                handleReviewIssue(iss.id, 'rejected', reason || '');
                              }}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-ink2 hover:text-red-600 hover:bg-red-50 text-[11px] font-medium transition"
                              title="Reject suggestion"
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          </div>

                          {iss.review_status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleReviewIssue(iss.id, 'resolved', 'Marked resolved by PM')}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-line bg-card hover:bg-hov text-ink2 hover:text-ink text-[11px] font-medium transition"
                              title="Mark as already resolved"
                            >
                              <CheckCircle2 size={12} className="text-ok" />
                              <span>Mark Resolved</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !analyzing ? (
            /* EMPTY STATE BEFORE ANALYSIS BEGINS (Module 1) */
            <div className="p-12 text-center bg-card border border-line rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand mx-auto grid place-items-center">
                <ShieldCheck size={26} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-ink">Ready for Requirement Intelligence Analysis</h3>
                <p className="text-xs text-ink2 mt-1 leading-relaxed">
                  Select an existing PRD and click <b>"Analyse Requirements"</b>. Gemini AI will evaluate your PRD across missing edge cases, ambiguous phrasing, contradictions, and incomplete specs.
                </p>
              </div>

              {availablePrds.length === 0 ? (
                <button
                  type="button"
                  onClick={() => navigateToCopilot()}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition shadow-xs"
                >
                  <Sparkles size={14} />
                  <span>Generate a PRD in AI PM Copilot First</span>
                </button>
              ) : (
                <div className="pt-2 flex justify-center gap-3 text-xs">
                  <span className="text-mute font-mono">100-Point Quality Rubric</span>
                  <span className="text-mute">•</span>
                  <span className="text-mute font-mono">Precision & Recall Benchmarks</span>
                  <span className="text-mute">•</span>
                  <span className="text-mute font-mono">Version Score Diffs</span>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {/* Global Shared Components */}
      <QuickCreate />
      <Drawer />
      <CommandPalette />
      <Toast />

      {/* Modals */}
      <ApiKeySettingsModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        toast={toast}
      />

      <BenchmarkEvaluationModal
        isOpen={evalModalOpen}
        onClose={() => setEvalModalOpen(false)}
        toast={toast}
      />

      <ScoreComparisonModal
        comparison={comparisonData}
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
      />
    </div>
  );
}
