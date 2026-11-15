import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Filter,
  HelpCircle,
  ListChecks,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  bulkReviewCriteria,
  deleteAcceptanceCriterion,
  generateAcceptanceCriteria,
  listAcceptanceCriteria,
  listUserStories,
  updateAcceptanceCriterion,
} from '../../api/storiesQa';
import EditArtifactModal from './EditArtifactModal';

export default function AcceptanceCriteriaTab({
  selectedProject,
  selectedPrd,
  toast,
}) {
  const [criteria, setCriteria] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Generation Controls
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [criteriaDepth, setCriteriaDepth] = useState('standard');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState(new Set());
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingCriterion, setEditingCriterion] = useState(null);

  const fetchDependencies = async () => {
    if (!selectedProject?.id) return;
    try {
      const storyList = await listUserStories({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
      });
      setStories(storyList);
      if (storyList.length > 0 && !selectedStoryId) {
        // Prefer first approved story
        const appStory = storyList.find((s) => s.review_status === 'approved') || storyList[0];
        setSelectedStoryId(String(appStory.id));
      }
    } catch (err) {
      console.error('Failed to fetch stories for criteria', err);
    }
  };

  const fetchCriteria = async () => {
    if (!selectedProject?.id) return;
    setLoading(true);
    try {
      const data = await listAcceptanceCriteria({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
        story_id: selectedStoryId ? Number(selectedStoryId) : null,
        review_status: statusFilter !== 'all' ? statusFilter : null,
        search: search.trim() || null,
      });
      setCriteria(data);
      // Auto-expand all by default
      setExpandedIds(new Set(data.map((c) => c.id)));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch acceptance criteria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, [selectedProject?.id, selectedPrd?.id]);

  useEffect(() => {
    fetchCriteria();
  }, [selectedProject?.id, selectedPrd?.id, selectedStoryId, statusFilter]);

  const handleGenerate = async () => {
    if (!selectedStoryId) {
      if (toast) toast('Please select a user story to generate criteria for');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await generateAcceptanceCriteria({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || 1,
        story_id: Number(selectedStoryId),
        model_name: selectedModel,
        criteria_depth: criteriaDepth,
      });

      if (toast) toast(`Generated ${res.count} criteria using Given / When / Then`);
      await fetchCriteria();
    } catch (err) {
      setError(err.message || 'Failed to generate acceptance criteria');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (critId, newStatus) => {
    try {
      await updateAcceptanceCriterion(critId, { review_status: newStatus });
      if (toast) toast(`Criterion marked as ${newStatus}`);
      await fetchCriteria();
    } catch (err) {
      if (toast) toast(`Error updating: ${err.message}`);
    }
  };

  const handleDelete = async (critId) => {
    if (!window.confirm('Delete this acceptance criterion?')) return;
    try {
      await deleteAcceptanceCriterion(critId);
      if (toast) toast('Criterion removed');
      await fetchCriteria();
    } catch (err) {
      if (toast) toast(`Error: ${err.message}`);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCriteriaIds.size === 0) return;
    try {
      await bulkReviewCriteria({
        criteria_ids: Array.from(selectedCriteriaIds),
        review_status: 'approved',
        review_notes: 'Bulk approved via Acceptance Criteria Studio',
      });
      if (toast) toast(`Bulk approved ${selectedCriteriaIds.size} criteria`);
      setSelectedCriteriaIds(new Set());
      await fetchCriteria();
    } catch (err) {
      if (toast) toast(`Bulk review error: ${err.message}`);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentSelectedStory = stories.find((s) => String(s.id) === String(selectedStoryId));

  const statusBadges = {
    approved: 'bg-ok/10 text-ok border-ok/20',
    pending: 'bg-amber/10 text-amber border-amber/20',
    rejected: 'bg-bad/10 text-bad border-bad/20',
    needs_clarification: 'bg-purple-500/10 text-purple-700 border-purple-200',
  };

  return (
    <div className="space-y-6">
      {/* GENERATOR WORKSPACE PANEL */}
      <div className="p-6 rounded-2xl bg-card border border-line shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <ListChecks size={16} className="text-brand" />
              Acceptance Criteria Studio (Given / When / Then)
            </h3>
            <p className="text-xs text-ink2 mt-0.5">
              Transform approved user stories into testable, unambiguous acceptance scenarios.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
            <select
              value={criteriaDepth}
              onChange={(e) => setCriteriaDepth(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
            >
              <option value="standard">Standard Scenarios</option>
              <option value="exhaustive">Exhaustive & Permissions</option>
              <option value="boundary_focused">Boundary & Limits</option>
            </select>
          </div>
        </div>

        {/* Story Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8">
            <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">
              Select User Story
            </label>
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink font-medium outline-none"
            >
              <option value="">-- All Stories / Select a Story to Generate --</option>
              {stories.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.story_key}] {st.title} ({st.review_status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedStoryId}
              className="w-full h-9 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-semibold transition inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Generating Criteria...' : 'Generate Criteria'}</span>
            </button>
          </div>
        </div>

        {/* Selected Story Context Banner */}
        {currentSelectedStory && (
          <div className="mt-4 p-3.5 rounded-xl bg-card2 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-brand font-mono mr-2">
                {currentSelectedStory.story_key}
              </span>
              <span className="text-ink font-medium">{currentSelectedStory.user_story_text}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-card text-ink2">
                Req: {currentSelectedStory.requirement_id}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                  statusBadges[currentSelectedStory.review_status] || statusBadges.pending
                }`}
              >
                {currentSelectedStory.review_status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FILTER & BULK ACTIONS */}
      <div className="p-4 rounded-xl bg-card border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-ink2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search criteria, Given, When, Then..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_clarification">Needs Clarification</option>
          </select>
        </div>

        {selectedCriteriaIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink2">{selectedCriteriaIds.size} criteria selected</span>
            <button
              onClick={handleBulkApprove}
              className="h-8 px-3 rounded-lg bg-ok text-white text-xs font-medium hover:bg-ok/90 transition shadow-xs"
            >
              Bulk Approve
            </button>
          </div>
        )}
      </div>

      {/* CRITERIA EXPANDABLE CARDS LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-xs text-ink2 bg-card rounded-2xl border border-line">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand" />
            Loading acceptance criteria...
          </div>
        ) : criteria.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink2 bg-card rounded-2xl border border-line max-w-md mx-auto">
            <ListChecks size={32} className="mx-auto mb-2 text-ink2 opacity-60" />
            <p className="font-semibold text-ink">No acceptance criteria generated yet.</p>
            <p className="mt-1 text-ink2">
              Select a user story and click "Generate Criteria" to create Given / When / Then scenarios.
            </p>
          </div>
        ) : (
          criteria.map((crit) => {
            const isExpanded = expandedIds.has(crit.id);
            const isSelected = selectedCriteriaIds.has(crit.id);

            return (
              <div
                key={crit.id}
                className="bg-card border border-line rounded-xl shadow-xs overflow-hidden transition hover:border-brand/30"
              >
                {/* Criterion Card Header */}
                <div
                  onClick={() => toggleExpand(crit.id)}
                  className="px-5 py-3.5 bg-card hover:bg-hov cursor-pointer flex items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        setSelectedCriteriaIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(crit.id)) next.delete(crit.id);
                          else next.add(crit.id);
                          return next;
                        });
                      }}
                      className="rounded border-line"
                    />
                    <ChevronRight
                      size={15}
                      className={`text-ink2 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    <span className="font-mono text-xs font-bold text-brand">{crit.criteria_key}</span>
                    <span className="text-xs font-semibold text-ink">{crit.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-card2 border border-line text-ink2 capitalize">
                      {crit.scenario_type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border uppercase ${
                        statusBadges[crit.review_status] || statusBadges.pending
                      }`}
                    >
                      {crit.review_status}
                    </span>
                    <span className="text-[11px] font-mono text-ink2">Req: {crit.requirement_id}</span>
                  </div>
                </div>

                {/* Expanded GIVEN / WHEN / THEN Block */}
                {isExpanded && (
                  <div className="px-5 py-4 border-t border-line bg-card2/30 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-card border border-line">
                        <span className="font-bold text-brand uppercase text-[10px] tracking-wider block mb-1">
                          GIVEN (Precondition)
                        </span>
                        <p className="text-ink leading-relaxed">{crit.given_text}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-card border border-line">
                        <span className="font-bold text-brand uppercase text-[10px] tracking-wider block mb-1">
                          WHEN (Trigger / Action)
                        </span>
                        <p className="text-ink leading-relaxed">{crit.when_text}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-card border border-line">
                        <span className="font-bold text-ok uppercase text-[10px] tracking-wider block mb-1">
                          THEN (Expected Outcome)
                        </span>
                        <p className="text-ink leading-relaxed font-medium">{crit.then_text}</p>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-2 flex items-center justify-between border-t border-line/60">
                      <div className="flex items-center gap-1.5">
                        {crit.review_status !== 'approved' && (
                          <button
                            onClick={() => handleStatusUpdate(crit.id, 'approved')}
                            className="h-7 px-2.5 rounded-lg bg-ok text-white text-[11px] font-medium hover:bg-ok/90 transition inline-flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            <span>Approve</span>
                          </button>
                        )}
                        {crit.review_status !== 'rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(crit.id, 'rejected')}
                            className="h-7 px-2.5 rounded-lg border border-line text-bad hover:bg-bad/5 text-[11px] font-medium transition"
                          >
                            <span>Reject</span>
                          </button>
                        )}
                        {crit.review_status !== 'needs_clarification' && (
                          <button
                            onClick={() => handleStatusUpdate(crit.id, 'needs_clarification')}
                            className="h-7 px-2.5 rounded-lg border border-line text-ink2 hover:bg-hov text-[11px] font-medium transition"
                          >
                            <span>Needs Clarification</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingCriterion(crit)}
                          className="h-7 px-2.5 rounded-lg border border-line hover:bg-hov text-ink text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(crit.id)}
                          className="h-7 px-2.5 rounded-lg border border-line hover:bg-bad/10 text-bad text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* EDIT MODAL */}
      <EditArtifactModal
        isOpen={Boolean(editingCriterion)}
        onClose={() => setEditingCriterion(null)}
        artifactType="acceptance_criteria"
        artifact={editingCriterion}
        onSave={async (id, payload) => {
          await updateAcceptanceCriterion(id, payload);
          if (toast) toast('Acceptance criterion updated');
          await fetchCriteria();
        }}
      />
    </div>
  );
}

