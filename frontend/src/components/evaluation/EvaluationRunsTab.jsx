import { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Eye,
  FileCheck2,
  Filter,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { listEvaluationRuns, downloadRunCSV } from '../../api/evaluation';
import RunDetailDrawer from './RunDetailDrawer';
import RunComparisonModal from './RunComparisonModal';

export default function EvaluationRunsTab({
  selectedProject,
  onRunEvaluation,
}) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Run detail drawer state
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Compare modal state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareRunA, setCompareRunA] = useState(null);
  const [compareRunB, setCompareRunB] = useState(null);

  useEffect(() => {
    loadRuns();
  }, [selectedProject]);

  const loadRuns = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await listEvaluationRuns({ project_id: selectedProject?.id });
      setRuns(list);
    } catch (err) {
      setError(err.message || 'Failed to load evaluation runs.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (runId) => {
    setSelectedRunId(runId);
    setDrawerOpen(true);
  };

  const handleOpenCompare = (runA, runB = null) => {
    setCompareRunA(runA);
    // Find previous run as default B if not given
    if (!runB) {
      const idx = runs.findIndex((r) => r.id === runA.id);
      const nextRun = runs[idx + 1] || runs[0];
      setCompareRunB(nextRun);
    } else {
      setCompareRunB(runB);
    }
    setCompareModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#202923]">Evaluation Runs Log</h2>
          <p className="text-xs text-[#78847C] mt-0.5">
            Audit history of all benchmark evaluation executions, calculated scores, and compliance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadRuns}
            className="px-3.5 py-2 rounded-xl border border-[#E5EAE5] hover:bg-[#F7F8F5] text-[#202923] text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={onRunEvaluation}
            className="px-4 py-2 rounded-xl bg-[#174B3A] hover:bg-[#2F765A] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
          >
            <Play size={14} className="fill-white" />
            Launch Evaluation Run
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8F5] text-[#78847C] border-b border-[#E5EAE5]">
                <th className="py-3 px-4 font-semibold">Run Identifier</th>
                <th className="py-3 px-4 font-semibold">Model & Prompt</th>
                <th className="py-3 px-4 font-semibold text-center">Samples</th>
                <th className="py-3 px-4 font-semibold text-center">F1 Score</th>
                <th className="py-3 px-4 font-semibold text-center">Precision</th>
                <th className="py-3 px-4 font-semibold text-center">Recall</th>
                <th className="py-3 px-4 font-semibold text-center">JSON Validity</th>
                <th className="py-3 px-4 font-semibold text-center">Traceability</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAE5]">
              {loading && runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#78847C]">
                    Loading evaluation runs...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#78847C]">
                    No completed evaluation runs found. Click "Launch Evaluation Run" to benchmark Gemini against ground truth.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F7F8F5]/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#174B3A]">{r.run_key}</span>
                        <span className="text-[10px] text-[#78847C]">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#202923]">
                      <span className="font-semibold block">{r.model_name}</span>
                      <span className="text-[10px] text-[#78847C]">{r.prompt_version}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-[#78847C]">
                      {r.total_samples}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#DCE9DF] text-[#174B3A] font-bold text-xs">
                        {r.f1_score}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#202923]">
                      {r.precision_score}%
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#202923]">
                      {r.recall_score}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-semibold text-[#10B981]">{r.json_validity_pct}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-semibold text-[#174B3A]">{r.traceability_validity_pct}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(r.id)}
                          className="px-2.5 py-1 rounded-md bg-[#F7F8F5] hover:bg-[#DCE9DF] text-[#174B3A] text-xs font-semibold border border-[#E5EAE5] transition"
                          title="Inspect sample-by-sample results"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => downloadRunCSV(r.id, r.run_key)}
                          className="p-1 rounded-md text-[#78847C] hover:text-[#202923] hover:bg-[#F7F8F5] transition"
                          title="Export CSV"
                        >
                          <Download size={14} />
                        </button>
                        {runs.length > 1 && (
                          <button
                            onClick={() => handleOpenCompare(r)}
                            className="p-1 rounded-md text-[#78847C] hover:text-[#174B3A] hover:bg-[#F7F8F5] transition"
                            title="Compare with another run"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Detail Drawer */}
      {drawerOpen && (
        <RunDetailDrawer
          runId={selectedRunId}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Compare Runs Modal */}
      {compareModalOpen && (
        <RunComparisonModal
          runA={compareRunA}
          runB={compareRunB}
          allRuns={runs}
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
        />
      )}
    </div>
  );
}

