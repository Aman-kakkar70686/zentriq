import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Filter,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteEdgeCase,
  generateEdgeCases,
  listEdgeCases,
  listUserStories,
  updateEdgeCase,
} from '../../api/storiesQa';
import EditArtifactModal from './EditArtifactModal';

export default function EdgeCasesTab({
  selectedProject,
  selectedPrd,
  toast,
}) {
  const [edgeCases, setEdgeCases] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Generation Selection
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Filter Tabs
  const [categoryTab, setCategoryTab] = useState('ALL'); // 'ALL' | 'Critical' | 'High' | 'Medium' | 'Low' | 'needs_clarification'
  const [search, setSearch] = useState('');
  const [editingCase, setEditingCase] = useState(null);
  const [activeCase, setActiveCase] = useState(null);

  const fetchDependencies = async () => {
    if (!selectedProject?.id) return;
    try {
      const storyList = await listUserStories({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
      });
      setStories(storyList);
      if (storyList.length > 0 && !selectedStoryId) {
        setSelectedStoryId(String(storyList[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEdgeCases = async () => {
    if (!selectedProject?.id) return;
    setLoading(true);
    try {
      const data = await listEdgeCases({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
        story_id: selectedStoryId ? Number(selectedStoryId) : null,
        severity: ['Critical', 'High', 'Medium', 'Low'].includes(categoryTab) ? categoryTab : null,
        review_status: categoryTab === 'needs_clarification' ? 'needs_clarification' : null,
        search: search.trim() || null,
      });
      setEdgeCases(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch edge cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, [selectedProject?.id, selectedPrd?.id]);

  useEffect(() => {
    fetchEdgeCases();
  }, [selectedProject?.id, selectedPrd?.id, selectedStoryId, categoryTab]);

  const handleGenerate = async () => {
    if (!selectedStoryId) {
      if (toast) toast('Please select a user story first');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await generateEdgeCases({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || 1,
        story_id: Number(selectedStoryId),
        model_name: selectedModel,
      });

      if (toast) toast(`Identified ${res.count} edge cases and failure modes`);
      await fetchEdgeCases();
    } catch (err) {
      setError(err.message || 'Failed to generate edge cases');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (caseId, newStatus) => {
    try {
      await updateEdgeCase(caseId, { review_status: newStatus });
      if (toast) toast(`Edge case status updated to ${newStatus}`);
      await fetchEdgeCases();
      if (activeCase?.id === caseId) {
        setActiveCase((prev) => (prev ? { ...prev, review_status: newStatus } : null));
      }
    } catch (err) {
      if (toast) toast(`Error updating edge case: ${err.message}`);
    }
  };

  const handleDelete = async (caseId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this edge case?')) return;
    try {
      await deleteEdgeCase(caseId);
      if (toast) toast('Edge case deleted');
      await fetchEdgeCases();
      if (activeCase?.id === caseId) setActiveCase(null);
    } catch (err) {
      if (toast) toast(`Error: ${err.message}`);
    }
  };

  const severityBadges = {
    Critical: 'bg-bad/10 text-bad border-bad/20 font-bold',
    High: 'bg-amber/10 text-amber border-amber/20 font-semibold',
    Medium: 'bg-blue-500/10 text-blue-700 border-blue-200',
    Low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const currentStory = stories.find((s) => String(s.id) === String(selectedStoryId));

  return (
    <div className="space-y-6">
      {/* GENERATOR WORKSPACE */}
      <div className="p-6 rounded-2xl bg-card border border-line shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <ShieldAlert size={16} className="text-brand" />
              Edge Case & Failure Mode Intelligence
            </h3>
            <p className="text-xs text-ink2 mt-0.5">
              Identify boundary values, duplicate submissions, and API degradation before implementation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-line bg-card text-xs text-ink outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
          </div>
        </div>

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
              <option value="">-- All Stories / Select Story to Analyze --</option>
              {stories.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.story_key}] {st.title} ({st.priority})
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
              <span>{generating ? 'Surfacing Failure Scenarios...' : 'Generate Edge Cases'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CATEGORY & SEVERITY FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-line pb-1">
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {[
            ['ALL', 'All Edge Cases'],
            ['Critical', 'Critical'],
            ['High', 'High Severity'],
            ['Medium', 'Medium'],
            ['Low', 'Low'],
            ['needs_clarification', 'Needs Clarification'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategoryTab(key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                categoryTab === key
                  ? 'bg-brand text-white font-semibold shadow-xs'
                  : 'text-ink2 hover:text-ink hover:bg-hov'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-ink2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search edge cases..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
          />
        </div>
      </div>

      {/* EDGE CASES CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-ink2 bg-card rounded-2xl border border-line">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand" />
            Loading edge cases...
          </div>
        ) : edgeCases.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-ink2 bg-card rounded-2xl border border-line">
            <ShieldAlert size={32} className="mx-auto mb-2 text-ink2 opacity-60" />
            <p className="font-semibold text-ink">No edge cases found for this category.</p>
            <p className="mt-1 text-ink2">
              Select a user story and click "Generate Edge Cases" to test for unexpected scenarios.
            </p>
          </div>
        ) : (
          edgeCases.map((ec) => (
            <div
              key={ec.id}
              onClick={() => setActiveCase(ec)}
              className="p-4 rounded-xl bg-card border border-line hover:border-brand/40 hover:bg-hov cursor-pointer transition shadow-xs flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand">{ec.edge_case_key}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border ${
                      severityBadges[ec.severity] || severityBadges.Medium
                    }`}
                  >
                    {ec.severity}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-ink2 uppercase tracking-wide">
                  {ec.category.replace('_', ' ')}
                </div>

                <h4 className="text-xs font-semibold text-ink leading-snug line-clamp-2">
                  {ec.scenario}
                </h4>

                <div className="p-2.5 rounded-lg bg-card2 border border-line/60 text-xs">
                  <span className="text-[10px] font-bold text-ink2 uppercase block mb-0.5">
                    Trigger Condition:
                  </span>
                  <p className="text-ink text-[11.5px] line-clamp-2">{ec.trigger_condition}</p>
                </div>

                <div className="text-[11.5px] text-ink2 line-clamp-2">
                  <span className="font-medium text-ink">Expected: </span>
                  {ec.expected_behaviour}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-line/60 flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-ink2">Req: {ec.requirement_id}</span>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCase(ec);
                    }}
                    className="p-1 rounded text-ink2 hover:text-ink hover:bg-card transition"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(ec.id, e)}
                    className="p-1 rounded text-ink2 hover:text-bad hover:bg-bad/10 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL / PANEL */}
      {activeCase && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onMouseDown={(e) => e.target === e.currentTarget && setActiveCase(null)}
        >
          <div className="bg-card border border-line rounded-2xl shadow-xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="px-6 py-4.5 border-b border-line flex items-start justify-between bg-card2/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-brand">{activeCase.edge_case_key}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${severityBadges[activeCase.severity]}`}>
                    {activeCase.severity}
                  </span>
                  <span className="text-[11px] text-ink2 capitalize">{activeCase.category.replace('_', ' ')}</span>
                </div>
                <h3 className="text-base font-semibold text-ink">{activeCase.scenario}</h3>
              </div>
              <button onClick={() => setActiveCase(null)} className="p-1.5 rounded-lg text-ink2 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-ink uppercase tracking-wider text-[11px] block mb-1">
                  Trigger Condition
                </span>
                <p className="p-3 rounded-xl bg-card2 border border-line text-ink leading-relaxed font-mono">
                  {activeCase.trigger_condition}
                </p>
              </div>

              <div>
                <span className="font-semibold text-ink uppercase tracking-wider text-[11px] block mb-1">
                  Expected System Behaviour
                </span>
                <p className="p-3 rounded-xl bg-ok/5 border border-ok/20 text-ink leading-relaxed">
                  {activeCase.expected_behaviour}
                </p>
              </div>

              {activeCase.clarification_required && (
                <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-xs">
                  <span className="font-semibold text-amber block mb-0.5">PM Clarification Required:</span>
                  <p className="text-ink">{activeCase.clarification_required}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-line text-ink2">
                <span>Linked Requirement: {activeCase.requirement_id}</span>
                <span>Story ID: #{activeCase.story_id}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleStatusUpdate(activeCase.id, 'approved')}
                  className="h-8 px-3 rounded-lg bg-ok text-white font-medium hover:bg-ok/90 transition"
                >
                  Approve Edge Case
                </button>
                <button
                  onClick={() => {
                    setEditingCase(activeCase);
                    setActiveCase(null);
                  }}
                  className="h-8 px-3 rounded-lg border border-line hover:bg-hov text-ink font-medium transition"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <EditArtifactModal
        isOpen={Boolean(editingCase)}
        onClose={() => setEditingCase(null)}
        artifactType="edge_case"
        artifact={editingCase}
        onSave={async (id, payload) => {
          await updateEdgeCase(id, payload);
          if (toast) toast('Edge case updated');
          await fetchEdgeCases();
        }}
      />
    </div>
  );
}

