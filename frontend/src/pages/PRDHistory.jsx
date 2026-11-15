import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  History,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { convertPRDToTasks, deletePRD, listPRDs, prdToMarkdown } from '../api/ai';
import { useApp } from '../context/AppContext';
import CommandPalette from '../components/CommandPalette';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';
import PRDViewer from '../components/ai/PRDViewer';

export default function PRDHistory() {
  const { data, toast, navigateToCopilot, reload: reloadGlobal } = useApp();
  const [prds, setPrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedPrd, setSelectedPrd] = useState(null);
  const [convertingId, setConvertingId] = useState(null);

  const fetchPrds = async () => {
    setLoading(true);
    try {
      const projId = selectedProjectId === 'all' ? null : Number(selectedProjectId);
      const list = await listPRDs(projId);
      setPrds(list);
    } catch (e) {
      toast('Failed to load PRD history: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrds();
  }, [selectedProjectId]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the PRD "${title}"?`)) return;
    try {
      await deletePRD(id);
      setPrds((prev) => prev.filter((p) => p.id !== id));
      if (selectedPrd?.id === id) setSelectedPrd(null);
      toast('PRD deleted.');
    } catch (e) {
      toast('Failed to delete PRD: ' + e.message);
    }
  };

  const handleConvertToTasks = async (prdItem) => {
    setConvertingId(prdItem.id);
    try {
      const res = await convertPRDToTasks(prdItem.id);
      toast(res.message || 'Tasks created in project!');
      await reloadGlobal();
    } catch (e) {
      toast('Failed to convert to tasks: ' + e.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleCopyMarkdown = (prdItem) => {
    const md = prdToMarkdown(prdItem.content, {
      projectName: prdItem.project_name,
      featureName: prdItem.feature_name || prdItem.title,
      modelName: prdItem.model_name,
    });
    navigator.clipboard.writeText(md);
    toast('PRD Markdown copied to clipboard!');
  };

  // Filtered PRD items
  const filteredPrds = prds.filter((p) => {
    const matchSearch =
      !searchQuery.trim() ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.feature_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.problem_statement?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-56">
        <TopBar />
        <main className="max-w-[1300px] px-4 lg:px-10 pt-7 pb-24">
          {/* Header Title & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-mute">AI WORKSPACE</span>
                <span className="text-mute">/</span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-brand flex items-center gap-1">
                  <History size={12} /> PRD HISTORY
                </span>
              </div>
              <h1 className="text-[28px] font-semibold text-ink tracking-tight">PRD History & Artifacts</h1>
              <p className="text-[14.5px] text-ink2 mt-0.5">
                Audit, view, export, and convert past AI-generated Product Requirements Documents into active team tasks.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={fetchPrds}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition shadow-xs"
                title="Refresh PRD list"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-brand' : 'text-ink2'} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToCopilot()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition shadow-xs"
                title="Open AI Copilot to generate a new PRD"
              >
                <Sparkles size={14} />
                <span>New PRD Analysis</span>
              </button>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
            <div className="p-4 rounded-2xl bg-card border border-line">
              <span className="text-xs font-semibold text-mute block mb-1">Total PRDs Generated</span>
              <span className="text-2xl font-bold text-ink">{prds.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line">
              <span className="text-xs font-semibold text-mute block mb-1">Projects Documented</span>
              <span className="text-2xl font-bold text-brand">
                {new Set(prds.map((p) => p.project_id)).size}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line">
              <span className="text-xs font-semibold text-mute block mb-1">Primary Engine</span>
              <span className="text-sm font-bold text-ink mt-1 block">Gemini 2.5 Flash</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line">
              <span className="text-xs font-semibold text-mute block mb-1">Ready for Review</span>
              <span className="text-2xl font-bold text-ok">
                {prds.filter((p) => p.status === 'completed').length}
              </span>
            </div>
          </div>

          {/* Search & Project Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PRD by title, feature name, or problem..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-line bg-card text-xs text-ink placeholder:text-mute focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={15} className="text-mute shrink-0" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-10 px-3 rounded-xl border border-line bg-card text-xs font-medium text-ink focus:outline-hidden focus:border-brand"
              >
                <option value="all">All Projects</option>
                {data?.projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PRD Cards List */}
          {loading ? (
            <div className="py-20 text-center text-ink2 text-sm bg-card border border-line rounded-2xl">
              <RefreshCw size={24} className="mx-auto text-brand animate-spin mb-3" />
              <p>Loading PRD History…</p>
            </div>
          ) : filteredPrds.length === 0 ? (
            <div className="p-12 text-center bg-card border border-line rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand mx-auto grid place-items-center">
                <FileText size={24} />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-semibold text-ink">No PRDs Found</h3>
                <p className="text-xs text-ink2 mt-1">
                  {searchQuery
                    ? 'No PRDs matched your search query. Try clearing your filter.'
                    : 'You have not generated any PRDs yet. Enter a product problem statement in AI Copilot to generate your first document.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateToCopilot()}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition shadow-xs"
              >
                <Sparkles size={14} />
                <span>Open AI PM Copilot</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPrds.map((prdItem) => {
                const content = prdItem.content || {};
                const reqCount = content.functionalRequirements?.length || 0;
                const storyCount = content.userStories?.length || 0;

                return (
                  <div
                    key={prdItem.id}
                    className="p-5 rounded-2xl bg-card border border-line hover:border-brand/40 transition shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
                          {prdItem.project_name || 'Project'}
                        </span>
                        <span className="text-[11px] font-mono text-mute bg-canvas px-2 py-0.5 rounded border border-line">
                          {prdItem.model_name || 'gemini-2.5-flash'}
                        </span>
                        <span className="text-[11px] text-ink2 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(prdItem.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPrd(prdItem)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition"
                          title="View complete PRD"
                        >
                          <Eye size={13} className="text-brand" />
                          <span>View PRD</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConvertToTasks(prdItem)}
                          disabled={convertingId === prdItem.id}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition disabled:opacity-50"
                          title="Convert requirements to project tasks"
                        >
                          <PlusCircle size={13} className="text-brand" />
                          <span>{convertingId === prdItem.id ? 'Converting…' : 'Tasks'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyMarkdown(prdItem)}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-line bg-card hover:bg-hov text-ink2 hover:text-ink text-xs font-medium transition"
                          title="Copy Markdown"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(prdItem.id, prdItem.title)}
                          className="h-8 px-2 rounded-lg text-ink2 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete PRD"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-ink hover:text-brand transition cursor-pointer" onClick={() => setSelectedPrd(prdItem)}>
                        {prdItem.title || prdItem.feature_name}
                      </h3>
                      <p className="text-xs text-ink2 mt-1 line-clamp-2 leading-relaxed">
                        {prdItem.problem_statement}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink2 pt-2 border-t border-line/60">
                      <div className="flex items-center gap-3">
                        <span><b className="text-ink font-semibold">{reqCount}</b> Functional Specs</span>
                        <span>•</span>
                        <span><b className="text-ink font-semibold">{storyCount}</b> User Stories</span>
                        {prdItem.tokens_used > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-mute">{prdItem.tokens_used.toLocaleString()} tokens</span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateToCopilot(prdItem)}
                        className="text-brand font-semibold hover:underline inline-flex items-center gap-1 text-xs"
                      >
                        <span>Open in Copilot</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full PRD Detail Modal View */}
          {selectedPrd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-canvas border border-line rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-y-auto flex flex-col">
                <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-line bg-card/95 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand">PRD INSPECTOR</span>
                    <span className="text-mute">/</span>
                    <h3 className="text-sm font-bold text-ink truncate max-w-md">{selectedPrd.title}</h3>
                  </div>

                  <button
                    onClick={() => setSelectedPrd(null)}
                    className="p-1.5 rounded-xl text-ink2 hover:bg-hov hover:text-ink transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6">
                  <PRDViewer
                    prd={selectedPrd.content}
                    metadata={{
                      projectName: selectedPrd.project_name,
                      featureName: selectedPrd.feature_name || selectedPrd.title,
                      modelName: selectedPrd.model_name,
                      tokensUsed: selectedPrd.tokens_used,
                      latencyMs: selectedPrd.generation_time_ms,
                    }}
                    onConvertToTasks={() => handleConvertToTasks(selectedPrd)}
                    isSaved={true}
                    toast={toast}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <QuickCreate />
      <Drawer />
      <CommandPalette />
      <Toast />
    </div>
  );
}
