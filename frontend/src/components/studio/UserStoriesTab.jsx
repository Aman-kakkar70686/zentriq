import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  Filter,
  HelpCircle,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  convertStoryToTask,
  deleteUserStory,
  generateUserStories,
  listUserStories,
  updateUserStory,
} from '../../api/storiesQa';
import UserStoryDetailDrawer from './UserStoryDetailDrawer';
import EditArtifactModal from './EditArtifactModal';

export default function UserStoriesTab({
  projects,
  selectedProject,
  setSelectedProject,
  prds,
  selectedPrd,
  setSelectedPrd,
  toast,
}) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Generation Controls
  const [selectedReqId, setSelectedReqId] = useState('ALL');
  const [splitPreference, setSplitPreference] = useState('balanced');
  const [roleGuidance, setRoleGuidance] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Active Story Drawers / Modals
  const [activeStory, setActiveStory] = useState(null);
  const [editingStory, setEditingStory] = useState(null);

  // Bulk Selection
  const [selectedStoryIds, setSelectedStoryIds] = useState(new Set());

  const fetchStories = async () => {
    if (!selectedProject?.id) return;
    setLoading(true);
    try {
      const data = await listUserStories({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
        review_status: statusFilter !== 'all' ? statusFilter : null,
        priority: priorityFilter !== 'all' ? priorityFilter : null,
        search: search.trim() || null,
      });
      setStories(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch user stories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [selectedProject?.id, selectedPrd?.id, statusFilter, priorityFilter]);

  const handleGenerate = async () => {
    if (!selectedProject?.id || !selectedPrd?.id) {
      if (toast) toast('Please select a project and an approved PRD first');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await generateUserStories({
        project_id: selectedProject.id,
        prd_id: selectedPrd.id,
        requirement_id: selectedReqId === 'ALL' ? null : selectedReqId,
        model_name: selectedModel,
        split_preference: splitPreference,
        user_role_guidance: roleGuidance.trim() || null,
      });

      if (toast) toast(`Generated ${res.count} user stories with ${selectedModel}`);
      await fetchStories();
    } catch (err) {
      setError(err.message || 'Failed to generate user stories');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (storyId, newStatus) => {
    try {
      await updateUserStory(storyId, { review_status: newStatus });
      if (toast) toast(`Story status set to ${newStatus}`);
      await fetchStories();
      if (activeStory?.id === storyId) {
        setActiveStory((prev) => (prev ? { ...prev, review_status: newStatus } : null));
      }
    } catch (err) {
      if (toast) toast(`Error updating status: ${err.message}`);
    }
  };

  const handleDelete = async (storyId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this user story? Linked criteria and test cases will also be removed.')) return;
    try {
      await deleteUserStory(storyId);
      if (toast) toast('Story deleted');
      await fetchStories();
      if (activeStory?.id === storyId) setActiveStory(null);
    } catch (err) {
      if (toast) toast(`Error deleting story: ${err.message}`);
    }
  };

  const handleSaveEdit = async (storyId, payload) => {
    await updateUserStory(storyId, payload);
    if (toast) toast('User story updated');
    await fetchStories();
    if (activeStory?.id === storyId) {
      setActiveStory((prev) => (prev ? { ...prev, ...payload } : null));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedStoryIds.size === 0) return;
    try {
      for (const id of selectedStoryIds) {
        await updateUserStory(id, { review_status: 'approved' });
      }
      if (toast) toast(`Approved ${selectedStoryIds.size} user stories`);
      setSelectedStoryIds(new Set());
      await fetchStories();
    } catch (err) {
      if (toast) toast(`Bulk error: ${err.message}`);
    }
  };

  const toggleSelectStory = (id, e) => {
    e.stopPropagation();
    setSelectedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Requirements available from selected PRD
  const availableReqs = selectedPrd?.content?.functionalRequirements || [];

  const statusBadges = {
    approved: 'bg-ok/10 text-ok border-ok/20',
    pending: 'bg-amber/10 text-amber border-amber/20',
    rejected: 'bg-bad/10 text-bad border-bad/20',
    needs_clarification: 'bg-purple-500/10 text-purple-700 border-purple-200',
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const priorityBadges = {
    P0: 'bg-bad/10 text-bad border-bad/20 font-bold',
    P1: 'bg-amber/10 text-amber border-amber/20 font-medium',
    P2: 'bg-blue-500/10 text-blue-700 border-blue-200',
    P3: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* TWO-COLUMN WORKSPACE: LEFT GENERATOR CONTROLS, RIGHT PREVIEW / OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: CONFIGURATION & GENERATION */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand" />
                User Story Generator
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sage/30 text-brand uppercase">
                Week 3 AI
              </span>
            </div>

            {/* Approved PRD Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">
                Approved PRD Source
              </label>
              <select
                value={selectedPrd?.id || ''}
                onChange={(e) => {
                  const p = prds.find((x) => String(x.id) === e.target.value);
                  setSelectedPrd(p || null);
                }}
                className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink outline-none"
              >
                {prds.map((p) => (
                  <option key={p.id} value={p.id}>
                    PRD #{p.id}: {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Approved Requirement Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">
                Approved Functional Requirement
              </label>
              <select
                value={selectedReqId}
                onChange={(e) => setSelectedReqId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink outline-none"
              >
                <option value="ALL">All Requirements (Bulk Generation)</option>
                {availableReqs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}: {r.title} ({r.priority || 'P1'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink2 mt-1">
                {selectedReqId === 'ALL'
                  ? `Transforms all ${availableReqs.length} requirements in this PRD into focused stories.`
                  : 'Targeting specific single requirement for story decomposition.'}
              </p>
            </div>

            {/* Split Preference & Role Guidance */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">
                  Story Granularity
                </label>
                <select
                  value={splitPreference}
                  onChange={(e) => setSplitPreference(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                >
                  <option value="balanced">Balanced (Recommended)</option>
                  <option value="granular">Granular (2-3 stories per req)</option>
                  <option value="high_level">High-Level (1 story per req)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">
                  Gemini Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">
                Role Guidance / Personas (Optional)
              </label>
              <input
                type="text"
                value={roleGuidance}
                onChange={(e) => setRoleGuidance(e.target.value)}
                placeholder="e.g. mobile shopper, store manager, logistics clerk"
                className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedPrd}
              className="w-full h-10 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-semibold transition inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Decomposing Requirements with Gemini...' : 'Generate User Stories'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED REQUIREMENT CONTEXT & QUALITY RULES */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-line shadow-xs">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">
              Source PRD Requirement Context
            </h3>

            {selectedPrd ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-card2 border border-line text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-ink">{selectedPrd.title}</span>
                    <span className="text-[11px] text-ink2">Version: {selectedPrd.content?.version || '1.0.0'}</span>
                  </div>
                  <p className="text-ink2 line-clamp-2">
                    {selectedPrd.problem_statement || selectedPrd.content?.executiveSummary}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider">
                    PRD Requirements ({availableReqs.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableReqs.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => setSelectedReqId(req.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                          selectedReqId === req.id
                            ? 'bg-sage/20 border-brand text-brand font-medium'
                            : 'bg-card border-line text-ink hover:bg-hov'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{req.id}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-card border border-line">
                            {req.priority || 'P1'}
                          </span>
                        </div>
                        <div className="truncate mt-0.5 text-ink2">{req.title}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Story Generation Rules Indicator */}
                <div className="p-3 rounded-xl bg-sage/10 border border-brand/20 text-[11.5px] text-ink leading-relaxed">
                  <span className="font-semibold text-brand">Quality Rules Active: </span>
                  Splits large requirements into deliverable INVEST stories, avoids duplicate user roles, and flags unclear conditions for PM review.
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink2 py-8 text-center">
                Select an approved PRD to inspect source functional requirements.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-xl bg-card border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-ink2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories by keyword, ID, role..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">All Review Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_clarification">Needs Clarification</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="P0">P0 - Blocker</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - Major</option>
            <option value="P3">P3 - Minor</option>
          </select>
        </div>

        {selectedStoryIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink2">{selectedStoryIds.size} selected</span>
            <button
              onClick={handleBulkApprove}
              className="h-8 px-3 rounded-lg bg-ok text-white text-xs font-medium hover:bg-ok/90 transition shadow-xs"
            >
              Bulk Approve Selected
            </button>
          </div>
        )}
      </div>

      {/* STORY LIST TABLE */}
      <div className="bg-card border border-line rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">User Stories List</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-card2 border border-line text-ink2">
              {stories.length}
            </span>
          </div>
          <button
            onClick={fetchStories}
            className="text-xs text-ink2 hover:text-ink inline-flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-ink2">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand" />
            Loading user stories from database...
          </div>
        ) : stories.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink2 max-w-sm mx-auto">
            <FileCheck2 size={32} className="mx-auto mb-2 text-ink2 opacity-60" />
            <p className="font-semibold text-ink">No user stories found.</p>
            <p className="mt-1 text-ink2">
              Select an approved PRD above and click "Generate User Stories" to transform your requirements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-card2/50 text-ink2 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStoryIds.size === stories.length && stories.length > 0}
                      onChange={() => {
                        if (selectedStoryIds.size === stories.length) setSelectedStoryIds(new Set());
                        else setSelectedStoryIds(new Set(stories.map((s) => s.id)));
                      }}
                      className="rounded border-line"
                    />
                  </th>
                  <th className="py-3 px-4">Story</th>
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Role / Persona</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stories.map((story) => {
                  const isChecked = selectedStoryIds.has(story.id);
                  return (
                    <tr
                      key={story.id}
                      onClick={() => setActiveStory(story)}
                      className="hover:bg-hov cursor-pointer transition group"
                    >
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectStory(story.id, e)}
                          className="rounded border-line"
                        />
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand">{story.story_key}</span>
                          <span className="font-semibold text-ink truncate">{story.title}</span>
                        </div>
                        <p className="text-[11.5px] text-ink2 truncate mt-0.5 italic">
                          "{story.user_story_text}"
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-card border border-line text-ink">
                          {story.requirement_id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-ink font-medium">{story.user_role}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10.5px] px-2 py-0.5 rounded border ${
                            priorityBadges[story.priority] || priorityBadges.P1
                          }`}
                        >
                          {story.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border uppercase ${
                            statusBadges[story.review_status] || statusBadges.pending
                          }`}
                        >
                          {story.review_status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                          {story.review_status !== 'approved' && (
                            <button
                              onClick={() => handleStatusUpdate(story.id, 'approved')}
                              className="p-1.5 rounded-lg text-ok hover:bg-ok/10 transition"
                              title="Approve Story"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingStory(story)}
                            className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-hov transition"
                            title="Edit Story"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(story.id, e)}
                            className="p-1.5 rounded-lg text-ink2 hover:text-bad hover:bg-bad/10 transition"
                            title="Delete Story"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      <UserStoryDetailDrawer
        isOpen={Boolean(activeStory)}
        onClose={() => setActiveStory(null)}
        story={activeStory}
        onUpdateStatus={handleStatusUpdate}
        onEdit={(st) => setEditingStory(st)}
        onRefresh={fetchStories}
        toast={toast}
      />

      {/* EDIT MODAL */}
      <EditArtifactModal
        isOpen={Boolean(editingStory)}
        onClose={() => setEditingStory(null)}
        artifactType="user_story"
        artifact={editingStory}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

