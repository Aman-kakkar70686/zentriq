import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  ListChecks,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getTraceabilityMatrix } from '../../api/storiesQa';

export default function TraceabilityTab({
  selectedProject,
  selectedPrd,
  onNavigateTab,
  toast,
}) {
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);

  const fetchMatrix = async () => {
    if (!selectedProject?.id) return;
    setLoading(true);
    try {
      const data = await getTraceabilityMatrix({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
      });
      setMatrixData(data);
      // Expand all by default
      if (data?.rows) {
        setExpandedRows(new Set(data.rows.map((r) => r.requirement_id)));
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch traceability matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedProject?.id, selectedPrd?.id]);

  const toggleExpand = (reqId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  const summary = matrixData?.summary || {};
  let rows = matrixData?.rows || [];
  if (filterMissingOnly) {
    rows = rows.filter((r) => !r.is_covered || r.stories_count === 0);
  }

  const statusBadges = {
    approved: 'bg-ok/10 text-ok border-ok/20',
    pending: 'bg-amber/10 text-amber border-amber/20',
    rejected: 'bg-bad/10 text-bad border-bad/20',
    needs_clarification: 'bg-purple-500/10 text-purple-700 border-purple-200',
  };

  return (
    <div className="space-y-6">
      {/* COVERAGE METRICS TOP BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-brand/30 bg-sage/15 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
              Req → Story Coverage
            </span>
            <ShieldCheck size={16} className="text-brand" />
          </div>
          <div className="text-3xl font-bold text-brand mt-1 tabular-nums">
            {summary.coverage_rate_pct || 0}%
          </div>
          <div className="text-xs text-ink2 mt-1">
            {summary.covered_requirements || 0} of {summary.total_requirements || 0} requirements covered
          </div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider">
              Requirements
            </span>
            <Layers size={16} className="text-ink2" />
          </div>
          <div className="text-3xl font-bold text-ink mt-1 tabular-nums">
            {summary.total_requirements || 0}
          </div>
          <div className="text-xs text-ink2 mt-1">Total functional requirements</div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber uppercase tracking-wider">
              Stories Lacking Criteria
            </span>
            <AlertTriangle size={16} className="text-amber" />
          </div>
          <div className="text-3xl font-bold text-amber mt-1 tabular-nums">
            {summary.stories_without_criteria || 0}
          </div>
          <div className="text-xs text-ink2 mt-1">Require G/W/T criteria</div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-bad uppercase tracking-wider">
              Criteria Lacking QA Tests
            </span>
            <XCircle size={16} className="text-bad" />
          </div>
          <div className="text-3xl font-bold text-bad mt-1 tabular-nums">
            {summary.criteria_without_tests || 0}
          </div>
          <div className="text-xs text-ink2 mt-1">Downstream test gaps</div>
        </div>
      </div>

      {/* FILTER & MATRIX ACTIONS BAR */}
      <div className="p-4 rounded-xl bg-card border border-line shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-ink">Requirement Traceability Matrix</span>
          <label className="flex items-center gap-2 text-xs text-ink2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterMissingOnly}
              onChange={(e) => setFilterMissingOnly(e.target.checked)}
              className="rounded border-line"
            />
            <span>Show Uncovered Requirements Only</span>
          </label>
        </div>

        <button
          onClick={fetchMatrix}
          className="text-xs text-ink2 hover:text-ink inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Recompute Matrix</span>
        </button>
      </div>

      {/* MATRIX HIERARCHICAL TABLE */}
      <div className="bg-card border border-line rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-card2/30">
          <div className="text-xs font-semibold text-ink uppercase tracking-wider">
            Traceability Chain: PRD Requirement → User Story → Criteria → Edge Cases → QA Test Cases
          </div>
          <span className="text-xs text-ink2">Expand rows to inspect downstream coverage</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-ink2">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand" />
            Computing full relational traceability graph...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink2 max-w-sm mx-auto">
            <ShieldCheck size={32} className="mx-auto mb-2 text-ink2 opacity-60" />
            <p className="font-semibold text-ink">No requirements found.</p>
            <p className="mt-1 text-ink2">
              Ensure you have an approved PRD with functional requirements selected.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((row) => {
              const isExpanded = expandedRows.has(row.requirement_id);
              const storiesCount = row.stories_count;

              return (
                <div key={row.requirement_id} className="transition">
                  {/* REQUIREMENT ROW */}
                  <div
                    onClick={() => toggleExpand(row.requirement_id)}
                    className="p-4 hover:bg-hov cursor-pointer flex items-start justify-between gap-4 select-none"
                  >
                    <div className="flex items-start gap-3">
                      <ChevronRight
                        size={16}
                        className={`text-ink2 mt-0.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                            {row.requirement_id}
                          </span>
                          <span className="text-xs font-semibold text-ink">{row.requirement_title}</span>
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded border bg-card text-ink2">
                            {row.priority}
                          </span>
                        </div>
                        <p className="text-xs text-ink2 mt-1 leading-relaxed max-w-2xl">
                          {row.requirement_description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-ink2 font-medium">
                        {storiesCount} {storiesCount === 1 ? 'Story' : 'Stories'}
                      </span>
                      <span
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                          row.is_covered
                            ? 'bg-ok/10 text-ok border-ok/20'
                            : storiesCount > 0
                            ? 'bg-amber/10 text-amber border-amber/20'
                            : 'bg-bad/10 text-bad border-bad/20'
                        }`}
                      >
                        {row.is_covered ? 'Fully Covered' : storiesCount > 0 ? 'Pending Approval' : 'Missing Story'}
                      </span>
                    </div>
                  </div>

                  {/* DOWNSTREAM EXPANDED STORIES & ARTIFACTS */}
                  {isExpanded && (
                    <div className="pl-11 pr-5 pb-5 pt-1 bg-card2/30 space-y-3">
                      {storiesCount === 0 ? (
                        <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-xs text-ink flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber" />
                            No user stories generated for this requirement yet.
                          </span>
                          <button
                            onClick={() => onNavigateTab('stories')}
                            className="text-xs font-semibold text-brand hover:underline"
                          >
                            Generate Story →
                          </button>
                        </div>
                      ) : (
                        row.stories.map((st) => (
                          <div
                            key={st.id}
                            className="p-3.5 rounded-xl bg-card border border-line space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-brand">
                                  {st.story_key}
                                </span>
                                <span className="text-xs font-semibold text-ink">{st.title}</span>
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                                  statusBadges[st.review_status] || statusBadges.pending
                                }`}
                              >
                                {st.review_status}
                              </span>
                            </div>

                            {/* Criteria & Edge Cases Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {/* Acceptance Criteria & Tests */}
                              <div className="p-2.5 rounded-lg bg-card2 border border-line/60 space-y-2 text-xs">
                                <span className="font-semibold text-ink text-[11px] uppercase tracking-wider block">
                                  Acceptance Criteria ({st.criteria.length})
                                </span>
                                {st.criteria.length === 0 ? (
                                  <div className="text-ink2 italic">No criteria specified yet.</div>
                                ) : (
                                  st.criteria.map((c) => (
                                    <div
                                      key={c.id}
                                      className="p-2 rounded bg-card border border-line space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-[11px] font-bold text-teal-700">
                                          {c.key}
                                        </span>
                                        <span className="text-[10px] text-ink2 capitalize">
                                          {c.review_status}
                                        </span>
                                      </div>
                                      <div className="text-[11.5px] text-ink font-medium">{c.title}</div>
                                      {c.tests.length > 0 && (
                                        <div className="pt-1 text-[10.5px] text-ink2 flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-brand">Tests:</span>
                                          {c.tests.map((t) => (
                                            <span
                                              key={t.id}
                                              className="px-1.5 py-0.2 rounded bg-sage/20 text-brand font-mono font-medium"
                                            >
                                              {t.key} ({t.execution_status})
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Edge Cases */}
                              <div className="p-2.5 rounded-lg bg-card2 border border-line/60 space-y-2 text-xs">
                                <span className="font-semibold text-ink text-[11px] uppercase tracking-wider block">
                                  Edge Cases ({st.edge_cases.length})
                                </span>
                                {st.edge_cases.length === 0 ? (
                                  <div className="text-ink2 italic">No edge cases surfaced yet.</div>
                                ) : (
                                  st.edge_cases.map((ec) => (
                                    <div
                                      key={ec.id}
                                      className="p-2 rounded bg-card border border-line flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <span className="font-mono text-[11px] font-bold text-amber mr-1.5">
                                          {ec.key}
                                        </span>
                                        <span className="capitalize text-ink">
                                          {ec.category.replace('_', ' ')}
                                        </span>
                                      </div>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-card2 border border-line">
                                        {ec.severity}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

