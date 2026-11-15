import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart2,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
  X
} from 'lucide-react';
import { runBenchmarkEvaluation } from '../../api/ai';

export default function BenchmarkEvaluationModal({ isOpen, onClose, toast }) {
  const [running, setRunning] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  if (!isOpen) return null;

  const handleRunEvaluation = async () => {
    setRunning(true);
    setEvalResult(null);
    try {
      const res = await runBenchmarkEvaluation(selectedModel);
      setEvalResult(res);
      if (toast) toast('Evaluation benchmark completed!');
    } catch (e) {
      if (toast) toast('Benchmark evaluation failed: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-canvas border border-line rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-line bg-card/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand grid place-items-center">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">AI Requirement Intelligence Benchmark & Accuracy</h3>
              <p className="text-xs text-ink2">Empirical evaluation of Gemini defect detection across standard test cases</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-ink2 hover:bg-hov hover:text-ink transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Top Control Bar */}
          <div className="p-4 rounded-2xl bg-card border border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider">Evaluation Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={running}
                className="h-8 px-2.5 rounded-lg border border-line bg-card2 text-xs font-semibold text-ink"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Primary)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={running}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{running ? 'Running 5 Test Cases…' : 'Run Benchmark Evaluation'}</span>
            </button>
          </div>

          {/* Results Display */}
          {evalResult ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Empirical KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-card border border-line text-center">
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Precision
                  </span>
                  <span className="text-3xl font-extrabold text-brand">{evalResult.precision}%</span>
                  <span className="text-[10px] text-ink2 block mt-1">TP / (TP + FP)</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-line text-center">
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Recall
                  </span>
                  <span className="text-3xl font-extrabold text-ok">{evalResult.recall}%</span>
                  <span className="text-[10px] text-ink2 block mt-1">TP / (TP + FN)</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-line text-center">
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    F1 Score
                  </span>
                  <span className="text-3xl font-extrabold text-ink">{evalResult.f1_score}%</span>
                  <span className="text-[10px] text-ink2 block mt-1">Harmonic Mean</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-line text-center">
                  <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                    Valid JSON Rate
                  </span>
                  <span className="text-3xl font-extrabold text-brand">{evalResult.valid_json_response_rate}%</span>
                  <span className="text-[10px] text-ink2 block mt-1">Schema Compliance</span>
                </div>
              </div>

              {/* False Positive / False Negative Summary */}
              <div className="p-4 rounded-2xl bg-card2 border border-line flex items-center justify-around text-xs">
                <div>
                  <span className="text-mute">False Positives (Hallucinated Defect): </span>
                  <b className="text-amber font-semibold">{evalResult.false_positive_count}</b>
                </div>
                <div className="h-4 w-px bg-line" />
                <div>
                  <span className="text-mute">False Negatives (Missed Defect): </span>
                  <b className="text-red-600 font-semibold">{evalResult.false_negative_count}</b>
                </div>
                <div className="h-4 w-px bg-line" />
                <div>
                  <span className="text-mute">Model Evaluated: </span>
                  <b className="text-ink font-semibold">{evalResult.model_evaluated}</b>
                </div>
              </div>

              {/* Individual Test Cases Table */}
              <div className="rounded-2xl border border-line bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-line bg-card2 font-semibold text-xs text-ink">
                  Test Case Results Breakdown ({evalResult.test_results?.length || 0} Test PRDs)
                </div>
                <div className="divide-y divide-line text-xs">
                  {evalResult.test_results?.map((tc, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-mute">{tc.test_case_id}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            tc.passed ? 'bg-ok/15 text-ok border border-ok/30' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {tc.passed ? 'PASSED' : 'DISCREPANCY'}
                          </span>
                          <span className="font-semibold text-ink">{tc.name}</span>
                        </div>
                        <p className="text-ink2 text-[11px]">{tc.description}</p>
                        <div className="text-[10px] text-mute flex items-center gap-3">
                          <span>Expected: <b>{tc.expected_defects?.join(', ') || 'None (Clean PRD)'}</b></span>
                          <span>•</span>
                          <span>Detected: <b>{tc.detected_defects?.join(', ') || 'None'}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        {tc.latency_ms && (
                          <span className="text-[11px] font-mono text-mute flex items-center gap-1">
                            <Clock size={11} /> {tc.latency_ms}ms
                          </span>
                        )}
                        <div className="text-[11px]">
                          <span className="text-ok font-semibold">TP: {tc.true_positives}</span> |{' '}
                          <span className="text-amber font-semibold">FP: {tc.false_positives}</span> |{' '}
                          <span className="text-red-600 font-semibold">FN: {tc.false_negatives}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="p-10 rounded-2xl border border-line bg-card text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand mx-auto grid place-items-center">
                <BarChart2 size={24} />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-bold text-ink">Evaluation Suite Ready to Run</h4>
                <p className="text-xs text-ink2 mt-1 leading-relaxed">
                  Run the empirical benchmark to measure Precision, Recall, and F1 defect detection against 5 curated test PRDs (Missing, Ambiguous, Conflicting, Incomplete, and Clean Gold-Standard).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
