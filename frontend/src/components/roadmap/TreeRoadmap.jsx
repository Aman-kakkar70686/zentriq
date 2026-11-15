import { useState, useEffect, useMemo, useRef } from 'react';
import {
  GitBranch, GitFork, Plus, Edit3, Trash2, CheckCircle2, Clock,
  AlertCircle, AlertTriangle, ChevronRight, ChevronDown, Sparkles,
  Save, RefreshCw, ZoomIn, ZoomOut, Maximize2, Search, Filter,
  Calendar, User, Check, X, Shield, ArrowRight, CornerDownRight,
  Layers, ListTree, SlidersHorizontal
} from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { Btn, Dot } from '../ui';

// Status badge styling helper
const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-500/20'
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500 text-white',
    ring: 'ring-blue-500/20'
  },
  planned: {
    label: 'Planned',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-white',
    ring: 'ring-amber-500/20'
  },
  blocked: {
    label: 'Blocked',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500 text-white',
    ring: 'ring-rose-500/20'
  }
};

const PRIORITY_CONFIG = {
  high: { label: 'High Priority', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  low: { label: 'Low', color: 'text-slate-600 bg-slate-50 border-slate-200' }
};

// Recursive helper to traverse and mutate tree
function traverseTree(nodes, callback) {
  if (!nodes || !Array.isArray(nodes)) return;
  nodes.forEach(node => {
    callback(node);
    if (node.children && node.children.length > 0) {
      traverseTree(node.children, callback);
    }
  });
}

function findAndMutate(nodes, targetId, mutateFn) {
  if (!nodes || !Array.isArray(nodes)) return false;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      mutateFn(nodes, i);
      return true;
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      const found = findAndMutate(nodes[i].children, targetId, mutateFn);
      if (found) return true;
    }
  }
  return false;
}

export default function TreeRoadmap({ project, onUpdateProject }) {
  const { toast } = useApp();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'outline'
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Modal State for Adding or Editing Branch
  const [modalState, setModalState] = useState({
    open: false,
    mode: 'add', // 'add' | 'edit'
    parentId: null,
    node: null
  });

  const [form, setForm] = useState({
    title: '',
    type: 'feature', // 'phase' | 'feature' | 'subtask'
    status: 'planned', // 'planned' | 'in_progress' | 'completed' | 'blocked'
    quarter: '',
    assignee: '',
    priority: 'medium',
    notes: ''
  });

  // Load tree roadmap from project prop or fetch
  useEffect(() => {
    if (project?.roadmap_tree) {
      const parsed = typeof project.roadmap_tree === 'string'
        ? JSON.parse(project.roadmap_tree)
        : project.roadmap_tree;
      setTreeData(parsed);
      // Auto-expand all top-level and 2nd level nodes
      const initialExpanded = new Set();
      parsed.branches?.forEach(b => {
        initialExpanded.add(b.id);
        b.children?.forEach(c => initialExpanded.add(c.id));
      });
      setExpandedNodes(initialExpanded);
      setIsDirty(false);
    } else {
      // Default empty structure
      setTreeData({
        root_title: `${project?.name || 'Project'} Roadmap Tree`,
        vision: project?.description || 'Custom milestone tree roadmap',
        updated_at: new Date().toISOString().split('T')[0],
        branches: []
      });
      setIsDirty(false);
    }
  }, [project?.id, project?.roadmap_tree]);

  // Compute Tree Stats
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let planned = 0;
    let blocked = 0;

    if (treeData?.branches) {
      traverseTree(treeData.branches, (node) => {
        total++;
        if (node.status === 'completed') completed++;
        else if (node.status === 'in_progress') inProgress++;
        else if (node.status === 'blocked') blocked++;
        else planned++;
      });
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, planned, blocked, pct };
  }, [treeData]);

  // Expand / Collapse toggles
  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set();
    if (treeData?.branches) {
      traverseTree(treeData.branches, node => all.add(node.id));
    }
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Open Modal to Add child branch or edit branch
  const handleOpenAddModal = (parentId = 'root', defaultType = 'feature') => {
    setForm({
      title: '',
      type: parentId === 'root' ? 'phase' : defaultType,
      status: 'planned',
      quarter: parentId === 'root' ? 'Q1 2026' : 'Sprint 1',
      assignee: project?.members?.[0]?.name || '',
      priority: 'high',
      notes: ''
    });
    setModalState({
      open: true,
      mode: 'add',
      parentId,
      node: null
    });
  };

  const handleOpenEditModal = (node) => {
    setForm({
      title: node.title || '',
      type: node.type || 'feature',
      status: node.status || 'planned',
      quarter: node.quarter || '',
      assignee: node.assignee || '',
      priority: node.priority || 'medium',
      notes: node.notes || ''
    });
    setModalState({
      open: true,
      mode: 'edit',
      parentId: null,
      node
    });
  };

  // Save Modal Form (Add or Edit Node)
  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      if (toast) toast('Please enter a feature/branch title');
      return;
    }

    setTreeData(prev => {
      const cloned = JSON.parse(JSON.stringify(prev || { branches: [] }));
      if (!cloned.branches) cloned.branches = [];

      if (modalState.mode === 'add') {
        const newNodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newNode = {
          id: newNodeId,
          title: form.title.trim(),
          type: form.type,
          status: form.status,
          quarter: form.quarter.trim(),
          assignee: form.assignee.trim(),
          priority: form.priority,
          notes: form.notes.trim(),
          children: []
        };

        if (modalState.parentId === 'root') {
          cloned.branches.push(newNode);
        } else {
          findAndMutate(cloned.branches, modalState.parentId, (parentArray, index) => {
            const parent = parentArray[index];
            if (!parent.children) parent.children = [];
            parent.children.push(newNode);
          });
          // Ensure parent is expanded
          setExpandedNodes(exp => new Set([...exp, modalState.parentId, newNodeId]));
        }
      } else if (modalState.mode === 'edit' && modalState.node) {
        findAndMutate(cloned.branches, modalState.node.id, (arr, idx) => {
          arr[idx] = {
            ...arr[idx],
            title: form.title.trim(),
            type: form.type,
            status: form.status,
            quarter: form.quarter.trim(),
            assignee: form.assignee.trim(),
            priority: form.priority,
            notes: form.notes.trim()
          };
        });
      }

      setIsDirty(true);
      return cloned;
    });

    setModalState({ open: false, mode: 'add', parentId: null, node: null });
    if (toast) toast(modalState.mode === 'add' ? 'New branch attached!' : 'Branch details updated!');
  };

  // Quick Cycle Status
  const handleCycleStatus = (nodeId, e) => {
    e?.stopPropagation();
    const cycle = {
      planned: 'in_progress',
      in_progress: 'completed',
      completed: 'planned',
      blocked: 'in_progress'
    };

    setTreeData(prev => {
      const cloned = JSON.parse(JSON.stringify(prev));
      findAndMutate(cloned.branches, nodeId, (arr, idx) => {
        const current = arr[idx].status || 'planned';
        arr[idx].status = cycle[current] || 'planned';
      });
      setIsDirty(true);
      return cloned;
    });
  };

  // Delete Branch
  const handleDeleteNode = (nodeId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to prune this branch and its sub-features?')) {
      return;
    }

    setTreeData(prev => {
      const cloned = JSON.parse(JSON.stringify(prev));
      findAndMutate(cloned.branches, nodeId, (arr, idx) => {
        arr.splice(idx, 1);
      });
      setIsDirty(true);
      return cloned;
    });

    if (toast) toast('Branch pruned from roadmap tree');
  };

  // Persist tree to backend
  const handleSaveToBackend = async () => {
    if (!project?.id) return;
    setSaving(true);
    try {
      const payload = {
        roadmap_tree: treeData
      };
      const res = await api.put(`/projects/${project.id}/roadmap`, payload);
      setIsDirty(false);
      if (onUpdateProject) {
        onUpdateProject({ ...project, roadmap_tree: res.data.roadmap_tree });
      }
      if (toast) toast('Tree roadmap saved successfully to database!');
    } catch (err) {
      console.error('Error saving roadmap tree:', err);
      if (toast) toast(`Failed to save roadmap: ${errMsg(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Preset Template / AI Generator
  const handleLoadTemplate = () => {
    if (treeData?.branches?.length > 0 && !window.confirm('Replace current roadmap with an auto-generated agile tree?')) {
      return;
    }

    const template = {
      root_title: `${project?.name || 'Project'} Tree Roadmap`,
      vision: project?.description || 'Custom milestone tree roadmap',
      updated_at: new Date().toISOString().split('T')[0],
      branches: [
        {
          id: `b-ph1-${Date.now()}`,
          title: 'Phase 1: Architecture & Core Foundation',
          type: 'phase',
          status: 'completed',
          quarter: 'Q1 2026',
          assignee: project?.members?.[0]?.name || 'Tech Lead',
          priority: 'high',
          notes: 'System architecture, DB migrations, auth baseline',
          children: [
            {
              id: `b-f1-${Date.now()}`,
              title: 'API Gateway & Secure Auth Service',
              type: 'feature',
              status: 'completed',
              quarter: 'Sprint 1',
              assignee: project?.members?.[0]?.name || 'Developer',
              priority: 'high',
              children: [
                {
                  id: `b-sub1-${Date.now()}`,
                  title: 'OAuth2 & JWT Token Rotator',
                  type: 'subtask',
                  status: 'completed',
                  assignee: 'Aman Kakkar',
                  priority: 'medium',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: `b-ph2-${Date.now()}`,
          title: 'Phase 2: Core Feature Implementation',
          type: 'phase',
          status: 'in_progress',
          quarter: 'Q2 2026',
          assignee: 'Alfie Mathew',
          priority: 'high',
          notes: 'Main business workflow and user interfaces',
          children: [
            {
              id: `b-f2-${Date.now()}`,
              title: 'Primary Service Pipeline & Engine',
              type: 'feature',
              status: 'in_progress',
              quarter: 'Sprint 3',
              assignee: 'Sarah Chen',
              priority: 'high',
              children: []
            },
            {
              id: `b-f3-${Date.now()}`,
              title: 'Real-Time Activity Telemetry & Sync',
              type: 'feature',
              status: 'planned',
              quarter: 'Sprint 4',
              assignee: 'David Kim',
              priority: 'medium',
              children: []
            }
          ]
        },
        {
          id: `b-ph3-${Date.now()}`,
          title: 'Phase 3: Production Hardening & Launch',
          type: 'phase',
          status: 'planned',
          quarter: 'Q3 2026',
          assignee: 'Lead PM',
          priority: 'high',
          notes: 'Security audit, performance testing, and GA deployment',
          children: [
            {
              id: `b-f4-${Date.now()}`,
              title: 'Load Testing & End-to-End QA Validation',
              type: 'feature',
              status: 'planned',
              quarter: 'Sprint 5',
              assignee: 'QA Team',
              priority: 'high',
              children: []
            }
          ]
        }
      ]
    };

    setTreeData(template);
    setIsDirty(true);
    // Expand all
    const all = new Set();
    traverseTree(template.branches, n => all.add(n.id));
    setExpandedNodes(all);
    if (toast) toast('Agile tree roadmap template generated!');
  };

  // Node Matcher for Search & Filter
  const matchesFilter = (node) => {
    if (statusFilter !== 'all' && node.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (node.title || '').toLowerCase().includes(q);
      const matchAssignee = (node.assignee || '').toLowerCase().includes(q);
      const matchQuarter = (node.quarter || '').toLowerCase().includes(q);
      return matchTitle || matchAssignee || matchQuarter;
    }
    return true;
  };

  // Recursive Tree Node Renderer for the Branching Canvas
  const renderCanvasBranch = (node, level = 0, isLast = false, parentType = 'root') => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isMatching = matchesFilter(node);
    const stConfig = STATUS_CONFIG[node.status] || STATUS_CONFIG.planned;
    const prConfig = PRIORITY_CONFIG[node.priority] || PRIORITY_CONFIG.medium;

    return (
      <div key={node.id} className="relative flex items-start gap-4 my-2.5 group/node">
        {/* Node Card */}
        <div
          className={`relative z-10 w-72 sm:w-80 p-3.5 bg-card border rounded-xl shadow-xs transition-all duration-150 ${
            isMatching ? 'opacity-100' : 'opacity-40'
          } ${
            node.status === 'completed'
              ? 'border-emerald-200/80 bg-emerald-500/[0.02]'
              : node.status === 'in_progress'
              ? 'border-blue-300 shadow-sm ring-2 ring-blue-500/10'
              : 'border-line hover:border-brand/40'
          }`}
        >
          {/* Top Bar: Level/Type Badge & Status Pill */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                node.type === 'phase'
                  ? 'bg-brand/10 text-brand'
                  : node.type === 'feature'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {node.type || 'feature'}
              </span>
              {node.quarter && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-mute">
                  <Calendar size={11} /> {node.quarter}
                </span>
              )}
            </div>

            {/* Quick Cycle Status Button */}
            <button
              onClick={(e) => handleCycleStatus(node.id, e)}
              title="Click to cycle status: Planned -> In Progress -> Completed"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition ${stConfig.bg} hover:brightness-95`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stConfig.dot}`} />
              <span>{stConfig.label}</span>
            </button>
          </div>

          {/* Title */}
          <h4 className="text-sm font-bold text-ink leading-snug group-hover/node:text-brand transition-colors">
            {node.title}
          </h4>

          {/* Notes or description if any */}
          {node.notes && (
            <p className="text-xs text-mute mt-1 line-clamp-2 leading-relaxed">
              {node.notes}
            </p>
          )}

          {/* Footer Metadata: Assignee, Priority, Children count */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-line/60 text-[11px]">
            <div className="flex items-center gap-2">
              {node.assignee ? (
                <span className="inline-flex items-center gap-1 text-ink2 font-medium">
                  <User size={12} className="text-mute" />
                  <span className="truncate max-w-[110px]">{node.assignee}</span>
                </span>
              ) : (
                <span className="text-mute italic">Unassigned</span>
              )}
              {node.priority && node.priority !== 'medium' && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${prConfig.color}`}>
                  {node.priority}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* + Branch Button */}
              <button
                onClick={() => handleOpenAddModal(node.id, node.type === 'phase' ? 'feature' : 'subtask')}
                title="Attach new branch/feature under this node"
                className="p-1 text-ink2 hover:text-brand hover:bg-brand/10 rounded transition"
              >
                <Plus size={14} />
              </button>
              {/* Edit Button */}
              <button
                onClick={() => handleOpenEditModal(node)}
                title="Edit branch details"
                className="p-1 text-ink2 hover:text-brand hover:bg-brand/10 rounded transition"
              >
                <Edit3 size={13} />
              </button>
              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteNode(node.id, e)}
                title="Delete this branch"
                className="p-1 text-mute hover:text-rose-600 hover:bg-rose-50 rounded transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Expand/Collapse Handle if has children */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(node.id)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-line shadow-xs flex items-center justify-center text-ink2 hover:text-brand hover:border-brand transition z-20"
              title={isExpanded ? 'Collapse sub-branches' : 'Expand sub-branches'}
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <span className="text-[10px] font-bold text-brand">+{node.children.length}</span>
              )}
            </button>
          )}
        </div>

        {/* Child Branches (Diverging Horizontally to the right) */}
        {hasChildren && isExpanded && (
          <div className="relative pl-6 ml-2 border-l-2 border-dashed border-line/90 space-y-3">
            {node.children.map((child, idx) =>
              renderCanvasBranch(child, level + 1, idx === node.children.length - 1, node.type)
            )}
          </div>
        )}
      </div>
    );
  };

  // Outline List View (Fast Hierarchical Scanner)
  const renderOutlineBranch = (node, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const stConfig = STATUS_CONFIG[node.status] || STATUS_CONFIG.planned;
    const isMatching = matchesFilter(node);

    return (
      <div key={node.id} className={`transition ${isMatching ? 'opacity-100' : 'opacity-40'}`}>
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
            depth === 0 ? 'bg-card border-line font-semibold' : 'bg-card2/40 border-line/60 ml-6 text-sm'
          } hover:border-brand/40`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="p-1 text-mute hover:text-ink transition"
              >
                <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="w-5 text-center text-mute/50">•</span>
            )}

            <button
              onClick={(e) => handleCycleStatus(node.id, e)}
              className={`w-3 h-3 rounded-full ${stConfig.dot} hover:scale-125 transition shrink-0`}
              title="Click to cycle status"
            />

            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
              node.type === 'phase' ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-600'
            }`}>
              {node.type}
            </span>

            <span className="font-medium text-ink truncate">{node.title}</span>

            {node.quarter && (
              <span className="text-xs text-mute hidden sm:inline-block">({node.quarter})</span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {node.assignee && (
              <span className="text-xs text-mute flex items-center gap-1 hidden md:flex">
                <User size={12} /> {node.assignee}
              </span>
            )}

            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${stConfig.bg}`}>
              {stConfig.label}
            </span>

            <button
              onClick={() => handleOpenAddModal(node.id, node.type === 'phase' ? 'feature' : 'subtask')}
              className="p-1 text-ink2 hover:text-brand hover:bg-brand/10 rounded"
              title="Add child branch"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => handleOpenEditModal(node)}
              className="p-1 text-ink2 hover:text-brand hover:bg-brand/10 rounded"
              title="Edit branch"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={(e) => handleDeleteNode(node.id, e)}
              className="p-1 text-mute hover:text-rose-600 hover:bg-rose-50 rounded"
              title="Delete branch"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1.5 mt-1.5">
            {node.children.map(child => renderOutlineBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & STATS SUMMARY */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                <GitBranch size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {treeData?.root_title || `${project?.name} Custom Roadmap`}
                </h3>
                <p className="text-xs text-mute">
                  {treeData?.vision || 'Branching product tree. Attach features, milestones, and deliverables.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-generate Template */}
            <Btn
              variant="outline"
              size="sm"
              onClick={handleLoadTemplate}
              className="text-xs"
              title="Generate a standard Agile Milestone Tree"
            >
              <Sparkles size={13} className="text-brand mr-1" />
              Template
            </Btn>

            {/* + Add Milestone Root */}
            <Btn
              variant="outline"
              size="sm"
              onClick={() => handleOpenAddModal('root', 'phase')}
              className="text-xs font-semibold"
            >
              <Plus size={14} className="mr-1" />
              Add Milestone / Phase
            </Btn>

            {/* Save Roadmap Button */}
            <Btn
              variant={isDirty ? 'primary' : 'outline'}
              size="sm"
              disabled={saving}
              onClick={handleSaveToBackend}
              className={`text-xs font-semibold ${isDirty ? 'animate-pulse' : ''}`}
            >
              <Save size={14} className="mr-1.5" />
              {saving ? 'Saving...' : isDirty ? 'Save Changes *' : 'Roadmap Saved'}
            </Btn>
          </div>
        </div>

        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-line text-xs">
          <div className="p-2.5 bg-card2/60 rounded-lg">
            <span className="text-mute block font-medium">Total Branches</span>
            <span className="text-base font-bold text-ink mt-0.5 block">{stats.total} Features</span>
          </div>

          <div className="p-2.5 bg-card2/60 rounded-lg">
            <span className="text-emerald-700 block font-medium">Completed</span>
            <span className="text-base font-bold text-emerald-800 mt-0.5 block">
              {stats.completed} ({stats.pct}%)
            </span>
          </div>

          <div className="p-2.5 bg-card2/60 rounded-lg">
            <span className="text-blue-700 block font-medium">In Progress</span>
            <span className="text-base font-bold text-blue-800 mt-0.5 block">{stats.inProgress}</span>
          </div>

          <div className="p-2.5 bg-card2/60 rounded-lg">
            <span className="text-amber-700 block font-medium">Planned</span>
            <span className="text-base font-bold text-amber-800 mt-0.5 block">{stats.planned}</span>
          </div>

          <div className="p-2.5 bg-card2/60 rounded-lg">
            <span className="text-rose-700 block font-medium">Blocked</span>
            <span className="text-base font-bold text-rose-800 mt-0.5 block">{stats.blocked}</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-mute font-medium">
            <span>Roadmap Completion Progress</span>
            <span className="font-bold text-brand">{stats.pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
              title={`Completed: ${stats.completed}`}
            />
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
              title={`In Progress: ${stats.inProgress}`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.planned / stats.total) * 100 : 0}%` }}
              title={`Planned: ${stats.planned}`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.blocked / stats.total) * 100 : 0}%` }}
              title={`Blocked: ${stats.blocked}`}
            />
          </div>
        </div>
      </div>

      {/* 2. FILTER & VIEW CONTROLS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-line rounded-xl p-3">
        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              placeholder="Search features, quarters, assignees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card2/50 border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-card2/50 border border-line rounded-lg px-2.5 py-1.5 text-ink font-medium focus:outline-none focus:border-brand"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="planned">Planned</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Tree vs Outline View & Zoom Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Expand / Collapse All */}
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs text-mute hover:text-ink font-medium rounded hover:bg-card2 transition"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-mute hover:text-ink font-medium rounded hover:bg-card2 transition"
          >
            Collapse
          </button>

          <div className="w-px h-4 bg-line mx-1" />

          {/* Zoom controls for canvas view */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-1 border border-line rounded-lg px-1 py-0.5">
              <button
                onClick={() => setZoom(z => Math.max(0.7, z - 0.1))}
                className="p-1 text-mute hover:text-ink transition"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[11px] font-semibold text-ink px-1">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
                className="p-1 text-mute hover:text-ink transition"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1 text-mute hover:text-ink transition"
                title="Reset Zoom"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex items-center bg-card2/80 p-0.5 rounded-lg border border-line">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'tree' ? 'bg-card text-brand shadow-xs' : 'text-mute hover:text-ink'
              }`}
            >
              <GitFork size={13} />
              <span>Tree Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('outline')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'outline' ? 'bg-card text-brand shadow-xs' : 'text-mute hover:text-ink'
              }`}
            >
              <ListTree size={13} />
              <span>Outline</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ROADMAP TREE CANVAS OR OUTLINE VIEW */}
      {viewMode === 'tree' ? (
        <div className="bg-card border border-line rounded-xl p-6 shadow-xs overflow-x-auto min-h-[480px]">
          {treeData?.branches?.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
                <GitBranch size={24} />
              </div>
              <h4 className="text-sm font-bold text-ink">No roadmap branches created yet</h4>
              <p className="text-xs text-mute max-w-sm mx-auto">
                Start building your project roadmap by attaching milestone phases, feature epics, and tasks.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Btn variant="primary" size="sm" onClick={() => handleOpenAddModal('root', 'phase')}>
                  <Plus size={14} className="mr-1" />
                  Add First Milestone Phase
                </Btn>
                <Btn variant="outline" size="sm" onClick={handleLoadTemplate}>
                  <Sparkles size={14} className="mr-1 text-brand" />
                  Auto-Generate Template
                </Btn>
              </div>
            </div>
          ) : (
            <div
              className="transition-transform origin-top-left"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              {/* Central Root Anchor Node */}
              <div className="inline-flex items-center gap-3 p-4 bg-brand text-white rounded-2xl shadow-md mb-6">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Layers size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                    Project Target Vision
                  </span>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {project?.name || 'Project Root'}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5 max-w-md line-clamp-1">
                    {project?.description || 'Milestone Roadmap Tree'}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenAddModal('root', 'phase')}
                  className="ml-4 px-3 py-1.5 bg-white text-brand hover:bg-emerald-50 text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs"
                >
                  <Plus size={13} />
                  <span>Attach Phase</span>
                </button>
              </div>

              {/* Top-Level Branches (Phases / Milestones) */}
              <div className="space-y-6 pl-4 border-l-2 border-brand/30">
                {treeData.branches.map((branch, idx) =>
                  renderCanvasBranch(branch, 0, idx === treeData.branches.length - 1, 'root')
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* OUTLINE HIERARCHICAL LIST VIEW */
        <div className="bg-card border border-line rounded-xl p-5 shadow-xs space-y-2">
          {treeData?.branches?.length === 0 ? (
            <div className="py-12 text-center text-mute text-xs">
              No roadmap branches yet. Click "Add Milestone / Phase" to start.
            </div>
          ) : (
            treeData.branches.map(branch => renderOutlineBranch(branch, 0))
          )}
        </div>
      )}

      {/* 4. MODAL: ADD / EDIT BRANCH */}
      {modalState.open && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card2/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                  <GitBranch size={16} />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  {modalState.mode === 'add' ? 'Attach New Branch / Feature' : 'Edit Roadmap Branch'}
                </h3>
              </div>
              <button
                onClick={() => setModalState({ open: false, mode: 'add', parentId: null, node: null })}
                className="text-mute hover:text-ink p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              {/* Feature Title */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Feature / Branch Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 1-Click Biometric Checkout, Redis Inventory Sync..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                />
              </div>

              {/* Branch Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Branch Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink font-medium"
                  >
                    <option value="phase">Milestone / Phase</option>
                    <option value="feature">Feature / Epic</option>
                    <option value="subtask">Sub-Task / Tech Enabler</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink font-medium"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Timeframe & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Target Timeframe / Sprint
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Q2 2026 or Sprint 4"
                    value={form.quarter}
                    onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Assignee</label>
                  <input
                    type="text"
                    placeholder="e.g., Aman Kakkar"
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Priority</label>
                <div className="flex items-center gap-2">
                  {['high', 'medium', 'low'].map(pr => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setForm({ ...form, priority: pr })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border uppercase transition ${
                        form.priority === pr
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-line text-mute hover:text-ink'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Notes & Requirements</label>
                <textarea
                  rows={2}
                  placeholder="Technical notes, dependencies, or acceptance criteria..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Btn
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setModalState({ open: false, mode: 'add', parentId: null, node: null })}
                >
                  Cancel
                </Btn>
                <Btn variant="primary" size="sm" type="submit">
                  {modalState.mode === 'add' ? 'Attach Branch' : 'Save Changes'}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
