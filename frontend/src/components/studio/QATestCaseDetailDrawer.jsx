import { useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { updateQATestCase, validateArtifact } from '../../api/storiesQa';

export default function QATestCaseDetailDrawer({
  isOpen,
  onClose,
  testCase,
  onUpdateStatus,
  onEdit,
  onRefresh,
  toast,
}) {
  if (!isOpen || !testCase) return null;

  const [execStatus, setExecStatus] = useState(testCase.execution_status || 'not_run');
  const [actualResult, setActualResult] = useState(testCase.actual_result || '');
  const [notes, setNotes] = useState(testCase.execution_notes || '');
  const [savingExec, setSavingExec] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleSaveExecution = async (statusOverride = null) => {
    setSavingExec(true);
    const targetStatus = statusOverride || execStatus;
    try {
      await updateQATestCase(testCase.id, {
        execution_status: targetStatus,
        actual_result: actualResult,
        execution_notes: notes,
      });
      setExecStatus(targetStatus);
      if (toast) toast(`Test case execution updated to ${targetStatus}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (toast) toast(`Error saving execution: ${err.message}`);
    } finally {
      setSavingExec(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      await validateArtifact({
        artifact_type: 'qa_test_case',
        artifact_id: testCase.id,
      });
      if (toast) toast('AI QA Validation complete');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (toast) toast(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const statusColors = {
    approved: 'bg-ok/10 text-ok border-ok/20',
    pending: 'bg-amber/10 text-amber border-amber/20',
    rejected: 'bg-bad/10 text-bad border-bad/20',
    needs_clarification: 'bg-purple-500/10 text-purple-700 border-purple-200',
  };

  const execStatusColors = {
    passed: 'bg-ok text-white',
    failed: 'bg-bad text-white',
    blocked: 'bg-amber text-white',
    not_run: 'bg-card text-ink2 border border-line',
  };

  const steps = Array.isArray(testCase.test_steps) ? testCase.test_steps : [];
  const valData = testCase.validation_results || {};
  const checks = valData.checks || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex justify-end transition-opacity duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-line overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-line flex items-start justify-between bg-card2/40">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                {testCase.test_case_key}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-card border-line capitalize">
                {testCase.category.replace('_', ' ')}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-card border-line">
                Priority: {testCase.priority}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                  statusColors[testCase.review_status] || statusColors.pending
                }`}
              >
                {testCase.review_status}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-ink leading-snug">{testCase.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-hov transition shrink-0 ml-3"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action & Review Bar */}
        <div className="px-6 py-3 border-b border-line bg-card flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {testCase.review_status !== 'approved' && (
              <button
                onClick={() => onUpdateStatus(testCase.id, 'approved')}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ok text-white text-xs font-medium hover:bg-ok/90 transition shadow-xs"
              >
                <CheckCircle2 size={13} />
                <span>Approve Test</span>
              </button>
            )}
            {testCase.review_status !== 'rejected' && (
              <button
                onClick={() => onUpdateStatus(testCase.id, 'rejected')}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line text-bad hover:bg-bad/5 text-xs font-medium transition"
              >
                <span>Reject</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(testCase)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line hover:bg-hov text-ink text-xs font-medium transition"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-line hover:bg-hov text-ink2 text-xs transition"
              title="Re-run AI QA Validation"
            >
              <RefreshCw size={12} className={validating ? 'animate-spin text-brand' : ''} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-ink">
          {/* MANUAL EXECUTION RECORDER */}
          <div className="p-4 rounded-xl border border-line bg-card2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Play size={13} className="text-brand" />
                Manual QA Execution
              </span>
              <span className="text-[11px] text-ink2">Authorized Tester Only</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                ['not_run', 'Not Run', Clock],
                ['passed', 'Passed', CheckCircle2],
                ['failed', 'Failed', XCircle],
                ['blocked', 'Blocked', Ban],
              ].map(([st, label, Icon]) => {
                const isSelected = execStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => {
                      setExecStatus(st);
                      handleSaveExecution(st);
                    }}
                    className={`h-8 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1 transition ${
                      isSelected
                        ? execStatusColors[st]
                        : 'bg-card border border-line text-ink hover:bg-hov'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-1">
                Actual Result Observed
              </label>
              <textarea
                rows={2}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="Log actual system response, error codes, or screen state..."
                className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-1">
                Execution Notes / Bug ID
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Verified on Chrome 128 MacOS / Regression pass"
                className="w-full h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
              />
            </div>

            <button
              onClick={() => handleSaveExecution()}
              disabled={savingExec}
              className="w-full h-8 rounded-lg bg-brand hover:bg-brandh text-white text-xs font-medium transition inline-flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              <Save size={13} />
              <span>{savingExec ? 'Saving...' : 'Update Execution Log'}</span>
            </button>
          </div>

          {/* PRECONDITIONS & TEST DATA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-line bg-card">
              <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider block mb-1">
                Preconditions
              </span>
              <p className="text-xs text-ink leading-relaxed">
                {testCase.preconditions || 'Standard active session with appropriate permissions.'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-line bg-card">
              <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider block mb-1">
                Test Data
              </span>
              <p className="text-xs text-ink leading-relaxed font-mono">
                {testCase.test_data || 'Standard production-like seed fixtures.'}
              </p>
            </div>
          </div>

          {/* TEST STEPS */}
          <div className="p-4 rounded-xl border border-line bg-card space-y-2">
            <span className="text-xs font-semibold text-ink uppercase tracking-wider block">
              Numbered Test Steps
            </span>
            <div className="space-y-1.5 pt-1">
              {steps.map((st, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-ink leading-relaxed">
                  <span className="w-5 h-5 rounded-md bg-sage/30 text-brand font-bold text-[11px] flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span>{st.replace(/^[0-9]+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EXPECTED RESULT */}
          <div className="p-4 rounded-xl border border-ok/20 bg-ok/5 space-y-1">
            <span className="text-xs font-semibold text-ok uppercase tracking-wider block">
              Expected Result
            </span>
            <p className="text-xs text-ink font-medium leading-relaxed">{testCase.expected_result}</p>
          </div>

          {/* SOURCE TRACEABILITY */}
          <div className="p-3.5 rounded-xl border border-line bg-card text-xs space-y-1.5">
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px] block">
              Traceability Links
            </span>
            <div className="flex items-center justify-between text-ink2">
              <span>Source Requirement:</span>
              <span className="font-mono font-medium text-brand">{testCase.requirement_id}</span>
            </div>
            <div className="flex items-center justify-between text-ink2">
              <span>User Story ID:</span>
              <span className="font-mono font-medium text-ink">#{testCase.story_id}</span>
            </div>
            {testCase.acceptance_criteria_id && (
              <div className="flex items-center justify-between text-ink2">
                <span>Acceptance Criteria ID:</span>
                <span className="font-mono font-medium text-ink">#{testCase.acceptance_criteria_id}</span>
              </div>
            )}
          </div>

          {/* AI VALIDATION REPORT */}
          {checks.length > 0 && (
            <div className="p-4 rounded-xl border border-line bg-card space-y-2">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand" />
                AI Validation Checks
              </span>
              <div className="space-y-1.5 pt-1">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={13} className={c.passed ? 'text-ok' : 'text-amber'} />
                    <span className="font-medium text-ink">{c.rule}:</span>
                    <span className="text-ink2">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

