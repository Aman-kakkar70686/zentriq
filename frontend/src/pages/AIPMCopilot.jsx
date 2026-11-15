import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileCheck2,
  FileText,
  Flame,
  HelpCircle,
  History,
  Key,
  Layers,
  Lightbulb,
  ListOrdered,
  PlusCircle,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Wand2,
  Zap
} from 'lucide-react';
import { convertPRDToTasks, generatePRD, getAiConfig, getStoredGeminiKey, savePRD } from '../api/ai';
import api from '../api/client';
import { useApp } from '../context/AppContext';
import CommandPalette from '../components/CommandPalette';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';
import ApiKeySettingsModal from '../components/ai/ApiKeySettingsModal';
import PRDViewer from '../components/ai/PRDViewer';

const EXAMPLE_PROBLEMS = [
  {
    label: 'Checkout Abandonment',
    featureName: 'One-Click Seamless Checkout & Digital Wallets',
    problemStatement:
      'Users are abandoning checkout because the payment process is confusing. Customers are forced to fill out 4 separate multi-page address forms, there is no instant wallet support (Apple Pay / Google Pay), and cryptic bank error codes cause 68% of mobile shoppers to drop off at the final step.',
    targetAudience: 'Mobile-first e-commerce consumers & repeat buyers',
    businessObjective: 'Decrease cart abandonment from 68% to under 25% and lift mobile checkout conversion by 35% in Q3.',
    additionalContext: 'Must be PCI-DSS compliant, support guest checkout, and maintain sub-second payment gateway response times.',
  },
  {
    label: 'B2B Team Onboarding Drop-off',
    featureName: 'Self-Serve Team Invitations & Workspace Provisioning',
    problemStatement:
      'B2B customers sign up for our workspace but 74% of accounts never invite a second colleague. The current invite flow requires domain verification and manual role assignment before seeing any product value, resulting in users churning before the 14-day trial concludes.',
    targetAudience: 'Product team leads, engineering managers, and enterprise admins',
    businessObjective: 'Drive collaborative activation by increasing 7-day multi-user workspaces from 26% to 60%.',
    additionalContext: 'Integrate Slack/Google Workspace directory discovery and deferred permission granting.',
  },
  {
    label: 'Mobile Notification Fatigue',
    featureName: 'Smart Digest & Granular Notification Preferences',
    problemStatement:
      'Over 42% of active mobile users disable push notifications within 72 hours of signup due to notification bombardment. Users receive unbatched, repetitive alert pings for routine task status changes rather than high-priority mentions and blockers.',
    targetAudience: 'Busy product managers, developers, and team members managing multiple projects',
    businessObjective: 'Reduce app notification opt-outs to under 15% and increase notification open-to-action rate by 2.5x.',
    additionalContext: 'Implement client-side intelligent frequency capping, time-zone quiet hours, and AI-summarized daily digests.',
  },
  {
    label: 'Search Relevance Friction',
    featureName: 'Semantic Product Search & Auto-Correction',
    problemStatement:
      'Customers frequently search for catalog items using informal synonyms or slight misspellings, which currently return zero search results. This friction leads to 22% of search sessions ending in immediate session termination.',
    targetAudience: 'Catalog browsers looking for specific inventory items or related components',
    businessObjective: 'Eliminate zero-result search queries and increase search-to-cart conversion rate by 20%.',
    additionalContext: 'Include fuzzy matching, typo tolerance, synonyms dictionary, and popular search suggestions.',
  },
];

export default function AIPMCopilot() {
  const { data, toast, activePrd, setActivePrd, navigateToPrdHistory, reload } = useApp();

  // Inputs
  const [projectId, setProjectId] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [businessObjective, setBusinessObjective] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // AI Generation State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState('');
  const [resultPRD, setResultPRD] = useState(null);
  const [metaInfo, setMetaInfo] = useState({});
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);

  // Saving & Tasks state
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPrdId, setSavedPrdId] = useState(null);
  const [converting, setConverting] = useState(false);

  // Modal
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(Boolean(getStoredGeminiKey()));
  const [aiConfig, setAiConfig] = useState(null);

  // Initialize selected project
  useEffect(() => {
    if (data?.projects?.length > 0 && !projectId) {
      setProjectId(data.projects[0].id.toString());
    }
  }, [data, projectId]);

  // Load active PRD if navigated from history
  useEffect(() => {
    if (activePrd) {
      setResultPRD(activePrd.content || activePrd);
      setFeatureName(activePrd.feature_name || activePrd.title || '');
      setProblemStatement(activePrd.problem_statement || '');
      setTargetAudience(activePrd.target_audience || '');
      setBusinessObjective(activePrd.business_objective || '');
      setAdditionalContext(activePrd.additional_context || '');
      if (activePrd.project_id) setProjectId(activePrd.project_id.toString());
      setMetaInfo({
        projectName: activePrd.project_name || data?.projects?.find((p) => p.id === activePrd.project_id)?.name,
        featureName: activePrd.feature_name || activePrd.title,
        modelName: activePrd.model_name || 'Gemini 2.5 Flash',
        latencyMs: activePrd.generation_time_ms,
        tokensUsed: activePrd.tokens_used,
      });
      setIsSaved(true);
      setSavedPrdId(activePrd.id);
      setLastAnalysisTime(activePrd.created_at ? new Date(activePrd.created_at) : new Date());
    }
  }, [activePrd, data?.projects]);

  useEffect(() => {
    getAiConfig().then((cfg) => {
      setAiConfig(cfg);
      if (cfg?.default_model) setSelectedModel(cfg.default_model);
    });
  }, []);

  const selectedProject = data?.projects?.find((p) => p.id === Number(projectId));

  const handleApplyExample = (ex) => {
    setFeatureName(ex.featureName);
    setProblemStatement(ex.problemStatement);
    setTargetAudience(ex.targetAudience);
    setBusinessObjective(ex.businessObjective);
    setAdditionalContext(ex.additionalContext);
    setError('');
    toast(`Loaded preset: ${ex.label}`);
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!featureName.trim()) {
      setError('Please provide a feature or product name.');
      return;
    }
    if (!problemStatement.trim() || problemStatement.trim().length < 10) {
      setError('Please provide a detailed product problem statement (minimum 10 characters).');
      return;
    }
    if (!projectId) {
      setError('Please select a project to associate this PRD with.');
      return;
    }

    setError('');
    setAnalyzing(true);
    setAnalysisStep(1);
    setIsSaved(false);
    setSavedPrdId(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const response = await generatePRD({
        projectId: Number(projectId),
        featureName: featureName.trim(),
        problemStatement: problemStatement.trim(),
        targetAudience: targetAudience.trim(),
        businessObjective: businessObjective.trim(),
        additionalContext: additionalContext.trim(),
        modelName: selectedModel,
      });

      clearInterval(stepInterval);
      setAnalysisStep(5);

      setResultPRD(response.prd);
      const generatedAt = new Date();
      setLastAnalysisTime(generatedAt);

      const meta = {
        projectId: Number(projectId),
        projectName: selectedProject?.name || 'Zentriq Project',
        featureName: featureName.trim(),
        modelName: response.model_used || selectedModel,
        latencyMs: response.latency_ms,
        tokensUsed: response.tokens_used,
        generatedAt: generatedAt.toLocaleTimeString(),
      };
      setMetaInfo(meta);
      toast('PRD generated successfully!');

      // Automatically auto-save PRD to history
      try {
        const saved = await savePRD({
          project_id: Number(projectId),
          title: response.prd.title || featureName.trim(),
          feature_name: featureName.trim(),
          problem_statement: problemStatement.trim(),
          target_audience: targetAudience.trim() || null,
          business_objective: businessObjective.trim() || null,
          additional_context: additionalContext.trim() || null,
          model_name: response.model_used || selectedModel,
          status: 'completed',
          content: response.prd,
          tokens_used: response.tokens_used || 0,
          generation_time_ms: response.latency_ms || 0,
        });
        setIsSaved(true);
        setSavedPrdId(saved.id);
      } catch (saveErr) {
        console.warn('Auto-save error:', saveErr);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message || 'Failed to generate PRD. Please check your Gemini credentials.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualSave = async () => {
    if (!resultPRD || isSaved) return;
    setSaving(true);
    try {
      const saved = await savePRD({
        project_id: Number(projectId),
        title: resultPRD.title || featureName.trim(),
        feature_name: featureName.trim(),
        problem_statement: problemStatement.trim(),
        target_audience: targetAudience.trim() || null,
        business_objective: businessObjective.trim() || null,
        additional_context: additionalContext.trim() || null,
        model_name: metaInfo.modelName || selectedModel,
        status: 'completed',
        content: resultPRD,
        tokens_used: metaInfo.tokensUsed || 0,
        generation_time_ms: metaInfo.latencyMs || 0,
      });
      setIsSaved(true);
      setSavedPrdId(saved.id);
      toast('PRD saved to PRD History!');
    } catch (err) {
      toast('Failed to save PRD: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToTasks = async () => {
    if (!savedPrdId && !isSaved) {
      toast('Saving PRD first before converting to tasks...');
      await handleManualSave();
    }

    if (!savedPrdId) {
      toast('Please save the PRD to history before converting to tasks.');
      return;
    }

    setConverting(true);
    try {
      const res = await convertPRDToTasks(savedPrdId);
      toast(res.message || 'Tasks created in project!');
      await reload();
    } catch (err) {
      toast('Error converting to tasks: ' + (err.message || 'Error'));
    } finally {
      setConverting(false);
    }
  };

  const stepLabels = [
    'Validating product problem statement...',
    'Connecting to Gemini 2.5 Flash neural model...',
    'Synthesizing root causes, user personas & KPIs...',
    'Generating prioritized functional specs (P0/P1/P2)...',
    'Finalizing formatted Product Requirements Document...',
  ];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-56">
        <TopBar />
        <main className="max-w-[1300px] px-4 lg:px-10 pt-7 pb-24">
          {/* Header Title & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-mute">AI WORKSPACE</span>
                <span className="text-mute">/</span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-brand flex items-center gap-1">
                  <Sparkles size={12} /> COPILOT
                </span>
              </div>
              <h1 className="text-[28px] font-semibold text-ink tracking-tight flex items-center gap-2.5">
                <span>AI Product Manager Copilot</span>
              </h1>
              <p className="text-[14.5px] text-ink2 mt-0.5">
                Transform raw product problem statements into production-ready, executive-grade PRDs using Google Gemini AI.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setKeyModalOpen(true)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium transition shadow-xs ${
                  hasCustomKey || aiConfig?.configured
                    ? 'border-ok/30 bg-ok/5 text-ok hover:bg-ok/10'
                    : 'border-amber/40 bg-amber/5 text-amber hover:bg-amber/10'
                }`}
                title="Configure Gemini API Key"
              >
                <Key size={14} />
                <span>{hasCustomKey || aiConfig?.configured ? 'Gemini Key Active' : 'Configure Gemini Key'}</span>
              </button>

              <button
                type="button"
                onClick={navigateToPrdHistory}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title="View saved PRDs"
              >
                <History size={14} className="text-ink2" />
                <span>PRD History</span>
              </button>
            </div>
          </div>

          {/* TWO MAIN SECTIONS: Left Section (Problem Input) & Right Section (Analysis Status) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            {/* LEFT SECTION: Product Problem Input (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-card border border-line rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand grid place-items-center">
                      <Brain size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-ink">Product Problem Input</h2>
                      <p className="text-xs text-ink2">Define the core customer friction or business challenge</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-mute bg-card2 px-2 py-0.5 rounded border border-line">
                    Step 1 of 2
                  </span>
                </div>

                {/* Example Problem Statements Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb size={13} className="text-amber" /> Example Problem Statements
                    </span>
                    <span className="text-[11px] text-mute">Click to populate</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_PROBLEMS.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyExample(ex)}
                        className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-line bg-canvas hover:bg-hov hover:border-brand/40 text-ink transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles size={11} className="text-brand shrink-0" />
                        <span className="font-medium">{ex.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* 1. Project Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                      1. Associated Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="select-project"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-line bg-card2 text-sm text-ink focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      required
                    >
                      <option value="" disabled>Select a project...</option>
                      {data?.projects?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Product or Feature Name */}
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                      2. Product or Feature Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-feature-name"
                      type="text"
                      value={featureName}
                      onChange={(e) => setFeatureName(e.target.value)}
                      placeholder="e.g. One-Click Express Checkout & Digital Wallets"
                      className="w-full h-10 px-3.5 rounded-xl border border-line bg-card2 text-sm text-ink placeholder:text-mute focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      required
                    />
                  </div>

                  {/* 3. Problem Statement (large textarea) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                        3. Raw Problem Statement <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-mute font-mono">
                        {problemStatement.length} chars
                      </span>
                    </div>
                    <textarea
                      id="textarea-problem-statement"
                      rows={5}
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      placeholder="Describe the user pain point, metrics drop-off, customer feedback, or friction in detail... Example: Users are abandoning checkout because the payment process is confusing."
                      className="w-full p-3.5 rounded-xl border border-line bg-card2 text-sm text-ink placeholder:text-mute focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand resize-y leading-relaxed"
                      required
                    />
                  </div>

                  {/* 4. Target Audience (optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                        4. Target Audience <span className="text-mute font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Mobile-first shoppers & repeat buyers"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-card2 text-sm text-ink placeholder:text-mute focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>

                    {/* 5. Business Objective (optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                        5. Business Objective <span className="text-mute font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={businessObjective}
                        onChange={(e) => setBusinessObjective(e.target.value)}
                        placeholder="e.g. Reduce cart abandonment below 25%"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-card2 text-sm text-ink placeholder:text-mute focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                  </div>

                  {/* 6. Additional Context (optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                      6. Additional Context & Technical Constraints <span className="text-mute font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      placeholder="e.g. Must comply with PCI-DSS, support guest checkout, and work with Stripe or Apple Pay."
                      className="w-full p-3 rounded-xl border border-line bg-card2 text-sm text-ink placeholder:text-mute focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand resize-y"
                    />
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold">Unable to analyze problem:</div>
                        <div>{error}</div>
                        {error.toLowerCase().includes('key') && (
                          <button
                            type="button"
                            onClick={() => setKeyModalOpen(true)}
                            className="text-brand underline font-semibold mt-1 block"
                          >
                            Click here to configure your Gemini API Key
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PRIMARY ACTION BUTTON */}
                  <div className="pt-2">
                    <button
                      id="btn-analyze-generate"
                      type="submit"
                      disabled={analyzing}
                      className="w-full h-11 px-5 rounded-xl bg-brand hover:bg-brandh text-white font-medium text-sm transition shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          <span>Analysing Problem & Generating PRD…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={17} />
                          <span>Analyse Problem & Generate PRD</span>
                          <ArrowRight size={16} className="ml-1 opacity-70" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT SECTION: AI Analysis Status (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-card border border-line rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sage/20 text-sagedk grid place-items-center">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-ink">AI Analysis Status</h2>
                      <p className="text-xs text-ink2">Real-time inference & model metrics</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    analyzing
                      ? 'bg-amber/15 text-amber border border-amber/30 animate-pulse'
                      : resultPRD
                      ? 'bg-ok/15 text-ok border border-ok/30'
                      : 'bg-card2 text-mute border border-line'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${analyzing ? 'bg-amber' : resultPRD ? 'bg-ok' : 'bg-mute'}`} />
                    {analyzing ? 'Analyzing' : resultPRD ? 'Complete' : 'Idle'}
                  </span>
                </div>

                {/* Analysis Status Cards */}
                <div className="space-y-3.5">
                  {/* Selected Project */}
                  <div className="p-3.5 rounded-xl border border-line bg-card2 space-y-1">
                    <div className="text-[11px] font-semibold text-mute uppercase tracking-wider">
                      Selected Project
                    </div>
                    {selectedProject ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">{selectedProject.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-canvas border border-line text-ink2">
                          {selectedProject.status}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-mute">No project selected</span>
                    )}
                  </div>

                  {/* Model Selector & Status */}
                  <div className="p-3.5 rounded-xl border border-line bg-card2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-mute uppercase tracking-wider">
                        AI Provider & Model
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand/10 text-brand font-semibold">
                        Google Gemini
                      </span>
                    </div>

                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-line bg-card text-xs font-semibold text-ink focus:outline-hidden focus:border-brand"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Primary / Recommended)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast Reasoning)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Stable Fallback)</option>
                    </select>
                  </div>

                  {/* Live Generation Progress or Empty State */}
                  {analyzing ? (
                    <div className="p-4 rounded-xl border border-brand/30 bg-brand/5 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-brand">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw size={13} className="animate-spin" /> Reasoning with Gemini AI...
                        </span>
                        <span>Step {analysisStep} of 5</span>
                      </div>

                      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(analysisStep / 5) * 100}%` }}
                        />
                      </div>

                      <p className="text-xs text-ink font-medium">
                        {stepLabels[analysisStep - 1] || 'Processing problem statement...'}
                      </p>
                    </div>
                  ) : resultPRD ? (
                    <div className="p-4 rounded-xl border border-ok/30 bg-ok/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-ok flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> PRD Generation Complete
                        </span>
                        <span className="text-[11px] font-mono text-ink2">
                          {metaInfo.generatedAt || 'Just now'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-card border border-line">
                          <span className="text-[10px] text-mute block">Latency</span>
                          <span className="font-mono font-semibold text-ink">
                            {metaInfo.latencyMs ? `${(metaInfo.latencyMs / 1000).toFixed(2)}s` : '1.8s'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-card border border-line">
                          <span className="text-[10px] text-mute block">Tokens Generated</span>
                          <span className="font-mono font-semibold text-brand">
                            {metaInfo.tokensUsed ? metaInfo.tokensUsed.toLocaleString() : '1,240'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-ink2 flex items-center justify-between pt-1 border-t border-ok/20">
                        <span>Functional Specs: <b className="text-ink">{resultPRD.functionalRequirements?.length || 0}</b></span>
                        <span>User Stories: <b className="text-ink">{resultPRD.userStories?.length || 0}</b></span>
                        <span>KPIs: <b className="text-ink">{resultPRD.goalsAndSuccessMetrics?.kpis?.length || 0}</b></span>
                      </div>
                    </div>
                  ) : (
                    /* Helpful Empty State Before Analysis Begins */
                    <div className="p-5 rounded-xl border border-line bg-canvas text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 text-brand mx-auto grid place-items-center">
                        <Wand2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Awaiting Product Problem Input
                        </h4>
                        <p className="text-xs text-ink2 mt-1 leading-relaxed">
                          Fill in the problem statement on the left or click an example preset to initiate Gemini AI analysis.
                        </p>
                      </div>

                      <div className="pt-2 text-left space-y-2 border-t border-line text-[11px] text-ink2">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-brand/15 text-brand font-bold grid place-items-center text-[10px]">1</span>
                          <span>Input raw user pain or business friction</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-brand/15 text-brand font-bold grid place-items-center text-[10px]">2</span>
                          <span>Gemini 2.5 Flash extracts root causes & personas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-brand/15 text-brand font-bold grid place-items-center text-[10px]">3</span>
                          <span>Synthesizes structured P0/P1 PRD & tasks</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Analysis Timestamp */}
                  <div className="flex items-center justify-between text-xs text-mute px-1">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Last Analysis:
                    </span>
                    <span className="font-mono text-ink2">
                      {lastAnalysisTime ? lastAnalysisTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* PM Best Practice Card */}
              <div className="p-5 rounded-2xl border border-line bg-card2 space-y-2 text-xs text-ink2">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <Rocket size={15} className="text-brand" />
                  <span>Pro Tip for High-Quality PRDs</span>
                </div>
                <p className="leading-relaxed">
                  Mention measurable business metrics (e.g. drop-off rates, conversion percentages) and specific user personas in your problem statement to give Gemini rich context for generating quantified KPIs.
                </p>
              </div>
            </div>
          </div>

          {/* GENERATED PRD DISPLAY SECTION */}
          {resultPRD && (
            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">GENERATED ARTIFACT</span>
                  <span className="text-mute">/</span>
                  <h3 className="text-lg font-bold text-ink">Product Requirements Document</h3>
                </div>
                <span className="text-xs text-ink2">
                  {isSaved ? '✓ Saved in PRD History' : 'Unsaved Draft'}
                </span>
              </div>

              <PRDViewer
                prd={resultPRD}
                metadata={metaInfo}
                onSave={handleManualSave}
                onConvertToTasks={handleConvertToTasks}
                isSaving={saving}
                isConverting={converting}
                isSaved={isSaved}
                toast={toast}
              />
            </div>
          )}
        </main>
      </div>

      {/* Global Shared Components */}
      <QuickCreate />
      <Drawer />
      <CommandPalette />
      <Toast />

      {/* API Key Modal */}
      <ApiKeySettingsModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onKeySaved={(k) => setHasCustomKey(Boolean(k))}
        toast={toast}
      />
    </div>
  );
}
