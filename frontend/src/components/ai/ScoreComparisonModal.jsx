import { ArrowUpRight, CheckCircle2, ChevronRight, TrendingUp, X } from 'lucide-react';

export default function ScoreComparisonModal({ comparison, isOpen, onClose }) {
  if (!isOpen || !comparison) return null;

  const isImprovement = comparison.score_improvement >= 0;

  const categoryLabels = {
    completeness: '1. Completeness (max 25)',
    clarity: '2. Clarity (max 20)',
    testability: '3. Testability (max 20)',
    feasibility: '4. Feasibility (max 15)',
    consistency: '5. Consistency (max 10)',
    risk_dependencies: '6. Risk & Dependencies (max 10)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-canvas border border-line rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ok/10 text-ok grid place-items-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">PRD Quality Score Comparison</h3>
              <p className="text-xs text-ink2">Comparing previous analysis run with re-analysis results</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-ink2 hover:bg-hov hover:text-ink transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Score Delta Banner */}
          <div className="p-6 rounded-2xl bg-card border border-line flex items-center justify-between">
            <div className="text-center">
              <span className="text-xs text-mute font-semibold uppercase tracking-wider block mb-1">Previous Score</span>
              <span className="text-3xl font-extrabold text-ink2">{comparison.previous_score}</span>
              <span className="text-[11px] text-mute block mt-1">/ 100 ({comparison.previous_label})</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-mono font-bold text-mute">RE-ANALYSIS</span>
              <ChevronRight size={24} className="text-brand" />
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                isImprovement ? 'bg-ok/15 text-ok border border-ok/30' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {isImprovement ? `+${comparison.score_improvement}` : comparison.score_improvement} points
                <ArrowUpRight size={13} />
              </span>
            </div>

            <div className="text-center">
              <span className="text-xs text-brand font-semibold uppercase tracking-wider block mb-1">Current Score</span>
              <span className="text-4xl font-extrabold text-brand">{comparison.current_score}</span>
              <span className="text-[11px] text-ink font-semibold block mt-1">/ 100 ({comparison.current_label})</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-ok/10 border border-ok/20 flex items-center gap-2.5 text-ink">
              <CheckCircle2 size={16} className="text-ok shrink-0" />
              <div>
                <span className="font-semibold">{comparison.resolved_issues_count} Issues Resolved</span>
                <p className="text-[11px] text-ink2">Incorporated directly into PRD specifications</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-line text-ink">
              <span className="font-semibold block">{comparison.current_issue_count} Remaining Action Items</span>
              <p className="text-[11px] text-ink2">Ready for review or PM clarification</p>
            </div>
          </div>

          {/* Category-by-Category Diff Table */}
          <div className="rounded-xl border border-line bg-card overflow-hidden text-xs">
            <div className="px-4 py-2.5 bg-card2 border-b border-line font-semibold text-ink2 uppercase tracking-wider text-[11px]">
              Category Score Breakdown
            </div>
            <div className="divide-y divide-line">
              {Object.entries(comparison.category_differences || {}).map(([key, diff]) => {
                const label = categoryLabels[key] || key;
                const change = diff.difference;
                return (
                  <div key={key} className="p-3 flex items-center justify-between">
                    <span className="font-medium text-ink">{label}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-mute">{diff.previous_score}</span>
                      <ChevronRight size={12} className="text-mute" />
                      <span className="font-bold text-ink">{diff.current_score}</span>
                      <span className={`text-[11px] font-bold w-12 text-right ${
                        change > 0 ? 'text-ok' : change < 0 ? 'text-red-600' : 'text-mute'
                      }`}>
                        {change > 0 ? `+${change}` : change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-card2 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
