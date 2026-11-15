import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  deleteQATestCase,
  generateQATestCases,
  getExportCSVUrl,
  listAcceptanceCriteria,
  listQATestCases,
  listUserStories,
  updateQATestCase,
} from '../../api/storiesQa';
import QATestCaseDetailDrawer from './QATestCaseDetailDrawer';
import EditArtifactModal from './EditArtifactModal';

export default function QATestCasesTab({
  selectedProject,
  selectedPrd,
  toast,
}) {
  const [testCases, setTestCases] = useState([]);
  const [stories, setStories] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Generation Controls
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [executionFilter, setExecutionFilter] = useState('all');

  // Drawers & Modals
  const [activeTestCase, setActiveTestCase] = useState(null);
  const [editingTestCase, setEditingTestCase] = useState(null);

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

  const fetchCriteriaForStory = async (storyId) => {
    if (!storyId) return;
    try {
      const critList = await listAcceptanceCriteria({
        project_id: selectedProject?.id,
        story_id: Number(storyId),
      });
      setCriteria(critList);
      setSelectedCriteriaIds(critList.map((c) => c.id));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTestCases = async () => {
    if (!selectedProject?.id) return;
    setLoading(true);
    try {
      const data = await listQATestCases({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || null,
        story_id: selectedStoryId ? Number(selectedStoryId) : null,
        category: categoryFilter !== 'all' ? categoryFilter : null,
        priority: priorityFilter !== 'all' ? priorityFilter : null,
        review_status: reviewFilter !== 'all' ? reviewFilter : null,
        execution_status: executionFilter !== 'all' ? executionFilter : null,
        search: search.trim() || null,
      });
      setTestCases(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch test cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, [selectedProject?.id, selectedPrd?.id]);

  useEffect(() => {
    if (selectedStoryId) {
      fetchCriteriaForStory(selectedStoryId);
    }
  }, [selectedStoryId]);

  useEffect(() => {
    fetchTestCases();
  }, [
    selectedProject?.id,
    selectedPrd?.id,
    selectedStoryId,
    categoryFilter,
    priorityFilter,
    reviewFilter,
    executionFilter,
  ]);

  const handleGenerate = async () => {
    if (!selectedStoryId) {
      if (toast) toast('Please select a user story first');
      return;
    }
    if (criteria.length === 0) {
      if (toast) toast('No acceptance criteria found for this story. Generate criteria first.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await generateQATestCases({
        project_id: selectedProject.id,
        prd_id: selectedPrd?.id || 1,
        story_id: Number(selectedStoryId),
        criteria_ids: selectedCriteriaIds.length > 0 ? selectedCriteriaIds : null,
        model_name: selectedModel,
      });

      if (toast) toast(`Generated ${res.count} reproducible QA test cases`);
      await fetchTestCases();
    } catch (err) {
      setError(err.message || 'Failed to generate test cases');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (testId, newStatus) => {
    try {
      await updateQATestCase(testId, { review_status: newStatus });
      if (toast) toast(`Test case review status: ${newStatus}`);
      await fetchTestCases();
      if (activeTestCase?.id === testId) {
        setActiveTestCase((prev) => (prev ? { ...prev, review_status: newStatus } : null));
      }
    } catch (err) {
      if (toast) toast(`Error updating review status: ${err.message}`);
    }
  };

  const handleExecutionChange = async (testId, execStatus, e) => {
    e.stopPropagation();
    try {
      await updateQATestCase(testId, { execution_status: execStatus });
      if (toast) toast(`Test marked as ${execStatus}`);
      await fetchTestCases();
      if (activeTestCase?.id === testId) {
        setActiveTestCase((prev) => (prev ? { ...prev, execution_status: execStatus } : null));
      }
    } catch (err) {
      if (toast) toast(`Execution update failed: ${err.message}`);
    }
  };

  const handleDelete = async (testId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this QA test case?')) return;
    try {
      await deleteQATestCase(testId);
      if (toast) toast('Test case deleted');
      await fetchTestCases();
      if (activeTestCase?.id === testId) setActiveTestCase(null);
    } catch (err) {
      if (toast) toast(`Error deleting: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    const url = getExportCSVUrl(selectedProject?.id, selectedPrd?.id);
    window.open(url, '_blank');
    if (toast) toast('Downloading verified QA Test Cases CSV');
  };

  // Top Section Statistics
  const totalCount = testCases.length;
  const approvedCount = testCases.filter((t) => t.review_status === 'approved').length;
  const pendingCount = testCases.filter((t) => t.review_status === 'pending').length;
  const passedCount = testCases.filter((t) => t.execution_status === 'passed').length;
  const failedCount = testCases.filter((t) => t.execution_status === 'failed').length;

  const execBadges = {
    passed: 'bg-ok text-white',
    failed: 'bg-bad text-white',
    blocked: 'bg-amber text-white',
    not_run: 'bg-card text-ink2 border border-line',
  };

  const priorityBadges = {
    P0: 'bg-bad/10 text-bad border-bad/20 font-bold',
    P1: 'bg-amber/10 text-amber border-amber/20 font-medium',
    P2: 'bg-blue-500/10 text-blue-700 border-blue-200',
    P3: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* TOP SECTION STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-ink2 uppercase tracking-wide">Total Tests</div>
          <div className="text-2xl font-bold text-ink mt-0.5 tabular-nums">{totalCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-ok uppercase tracking-wide">Approved Tests</div>
          <div className="text-2xl font-bold text-ok mt-0.5 tabular-nums">{approvedCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-amber uppercase tracking-wide">Pending Review</div>
          <div className="text-2xl font-bold text-amber mt-0.5 tabular-nums">{pendingCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-ok/30 bg-ok/5 shadow-xs">
          <div className="text-[11px] font-semibold text-ok uppercase tracking-wide">Passed Runs</div>
          <div className="text-2xl font-bold text-ok mt-0.5 tabular-nums">{passedCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-bad/30 bg-bad/5 shadow-xs">
          <div className="text-[11px] font-semibold text-bad uppercase tracking-wide">Failed Runs</div>
          <div className="text-2xl font-bold text-bad mt-0.5 tabular-nums">{failedCount}</div>
        </div>
      </div>

      {/* GENERATION WORKSPACE PANEL */}
      <div className="p-6 rounded-2xl bg-card border border-line shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand" />
              QA Test Case Automation & Execution Engine
            </h3>
            <p className="text-xs text-ink2 mt-0.5">
              Transform acceptance criteria into actionable test steps, execution logs, and exportable suites.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
            >
              <Download size={13} className="text-brand" />
              <span>Export CSV</span>
            </button>
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

        {/* Story & Criteria Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8">
            <label className="block text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">
              Select User Story ({criteria.length} Criteria Available)
            </label>
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink font-medium outline-none"
            >
              <option value="">-- All Stories / Select Story to Test --</option>
              {stories.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.story_key}] {st.title} ({st.review_status})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedStoryId || criteria.length === 0}
              className="w-full h-9 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-semibold transition inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Deriving Test Cases...' : 'Generate QA Tests'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="p-4 rounded-xl bg-card border border-line shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-ink2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test title, ID, steps..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">All Categories</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="boundary">Boundary</option>
            <option value="validation">Validation</option>
            <option value="error_handling">Error Handling</option>
            <option value="integration">Integration</option>
            <option value="security_permission">Security</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="P0">P0 - Blocker</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - Major</option>
            <option value="P3">P3 - Minor</option>
          </select>

          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">Review Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={executionFilter}
            onChange={(e) => setExecutionFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
          >
            <option value="all">Execution Status</option>
            <option value="not_run">Not Run</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* QA TEST CASES TABLE */}
      <div className="bg-card border border-line rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">Test Management Suite</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-card2 border border-line text-ink2">
              {testCases.length}
            </span>
          </div>
          <button
            onClick={fetchTestCases}
            className="text-xs text-ink2 hover:text-ink inline-flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-ink2">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand" />
            Loading test cases from database...
          </div>
        ) : testCases.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink2 max-w-sm mx-auto">
            <ShieldCheck size={32} className="mx-auto mb-2 text-ink2 opacity-60" />
            <p className="font-semibold text-ink">No test cases generated yet.</p>
            <p className="mt-1 text-ink2">
              Select a story with acceptance criteria and click "Generate QA Tests" to assemble your test suite.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-card2/50 text-ink2 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Test ID</th>
                  <th className="py-3 px-4">Test Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Review</th>
                  <th className="py-3 px-4">Manual Execution</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {testCases.map((tc) => {
                  return (
                    <tr
                      key={tc.id}
                      onClick={() => setActiveTestCase(tc)}
                      className="hover:bg-hov cursor-pointer transition group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand">{tc.test_case_key}</td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-ink">{tc.title}</div>
                        <div className="text-[11px] text-ink2 truncate mt-0.5">
                          {tc.expected_result}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded bg-card2 border border-line text-ink">
                          {tc.category.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            priorityBadges[tc.priority] || priorityBadges.P1
                          }`}
                        >
                          {tc.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                            tc.review_status === 'approved'
                              ? 'bg-ok/10 text-ok border-ok/20'
                              : 'bg-amber/10 text-amber border-amber/20'
                          }`}
                        >
                          {tc.review_status}
                        </span>
                      </td>

                      {/* Manual Execution Pill Buttons */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleExecutionChange(tc.id, 'passed', e)}
                            className={`h-6 px-2 rounded text-[10px] font-semibold transition ${
                              tc.execution_status === 'passed'
                                ? 'bg-ok text-white'
                                : 'bg-card border border-line hover:bg-ok/10 text-ok'
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            onClick={(e) => handleExecutionChange(tc.id, 'failed', e)}
                            className={`h-6 px-2 rounded text-[10px] font-semibold transition ${
                              tc.execution_status === 'failed'
                                ? 'bg-bad text-white'
                                : 'bg-card border border-line hover:bg-bad/10 text-bad'
                            }`}
                          >
                            Fail
                          </button>
                          <button
                            onClick={(e) => handleExecutionChange(tc.id, 'blocked', e)}
                            className={`h-6 px-2 rounded text-[10px] font-semibold transition ${
                              tc.execution_status === 'blocked'
                                ? 'bg-amber text-white'
                                : 'bg-card border border-line hover:bg-amber/10 text-amber'
                            }`}
                          >
                            Block
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
                          {tc.review_status !== 'approved' && (
                            <button
                              onClick={() => handleStatusUpdate(tc.id, 'approved')}
                              className="p-1 rounded text-ok hover:bg-ok/10"
                              title="Approve Test"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingTestCase(tc)}
                            className="p-1 rounded text-ink2 hover:text-ink hover:bg-hov"
                            title="Edit Test Case"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(tc.id, e)}
                            className="p-1 rounded text-ink2 hover:text-bad hover:bg-bad/10"
                            title="Delete Test Case"
                          >
                            <Trash2 size={13} />
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
      <QATestCaseDetailDrawer
        isOpen={Boolean(activeTestCase)}
        onClose={() => setActiveTestCase(null)}
        testCase={activeTestCase}
        onUpdateStatus={handleStatusUpdate}
        onEdit={(tc) => setEditingTestCase(tc)}
        onRefresh={fetchTestCases}
        toast={toast}
      />

      {/* EDIT MODAL */}
      <EditArtifactModal
        isOpen={Boolean(editingTestCase)}
        onClose={() => setEditingTestCase(null)}
        artifactType="qa_test_case"
        artifact={editingTestCase}
        onSave={async (id, payload) => {
          await updateQATestCase(id, payload);
          if (toast) toast('Test case updated');
          await fetchTestCases();
        }}
      />
    </div>
  );
}

