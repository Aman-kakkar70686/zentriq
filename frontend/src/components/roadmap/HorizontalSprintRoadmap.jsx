import { useState, useMemo } from 'react';
import {
  Sparkles, Calendar, Layers, ShieldCheck, CheckCircle2, Rocket,
  Plus, GripVertical, User, Clock, AlertTriangle, ArrowRight,
  ArrowLeft, Search, Filter, MoreHorizontal, Check, RefreshCw
} from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { Btn } from '../ui';
import { fmtDate } from '../../lib/format';

// 6 Exact Horizontal Stages matching Zentriq Product Flow (Image 1)
const STAGES = [
  {
    key: 'ideas',
    label: 'IDEAS',
    sub: 'Product Backlog & Ideation',
    icon: Sparkles,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    pill: 'bg-purple-100 text-purple-800',
    dropHighlight: 'ring-2 ring-purple-400 bg-purple-50/50'
  },
  {
    key: 'planned',
    label: 'PLANNED',
    sub: 'Sprint Grooming & Scope',
    icon: Calendar,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-800',
    dropHighlight: 'ring-2 ring-blue-400 bg-blue-50/50'
  },
  {
    key: 'building',
    label: 'BUILDING',
    sub: 'Active Development in Progress',
    icon: Layers,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-800',
    dropHighlight: 'ring-2 ring-amber-400 bg-amber-50/50'
  },
  {
    key: 'review',
    label: 'REVIEW',
    sub: 'QA, Code Review & Testing',
    icon: ShieldCheck,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    pill: 'bg-violet-100 text-violet-800',
    dropHighlight: 'ring-2 ring-violet-400 bg-violet-50/50'
  },
  {
    key: 'ready',
    label: 'READY',
    sub: 'Staging Verified for Release',
    icon: CheckCircle2,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    pill: 'bg-teal-100 text-teal-800',
    dropHighlight: 'ring-2 ring-teal-400 bg-teal-50/50'
  },
  {
    key: 'shipped',
    label: 'SHIPPED',
    sub: 'Released to Production',
    icon: Rocket,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-800',
    dropHighlight: 'ring-2 ring-emerald-400 bg-emerald-50/50'
  }
];

export default function HorizontalSprintRoadmap({ project, onRefreshProject }) {
  const { toast } = useApp();
  const [tasks, setTasks] = useState(project?.task_list || []);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Quick Add Task Modal/Form
  const [quickAddStage, setQuickAddStage] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  // Keep tasks synced if project prop updates
  useMemo(() => {
    if (project?.task_list) {
      setTasks(project.task_list);
    }
  }, [project?.task_list]);

  // Stage counts for the horizontal pipeline bar
  const stageCounts = useMemo(() => {
    const counts = { ideas: 0, planned: 0, building: 0, review: 0, ready: 0, shipped: 0 };
    tasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        return matchTitle || matchAssignee;
      }
      return true;
    });
  }, [tasks, priorityFilter, search]);

  // Group filtered tasks by stage
  const tasksByStage = useMemo(() => {
    const map = { ideas: [], planned: [], building: [], review: [], ready: [], shipped: [] };
    filteredTasks.forEach(t => {
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map.ideas.push(t);
      }
    });
    return map;
  }, [filteredTasks]);

  // Handle Drag Start
  const handleDragStart = (e, task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle Drag Over column
  const handleDragOver = (e, stageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  // Handle Drag Leave column
  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  // Handle Drop in Column
  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);

    const taskIdStr = e.dataTransfer.getData('text/plain') || draggedTaskId;
    const taskId = parseInt(taskIdStr, 10);
    setDraggedTaskId(null);

    if (!taskId) return;

    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask || currentTask.status === targetStage) return;

    const oldStage = currentTask.status;

    // 1. Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStage } : t));

    // 2. Call backend PATCH
    try {
      await api.patch(`/tasks/${taskId}`, { status: targetStage });
      if (toast) toast(`Moved "${currentTask.title.slice(0, 24)}..." to ${targetStage.toUpperCase()}`);
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      // Revert on error
      console.error('Error moving task:', err);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStage } : t));
      if (toast) toast(`Failed to move task: ${errMsg(err)}`);
    }
  };

  // 1-Click Move (Previous / Next stage buttons)
  const handleStepTask = async (taskId, direction) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const stageKeys = STAGES.map(s => s.key);
    const currentIndex = stageKeys.indexOf(currentTask.status);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= stageKeys.length) return;
    const targetStage = stageKeys[newIndex];

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStage } : t));

    try {
      await api.patch(`/tasks/${taskId}`, { status: targetStage });
      if (toast) toast(`Moved to ${targetStage.toUpperCase()}`);
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentTask.status } : t));
      if (toast) toast(`Failed to update task: ${errMsg(err)}`);
    }
  };

  // Create Quick Task in Specific Stage
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !quickAddStage || !project?.id) return;

    setCreating(true);
    try {
      const payload = {
        title: newTaskTitle.trim(),
        project_id: project.id,
        status: quickAddStage,
        priority: newTaskPriority,
        description: `Created in ${quickAddStage.toUpperCase()} stage.`
      };
      const res = await api.post('/tasks', payload);
      setTasks(prev => [...prev, res.data]);
      setNewTaskTitle('');
      setQuickAddStage(null);
      if (toast) toast(`New task added to ${quickAddStage.toUpperCase()}!`);
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      console.error('Error creating task:', err);
      if (toast) toast(`Error creating task: ${errMsg(err)}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HORIZONTAL PRODUCT FLOW PIPELINE BAR (MATCHING IMAGE 1) */}
      <div className="bg-card border border-line rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Project Stage Flow & Roadmap Velocity</h3>
            <p className="text-xs text-mute">
              Drag and drop cards across stages horizontally from Backlog Ideas to Shipped Production.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand/10 text-brand">
            {tasks.length} Total Deliverables
          </span>
        </div>

        {/* Horizontal Pipeline Steps */}
        <div className="relative py-2">
          {/* Connecting Line */}
          <div className="hidden sm:block absolute top-7 left-8 right-8 h-0.5 border-t-2 border-dashed border-line z-0" />

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 relative z-10">
            {STAGES.map((st, idx) => {
              const count = stageCounts[st.key] || 0;
              return (
                <div
                  key={st.key}
                  className="bg-card border border-line rounded-xl p-3 text-center transition hover:border-brand/40 group cursor-default"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className="text-xl font-extrabold text-ink group-hover:text-brand transition">
                      {count}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mute block">
                    {st.label}
                  </span>
                  {/* Visual mini dots */}
                  <div className="flex items-center justify-center gap-0.5 mt-1.5">
                    {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${st.dot}`} />
                    ))}
                    {count > 5 && <span className="text-[9px] text-mute font-bold">+</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. FILTER & TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-line rounded-xl p-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              placeholder="Search deliverables, features, assignees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card2/60 border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
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

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-card2/60 border border-line rounded-lg px-2.5 py-1.5 text-ink font-medium focus:outline-none focus:border-brand"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-mute hidden md:inline">
            Drag cards or use ➔ to advance
          </span>
          <Btn
            variant="outline"
            size="sm"
            onClick={() => setQuickAddStage('ideas')}
            className="text-xs font-semibold"
          >
            <Plus size={13} className="mr-1 text-brand" />
            Add Idea / Task
          </Btn>
        </div>
      </div>

      {/* 3. 6 HORIZONTAL SWIMLANES WITH DRAG & DROP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
        {STAGES.map((st, colIndex) => {
          const colTasks = tasksByStage[st.key] || [];
          const isOver = dragOverStage === st.key;

          return (
            <div
              key={st.key}
              onDragOver={(e) => handleDragOver(e, st.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, st.key)}
              className={`flex flex-col bg-card2/40 border rounded-2xl p-3 transition-all min-h-[520px] ${
                isOver ? st.dropHighlight : 'border-line/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                  <span className="text-xs font-bold text-ink tracking-wide">{st.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${st.pill}`}>
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => setQuickAddStage(st.key)}
                  title={`Add deliverable directly into ${st.label}`}
                  className="p-1 rounded text-mute hover:text-brand hover:bg-brand/10 transition"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Task Cards in this Column */}
              <div className="space-y-2.5 flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-line/70 rounded-xl flex flex-col items-center justify-center p-3 text-center">
                    <p className="text-[11px] text-mute font-medium">Drop items here</p>
                    <button
                      onClick={() => setQuickAddStage(st.key)}
                      className="text-[11px] text-brand font-semibold hover:underline mt-1"
                    >
                      + Add {st.label}
                    </button>
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, t)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className={`p-3 bg-card border rounded-xl shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:border-brand/40 group ${
                        draggedTaskId === t.id ? 'opacity-40 scale-95 border-brand' : 'border-line'
                      }`}
                    >
                      {/* Top Meta: Grip & Priority Pill */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1 text-mute group-hover:text-ink transition">
                          <GripVertical size={13} className="text-mute/60" />
                          <span className="text-[10px] font-mono text-mute">#{t.id}</span>
                        </div>

                        <span
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                            t.priority === 'high'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : t.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-ink leading-snug line-clamp-2">
                        {t.title}
                      </h4>

                      {/* Description if present */}
                      {t.description && (
                        <p className="text-[11px] text-mute mt-1 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}

                      {/* Footer: Assignee & Left/Right Step Controls */}
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-line/60 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-ink2 truncate max-w-[100px]">
                          <span className="w-4 h-4 rounded-full bg-brand/10 text-brand text-[8px] font-bold grid place-items-center shrink-0">
                            {t.assignee?.[0]?.toUpperCase() || 'U'}
                          </span>
                          <span className="truncate">{t.assignee?.split(' ')[0] || 'Unassigned'}</span>
                        </span>

                        {/* Step Advance Controls */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          {colIndex > 0 && (
                            <button
                              onClick={() => handleStepTask(t.id, 'prev')}
                              title="Move back 1 stage"
                              className="p-1 rounded hover:bg-card2 text-mute hover:text-ink transition"
                            >
                              <ArrowLeft size={11} />
                            </button>
                          )}
                          {colIndex < STAGES.length - 1 && (
                            <button
                              onClick={() => handleStepTask(t.id, 'next')}
                              title="Advance 1 stage"
                              className="p-1 rounded bg-brand/10 hover:bg-brand hover:text-white text-brand transition"
                            >
                              <ArrowRight size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. MODAL: QUICK ADD TO STAGE */}
      {quickAddStage && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-card2/40">
              <h3 className="text-sm font-bold text-ink">
                Add Deliverable to {quickAddStage.toUpperCase()}
              </h3>
              <button
                onClick={() => setQuickAddStage(null)}
                className="text-mute hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Real-time driver telemetry sync, Stripe Webhook..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Priority</label>
                <div className="flex items-center gap-2">
                  {['high', 'medium', 'low'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg border uppercase transition ${
                        newTaskPriority === p
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-line text-mute hover:text-ink'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Btn
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setQuickAddStage(null)}
                >
                  Cancel
                </Btn>
                <Btn variant="primary" size="sm" type="submit" disabled={creating}>
                  {creating ? 'Adding...' : 'Add to Pipeline'}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
