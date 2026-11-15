import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Download,
  FileCheck2,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { getEvaluationRunDetail, downloadRunCSV } from '../../api/evaluation';

export default function RunDetailDrawer({ runId, isOpen, onClose, onCompare }) {
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSampleId, setExpandedSampleId] = useState(null);

  useEffect(() => {
    if (runId && isOpen) {
      loadRunDetail();
    }
  }, [runId, isOpen]);

  const loadRunDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getEvaluationRunDetail(runId);
      setRun(data);
    } catch (err) {
      setError(err.message || 'Failed to load run details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const sampleResults = run?.sample_results || [];
  const filteredResults = sampleResults.filter((s) => {
    if (statusFilter === 'all') return true;
    return s.match_status === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-[#E5EAE5] overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E5EAE5] bg-[#F7F8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DCE9DF] text-[#174B3A] grid place-items-center font-bold text-sm">
              <FileCheck2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#174B3A]">
                  {run?.run_key || '...'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCE9DF] text-[#174B3A] uppercase tracking-wider">
                  {run?.status || 'completed'}
                </span>
              </div>
              <p className="text-xs text-[#78847C] mt-0.5">
                Model: <strong>{run?.model_name}</strong> • Prompt: <strong>{run?.prompt_version}</strong> • Evaluated: {run?.total_samples} samples
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadRunCSV(run.id, run.run_key)}
              className="px-3 py-1.5 rounded-lg border border-[#E5EAE5] bg-white hover:bg-[#F7F8F5] text-[#202923] text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={13} />
              CSV
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#E5EAE5] text-[#78847C] grid place-items-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center text-xs text-[#78847C]">Loading evaluation sample results...</div>
          ) : (
            <>
              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5]">
                  <span className="text-[10px] uppercase font-bold text-[#78847C]">F1 Score</span>
                  <p className="text-xl font-bold text-[#174B3A] mt-0.5">{run?.f1_score}%</p>
                  <span className="text-[10px] text-[#78847C]">Harmonic mean</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5]">
                  <span className="text-[10px] uppercase font-bold text-[#78847C]">Precision</span>
                  <p className="text-xl font-bold text-[#2F765A] mt-0.5">{run?.precision_score}%</p>
                  <span className="text-[10px] text-[#78847C]">TP / (TP + FP)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5]">
                  <span className="text-[10px] uppercase font-bold text-[#78847C]">Recall</span>
                  <p className="text-xl font-bold text-[#3B82F6] mt-0.5">{run?.recall_score}%</p>
                  <span className="text-[10px] text-[#78847C]">TP / (TP + FN)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5]">
                  <span className="text-[10px] uppercase font-bold text-[#78847C]">Schema Validity</span>
                  <p className="text-xl font-bold text-[#10B981] mt-0.5">{run?.json_validity_pct}%</p>
                  <span className="text-[10px] text-[#78847C]">Strict JSON parse</span>
                </div>
              </div>

              {/* Execution Diagnostics */}
              <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] flex items-center justify-between text-xs text-[#78847C]">
                <span>Execution Latency: <strong>{run?.execution_time_ms ? `${(run.execution_time_ms / 1000).toFixed(1)}s` : 'N/A'}</strong></span>
                <span>Tokens Consumed: <strong>{run?.tokens_used?.toLocaleString() || 0}</strong></span>
                <span>Traceability Validity: <strong>{run?.traceability_validity_pct}%</strong></span>
                <span>Unsupported Assumptions: <strong>{run?.unsupported_assumption_pct}%</strong></span>
              </div>

              {/* Verdict Filter Bar */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="text-xs font-bold text-[#202923] uppercase tracking-wider">
                  Sample-by-Sample Ground Truth Audit ({filteredResults.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'correct', label: 'Correct' },
                    { key: 'partially_correct', label: 'Partial' },
                    { key: 'unsupported_assumption', label: 'Assumptions' },
                    { key: 'incorrect', label: 'Failed' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => setStatusFilter(btn.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                        statusFilter === btn.key
                          ? 'bg-[#174B3A] text-white shadow-xs'
                          : 'bg-[#F7F8F5] text-[#78847C] hover:bg-[#E5EAE5]'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Results Accordion */}
              <div className="space-y-3">
                {filteredResults.map((res) => {
                  const isExpanded = expandedSampleId === res.result_id;
                  return (
                    <div
                      key={res.result_id}
                      className="border border-[#E5EAE5] rounded-xl overflow-hidden bg-white shadow-xs transition"
                    >
                      {/* Summary Row */}
                      <button
                        onClick={() => setExpandedSampleId(isExpanded ? null : res.result_id)}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-[#F7F8F5]/50 transition gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-[#174B3A] bg-[#F7F8F5] px-2 py-0.5 rounded border border-[#E5EAE5]">
                            {res.sample_key}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#202923]">{res.sample_name}</p>
                            <span className="text-[10px] text-[#78847C]">
                              Category: {res.category} • Complexity: {res.complexity}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            res.match_status === 'correct'
                              ? 'bg-[#DCE9DF] text-[#174B3A]'
                              : res.match_status === 'partially_correct'
                              ? 'bg-amber-50 text-amber-700'
                              : res.match_status === 'unsupported_assumption'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {res.match_status.replace('_', ' ')}
                          </span>

                          <span className="text-xs font-bold text-[#202923] w-12 text-right">
                            {res.score}%
                          </span>

                          {isExpanded ? <ChevronDown size={16} className="text-[#78847C]" /> : <ChevronRight size={16} className="text-[#78847C]" />}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 border-t border-[#E5EAE5] bg-[#F7F8F5] space-y-4 text-xs animate-in fade-in duration-150">
                          {/* Metrics Pill & Feedback */}
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E5EAE5]">
                            <div className="flex items-center gap-4">
                              <span className="text-[#174B3A] font-semibold">TP: <strong>{res.tp_count}</strong></span>
                              <span className="text-amber-700 font-semibold">FP: <strong>{res.fp_count}</strong></span>
                              <span className="text-red-700 font-semibold">FN: <strong>{res.fn_count}</strong></span>
                            </div>
                            {res.error_category && (
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                Defect: {res.error_category}
                              </span>
                            )}
                          </div>

                          <div className="p-3 bg-white rounded-lg border border-[#E5EAE5]">
                            <span className="font-semibold text-[#202923] block mb-1">Evaluator Feedback:</span>
                            <p className="text-[#78847C] leading-relaxed">{res.evaluator_feedback}</p>
                          </div>

                          {/* Split View of JSON Output */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-[#174B3A] uppercase tracking-wider">
                                Expected Ground Truth
                              </span>
                              <pre className="p-3 rounded-lg bg-white border border-[#E5EAE5] font-mono text-[10px] max-h-56 overflow-auto whitespace-pre-wrap">
                                {JSON.stringify(res.expected_output, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-[#202923] uppercase tracking-wider">
                                Actual Model Output
                              </span>
                              <pre className="p-3 rounded-lg bg-white border border-[#E5EAE5] font-mono text-[10px] max-h-56 overflow-auto whitespace-pre-wrap">
                                {JSON.stringify(res.actual_output, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

