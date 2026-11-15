import { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { compareRuns } from '../../api/evaluation';

export default function RunComparisonModal({
  runA,
  runB,
  allRuns = [],
  isOpen,
  onClose,
}) {
  const [selectedAId, setSelectedAId] = useState(runA?.id);
  const [selectedBId, setSelectedBId] = useState(runB?.id);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (runA) setSelectedAId(runA.id);
    if (runB) setSelectedBId(runB.id);
  }, [runA, runB]);

  useEffect(() => {
    if (selectedAId && selectedBId && isOpen) {
      loadComparison();
    }
  }, [selectedAId, selectedBId, isOpen]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await compareRuns(selectedAId, selectedBId);
      setComparison(data);
    } catch (err) {
      setError(err.message || 'Failed to compare runs.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const dataA = comparison?.run_a;
  const dataB = comparison?.run_b;
  const deltas = comparison?.deltas || {};

  const renderDelta = (delta, isGoodIfPositive = true) => {
    if (delta === 0) return <span className="text-[#78847C] font-semibold text-xs">0.0%</span>;
    const isPositive = delta > 0;
    const isGood = isGoodIfPositive ? isPositive : !isPositive;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-bold ${
          isGood ? 'text-[#16A34A]' : 'text-[#DC2626]'
        }`}
      >
        <Icon size={14} />
        {isPositive ? `+${delta}%` : `${delta}%`}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E5EAE5] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#E5EAE5] bg-[#F7F8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#DCE9DF] text-[#174B3A] grid place-items-center">
              <ArrowRightLeft size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202923]">Evaluation Run Comparison</h2>
              <p className="text-[11px] text-[#78847C]">
                Side-by-side empirical performance variance between prompt versions or models.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#E5EAE5] text-[#78847C] grid place-items-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Selector Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5]">
              <label className="block text-xs font-bold text-[#78847C] uppercase mb-1">
                Baseline (Run A)
              </label>
              <select
                value={selectedAId}
                onChange={(e) => setSelectedAId(Number(e.target.value))}
                className="w-full text-xs font-semibold p-2 rounded-lg border border-[#E5EAE5] bg-white text-[#202923]"
              >
                {allRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.run_key} ({r.model_name} • F1: {r.f1_score}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5]">
              <label className="block text-xs font-bold text-[#78847C] uppercase mb-1">
                Candidate (Run B)
              </label>
              <select
                value={selectedBId}
                onChange={(e) => setSelectedBId(Number(e.target.value))}
                className="w-full text-xs font-semibold p-2 rounded-lg border border-[#E5EAE5] bg-white text-[#202923]"
              >
                {allRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.run_key} ({r.model_name} • F1: {r.f1_score}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xs text-[#78847C]">Calculating empirical metrics delta...</div>
          ) : (
            <>
              {/* Summary Metrics Comparison Table */}
              <div className="bg-white rounded-xl border border-[#E5EAE5] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F8F5] text-[#78847C] border-b border-[#E5EAE5]">
                      <th className="py-2.5 px-4 font-semibold">Metric</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Run A (Baseline)</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Run B (Candidate)</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Variance (Delta)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAE5]">
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#202923]">F1 Score</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#78847C]">{dataA?.f1}%</td>
                      <td className="py-3 px-4 text-center font-bold text-[#174B3A]">{dataB?.f1}%</td>
                      <td className="py-3 px-4 text-center">{renderDelta(deltas.f1)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#202923]">Precision (Relevance)</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#78847C]">{dataA?.precision}%</td>
                      <td className="py-3 px-4 text-center font-bold text-[#2F765A]">{dataB?.precision}%</td>
                      <td className="py-3 px-4 text-center">{renderDelta(deltas.precision)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#202923]">Recall (Completeness)</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#78847C]">{dataA?.recall}%</td>
                      <td className="py-3 px-4 text-center font-bold text-[#3B82F6]">{dataB?.recall}%</td>
                      <td className="py-3 px-4 text-center">{renderDelta(deltas.recall)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#202923]">JSON Validity</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#78847C]">{dataA?.json_validity}%</td>
                      <td className="py-3 px-4 text-center font-bold text-[#10B981]">{dataB?.json_validity}%</td>
                      <td className="py-3 px-4 text-center">{renderDelta(deltas.json_validity)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#202923]">Unsupported Assumption Rate</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#78847C]">{dataA?.unsupported_assumption_rate}%</td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">{dataB?.unsupported_assumption_rate}%</td>
                      <td className="py-3 px-4 text-center">{renderDelta(deltas.unsupported_assumption_rate, false)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#202923]">Execution Latency</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#78847C]">{(dataA?.execution_time_ms / 1000).toFixed(1)}s</td>
                      <td className="py-3 px-4 text-center font-bold text-[#202923]">{(dataB?.execution_time_ms / 1000).toFixed(1)}s</td>
                      <td className="py-3 px-4 text-center text-xs font-semibold text-[#78847C]">
                        {deltas.execution_time_ms > 0 ? `+${(deltas.execution_time_ms / 1000).toFixed(1)}s` : `${(deltas.execution_time_ms / 1000).toFixed(1)}s`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Version & Config Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
                  <span className="font-bold text-[#174B3A]">Run A Config:</span>
                  <p className="text-[#78847C]">Model: {dataA?.model_name}</p>
                  <p className="text-[#78847C]">Prompt Version: {dataA?.prompt_version}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
                  <span className="font-bold text-[#174B3A]">Run B Config:</span>
                  <p className="text-[#78847C]">Model: {dataB?.model_name}</p>
                  <p className="text-[#78847C]">Prompt Version: {dataB?.prompt_version}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5EAE5] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#174B3A] text-white text-xs font-bold hover:bg-[#2F765A] transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}

