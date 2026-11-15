import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  HelpCircle,
  Layers,
  ListFilter,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  X,
} from 'lucide-react';
import { convertStoryToTask, validateArtifact } from '../../api/storiesQa';

export default function UserStoryDetailDrawer({
  isOpen,
  onClose,
  story,
  onUpdateStatus,
  onEdit,
  onRefresh,
  toast,
}) {
  if (!isOpen || !story) return null;

  const [validating, setValidating] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await validateArtifact({
        artifact_type: 'user_story',
        artifact_id: story.id,
      });
      if (toast) toast('AI Quality Validation complete');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (toast) toast(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleConvertToTask = async () => {
    setConverting(true);
    try {
      const res = await convertStoryToTask(story.id);
      if (toast) toast(`Story converted to Task #${res.task_id}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (toast) toast(`Error: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  const statusColors = {
    approved: 'bg-ok/10 text-ok border-ok/20',
    pending: 'bg-amber/10 text-amber border-amber/20',
    rejected: 'bg-bad/10 text-bad border-bad/20',
    needs_clarification: 'bg-purple-500/10 text-purple-700 border-purple-200',
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const priorityColors = {
    P0: 'bg-bad/10 text-bad border-bad/20 font-bold',
    P1: 'bg-amber/10 text-amber border-amber/20 font-semibold',
    P2: 'bg-blue-500/10 text-blue-700 border-blue-200',
    P3: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const valData = story.validation_results || {};
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
                {story.story_key}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  priorityColors[story.priority] || priorityColors.P1
                }`}
              >
                {story.priority}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                  statusColors[story.review_status] || statusColors.pending
                }`}
              >
                {story.review_status.replace('_', ' ')}
              </span>
              <span className="text-[11px] font-medium text-ink2 bg-card border border-line px-2 py-0.5 rounded">
                Req: {story.requirement_id}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-ink leading-snug">{story.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-hov transition shrink-0 ml-3"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-line bg-card flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {story.review_status !== 'approved' && (
              <button
                onClick={() => onUpdateStatus(story.id, 'approved')}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ok text-white text-xs font-medium hover:bg-ok/90 transition shadow-xs"
              >
                <CheckCircle2 size={13} />
                <span>Approve</span>
              </button>
            )}
            {story.review_status !== 'rejected' && (
              <button
                onClick={() => onUpdateStatus(story.id, 'rejected')}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line text-bad hover:bg-bad/5 text-xs font-medium transition"
              >
                <span>Reject</span>
              </button>
            )}
            {story.review_status !== 'needs_clarification' && (
              <button
                onClick={() => onUpdateStatus(story.id, 'needs_clarification')}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line text-ink2 hover:bg-hov text-xs font-medium transition"
              >
                <HelpCircle size={13} />
                <span>Clarify</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {story.review_status === 'approved' && (
              <button
                onClick={handleConvertToTask}
                disabled={converting || story.is_converted_to_task}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-brand bg-brand/5 hover:bg-brand/10 text-brand text-xs font-semibold transition disabled:opacity-60"
                title={story.is_converted_to_task ? 'Already converted to task' : 'Convert to project task'}
              >
                <PlusCircle size={13} />
                <span>{story.is_converted_to_task ? `Task #${story.task_id}` : converting ? 'Converting...' : 'Convert to Task'}</span>
              </button>
            )}
            <button
              onClick={() => onEdit(story)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line hover:bg-hov text-ink text-xs font-medium transition"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-line hover:bg-hov text-ink2 text-xs transition"
              title="Re-run AI Quality Validation"
            >
              <RefreshCw size={12} className={validating ? 'animate-spin text-brand' : ''} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-ink">
          {/* USER STORY CORE CARD */}
          <div className="p-4 rounded-xl bg-card2 border border-line space-y-3">
            <div className="text-[11px] font-semibold text-brand tracking-wider uppercase">
              USER STORY (INVEST TEMPLATE)
            </div>
            <p className="text-sm text-ink font-medium leading-relaxed bg-card p-3 rounded-lg border border-line/80 italic">
              "{story.user_story_text}"
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-ink2 block font-medium">Actor / Persona:</span>
                <span className="font-semibold text-ink flex items-center gap-1 mt-0.5">
                  <User size={13} className="text-brand" />
                  {story.user_role}
                </span>
              </div>
              <div>
                <span className="text-ink2 block font-medium">Business Value:</span>
                <span className="font-semibold text-ink block mt-0.5">{story.business_value}</span>
              </div>
            </div>
          </div>

          {/* FUNCTIONALITY & BENEFIT BREAKDOWN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-line bg-card">
              <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider block mb-1">
                Functionality (I want)
              </span>
              <p className="text-xs text-ink leading-relaxed">{story.functionality}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-line bg-card">
              <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider block mb-1">
                Business Benefit (So that)
              </span>
              <p className="text-xs text-ink leading-relaxed">{story.business_benefit}</p>
            </div>
          </div>

          {/* SPLIT REASON / CLARIFICATION IF ANY */}
          {story.split_reason && (
            <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-200 text-xs">
              <span className="font-semibold text-blue-800 block mb-1">Split Rationale:</span>
              <p className="text-blue-900 leading-relaxed">{story.split_reason}</p>
            </div>
          )}

          {story.clarification_item && (
            <div className="p-3.5 rounded-xl bg-amber/10 border border-amber/20 text-xs">
              <span className="font-semibold text-amber block mb-1 flex items-center gap-1">
                <AlertTriangle size={13} />
                Flagged Missing Information:
              </span>
              <p className="text-ink leading-relaxed">{story.clarification_item}</p>
            </div>
          )}

          {/* DEPENDENCIES & ASSUMPTIONS */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Technical Assumptions & Dependencies
            </div>
            <div className="space-y-2 text-xs">
              {story.dependencies?.length > 0 ? (
                <div>
                  <span className="text-ink2 font-medium">Dependencies:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-ink">
                    {story.dependencies.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-ink2 italic">No hard dependencies specified.</div>
              )}

              {story.assumptions?.length > 0 && (
                <div className="pt-2">
                  <span className="text-ink2 font-medium">Assumptions:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-ink">
                    {story.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* AI QUALITY VALIDATION RESULTS */}
          <div className="p-4 rounded-xl border border-line bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand" />
                AI Quality Validation
              </span>
              {valData.quality_score && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sage/30 text-brand">
                  Score: {valData.quality_score}/100
                </span>
              )}
            </div>

            {checks.length > 0 ? (
              <div className="space-y-2 pt-1">
                {checks.map((chk, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2
                      size={14}
                      className={chk.passed ? 'text-ok shrink-0 mt-0.5' : 'text-amber shrink-0 mt-0.5'}
                    />
                    <div>
                      <span className="font-semibold text-ink">{chk.rule}: </span>
                      <span className="text-ink2">{chk.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-ink2">Run validation to generate comprehensive automated checks.</div>
            )}

            {valData.semantic_feedback && (
              <div className="p-2.5 rounded-lg bg-card2 text-xs text-ink2 border border-line/60 mt-2">
                <span className="font-medium text-ink">Guidance: </span>
                {valData.semantic_feedback}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

