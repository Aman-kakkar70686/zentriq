import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  XCircle,
} from 'lucide-react';
import { listBenchmarkDatasets, listBenchmarkSamples, createBenchmarkSample } from '../../api/evaluation';
import GroundTruthReviewModal from './GroundTruthReviewModal';

export default function BenchmarkLabTab({ selectedProject }) {
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [complexityFilter, setComplexityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal
  const [reviewingSampleId, setReviewingSampleId] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Create Sample Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Authentication');
  const [newComplexity, setNewComplexity] = useState('Medium');
  const [newSource, setNewSource] = useState('RFC / Industry Standard');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, [selectedProject]);

  useEffect(() => {
    if (activeDataset) {
      loadSamples();
    }
  }, [activeDataset, categoryFilter, complexityFilter, statusFilter]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const list = await listBenchmarkDatasets({ project_id: selectedProject?.id });
      setDatasets(list);
      if (list.length > 0) {
        setActiveDataset(list[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load benchmark datasets.');
    } finally {
      setLoading(false);
    }
  };

  const loadSamples = async () => {
    if (!activeDataset) return;
    try {
      setLoading(true);
      const list = await listBenchmarkSamples({
        dataset_id: activeDataset.id,
        category: categoryFilter !== 'all' ? categoryFilter : null,
        complexity: complexityFilter !== 'all' ? complexityFilter : null,
        review_status: statusFilter !== 'all' ? statusFilter : null,
        search: searchQuery.trim() || null,
      });
      setSamples(list);
    } catch (err) {
      setError(err.message || 'Failed to load benchmark samples.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadSamples();
  };

  const handleCreateSample = async (e) => {
    e.preventDefault();
    if (!newKey || !newName || !newDesc || !activeDataset) return;

    try {
      setCreating(true);
      setError('');
      await createBenchmarkSample({
        dataset_id: activeDataset.id,
        project_id: selectedProject?.id || activeDataset.project_id,
        sample_key: newKey.trim(),
        name: newName.trim(),
        requirement_description: newDesc.trim(),
        category: newCategory.trim(),
        complexity: newComplexity,
        reference_source: newSource.trim(),
      });
      setCreateModalOpen(false);
      setNewKey('');
      setNewName('');
      setNewDesc('');
      await loadSamples();
    } catch (err) {
      setError(err.message || 'Failed to create benchmark sample.');
    } finally {
      setCreating(false);
    }
  };

  const handleExportJSON = () => {
    if (!samples.length) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(samples, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `zentriq-benchmark-suite-${activeDataset?.version || 'v1.0'}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const categories = [
    'all',
    'Authentication & Security',
    'Payments & Transactions',
    'Analytics & UX',
    'Checkout & Compliance',
    'Administration & Audit',
    'File Management & Security',
    'Authorization & Governance',
    'Notifications & Communications',
    'Integrations & Sync',
    'Collaboration & Concurrency',
  ];

  return (
    <div className="space-y-6">
      {/* Dataset Header Card */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#DCE9DF] text-[#174B3A] uppercase tracking-wider">
              {activeDataset?.version || 'v1.0'}
            </span>
            <span className="text-xs text-[#78847C] font-semibold">
              Default Golden Dataset
            </span>
          </div>
          <h2 className="text-base font-bold text-[#202923]">
            {activeDataset?.name || 'Zentriq Core PM & QA Benchmark Suite'}
          </h2>
          <p className="text-xs text-[#78847C] max-w-2xl mt-0.5">
            {activeDataset?.description ||
              '10 gold-standard ground truth benchmark scenarios across authentication, financial sagas, ambiguous specs, conflicting rules, and real-time concurrency.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl border border-[#E5EAE5] hover:bg-[#F7F8F5] text-[#202923] text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#174B3A] hover:bg-[#2F765A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus size={14} />
            Add Benchmark Sample
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78847C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sample key, requirement text or title..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#E5EAE5] text-xs bg-[#F7F8F5] focus:outline-hidden focus:border-[#174B3A]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] text-[#202923] font-medium"
          >
            <option value="all">All Categories</option>
            {categories.slice(1).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Complexity Filter */}
          <select
            value={complexityFilter}
            onChange={(e) => setComplexityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] text-[#202923] font-medium"
          >
            <option value="all">All Complexities</option>
            <option value="Simple">Simple</option>
            <option value="Medium">Medium</option>
            <option value="Complex">Complex</option>
          </select>

          {/* Review Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] text-[#202923] font-medium"
          >
            <option value="all">All Review Statuses</option>
            <option value="approved">Approved (Ground Truth Ready)</option>
            <option value="pending_review">Pending Human Review</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={loadSamples}
            className="p-2 rounded-lg border border-[#E5EAE5] text-[#78847C] hover:text-[#202923] hover:bg-[#F7F8F5] transition"
            title="Refresh list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-white rounded-xl border border-[#E5EAE5] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8F5] text-[#78847C] border-b border-[#E5EAE5]">
                <th className="py-3 px-4 font-semibold w-24">Sample ID</th>
                <th className="py-3 px-4 font-semibold">Requirement Specification</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-center">Complexity</th>
                <th className="py-3 px-4 font-semibold text-center">Review Status</th>
                <th className="py-3 px-4 font-semibold text-center">Ground Truth</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAE5]">
              {loading && samples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78847C]">
                    Loading benchmark samples...
                  </td>
                </tr>
              ) : samples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78847C]">
                    No benchmark samples match your filters.
                  </td>
                </tr>
              ) : (
                samples.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7F8F5]/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#174B3A]">
                      {s.sample_key}
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-semibold text-[#202923] mb-0.5">{s.name}</p>
                      <p className="text-[11px] text-[#78847C] line-clamp-2">
                        {s.requirement_description}
                      </p>
                      {s.reference_source && (
                        <span className="inline-block mt-1 text-[10px] text-[#2F765A] font-medium bg-[#DCE9DF]/50 px-1.5 py-0.5 rounded">
                          RFC: {s.reference_source}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#78847C] whitespace-nowrap">
                      {s.category}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        s.complexity === 'Simple'
                          ? 'bg-blue-50 text-blue-700'
                          : s.complexity === 'Medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {s.complexity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        s.review_status === 'approved'
                          ? 'bg-[#DCE9DF] text-[#174B3A]'
                          : s.review_status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {s.review_status === 'approved' && <CheckCircle2 size={12} />}
                        {s.review_status === 'pending_review' && <Clock size={12} />}
                        {s.review_status === 'rejected' && <XCircle size={12} />}
                        {s.review_status === 'approved' ? 'Approved' : s.review_status === 'rejected' ? 'Rejected' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-[#202923]">
                        {s.expected_outputs_count || 0} artifacts
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setReviewingSampleId(s.id);
                          setReviewModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#F7F8F5] hover:bg-[#DCE9DF] text-[#174B3A] text-xs font-bold border border-[#E5EAE5] transition"
                      >
                        Review Ground Truth
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ground Truth Review Modal */}
      {reviewModalOpen && (
        <GroundTruthReviewModal
          sampleId={reviewingSampleId}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          onReviewed={loadSamples}
        />
      )}

      {/* New Sample Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-[#E5EAE5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE5]">
              <h3 className="text-sm font-bold text-[#202923]">Add Benchmark Requirement Sample</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-[#78847C] hover:text-[#202923]">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSample} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202923] mb-1">Sample Key</label>
                  <input
                    type="text"
                    required
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="e.g. BENCH-011"
                    className="w-full p-2.5 rounded-lg border border-[#E5EAE5] font-mono focus:outline-hidden focus:border-[#174B3A]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#202923] mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Payments & Billing"
                    className="w-full p-2.5 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202923] mb-1">Sample Title</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Webhook Delivery with Exponential Backoff"
                  className="w-full p-2.5 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202923] mb-1">Complexity</label>
                  <select
                    value={newComplexity}
                    onChange={(e) => setNewComplexity(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#E5EAE5] bg-white focus:outline-hidden focus:border-[#174B3A]"
                  >
                    <option value="Simple">Simple</option>
                    <option value="Medium">Medium</option>
                    <option value="Complex">Complex</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#202923] mb-1">Reference Source / RFC</label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="e.g. Stripe Webhook Spec"
                    className="w-full p-2.5 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202923] mb-1">Requirement Specification</label>
                <textarea
                  rows={4}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed functional requirement text to evaluate against Gemini..."
                  className="w-full p-2.5 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAE5]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5EAE5] text-xs font-semibold text-[#78847C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-[#174B3A] text-white text-xs font-bold hover:bg-[#2F765A] transition"
                >
                  {creating ? 'Saving...' : 'Save Benchmark Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

