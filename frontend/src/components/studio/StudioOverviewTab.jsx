import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Layers,
  ListChecks,
  Play,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function StudioOverviewTab({
  overviewData,
  loading,
  onNavigateTab,
  selectedProject,
  selectedPrd,
  onRefresh,
}) {
  const metrics = overviewData?.metrics || {};
  const progress = overviewData?.workflow_progress || {};
  const recentActivity = overviewData?.recent_activity || [];
  const recentGenerations = overviewData?.recent_generations || [];

  const workflowStages = [
    {
      key: 'prd',
      label: 'Approved PRD',
      sub: selectedPrd ? selectedPrd.title : 'Selected PRD',
      count: progress.prds_count || 1,
      status: 'Active',
      color: 'bg-brand text-white',
      tab: 'overview',
    },
    {
      key: 'requirements',
      label: 'Requirements',
      sub: `${progress.requirements_count || 0} Functional Reqs`,
      count: progress.requirements_count || 0,
      status: progress.requirements_count > 0 ? 'Ready' : 'Pending',
      color: 'bg-secondary text-white',
      tab: 'stories',
    },
    {
      key: 'stories',
      label: 'User Stories',
      sub: `${metrics.approved_stories || 0} Approved`,
      count: metrics.total_user_stories || 0,
      status: metrics.total_user_stories > 0 ? 'Generated' : 'Pending',
      color: 'bg-emerald-600 text-white',
      tab: 'stories',
    },
    {
      key: 'criteria',
      label: 'Acceptance Criteria',
      sub: `${metrics.approved_criteria || 0} Approved`,
      count: metrics.total_acceptance_criteria || 0,
      status: metrics.total_acceptance_criteria > 0 ? 'Defined' : 'Pending',
      color: 'bg-teal-600 text-white',
      tab: 'criteria',
    },
    {
      key: 'edge_cases',
      label: 'Edge Cases',
      sub: `${metrics.total_edge_cases || 0} Scenarios`,
      count: metrics.total_edge_cases || 0,
      status: metrics.total_edge_cases > 0 ? 'Identified' : 'Pending',
      color: 'bg-cyan-600 text-white',
      tab: 'edge-cases',
    },
    {
      key: 'qa_tests',
      label: 'QA Test Cases',
      sub: `${metrics.passed_tests || 0} Passed • ${metrics.failed_tests || 0} Failed`,
      count: metrics.total_qa_test_cases || 0,
      status: metrics.total_qa_test_cases > 0 ? 'Ready to Run' : 'Pending',
      color: 'bg-sage text-ink font-semibold',
      tab: 'qa-tests',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* SECTION A: HORIZONTAL WORKFLOW PROGRESS */}
      <section className="p-6 rounded-2xl bg-card border border-line shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Layers size={16} className="text-brand" />
              End-to-End Artifact Workflow
            </h3>
            <p className="text-xs text-ink2 mt-0.5">
              Approved PRD → Requirements → User Stories → Acceptance Criteria → Edge Cases → QA Test Cases
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs text-ink2 hover:text-ink inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line hover:bg-hov transition"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-brand' : ''} />
            <span>Refresh Workflow</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {workflowStages.map((st, i) => (
            <button
              key={st.key}
              onClick={() => onNavigateTab(st.tab)}
              className="group p-3.5 rounded-xl border border-line bg-card2/50 hover:bg-hov hover:border-brand/40 text-left transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider text-ink2 uppercase">
                  Stage 0{i + 1}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-card border border-line text-brand">
                  {st.status}
                </span>
              </div>
              <div className="text-xl font-bold text-ink tabular-nums">{st.count}</div>
              <div className="text-xs font-semibold text-ink mt-0.5 truncate">{st.label}</div>
              <div className="text-[11px] text-ink2 truncate mt-0.5">{st.sub}</div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand opacity-0 group-hover:opacity-100 transition">
                <span>View</span>
                <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION B: 6 KEY METRICS CARDS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
            Verified Studio Metrics
          </h3>
          <span className="text-[11px] text-ink2">Derived from live database records</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total User Stories */}
          <button
            onClick={() => onNavigateTab('stories', { filter: 'all' })}
            className="p-4 rounded-xl border border-line bg-card hover:bg-hov text-left transition shadow-xs group"
          >
            <div className="text-[11px] font-medium text-ink2 uppercase tracking-wide">Total Stories</div>
            <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
              {metrics.total_user_stories || 0}
            </div>
            <div className="text-[11px] text-ink2 mt-1">Generated stories</div>
          </button>

          {/* 2. Approved Stories */}
          <button
            onClick={() => onNavigateTab('stories', { filter: 'approved' })}
            className="p-4 rounded-xl border border-line bg-card hover:bg-hov text-left transition shadow-xs group"
          >
            <div className="text-[11px] font-medium text-ok uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 size={12} />
              Approved Stories
            </div>
            <div className="text-2xl font-bold text-ok mt-1 tabular-nums">
              {metrics.approved_stories || 0}
            </div>
            <div className="text-[11px] text-ink2 mt-1">Ready for tasks</div>
          </button>

          {/* 3. Acceptance Criteria */}
          <button
            onClick={() => onNavigateTab('criteria')}
            className="p-4 rounded-xl border border-line bg-card hover:bg-hov text-left transition shadow-xs group"
          >
            <div className="text-[11px] font-medium text-ink2 uppercase tracking-wide">Criteria</div>
            <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
              {metrics.total_acceptance_criteria || 0}
            </div>
            <div className="text-[11px] text-ok mt-1 font-medium">
              {metrics.approved_criteria || 0} approved
            </div>
          </button>

          {/* 4. Edge Cases */}
          <button
            onClick={() => onNavigateTab('edge-cases')}
            className="p-4 rounded-xl border border-line bg-card hover:bg-hov text-left transition shadow-xs group"
          >
            <div className="text-[11px] font-medium text-ink2 uppercase tracking-wide">Edge Cases</div>
            <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
              {metrics.total_edge_cases || 0}
            </div>
            <div className="text-[11px] text-ink2 mt-1">Failure scenarios</div>
          </button>

          {/* 5. QA Test Cases */}
          <button
            onClick={() => onNavigateTab('qa-tests')}
            className="p-4 rounded-xl border border-line bg-card hover:bg-hov text-left transition shadow-xs group"
          >
            <div className="text-[11px] font-medium text-ink2 uppercase tracking-wide">QA Tests</div>
            <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
              {metrics.total_qa_test_cases || 0}
            </div>
            <div className="text-[11px] text-brand mt-1 font-medium">
              {metrics.passed_tests || 0} passed • {metrics.failed_tests || 0} fail
            </div>
          </button>

          {/* 6. Requirement Coverage */}
          <button
            onClick={() => onNavigateTab('traceability')}
            className="p-4 rounded-xl border border-brand/30 bg-sage/10 hover:bg-sage/20 text-left transition shadow-xs group"
          >
            <div className="text-[11px] font-semibold text-brand uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck size={12} />
              Req Coverage
            </div>
            <div className="text-2xl font-bold text-brand mt-1 tabular-nums">
              {metrics.requirement_coverage_pct || 0}%
            </div>
            <div className="text-[11px] text-ink2 mt-1">Traceability rate</div>
          </button>
        </div>
      </section>

      {/* SECTION D: QUICK ACTIONS (Clean card layout, not oversized buttons) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
            Quick Generation Actions
          </h3>
          <span className="text-[11px] text-ink2">Run Gemini AI with approved requirements</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => onNavigateTab('stories', { autoOpenGenerate: true })}
            className="p-4 rounded-xl border border-line bg-card hover:border-brand/40 hover:bg-hov cursor-pointer transition shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <FileCheck2 size={16} />
            </div>
            <h4 className="text-sm font-semibold text-ink">Generate User Stories</h4>
            <p className="text-xs text-ink2 mt-1 leading-relaxed">
              Transform approved PRD requirements into INVEST stories with priorities and dependencies.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand">
              <span>Start Generator</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('criteria', { autoOpenGenerate: true })}
            className="p-4 rounded-xl border border-line bg-card hover:border-brand/40 hover:bg-hov cursor-pointer transition shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <ListChecks size={16} />
            </div>
            <h4 className="text-sm font-semibold text-ink">Generate Acceptance Criteria</h4>
            <p className="text-xs text-ink2 mt-1 leading-relaxed">
              Create structured Given / When / Then criteria covering happy paths, validation, and permissions.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand">
              <span>Specify Criteria</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('edge-cases', { autoOpenGenerate: true })}
            className="p-4 rounded-xl border border-line bg-card hover:border-brand/40 hover:bg-hov cursor-pointer transition shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber/10 text-amber flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <ShieldAlert size={16} />
            </div>
            <h4 className="text-sm font-semibold text-ink">Generate Edge Cases</h4>
            <p className="text-xs text-ink2 mt-1 leading-relaxed">
              Identify boundary, duplicate submission, network, and concurrency failure modes.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand">
              <span>Surface Edge Cases</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('qa-tests', { autoOpenGenerate: true })}
            className="p-4 rounded-xl border border-line bg-card hover:border-brand/40 hover:bg-hov cursor-pointer transition shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Play size={16} />
            </div>
            <h4 className="text-sm font-semibold text-ink">Generate QA Test Cases</h4>
            <p className="text-xs text-ink2 mt-1 leading-relaxed">
              Derive test steps, data, and expected results ready for manual execution and export.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand">
              <span>Build Test Suite</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: RECENT ACTIVITY & GENERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit / Review Activity */}
        <div className="p-5 rounded-2xl bg-card border border-line">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-brand" />
              Recent Review & Execution Activity
            </h3>
            <span className="text-[11px] text-ink2">Audit trail</span>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-2.5">
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl border border-line bg-card2/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand" />
                    <span className="font-semibold text-ink capitalize">
                      {act.artifact_type.replace('_', ' ')} #{act.artifact_id}
                    </span>
                    <span className="text-ink2 capitalize">• {act.action.replace('_', ' ')}</span>
                  </div>
                  <span className="text-[11px] text-ink2 tabular-nums">
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-ink2">
              No review actions recorded yet. Generate and approve artifacts to establish your audit trail.
            </div>
          )}
        </div>

        {/* Recent AI Generation Operations */}
        <div className="p-5 rounded-2xl bg-card border border-line">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand" />
              Recent AI Generation Log
            </h3>
            <span className="text-[11px] text-ink2">Real Gemini executions</span>
          </div>

          {recentGenerations.length > 0 ? (
            <div className="space-y-2.5">
              {recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="p-2.5 rounded-xl border border-line bg-card2/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-ink capitalize">
                      {gen.generation_type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-ink2 mt-0.5">
                      {gen.prompt_summary || 'Generated artifacts'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ok/10 text-ok border border-ok/20 uppercase">
                      {gen.status}
                    </span>
                    <div className="text-[10px] text-ink2 tabular-nums mt-0.5">
                      {gen.tokens_used} tokens • {gen.latency_ms}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-ink2">
              No AI generations recorded yet. Use the quick actions above to trigger Gemini intelligence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

