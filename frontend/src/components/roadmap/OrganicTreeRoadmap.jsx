import { useState, useMemo, useRef } from 'react';
import {
  GitBranch, Plus, Edit3, Trash2, CheckCircle2, Clock, Sparkles,
  Layers, User, ZoomIn, ZoomOut, Maximize2, Search, Filter,
  Check, X, RefreshCw, GripVertical, AlertTriangle
} from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { Btn } from '../ui';

// Stage styling for feature leaves
const STAGE_STYLES = {
  ideas: { label: 'Ideas', bg: 'bg-purple-500/10 text-purple-700 border-purple-300', dot: 'bg-purple-500', glow: '#a855f7' },
  planned: { label: 'Planned', bg: 'bg-blue-500/10 text-blue-700 border-blue-300', dot: 'bg-blue-500', glow: '#3b82f6' },
  building: { label: 'Building', bg: 'bg-amber-500/10 text-amber-700 border-amber-300', dot: 'bg-amber-500', glow: '#f59e0b' },
  review: { label: 'Review', bg: 'bg-rose-500/10 text-rose-700 border-rose-300', dot: 'bg-rose-500', glow: '#f43f5e' },
  ready: { label: 'Ready', bg: 'bg-teal-500/10 text-teal-700 border-teal-300', dot: 'bg-teal-500', glow: '#14b8a6' },
  shipped: { label: 'Shipped', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500', glow: '#10b981' }
};

// Symmetrical organic tree branches matching the user's uploaded Image 3
const BASE_BRANCHES = [
  {
    id: 'limb-1',
    name: 'Core Architecture & Auth',
    pillar: 'Phase 1',
    path: 'M 490 460 C 440 430 330 420 240 370 C 170 330 110 280 80 200',
    color: '#854d0e',
    anchor: { x: 70, y: 190 },
    subBranches: [
      { id: 'sub-1a', path: 'M 240 370 C 190 320 160 250 150 170', anchor: { x: 140, y: 160 } },
      { id: 'sub-1b', path: 'M 170 330 C 130 280 110 240 70 270', anchor: { x: 60, y: 260 } }
    ]
  },
  {
    id: 'limb-2',
    name: 'Product Catalog & Search',
    pillar: 'Phase 2',
    path: 'M 495 460 C 460 410 380 360 330 300 C 290 250 260 180 250 120',
    color: '#92400e',
    anchor: { x: 240, y: 110 },
    subBranches: [
      { id: 'sub-2a', path: 'M 330 300 C 310 230 310 170 320 110', anchor: { x: 310, y: 100 } },
      { id: 'sub-2b', path: 'M 380 360 C 370 300 370 240 390 180', anchor: { x: 380, y: 170 } }
    ]
  },
  {
    id: 'limb-3',
    name: 'Payment & Checkout Engine',
    pillar: 'Phase 3',
    path: 'M 500 460 C 500 380 480 300 470 220 C 460 160 460 110 470 70',
    color: '#78350f',
    anchor: { x: 460, y: 60 },
    subBranches: [
      { id: 'sub-3a', path: 'M 480 300 C 510 240 520 170 530 80', anchor: { x: 520, y: 70 } }
    ]
  },
  {
    id: 'limb-4',
    name: 'Fulfillment & Logistics',
    pillar: 'Phase 4',
    path: 'M 505 460 C 540 410 620 360 670 300 C 710 250 740 180 750 120',
    color: '#92400e',
    anchor: { x: 740, y: 110 },
    subBranches: [
      { id: 'sub-4a', path: 'M 670 300 C 690 230 690 170 680 110', anchor: { x: 670, y: 100 } },
      { id: 'sub-4b', path: 'M 620 360 C 630 300 630 240 610 180', anchor: { x: 600, y: 170 } }
    ]
  },
  {
    id: 'limb-5',
    name: 'AI Intelligence & Growth',
    pillar: 'Phase 5',
    path: 'M 510 460 C 560 430 670 420 760 370 C 830 330 890 280 920 200',
    color: '#854d0e',
    anchor: { x: 910, y: 190 },
    subBranches: [
      { id: 'sub-5a', path: 'M 760 370 C 810 320 840 250 850 170', anchor: { x: 840, y: 160 } },
      { id: 'sub-5b', path: 'M 830 330 C 870 280 890 240 930 270', anchor: { x: 920, y: 260 } }
    ]
  }
];

export default function OrganicTreeRoadmap({ project, onRefreshProject }) {
  const { toast } = useApp();
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Drag and drop state on tree
  const [draggedFeatureId, setDraggedFeatureId] = useState(null);
  const [activeBranchDrop, setActiveBranchDrop] = useState(null);

  // Features distributed across tree branches
  const [treeFeatures, setTreeFeatures] = useState(() => {
    // If project has roadmap_tree branches with features
    if (project?.roadmap_tree?.branches) {
      const flattened = [];
      project.roadmap_tree.branches.forEach((b, bIdx) => {
        const limbId = BASE_BRANCHES[bIdx % BASE_BRANCHES.length].id;
        flattened.push({
          id: b.id,
          title: b.title,
          status: b.status || 'planned',
          assignee: b.assignee || 'Aman Kakkar',
          priority: b.priority || 'high',
          limbId
        });
        (b.children || []).forEach((c) => {
          flattened.push({
            id: c.id,
            title: c.title,
            status: c.status || 'building',
            assignee: c.assignee || 'Dev Team',
            priority: c.priority || 'medium',
            limbId
          });
        });
      });
      if (flattened.length > 0) return flattened;
    }

    // Default features attached to tree branches
    return [
      { id: 'f-1', title: '1-Click Biometric Auth', status: 'shipped', assignee: 'Aman Kakkar', priority: 'high', limbId: 'limb-1' },
      { id: 'f-2', title: 'JWT Token Rotator', status: 'shipped', assignee: 'Alfie Mathew', priority: 'high', limbId: 'limb-1' },
      { id: 'f-3', title: 'RBAC Permission Engine', status: 'building', assignee: 'Sarah Chen', priority: 'medium', limbId: 'limb-1' },
      { id: 'f-4', title: 'Elasticsearch Indexer', status: 'building', assignee: 'David Kim', priority: 'high', limbId: 'limb-2' },
      { id: 'f-5', title: 'Dynamic Facet Filters', status: 'ready', assignee: 'David Kim', priority: 'medium', limbId: 'limb-2' },
      { id: 'f-6', title: 'Stripe & Razorpay Webhooks', status: 'planned', assignee: 'Aman Kakkar', priority: 'high', limbId: 'limb-3' },
      { id: 'f-7', title: 'UPI Intent Checkout Flow', status: 'ideas', assignee: 'Alfie Mathew', priority: 'high', limbId: 'limb-3' },
      { id: 'f-8', title: 'Automated GST Invoice PDF', status: 'planned', assignee: 'David Kim', priority: 'medium', limbId: 'limb-4' },
      { id: 'f-9', title: 'FedEx Fleet Telemetry Hook', status: 'ideas', assignee: 'Sarah Chen', priority: 'low', limbId: 'limb-4' },
      { id: 'f-10', title: 'Personalized Cross-Sell AI', status: 'ideas', assignee: 'Sarah Chen', priority: 'medium', limbId: 'limb-5' },
      { id: 'f-11', title: 'Cart Abandonment Sequence', status: 'planned', assignee: 'Lead PM', priority: 'low', limbId: 'limb-5' }
    ];
  });

  // Modal to add feature onto a specific branch
  const [modalOpen, setModalOpen] = useState(false);
  const [targetLimbId, setTargetLimbId] = useState('limb-1');
  const [newTitle, setNewTitle] = useState('');
  const [newStage, setNewStage] = useState('planned');
  const [newAssignee, setNewAssignee] = useState(project?.members?.[0]?.name || 'Developer');
  const [newPriority, setNewPriority] = useState('medium');

  // Filter features
  const filteredFeatures = useMemo(() => {
    return treeFeatures.filter(f => {
      if (stageFilter !== 'all' && f.status !== stageFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (f.title || '').toLowerCase().includes(q) || (f.assignee || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [treeFeatures, stageFilter, search]);

  // Group features by limb
  const featuresByLimb = useMemo(() => {
    const map = {};
    BASE_BRANCHES.forEach(b => { map[b.id] = []; });
    filteredFeatures.forEach(f => {
      if (map[f.limbId]) map[f.limbId].push(f);
      else map['limb-1'].push(f);
    });
    return map;
  }, [filteredFeatures]);

  // Handle Drag Start
  const handleFeatureDragStart = (e, featureId) => {
    setDraggedFeatureId(featureId);
    e.dataTransfer.setData('text/plain', featureId);
  };

  // Handle Drop onto Limb
  const handleLimbDrop = (e, limbId) => {
    e.preventDefault();
    setActiveBranchDrop(null);
    if (!draggedFeatureId) return;

    setTreeFeatures(prev =>
      prev.map(f => f.id === draggedFeatureId ? { ...f, limbId } : f)
    );
    setDraggedFeatureId(null);
    if (toast) toast('Feature attached to new tree branch!');
  };

  // Cycle feature stage on 1-click
  const handleCycleStage = (featureId, e) => {
    e.stopPropagation();
    const cycle = { ideas: 'planned', planned: 'building', building: 'review', review: 'ready', ready: 'shipped', shipped: 'ideas' };
    setTreeFeatures(prev =>
      prev.map(f => f.id === featureId ? { ...f, status: cycle[f.status] || 'planned' } : f)
    );
    if (toast) toast('Feature stage updated!');
  };

  // Delete feature
  const handleDeleteFeature = (featureId, e) => {
    e.stopPropagation();
    if (!window.confirm('Prune this feature from tree branch?')) return;
    setTreeFeatures(prev => prev.filter(f => f.id !== featureId));
    if (toast) toast('Feature pruned from branch');
  };

  // Add Feature to branch
  const handleAddFeatureSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newFeature = {
      id: `f-${Date.now()}`,
      title: newTitle.trim(),
      status: newStage,
      assignee: newAssignee.trim(),
      priority: newPriority,
      limbId: targetLimbId
    };

    setTreeFeatures(prev => [...prev, newFeature]);
    setNewTitle('');
    setModalOpen(false);
    if (toast) toast('New feature sprouted on branch!');
  };

  return (
    <div className="space-y-4">
      {/* 1. CONTROLS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-line rounded-xl p-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              placeholder="Filter branches & features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card2/60 border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs bg-card2/60 border border-line rounded-lg px-2.5 py-1.5 text-ink font-medium focus:outline-none focus:border-brand"
          >
            <option value="all">All Stages</option>
            <option value="ideas">Ideas</option>
            <option value="planned">Planned</option>
            <option value="building">Building</option>
            <option value="review">Review</option>
            <option value="ready">Ready</option>
            <option value="shipped">Shipped</option>
          </select>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-line rounded-lg px-1 py-0.5">
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
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

          <Btn
            variant="primary"
            size="sm"
            onClick={() => {
              setTargetLimbId('limb-1');
              setModalOpen(true);
            }}
            className="text-xs font-semibold"
          >
            <Plus size={13} className="mr-1" /> Sprout Feature
          </Btn>
        </div>
      </div>

      {/* 2. THE ORGANIC TREE CANVAS (LOOKS DIRECTLY LIKE IMAGE 3) */}
      <div className="relative bg-[#FAFAF8] border border-line rounded-2xl p-6 shadow-xs overflow-x-auto min-h-[640px] flex justify-center items-center">
        <div
          className="relative transition-transform duration-150 origin-center"
          style={{ transform: `scale(${zoom})`, width: 1000, height: 620 }}
        >
          {/* SVG Tree Silhouette Canvas */}
          <svg
            viewBox="0 0 1000 620"
            className="w-full h-full drop-shadow-sm select-none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Woody Bark Gradients */}
              <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#854d0e" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <linearGradient id="branchGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              {/* Radial Ground Shadow */}
              <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#174B3A" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#174B3A" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ground Shadow Ellipse */}
            <ellipse cx="500" cy="590" rx="360" ry="22" fill="url(#groundShadow)" />

            {/* Tree Trunk Base & Roots */}
            <path
              d="M 440 600 C 470 595 480 540 485 470 C 490 440 510 440 515 470 C 520 540 530 595 560 600 C 540 592 510 590 500 590 C 490 590 460 592 440 600 Z"
              fill="url(#trunkGrad)"
            />

            {/* Central Fork Junction */}
            <path
              d="M 485 470 C 475 420 465 380 440 330 C 460 370 480 410 495 450 Z"
              fill="url(#trunkGrad)"
            />

            {/* Main Tree Limbs & Sub-branches from Image 3 */}
            {BASE_BRANCHES.map((limb) => {
              const isDropHover = activeBranchDrop === limb.id;

              return (
                <g
                  key={limb.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setActiveBranchDrop(limb.id);
                  }}
                  onDragLeave={() => setActiveBranchDrop(null)}
                  onDrop={(e) => handleLimbDrop(e, limb.id)}
                  className="cursor-pointer transition-all"
                >
                  {/* Outer glow stroke when drag hovering */}
                  {isDropHover && (
                    <path
                      d={limb.path}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={24}
                      strokeLinecap="round"
                      className="animate-pulse opacity-80"
                    />
                  )}

                  {/* Main Branch Limb */}
                  <path
                    d={limb.path}
                    fill="none"
                    stroke={limb.color}
                    strokeWidth={14}
                    strokeLinecap="round"
                    className="hover:stroke-brand transition-colors"
                  />

                  {/* Secondary Twigs / Sub-branches */}
                  {limb.subBranches.map((sub, sIdx) => (
                    <path
                      key={sIdx}
                      d={sub.path}
                      fill="none"
                      stroke={limb.color}
                      strokeWidth={7}
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                  ))}

                  {/* Branch Socket / Sprout Node at the Tip */}
                  <circle
                    cx={limb.anchor.x}
                    cy={limb.anchor.y}
                    r={9}
                    fill="#174B3A"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    className="hover:scale-125 transition-transform"
                    onClick={() => {
                      setTargetLimbId(limb.id);
                      setModalOpen(true);
                    }}
                  />
                  <text
                    x={limb.anchor.x}
                    y={limb.anchor.y + 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    +
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Feature Cards Attached to Branches */}
          {BASE_BRANCHES.map((limb) => {
            const limbFeatures = featuresByLimb[limb.id] || [];

            return (
              <div
                key={limb.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setActiveBranchDrop(limb.id);
                }}
                onDragLeave={() => setActiveBranchDrop(null)}
                onDrop={(e) => handleLimbDrop(e, limb.id)}
                className="absolute z-20"
                style={{
                  left: `${limb.anchor.x - 70}px`,
                  top: `${Math.max(20, limb.anchor.y - (limbFeatures.length * 36) - 20)}px`
                }}
              >
                {/* Branch Pillar Label */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand text-white shadow-xs text-[10px] font-bold uppercase mb-1.5 w-max">
                  <GitBranch size={10} />
                  <span>{limb.pillar}: {limb.name.split(' ')[0]}</span>
                  <button
                    onClick={() => {
                      setTargetLimbId(limb.id);
                      setModalOpen(true);
                    }}
                    className="ml-1 hover:text-emerald-200"
                    title="Add feature to this branch"
                  >
                    +
                  </button>
                </div>

                {/* Feature Leaves attached to this branch */}
                <div className="space-y-1.5 w-48">
                  {limbFeatures.map((f) => {
                    const st = STAGE_STYLES[f.status] || STAGE_STYLES.planned;

                    return (
                      <div
                        key={f.id}
                        draggable={true}
                        onDragStart={(e) => handleFeatureDragStart(e, f.id)}
                        className="p-2 bg-card/95 backdrop-blur-xs border border-line hover:border-brand/50 rounded-xl shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:scale-102 group/card"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            onClick={(e) => handleCycleStage(f.id, e)}
                            title="Click to cycle stage"
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border cursor-pointer ${st.bg}`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${st.dot}`} />
                            {st.label}
                          </span>

                          <button
                            onClick={(e) => handleDeleteFeature(f.id, e)}
                            className="text-mute hover:text-rose-600 opacity-0 group-hover/card:opacity-100 transition p-0.5"
                            title="Prune feature"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>

                        <h5 className="text-[11.5px] font-semibold text-ink leading-tight mt-1 line-clamp-1">
                          {f.title}
                        </h5>

                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-line/60 text-[9.5px] text-mute">
                          <span className="truncate max-w-[90px]">{f.assignee}</span>
                          <span className="font-bold uppercase text-[8.5px]">{f.priority}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Central Trunk Label */}
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 text-center bg-card/90 border border-line px-4 py-1.5 rounded-xl shadow-sm z-30">
            <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
              Tree Trunk Foundation
            </span>
            <span className="text-xs font-bold text-ink">
              {project?.name || 'Project Roadmap'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MODAL: SPROUT FEATURE ONTO BRANCH */}
      {modalOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-card2/40">
              <h3 className="text-sm font-bold text-ink">
                Sprout Feature on Tree Branch
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-mute hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFeatureSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Select Tree Branch / Limb
                </label>
                <select
                  value={targetLimbId}
                  onChange={(e) => setTargetLimbId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink font-semibold"
                >
                  {BASE_BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.pillar}: {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Feature Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-Click Biometric Checkout, Redis Inventory Sync..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink font-medium"
                  >
                    <option value="ideas">Ideas</option>
                    <option value="planned">Planned</option>
                    <option value="building">Building</option>
                    <option value="review">Review</option>
                    <option value="ready">Ready</option>
                    <option value="shipped">Shipped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink font-medium"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Assignee</label>
                <input
                  type="text"
                  placeholder="e.g. Aman Kakkar"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card border border-line rounded-lg focus:outline-none focus:border-brand text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Btn
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Btn>
                <Btn variant="primary" size="sm" type="submit">
                  Sprout on Branch
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
