import { useState, useEffect, useMemo } from 'react';
import {
  Folder, Users, Calendar, Clock, CheckCircle2, AlertCircle, Sparkles,
  ArrowLeft, Search, Plus, ExternalLink, FileText, Download, Edit3, Check,
  X, ChevronRight, ChevronLeft, Mail, Layers, ShieldCheck, ArrowUpRight, BarChart2,
  AlertTriangle, RefreshCw, Send, BookOpen, GitBranch
} from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useApp } from '../context/AppContext';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import QuickCreate from '../components/QuickCreate';
import Drawer from '../components/Drawer';
import CommandPalette from '../components/CommandPalette';
import TreeRoadmap from '../components/roadmap/TreeRoadmap';
import HorizontalSprintRoadmap from '../components/roadmap/HorizontalSprintRoadmap';
import { Btn, Dot } from '../components/ui';
import { fmtDate, timeAgo } from '../lib/format';

export default function ProjectWorkspace() {
  const {
    data, reload, selectedProjectId, setSelectedProjectId,
    projectWorkspaceTab, setProjectWorkspaceTab,
    sidebarCollapsed, setSidebarCollapsed, toggleSidebar,
    setCreateType, openEmailComposer, toast
  } = useApp();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState(projectWorkspaceTab || 'roadmap'); // 'roadmap' | 'sprints' | 'docs' | 'team' | 'settings'
  const [docSubTab, setDocSubTab] = useState('proposal'); // 'proposal' | 'srs' | 'prds'
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'on_track' | 'at_risk' | 'shipped'

  // Edit Docs State
  const [editingDoc, setEditingDoc] = useState(false);
  const [docDraft, setDocDraft] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  // Assign Member State
  const [allUsers, setAllUsers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('Developer');
  const [assigning, setAssigning] = useState(false);

  // Edit Project Settings State
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active', start_date: '', end_date: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch all projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single project detailed view (isSilent preserves scroll position & prevents unmounting)
  const fetchProjectDetail = async (id, isSilent = false) => {
    if (!isSilent) setDetailLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      setSelectedProject(res.data);
      setEditForm({
        name: res.data.name || '',
        description: res.data.description || '',
        status: res.data.status || 'active',
        start_date: res.data.start_date || '',
        end_date: res.data.end_date || '',
      });
    } catch (err) {
      console.error('Error fetching project detail:', err);
      if (toast) toast('Could not load project details');
    } finally {
      if (!isSilent) setDetailLoading(false);
    }
  };

  // Fetch users for member assignment
  useEffect(() => {
    api.get('/users').then((r) => setAllUsers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  // When selectedProjectId in context changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetail(selectedProjectId);
    } else {
      setSelectedProject(null);
    }
  }, [selectedProjectId]);

  // Sync activeTab with projectWorkspaceTab from context
  useEffect(() => {
    if (projectWorkspaceTab) {
      setActiveTab(projectWorkspaceTab);
    }
  }, [projectWorkspaceTab]);

  // Handle doc subtab sync
  useEffect(() => {
    if (selectedProject) {
      if (docSubTab === 'proposal') {
        setDocDraft(selectedProject.proposal_doc || '');
      } else if (docSubTab === 'srs') {
        setDocDraft(selectedProject.srs_doc || '');
      }
      setEditingDoc(false);
    }
  }, [docSubTab, selectedProject]);

  // Save Proposal or SRS doc
  const handleSaveDoc = async () => {
    if (!selectedProject) return;
    setSavingDoc(true);
    try {
      const payload = {};
      if (docSubTab === 'proposal') payload.proposal_doc = docDraft;
      if (docSubTab === 'srs') payload.srs_doc = docDraft;

      const res = await api.patch(`/projects/${selectedProject.id}`, payload);
      setSelectedProject(res.data);
      setEditingDoc(false);
      if (toast) toast(`${docSubTab.toUpperCase()} updated successfully!`);
      await fetchProjects();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setSavingDoc(false);
    }
  };

  // Assign member to project
  const handleAssignMember = async (e) => {
    e?.preventDefault();
    if (!assignUserId || !selectedProject) return;
    setAssigning(true);
    try {
      const res = await api.post(`/projects/${selectedProject.id}/members`, {
        user_id: Number(assignUserId),
        role: assignRole,
      });
      setSelectedProject(res.data);
      setAssignUserId('');
      if (toast) toast('Team member assigned to project!');
      await fetchProjects();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setAssigning(false);
    }
  };

  // Remove member from project
  const handleRemoveMember = async (userId, memberName) => {
    if (!selectedProject || !window.confirm(`Remove ${memberName} from this project?`)) return;
    try {
      const res = await api.delete(`/projects/${selectedProject.id}/members/${userId}`);
      setSelectedProject(res.data);
      if (toast) toast(`${memberName} removed from project`);
      await fetchProjects();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  // Update Project Settings
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!selectedProject) return;
    setSavingSettings(true);
    try {
      const res = await api.patch(`/projects/${selectedProject.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      });
      setSelectedProject(res.data);
      if (toast) toast('Project details updated successfully!');
      await fetchProjects();
      await reload();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setSavingSettings(false);
    }
  };

  // Move task to next stage
  const handleAdvanceTask = async (taskId, currentStage) => {
    const STAGES = ['ideas', 'planned', 'building', 'review', 'ready', 'shipped'];
    const nextStage = STAGES[STAGES.indexOf(currentStage) + 1];
    if (!nextStage) return;
    try {
      await api.post(`/tasks/${taskId}/advance`);
      if (toast) toast(`Task moved to ${nextStage}!`);
      await fetchProjectDetail(selectedProject.id);
      await fetchProjects();
      await reload();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.members || []).some((m) => (m?.name || m || '').toString().toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'active') return p.status === 'active';
      if (statusFilter === 'shipped') return p.status === 'shipped' || p.progress === 100;
      if (statusFilter === 'at_risk') return p.status === 'at_risk' || (p.end_date && new Date(p.end_date) < new Date() && p.progress < 100);
      if (statusFilter === 'on_track') return p.status !== 'at_risk' && p.status !== 'shipped';

      return true;
    });
  }, [projects, search, statusFilter]);

  // Overall workspace stats
  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks || 0), 0);
  const totalShipped = projects.reduce((acc, p) => acc + (p.shipped_tasks || 0), 0);
  const allAssignedUserIds = new Set();
  projects.forEach((p) => (p.members || []).forEach((m) => allAssignedUserIds.add(m.id)));

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${(activeTab === 'roadmap' && sidebarCollapsed) ? 'lg:pl-0' : 'lg:pl-60'}`}>
        <TopBar />
        
        <main className={`flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full mx-auto animate-in fade-in duration-150 ${activeTab === 'roadmap' ? 'max-w-none' : 'max-w-7xl'}`}>
          
          {/* ============================================================== */}
          {/* VIEW A: PROJECT DIRECTORY (ALL PROJECTS LIST)                  */}
          {/* ============================================================== */}
          {!selectedProjectId ? (
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand grid place-items-center">
                      <Folder size={18} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-ink">Project Workspace</h1>
                  </div>
                  <p className="text-xs text-ink2 mt-1">
                    Manage project portfolios, proposals, SRS technical specs, sprints, and team allocations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Btn
                    variant="primary"
                    onClick={() => setCreateType('project')}
                    className="flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={14} />
                    <span>New Project</span>
                  </Btn>
                </div>
              </div>

              {/* High-Level Portfolio Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
                  <span className="text-[11px] font-semibold tracking-wider text-mute uppercase">PORTFOLIO</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-ink">{projects.length}</span>
                    <span className="text-xs text-ink2">Active Projects</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
                  <span className="text-[11px] font-semibold tracking-wider text-mute uppercase">SPRINTS & TASKS</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-ink">{totalTasks}</span>
                    <span className="text-xs text-ok font-medium">{totalShipped} shipped</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
                  <span className="text-[11px] font-semibold tracking-wider text-mute uppercase">TEAM DEPLOYED</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-ink">{allAssignedUserIds.size}</span>
                    <span className="text-xs text-ink2">Members Assigned</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-line bg-card shadow-xs">
                  <span className="text-[11px] font-semibold tracking-wider text-mute uppercase">OVERALL COMPLETION</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-brand">
                      {totalTasks > 0 ? Math.round((totalShipped / totalTasks) * 100) : 0}%
                    </span>
                    <span className="text-xs text-ink2">Target Velocity</span>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-card border border-line rounded-xl">
                {/* Search */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects by name, description, or assigned employees..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none"
                  />
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    ['all', 'All'],
                    ['active', 'Active'],
                    ['on_track', 'On Track'],
                    ['at_risk', 'At Risk'],
                    ['shipped', 'Shipped'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setStatusFilter(val)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                        statusFilter === val
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-ink2 hover:text-ink hover:bg-hov'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Projects Grid / List */}
              {loading ? (
                <div className="p-12 text-center text-xs text-ink2">Loading projects portfolio...</div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-12 border border-dashed border-line rounded-2xl bg-card text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-card2 border border-line grid place-items-center mx-auto text-mute">
                    <Folder size={22} />
                  </div>
                  <h3 className="text-sm font-semibold text-ink">No projects found</h3>
                  <p className="text-xs text-ink2 max-w-sm mx-auto">
                    {search || statusFilter !== 'all'
                      ? 'No projects match your current search or filter criteria.'
                      : 'You have no projects created yet. Click "New Project" to start tracking.'}
                  </p>
                  <Btn variant="primary" onClick={() => setCreateType('project')} className="text-xs mx-auto">
                    <Plus size={13} className="mr-1 inline" /> Create Project
                  </Btn>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProjects.map((p) => {
                    const isOverdue = p.end_date && new Date(p.end_date) < new Date() && p.progress < 100;
                    const isShipped = p.progress === 100 || p.status === 'shipped';
                    const statusLabel = isShipped ? 'Shipped' : isOverdue ? 'At Risk' : 'On Track';
                    const statusColor = isShipped
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : isOverdue
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className="group bg-card border border-line hover:border-brand/40 hover:shadow-md rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header: Title & Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-base text-ink group-hover:text-brand transition leading-snug line-clamp-1">
                              {p.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>

                          <p className="text-xs text-ink2 mt-2 line-clamp-2 leading-relaxed">
                            {p.description || 'No description provided for this project.'}
                          </p>

                          {/* Progress Bar */}
                          <div className="mt-4 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-ink2 font-medium">Sprint Completion</span>
                              <span className="font-semibold text-ink">{p.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-card2 border border-line/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isShipped ? 'bg-blue-600' : isOverdue ? 'bg-amber-500' : 'bg-brand'
                                }`}
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Documentation Indicators */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line/60 text-[11px] flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                                p.has_roadmap
                                  ? 'bg-[#DCE9DF]/50 border-[#174B3A]/20 text-[#174B3A]'
                                  : 'bg-card2 border-line text-mute'
                              }`}
                            >
                              <GitBranch size={11} />
                              <span>Tree Roadmap</span>
                              {p.has_roadmap && <Check size={10} className="text-brand font-bold" />}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                                p.has_proposal
                                  ? 'bg-[#DCE9DF]/50 border-[#174B3A]/20 text-[#174B3A]'
                                  : 'bg-card2 border-line text-mute'
                              }`}
                            >
                              <FileText size={11} />
                              <span>Proposal</span>
                              {p.has_proposal && <Check size={10} className="text-brand font-bold" />}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                                p.has_srs
                                  ? 'bg-[#DCE9DF]/50 border-[#174B3A]/20 text-[#174B3A]'
                                  : 'bg-card2 border-line text-mute'
                              }`}
                            >
                              <BookOpen size={11} />
                              <span>SRS Spec</span>
                              {p.has_srs && <Check size={10} className="text-brand font-bold" />}
                            </span>

                            <span className="ml-auto text-[11px] text-ink2 font-mono">
                              {p.tasks} tasks
                            </span>
                          </div>

                          {/* Assigned Employees */}
                          <div className="mt-3.5 space-y-1.5">
                            <span className="text-[10.5px] font-semibold text-mute uppercase tracking-wider block">
                              ASSIGNED TEAM ({p.members?.length || 0})
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {p.members && p.members.length > 0 ? (
                                p.members.slice(0, 4).map((m) => (
                                  <span
                                    key={m.id}
                                    title={`${m.name} (${m.role})`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card2 border border-line text-[11.5px] font-medium text-ink"
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full bg-brand/10 text-brand text-[9px] font-bold grid place-items-center">
                                      {m.name?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                    <span>{m.name.split(' ')[0]}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-mute">No members assigned</span>
                              )}
                              {p.members?.length > 4 && (
                                <span className="text-[11px] text-mute font-medium">
                                  +{p.members.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Timeline Deadline & Open Action */}
                        <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-ink2">
                            <Calendar size={12} className="text-mute shrink-0" />
                            <span>{p.end_date ? `Due ${fmtDate(p.end_date)}` : 'No deadline'}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectId(p.id);
                                if (setProjectWorkspaceTab) setProjectWorkspaceTab('roadmap');
                                setActiveTab('roadmap');
                              }}
                              className="text-xs font-semibold text-brand hover:text-emerald-700 inline-flex items-center gap-1 transition"
                            >
                              <GitBranch size={13} />
                              <span>Roadmap</span>
                            </button>
                            <span className="text-brand font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>Open</span>
                              <ChevronRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (detailLoading || !selectedProject || selectedProject.id !== selectedProjectId) ? (
            /* DETAIL LOADING SPINNER */
            <div className="py-24 text-center space-y-3 bg-card border border-line rounded-2xl p-8">
              <RefreshCw size={28} className="animate-spin text-brand mx-auto" />
              <h4 className="text-sm font-bold text-ink">Loading Project Workspace & Tree Roadmap...</h4>
              <p className="text-xs text-mute">Synchronizing custom branches, deliverables, and team assignments.</p>
            </div>
          ) : (
            /* ============================================================== */
            /* VIEW B: PROJECT DETAIL WORKSPACE (FOR SELECTED PROJECT)       */
            /* ============================================================== */
            <div className="space-y-6">
              
              {/* Back Breadcrumb Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink2 hover:text-brand transition"
                  >
                    <ArrowLeft size={14} />
                    <span>← Back to All Projects</span>
                  </button>

                  {/* Toggle Sidebar Full Screen Button (Only inside Roadmap) */}
                  {activeTab === 'roadmap' && (
                    <button
                      type="button"
                      onClick={toggleSidebar}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line bg-card hover:bg-card2 text-ink2 hover:text-ink transition shadow-xs"
                      title={sidebarCollapsed ? "Show sidebar options" : "Hide sidebar for wide screen"}
                    >
                      {sidebarCollapsed ? <ChevronRight size={14} className="text-brand" /> : <ChevronLeft size={14} />}
                      <span>{sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar (Full Canvas)'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Btn
                    variant="primary"
                    onClick={() => setCreateType('task')}
                    className="text-xs"
                  >
                    <Plus size={12} className="mr-1 inline" /> New Task
                  </Btn>
                </div>
              </div>

              {/* Ultra-compact Project Header Bar */}
              <div className="bg-card border border-line rounded-xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                    <Folder size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold tracking-tight text-ink truncate">{selectedProject.name}</h2>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold border bg-brand/10 border-brand/20 text-brand shrink-0">
                        {selectedProject.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-mute truncate max-w-md hidden sm:block">
                      {selectedProject.description || 'Project deliverables & timeline'}
                    </p>
                  </div>
                </div>

                {/* Compact Right Metadata & Progress */}
                <div className="flex items-center gap-4 text-xs shrink-0 self-end md:self-auto">
                  {selectedProject.end_date && (
                    <div className="hidden sm:flex items-center gap-1 text-ink2">
                      <Calendar size={12} className="text-mute" />
                      <span>Due {fmtDate(selectedProject.end_date)}</span>
                    </div>
                  )}

                  <div className="hidden md:flex items-center gap-1 text-ink2">
                    <Users size={12} className="text-mute" />
                    <span>{selectedProject.members?.length || 0} Members</span>
                  </div>

                  <div className="flex items-center gap-2 pl-3 border-l border-line">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-mute block leading-none">PROGRESS</span>
                      <span className="text-xs font-extrabold text-brand">{selectedProject.progress}%</span>
                    </div>
                    <div className="w-14 h-1.5 bg-card2 border border-line/60 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${selectedProject.progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-line pb-px overflow-x-auto">
                {[
                  ['roadmap', 'Custom Tree Roadmap', GitBranch],
                  ['sprints', 'Sprints & Tasks', Layers],
                  ['docs', 'Project Documents (Proposal & SRS)', FileText],
                  ['team', 'Assigned Team Members', Users],
                  ['settings', 'Project Settings', Edit3],
                ].map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key);
                      if (setProjectWorkspaceTab) setProjectWorkspaceTab(key);
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap ${
                      activeTab === key
                        ? 'border-brand text-brand bg-card'
                        : 'border-transparent text-ink2 hover:text-ink hover:bg-card2/60'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 0: ROADMAP (ORGANIC TREE - IMAGE 3 STYLE) */}
              {activeTab === 'roadmap' && (
                <TreeRoadmap
                  project={selectedProject}
                  onUpdateProject={(updated) => setSelectedProject(updated)}
                  onRefreshProject={() => fetchProjectDetail(selectedProject.id, true)}
                />
              )}

              {/* TAB 1: SPRINTS & TASKS (HORIZONTAL DRAG & DROP PIPELINE) */}
              {activeTab === 'sprints' && (
                <HorizontalSprintRoadmap
                  project={selectedProject}
                  onRefreshProject={() => fetchProjectDetail(selectedProject.id, true)}
                />
              )}

              {/* TAB 2: PROJECT DOCUMENTS & SPECS (PROPOSAL, SRS, PRDS) */}
              {activeTab === 'docs' && (
                <div className="space-y-4">
                  {/* Doc Subtabs */}
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDocSubTab('proposal')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          docSubTab === 'proposal'
                            ? 'bg-brand text-white shadow-xs'
                            : 'bg-card2 text-ink2 hover:text-ink'
                        }`}
                      >
                        Executive Proposal
                      </button>
                      <button
                        onClick={() => setDocSubTab('srs')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          docSubTab === 'srs'
                            ? 'bg-brand text-white shadow-xs'
                            : 'bg-card2 text-ink2 hover:text-ink'
                        }`}
                      >
                        Software Requirements Specification (SRS)
                      </button>
                      <button
                        onClick={() => setDocSubTab('prds')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          docSubTab === 'prds'
                            ? 'bg-brand text-white shadow-xs'
                            : 'bg-card2 text-ink2 hover:text-ink'
                        }`}
                      >
                        Linked AI PRDs ({selectedProject.linked_prds?.length || 0})
                      </button>
                    </div>

                    {docSubTab !== 'prds' && (
                      <div className="flex items-center gap-2">
                        {editingDoc ? (
                          <>
                            <Btn
                              variant="primary"
                              disabled={savingDoc}
                              onClick={handleSaveDoc}
                              className="text-xs flex items-center gap-1"
                            >
                              <Check size={13} />
                              <span>{savingDoc ? 'Saving...' : 'Save Document'}</span>
                            </Btn>
                            <Btn
                              disabled={savingDoc}
                              onClick={() => setEditingDoc(false)}
                              className="text-xs"
                            >
                              Cancel
                            </Btn>
                          </>
                        ) : (
                          <Btn
                            onClick={() => setEditingDoc(true)}
                            className="text-xs flex items-center gap-1.5"
                          >
                            <Edit3 size={12} />
                            <span>Edit {docSubTab.toUpperCase()}</span>
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Document Content View / Editor */}
                  {docSubTab !== 'prds' ? (
                    <div className="bg-card border border-line rounded-2xl p-6 shadow-xs">
                      {editingDoc ? (
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-ink">
                            Editing {docSubTab === 'proposal' ? 'Project Proposal' : 'Software Requirements Specification (SRS)'} (Markdown Supported)
                          </label>
                          <textarea
                            value={docDraft}
                            onChange={(e) => setDocDraft(e.target.value)}
                            rows={20}
                            className="w-full font-mono text-xs p-4 bg-card2 border border-line rounded-xl focus:border-brand focus:outline-none leading-relaxed"
                            placeholder="Write your document content in Markdown..."
                          />
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-ink leading-relaxed">
                          <pre className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] bg-transparent border-0 p-0 text-ink leading-relaxed">
                            {docSubTab === 'proposal'
                              ? selectedProject.proposal_doc || 'No proposal document drafted yet. Click "Edit PROPOSAL" above to add the executive summary and scope.'
                              : selectedProject.srs_doc || 'No Software Requirements Specification (SRS) created yet. Click "Edit SRS" above to add technical specs.'}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Linked PRDs Subtab */
                    <div className="bg-card border border-line rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-ink">AI Copilot PRDs for this Project</h4>
                          <p className="text-xs text-ink2 mt-0.5">Product Requirement Documents linked to {selectedProject.name}</p>
                        </div>
                      </div>

                      {selectedProject.linked_prds?.length === 0 ? (
                        <div className="p-8 border border-dashed border-line rounded-xl text-center text-xs text-ink2 space-y-2">
                          <p>No PRDs specifically tagged to this project yet.</p>
                          <p className="text-[11px] text-mute">You can generate new PRDs via AI PM Copilot in the sidebar anytime.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedProject.linked_prds.map((prd) => (
                            <div key={prd.id} className="p-4 rounded-xl border border-line bg-card2 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-semibold text-sm text-ink">{prd.title}</h5>
                                <span className="text-[11px] text-mute">{timeAgo(prd.created_at)}</span>
                              </div>
                              <p className="text-xs text-ink2 line-clamp-2">{prd.problem_statement}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASSIGNED TEAM MEMBERS */}
              {activeTab === 'team' && (
                <div className="space-y-6">
                  {/* Assign Member Bar */}
                  <div className="bg-card border border-line rounded-xl p-4 shadow-xs">
                    <form onSubmit={handleAssignMember} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-mute uppercase mb-1">Select Team Member</label>
                        <select
                          value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}
                          className="w-full text-xs p-2 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none"
                          required
                        >
                          <option value="">Choose an employee...</option>
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.email} ({u.role || u.designation})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-56">
                        <label className="block text-[11px] font-semibold text-mute uppercase mb-1">Project Role</label>
                        <select
                          value={assignRole}
                          onChange={(e) => setAssignRole(e.target.value)}
                          className="w-full text-xs p-2 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none"
                        >
                          <option value="Product Manager">Product Manager</option>
                          <option value="Lead Developer">Lead Developer</option>
                          <option value="Software Engineer">Software Engineer</option>
                          <option value="Frontend Engineer">Frontend Engineer</option>
                          <option value="QA Engineer">QA Engineer</option>
                          <option value="Designer">Designer</option>
                        </select>
                      </div>

                      <div className="sm:self-end">
                        <Btn type="submit" variant="primary" disabled={assigning || !assignUserId} className="text-xs w-full">
                          {assigning ? 'Assigning...' : '+ Assign to Project'}
                        </Btn>
                      </div>
                    </form>
                  </div>

                  {/* Team Members Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProject.members?.map((m) => (
                      <div key={m.id} className="p-4 rounded-xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-bold text-sm grid place-items-center">
                              {m.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-ink leading-tight">{m.name}</h4>
                              <p className="text-xs text-brand font-medium mt-0.5">{m.role}</p>
                              <p className="text-[11px] text-ink2">{m.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              openEmailComposer({
                                to: [m.email],
                                subject: `Update on Project: ${selectedProject.name}`,
                                message: `Hi ${m.name.split(' ')[0]},\n\nRegarding our ongoing work on ${selectedProject.name}:\n\n`,
                                projectId: selectedProject.id,
                                contextTitle: `Project: ${selectedProject.name}`,
                                emailType: 'direct',
                              });
                            }}
                            className="inline-flex items-center gap-1 text-ink2 hover:text-brand font-medium"
                          >
                            <Mail size={12} className="text-brand" />
                            <span>Send Email</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, m.name)}
                            className="text-mute hover:text-red-500 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: PROJECT SETTINGS & DATES */}
              {activeTab === 'settings' && (
                <div className="max-w-xl bg-card border border-line rounded-2xl p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold text-ink">Project Details & Milestone Dates</h3>
                  <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-ink font-medium mb-1">Project Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full p-2.5 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-ink font-medium mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                        className="w-full p-2.5 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-ink font-medium mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editForm.start_date}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                          className="w-full p-2.5 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-ink font-medium mb-1">Target Deadline</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                          className="w-full p-2.5 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-ink font-medium mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full p-2.5 bg-card2 border border-line rounded-lg focus:border-brand focus:outline-none text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="on_track">On Track</option>
                        <option value="at_risk">At Risk</option>
                        <option value="shipped">Shipped</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <Btn type="submit" variant="primary" disabled={savingSettings} className="text-xs">
                        {savingSettings ? 'Saving...' : 'Save Changes'}
                      </Btn>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      <QuickCreate />
      <Drawer />
      <CommandPalette />
    </div>
  );
}

