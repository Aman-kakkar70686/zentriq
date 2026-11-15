import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  HelpCircle,
  Layers,
  LineChart,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function EvaluationOverviewTab({
  overviewData,
  loading,
  onRefresh,
  onRunEvaluation,
  onNavigateTab,
}) {
  const [selectedChartMetric, setSelectedChartMetric] = useState('f1');

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="animate-spin text-[#174B3A] mx-auto mb-3" size={28} />
        <p className="text-sm font-medium text-[#78847C]">Calculating empirical evaluation metrics...</p>
      </div>
    );
  }

  const hasData = overviewData?.has_data;
  const metrics = overviewData?.metrics || {};
  const historyRuns = overviewData?.history_runs || [];
  const qualityDist = overviewData?.quality_distribution || { passed: 0, needs_improvement: 0, failed: 0, total: 0 };
  const byArtifact = overviewData?.by_artifact || {};
  const recentActivity = overviewData?.recent_activity || [];

  const chartMetricOptions = [
    { key: 'f1', label: 'Overall F1-Score', color: '#174B3A' },
    { key: 'precision', label: 'Precision Score', color: '#2F765A' },
    { key: 'recall', label: 'Recall Score', color: '#3B82F6' },
    { key: 'story_relevance', label: 'Story Relevance', color: '#8B5CF6' },
    { key: 'ac_quality', label: 'Acceptance Criteria Quality', color: '#10B981' },
    { key: 'qa_precision', label: 'QA Test Precision', color: '#EC4899' },
    { key: 'traceability_validity', label: 'Traceability Validity', color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-[#174B3A] to-[#2F765A] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles size={12} className="text-[#DCE9DF]" />
            Empirical Benchmark Lab
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Quality & Benchmark Intelligence</h2>
          <p className="text-[#DCE9DF] text-xs max-w-xl mt-1">
            Empirical evaluation of Zentriq AI generation accuracy against manually reviewed ground truth benchmarks.
            Every metric is calculated directly from actual database validation records — never fabricated.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            title="Recalculate metrics"
          >
            <RefreshCw size={14} />
            Recalculate
          </button>
          <button
            onClick={onRunEvaluation}
            className="px-4 py-2 rounded-xl bg-[#DCE9DF] hover:bg-white text-[#174B3A] text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Play size={14} className="fill-[#174B3A]" />
            Run Evaluation
          </button>
        </div>
      </div>

      {/* Six Main Evaluation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <MetricCard
          title="Total Evaluated"
          value={hasData && metrics.total_samples !== null ? metrics.total_samples : 'N/A'}
          unit="samples"
          subtitle="Across completed runs"
          icon={Layers}
          tooltip="Total count of benchmark requirement samples evaluated against ground truth."
          status="neutral"
          hasData={hasData}
        />
        <MetricCard
          title="Story Relevance"
          value={hasData && metrics.story_relevance !== null ? `${metrics.story_relevance}%` : 'N/A'}
          subtitle="INVEST compliance"
          icon={FileCheck2}
          tooltip="Precision of generated user stories matching role, action, benefit, and acceptance summary in ground truth."
          status={metrics.story_relevance >= 85 ? 'success' : 'warning'}
          hasData={hasData}
        />
        <MetricCard
          title="AC Quality"
          value={hasData && metrics.ac_quality !== null ? `${metrics.ac_quality}%` : 'N/A'}
          subtitle="Gherkin F1-score"
          icon={CheckCircle2}
          tooltip="Harmonic mean of precision and recall for Given/When/Then scenarios compared to approved benchmark criteria."
          status={metrics.ac_quality >= 85 ? 'success' : 'warning'}
          hasData={hasData}
        />
        <MetricCard
          title="QA Precision"
          value={hasData && metrics.qa_precision !== null ? `${metrics.qa_precision}%` : 'N/A'}
          subtitle="TP / (TP + FP)"
          icon={ShieldCheck}
          tooltip="Ratio of accurate, non-hallucinated test cases to total generated test cases."
          status={metrics.qa_precision >= 85 ? 'success' : 'warning'}
          hasData={hasData}
        />
        <MetricCard
          title="QA Recall"
          value={hasData && metrics.qa_recall !== null ? `${metrics.qa_recall}%` : 'N/A'}
          subtitle="TP / (TP + FN)"
          icon={Activity}
          tooltip="Ratio of captured boundary, negative, and happy path test scenarios compared to ground truth test expectations."
          status={metrics.qa_recall >= 80 ? 'success' : 'warning'}
          hasData={hasData}
        />
        <MetricCard
          title="Traceability Validity"
          value={hasData && metrics.traceability_validity !== null ? `${metrics.traceability_validity}%` : 'N/A'}
          subtitle="Requirement linkage"
          icon={Compass}
          tooltip="Percentage of generated artifacts that strictly link back to approved parent requirement IDs without orphaned keys."
          status={metrics.traceability_validity >= 95 ? 'success' : 'warning'}
          hasData={hasData}
        />
      </div>

      {/* Middle Row: Performance Trend Chart & Output Quality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5EAE5] p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#202923] flex items-center gap-2">
                <LineChart size={16} className="text-[#174B3A]" />
                Evaluation Performance Trend
              </h3>
              <p className="text-xs text-[#78847C] mt-0.5">
                Metric progression across historical evaluation runs.
              </p>
            </div>
            {/* Metric Selector Pill */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {chartMetricOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedChartMetric(opt.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedChartMetric === opt.key
                      ? 'bg-[#174B3A] text-white shadow-xs'
                      : 'bg-[#F7F8F5] text-[#78847C] hover:bg-[#E5EAE5]'
                  }`}
                >
                  {opt.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {!hasData || historyRuns.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#E5EAE5] rounded-xl bg-[#F7F8F5]">
              <LineChart className="text-[#78847C] mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm font-semibold text-[#202923]">Not enough evaluation data</p>
              <p className="text-xs text-[#78847C] max-w-sm mx-auto mt-1 mb-4">
                Run an evaluation against the approved benchmark suite to plot empirical accuracy trends.
              </p>
              <button
                onClick={onRunEvaluation}
                className="px-3.5 py-1.5 rounded-lg bg-[#174B3A] text-white text-xs font-semibold hover:bg-[#2F765A] transition"
              >
                Launch First Evaluation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* SVG Sparkline / Multi-point chart */}
              <div className="h-48 w-full bg-[#F7F8F5] rounded-xl p-4 flex flex-col justify-between border border-[#E5EAE5]">
                <div className="flex items-center justify-between text-[11px] text-[#78847C] border-b border-[#E5EAE5] pb-1">
                  <span>Target: 90% (Enterprise SLA)</span>
                  <span className="font-semibold text-[#174B3A]">
                    Active: {chartMetricOptions.find((m) => m.key === selectedChartMetric)?.label}
                  </span>
                </div>

                {/* Plot bars / points */}
                <div className="h-32 flex items-end justify-around gap-2 pt-2">
                  {historyRuns.map((r, idx) => {
                    const rawVal = r[selectedChartMetric] ?? r.f1 ?? 0;
                    const pctVal = Math.min(Math.max(rawVal, 0), 100);
                    return (
                      <div key={r.run_id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-[#202923] text-white text-[10px] font-semibold py-1 px-2 rounded-md shadow-md whitespace-nowrap z-10">
                          {r.run_key}: {pctVal}% ({r.model})
                        </div>
                        <div className="w-full max-w-[48px] bg-[#DCE9DF] hover:bg-[#174B3A] transition rounded-t-md relative flex items-end justify-center" style={{ height: `${pctVal}%` }}>
                          <span className="text-[10px] font-bold text-[#174B3A] group-hover:text-white mb-1">
                            {pctVal}%
                          </span>
                        </div>
                        <span className="text-[10px] text-[#78847C] truncate max-w-[60px]">
                          {r.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#78847C] px-1">
                <span>Evaluated with temperature=0.2 (deterministic mode)</span>
                <span className="text-[#174B3A] font-semibold">
                  Latest: {historyRuns[historyRuns.length - 1]?.[selectedChartMetric] ?? 0}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Output Quality Distribution */}
        <div className="bg-white rounded-xl border border-[#E5EAE5] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#202923] flex items-center gap-2">
              <BarChart2 size={16} className="text-[#174B3A]" />
              Output Quality Distribution
            </h3>
            <p className="text-xs text-[#78847C] mt-0.5">
              Breakdown across verified ground truth evaluations.
            </p>

            {!hasData || qualityDist.total === 0 ? (
              <div className="py-12 text-center text-xs text-[#78847C]">
                Not enough evaluation data.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {/* Horizontal Bar Breakdown */}
                <div className="h-4 w-full bg-[#F7F8F5] rounded-full overflow-hidden flex border border-[#E5EAE5]">
                  <div
                    style={{ width: `${(qualityDist.passed / qualityDist.total) * 100}%` }}
                    className="bg-[#174B3A] transition-all"
                    title={`Passed: ${qualityDist.passed}`}
                  />
                  <div
                    style={{ width: `${(qualityDist.needs_improvement / qualityDist.total) * 100}%` }}
                    className="bg-[#F59E0B] transition-all"
                    title={`Needs Improvement: ${qualityDist.needs_improvement}`}
                  />
                  <div
                    style={{ width: `${(qualityDist.failed / qualityDist.total) * 100}%` }}
                    className="bg-[#EF4444] transition-all"
                    title={`Failed: ${qualityDist.failed}`}
                  />
                </div>

                {/* Detail Counts */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F8F5] text-xs">
                    <span className="flex items-center gap-2 font-medium text-[#202923]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#174B3A]" />
                      Passed (Match Ground Truth)
                    </span>
                    <span className="font-bold text-[#174B3A]">
                      {qualityDist.passed} ({Math.round((qualityDist.passed / qualityDist.total) * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F8F5] text-xs">
                    <span className="flex items-center gap-2 font-medium text-[#202923]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      Needs Improvement (Minor Gaps)
                    </span>
                    <span className="font-bold text-[#F59E0B]">
                      {qualityDist.needs_improvement} ({Math.round((qualityDist.needs_improvement / qualityDist.total) * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F8F5] text-xs">
                    <span className="flex items-center gap-2 font-medium text-[#202923]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                      Failed (Schema or Omission)
                    </span>
                    <span className="font-bold text-[#EF4444]">
                      {qualityDist.failed} ({Math.round((qualityDist.failed / qualityDist.total) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E5EAE5] mt-4 flex items-center justify-between">
            <span className="text-xs text-[#78847C]">Total Ground Truth Audits</span>
            <span className="text-xs font-bold text-[#202923]">{qualityDist.total} records</span>
          </div>
        </div>
      </div>

      {/* Artifact Breakdown Table (Part 3.D) */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E5EAE5] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#202923]">Generation Quality by Artifact Type</h3>
            <p className="text-xs text-[#78847C] mt-0.5">
              Empirical precision, recall, and review status across development artifacts.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('quality')}
            className="text-xs font-semibold text-[#174B3A] hover:underline"
          >
            Detailed Quality Analysis →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8F5] text-[#78847C] border-b border-[#E5EAE5]">
                <th className="py-2.5 px-4 font-semibold">Artifact Type</th>
                <th className="py-2.5 px-4 font-semibold text-center">Evaluated</th>
                <th className="py-2.5 px-4 font-semibold text-center">Passed</th>
                <th className="py-2.5 px-4 font-semibold text-center">Needs Improvement</th>
                <th className="py-2.5 px-4 font-semibold text-center">Failed</th>
                <th className="py-2.5 px-4 font-semibold text-center">Precision</th>
                <th className="py-2.5 px-4 font-semibold text-center">Recall</th>
                <th className="py-2.5 px-4 font-semibold text-center">F1 Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAE5]">
              {Object.entries(byArtifact).map(([key, data]) => (
                <tr key={key} className="hover:bg-[#F7F8F5]/60 transition">
                  <td className="py-3 px-4 font-medium text-[#202923]">
                    {data.label || key}
                  </td>
                  <td className="py-3 px-4 text-center text-[#78847C]">
                    {hasData ? data.evaluated : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-[#DCE9DF] text-[#174B3A] font-semibold text-[11px]">
                      {hasData ? data.passed : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px]">
                      {hasData ? data.needs_improvement : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold text-[11px]">
                      {hasData ? data.failed : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#174B3A]">
                    {hasData && data.precision > 0 ? `${data.precision}%` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#2F765A]">
                    {hasData && data.recall > 0 ? `${data.recall}%` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#202923]">
                    {hasData && data.f1 > 0 ? `${data.f1}%` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#202923] flex items-center gap-2">
            <Clock size={16} className="text-[#174B3A]" />
            Recent Evaluation & Review Activity
          </h3>
          <span className="text-xs text-[#78847C]">Latest verification audits</span>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-xs text-[#78847C] py-4 text-center">No recent evaluation runs logged.</p>
        ) : (
          <div className="divide-y divide-[#E5EAE5]">
            {recentActivity.map((act, i) => (
              <div key={i} className="py-2.5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg grid place-items-center mt-0.5 shrink-0 ${
                      act.type === 'evaluation_run'
                        ? 'bg-[#DCE9DF] text-[#174B3A]'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {act.type === 'evaluation_run' ? <Play size={13} /> : <AlertTriangle size={13} />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#202923]">{act.title}</p>
                    <p className="text-[11px] text-[#78847C] mt-0.5">{act.detail}</p>
                  </div>
                </div>
                <span className="text-[10px] text-[#78847C] whitespace-nowrap mt-1">
                  {new Date(act.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, subtitle, icon: Icon, tooltip, status = 'neutral', hasData }) {
  const statusStyles = {
    success: 'border-l-4 border-l-[#174B3A]',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-red-500',
    neutral: 'border-l-4 border-l-[#E5EAE5]',
  };

  return (
    <div className={`bg-white rounded-xl border border-[#E5EAE5] p-4 shadow-xs relative group ${statusStyles[status]}`}>
      <div className="flex items-center justify-between text-[#78847C] mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className="relative">
          <Icon size={16} className="text-[#174B3A]" />
        </div>
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold text-[#202923] tracking-tight">{value}</span>
        {unit && <span className="text-xs font-medium text-[#78847C]">{unit}</span>}
      </div>

      <p className="text-[11px] text-[#78847C] mt-1 truncate">{subtitle}</p>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#202923] text-white text-[11px] py-1 px-2.5 rounded shadow-lg max-w-xs z-20 pointer-events-none text-center">
        {tooltip}
      </div>
    </div>
  );
}

