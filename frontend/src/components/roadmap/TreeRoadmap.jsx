import { useState } from 'react';
import { GitBranch, ArrowRightLeft } from 'lucide-react';
import HorizontalSprintRoadmap from './HorizontalSprintRoadmap';
import OrganicTreeRoadmap from './OrganicTreeRoadmap';

export default function TreeRoadmap({ project, onUpdateProject, onRefreshProject }) {
  // 'horizontal' (default drag & drop sprint pipeline) | 'organic_tree' (image 3 style botanical tree)
  const [viewMode, setViewMode] = useState('horizontal');

  return (
    <div className="space-y-4">
      {/* Top View Mode Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-line flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-card2/80 p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setViewMode('horizontal')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === 'horizontal'
                ? 'bg-brand text-white shadow-xs'
                : 'text-mute hover:text-ink hover:bg-card'
            }`}
          >
            <ArrowRightLeft size={13} />
            <span>Horizontal Sprint Roadmap (Drag & Drop)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('organic_tree')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === 'organic_tree'
                ? 'bg-brand text-white shadow-xs'
                : 'text-mute hover:text-ink hover:bg-card'
            }`}
          >
            <GitBranch size={13} />
            <span>Organic Tree Canvas (Image 3 Style)</span>
          </button>
        </div>

        <span className="text-xs text-mute font-medium hidden sm:inline">
          {viewMode === 'horizontal'
            ? 'Drag deliverables between pipeline stages'
            : 'Sprout & drag features on tree limbs'}
        </span>
      </div>

      {/* RENDER ACTIVE VIEW */}
      {viewMode === 'horizontal' ? (
        <HorizontalSprintRoadmap
          project={project}
          onRefreshProject={onRefreshProject}
        />
      ) : (
        <OrganicTreeRoadmap
          project={project}
          onRefreshProject={onRefreshProject}
        />
      )}
    </div>
  );
}
