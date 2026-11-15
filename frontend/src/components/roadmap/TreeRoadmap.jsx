import OrganicTreeRoadmap from './OrganicTreeRoadmap';

export default function TreeRoadmap({ project, onUpdateProject, onRefreshProject }) {
  // Only the Organic Tree Roadmap is displayed (Image 3 style) as requested
  return (
    <div className="space-y-4">
      <OrganicTreeRoadmap
        project={project}
        onRefreshProject={onRefreshProject}
      />
    </div>
  );
}
