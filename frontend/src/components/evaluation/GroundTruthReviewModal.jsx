import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Columns,
  Eye,
  FileCheck2,
  FolderGit2,
  Layers,
  ListChecks,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { getBenchmarkSample, reviewBenchmarkSample, updateBenchmarkSample } from '../../api/evaluation';

export default function GroundTruthReviewModal({
  sampleId,
  isOpen,
  onClose,
  onReviewed,
}) {
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active view tab for outputs
  const [activeArtifactTab, setActiveArtifactTab] = useState('user_story');

  // Review Form state
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewerNotes, setReviewerNotes] = useState('');

  useEffect(() => {
    if (sampleId && isOpen) {
      loadSampleDetail();
    }
  }, [sampleId, isOpen]);

  const loadSampleDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getBenchmarkSample(sampleId);
      setSample(data);
      setReviewStatus(data.review_status || 'approved');
      setReviewerNotes(data.reviewer_notes || '');
    } catch (err) {
      setError(err.message || 'Failed to load sample details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async (forcedStatus = null) => {
    try {
      setSaving(true);
      setError('');
      const targetStatus = forcedStatus || reviewStatus;
      await reviewBenchmarkSample(sampleId, {
        review_status: targetStatus,
        reviewer_notes: reviewerNotes,
      });
      setSuccessMsg(`Sample successfully marked as ${targetStatus}.`);
      if (onReviewed) onReviewed();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to update review status.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const expectedOutputs = sample?.expected_outputs || {};
  const latestAiResult = sample?.latest_ai_results?.[0] || null;
  const actualAiOutput = latestAiResult?.actual_output || {};

  const tabs = [
    { key: 'user_story', label: 'User Story' },
    { key: 'acceptance_criteria', label: 'Acceptance Criteria' },
    { key: 'edge_case', label: 'Edge Cases' },
    { key: 'qa_test_case', label: 'QA Test Cases' },
    { key: 'traceability', label: 'Traceability' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-[#E5EAE5] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5EAE5] flex items-center justify-between bg-[#F7F8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DCE9DF] text-[#174B3A] grid place-items-center font-bold text-sm">
              GT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#174B3A] bg-white px-2 py-0.5 rounded border border-[#E5EAE5]">
                  {sample?.sample_key || '...'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                  sample?.review_status === 'approved'
                    ? 'bg-[#DCE9DF] text-[#174B3A]'
                    : sample?.review_status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {sample?.review_status || 'Draft'}
                </span>
              </div>
              <h2 className="text-base font-bold text-[#202923] mt-0.5 truncate max-w-xl">
                {sample?.name || 'Benchmark Sample Ground Truth Review'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#E5EAE5] text-[#78847C] grid place-items-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2">
              <CheckCircle2 size={15} />
              {successMsg}
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center text-xs text-[#78847C]">Loading ground truth artifacts...</div>
          ) : (
            <>
              {/* Requirement Context Card */}
              <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78847C]">
                  <span className="font-semibold text-[#202923]">Input Requirement Specification</span>
                  <div className="flex items-center gap-3">
                    <span>Category: <strong>{sample?.category}</strong></span>
                    <span>Complexity: <strong>{sample?.complexity}</strong></span>
                    <span>Source: <strong>{sample?.reference_source || 'Internal Spec'}</strong></span>
                  </div>
                </div>
                <p className="text-xs text-[#202923] leading-relaxed bg-white p-3 rounded-lg border border-[#E5EAE5]">
                  {sample?.requirement_description}
                </p>
              </div>

              {/* Artifact Tabs Selector */}
              <div className="flex items-center gap-2 border-b border-[#E5EAE5] pb-2">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveArtifactTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeArtifactTab === t.key
                        ? 'bg-[#174B3A] text-white'
                        : 'bg-[#F7F8F5] text-[#78847C] hover:bg-[#E5EAE5]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Split Screen Comparison: Ground Truth (Left) vs Actual AI Output (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Ground Truth Expected Output */}
                <div className="border border-[#174B3A]/20 bg-[#174B3A]/5 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#174B3A]/15 mb-3">
                      <span className="text-xs font-bold text-[#174B3A] flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 size={14} className="text-[#174B3A]" />
                        Human Verified Ground Truth
                      </span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded text-[#174B3A] font-semibold border border-[#174B3A]/20">
                        Golden Standard
                      </span>
                    </div>

                    <div className="text-xs text-[#202923] space-y-2">
                      <pre className="p-3 bg-white rounded-lg border border-[#E5EAE5] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-[340px]">
                        {JSON.stringify(expectedOutputs[activeArtifactTab] || expectedOutputs[activeArtifactTab === 'edge_case' ? 'edge_cases' : activeArtifactTab] || 'No expected data configured for this artifact.', null, 2)}
                      </pre>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#78847C] mt-2">
                    Verified and approved by QA Architect. Used as reference for Precision/Recall calculation.
                  </p>
                </div>

                {/* Right Column: Actual Gemini Model Output */}
                <div className="border border-[#E5EAE5] bg-white rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE5] mb-3">
                      <span className="text-xs font-bold text-[#202923] flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles size={14} className="text-[#2F765A]" />
                        Latest Gemini Model Output
                      </span>
                      <span className="text-[10px] bg-[#F7F8F5] px-2 py-0.5 rounded text-[#78847C] font-semibold border border-[#E5EAE5]">
                        Score: {latestAiResult ? `${latestAiResult.score}%` : 'Not run yet'}
                      </span>
                    </div>

                    <div className="text-xs text-[#202923] space-y-2">
                      <pre className="p-3 bg-[#F7F8F5] rounded-lg border border-[#E5EAE5] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-[340px]">
                        {latestAiResult
                          ? JSON.stringify(actualAiOutput[activeArtifactTab] || actualAiOutput[activeArtifactTab === 'edge_case' ? 'edge_cases' : activeArtifactTab] || actualAiOutput, null, 2)
                          : 'No completed evaluation run yet for this sample. Run an evaluation from the Overview Dashboard to compare live Gemini output.'}
                      </pre>
                    </div>
                  </div>

                  {latestAiResult && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      <strong>Evaluator Feedback:</strong> {latestAiResult.evaluator_feedback || 'Matches criteria.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Reviewer Verdict & Actions Section (Part 4.D) */}
              <div className="p-5 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#202923] uppercase tracking-wider">
                      Ground Truth Approval & Review Verdict
                    </h3>
                    <p className="text-[11px] text-[#78847C]">
                      Unapproved samples will be excluded from benchmark evaluation runs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {['approved', 'pending_review', 'rejected'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setReviewStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                          reviewStatus === st
                            ? st === 'approved'
                              ? 'bg-[#174B3A] text-white shadow-xs'
                              : st === 'rejected'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white text-[#78847C] border border-[#E5EAE5] hover:bg-[#E5EAE5]'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1">
                    Reviewer Notes / Ground Truth Criteria Justification
                  </label>
                  <textarea
                    rows={2}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Document RFC reference, edge case justification, or reason for status..."
                    className="w-full text-xs p-3 rounded-lg border border-[#E5EAE5] bg-white focus:outline-hidden focus:border-[#174B3A]"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5EAE5] bg-white flex items-center justify-between">
          <div className="text-xs text-[#78847C]">
            Reviewed by: <span className="font-semibold text-[#202923]">{sample?.reviewed_by_id ? 'Authenticated Reviewer' : 'Unreviewed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E5EAE5] text-xs font-semibold text-[#78847C] hover:bg-[#F7F8F5] transition"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveReview('rejected')}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition"
            >
              Reject Sample
            </button>
            <button
              onClick={() => handleSaveReview('approved')}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#174B3A] hover:bg-[#2F765A] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <Check size={14} />
              {saving ? 'Saving...' : 'Approve as Ground Truth'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

