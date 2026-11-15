import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, GitBranch, GitCommit, GitMerge, GitPullRequest, Github, Link2, RefreshCw, Shield, Sparkles, UserCheck } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Btn } from '../ui';

export default function GitHubTab({ data, members = [], toast }) {
  const [repoOwner, setRepoOwner] = useState(data?.github?.repo_owner || '');
  const [repoName, setRepoName] = useState(data?.github?.repo_name || '');
  const [token, setToken] = useState('');
  const [showConfig, setShowConfig] = useState(!data?.github?.is_connected);
  const [busy, setBusy] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState('');
  const [ghData, setGhData] = useState(null);

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await api.get('/team/github/activity');
      setGhData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!repoOwner.trim() || !repoName.trim()) {
      setError('Please provide both repository owner and repository name');
      return;
    }
    setBusy(true);
    setError('');

    try {
      const res = await api.post('/team/github/config', {
        repo_owner: repoOwner.trim(),
        repo_name: repoName.trim(),
        github_token: token.trim() || null,
      });

      if (toast) toast(`Connected repository: ${res.data.repo}`);
      setShowConfig(false);
      await fetchActivity();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const handleQuickConnect = (owner, repo) => {
    setRepoOwner(owner);
    setRepoName(repo);
    setToken('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Connection Header & Repository Status */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#24292F] text-white flex items-center justify-center shadow-xs">
              <Github size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">GitHub App & Repository Integration</h3>
                <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                  ghData?.is_connected
                    ? 'bg-ok/10 text-ok border-ok/20'
                    : 'bg-amber/10 text-amber border-amber/20'
                }`}>
                  {ghData?.is_connected ? 'Connected' : 'Setup Required'}
                </span>
              </div>
              <p className="text-xs text-ink2 mt-0.5">
                {ghData?.is_connected
                  ? `Live sync active with repository ${ghData.repo}`
                  : 'Connect your GitHub repository to link real commits, PRs, and team members.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ghData?.is_connected && (
              <button
                onClick={fetchActivity}
                disabled={loadingActivity}
                className="h-8 px-2.5 rounded-lg border border-line bg-card hover:bg-hov text-xs font-medium text-ink transition inline-flex items-center gap-1.5"
                title="Refresh GitHub activity"
              >
                <RefreshCw size={13} className={loadingActivity ? 'animate-spin text-brand' : 'text-ink2'} />
                <span>{loadingActivity ? 'Syncing…' : 'Sync Activity'}</span>
              </button>
            )}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="h-8 px-3 rounded-lg border border-line bg-card hover:bg-hov text-xs font-medium text-ink transition"
            >
              {showConfig ? 'Hide Settings' : 'Configure Repository'}
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        {showConfig && (
          <form onSubmit={handleConnect} className="mt-5 pt-4 border-t border-line space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-ink mb-1">
                  Repository Owner / Organization:
                </label>
                <input
                  type="text"
                  placeholder="e.g. facebook or vercel"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  className="w-full h-9 rounded-lg border border-line bg-card2 px-3 text-xs outline-none focus:border-brand font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink mb-1">
                  Repository Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. react or next.js"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-line bg-card2 px-3 text-xs outline-none focus:border-brand font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">
                GitHub Personal Access Token / App Secret (Optional for public repositories):
              </label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Leave empty for public repos)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full h-9 rounded-lg border border-line bg-card2 px-3 text-xs outline-none focus:border-brand font-mono"
              />
              <p className="text-[11px] text-mute mt-1">
                Tokens are transmitted securely and used exclusively to authenticate GitHub REST API requests.
              </p>
            </div>

            {/* Quick Demo Connectors */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-mute">Quick public test repos:</span>
              <button
                type="button"
                onClick={() => handleQuickConnect('facebook', 'react')}
                className="text-[11px] font-medium text-brand hover:underline px-2 py-0.5 rounded bg-card2 border border-line"
              >
                facebook/react
              </button>
              <button
                type="button"
                onClick={() => handleQuickConnect('vercel', 'next.js')}
                className="text-[11px] font-medium text-brand hover:underline px-2 py-0.5 rounded bg-card2 border border-line"
              >
                vercel/next.js
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Btn type="button" onClick={() => setShowConfig(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={busy}>
                {busy ? 'Validating…' : 'Test & Save Repository'}
              </Btn>
            </div>
          </form>
        )}
      </div>

      {/* 2. Team Member GitHub Mapping Status */}
      <div className="bg-card border border-line rounded-xl p-4.5 shadow-xs">
        <h4 className="text-xs font-semibold tracking-wider text-mute uppercase mb-2">
          TEAM MEMBER GITHUB MAPPING
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {members.map((m) => (
            <div key={m.id} className="p-2.5 rounded-lg border border-line bg-card2 flex items-center justify-between text-xs">
              <span className="font-semibold text-ink truncate">{m.name}</span>
              {m.github_username ? (
                <span className="font-mono text-[11px] text-brand font-medium">@{m.github_username}</span>
              ) : (
                <span className="text-[10px] text-mute">Unlinked</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Live Commits & Pull Requests Data */}
      {ghData?.is_connected ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commits Feed */}
          <div className="bg-card border border-line rounded-xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <GitCommit size={16} className="text-brand" />
                <h3 className="text-sm font-semibold text-ink">Recent Real Commits</h3>
              </div>
              <span className="text-xs text-ink2 font-medium">
                {ghData.commits?.length || 0} commits
              </span>
            </div>

            <div className="space-y-2.5 flex-1 max-h-[460px] overflow-y-auto pr-1">
              {ghData.commits?.map((c) => (
                <div key={c.sha} className="p-3 rounded-lg border border-line bg-card2 hover:bg-hov transition text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink leading-tight line-clamp-2">{c.message}</p>
                    <a
                      href={c.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-brand hover:underline shrink-0 inline-flex items-center gap-0.5"
                    >
                      <span>{c.sha}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] text-ink2 pt-1 border-t border-line/60">
                    <div className="flex items-center gap-1.5">
                      {c.author_avatar ? (
                        <img src={c.author_avatar} alt="" className="w-4 h-4 rounded-full" />
                      ) : (
                        <Github size={12} />
                      )}
                      <span className="font-mono text-[11px]">{c.author_login}</span>
                    </div>

                    {c.mapped_member && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand font-medium text-[10.5px]">
                        <UserCheck size={11} />
                        <span>Mapped to {c.mapped_member}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pull Requests Feed */}
          <div className="bg-card border border-line rounded-xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <GitPullRequest size={16} className="text-brand" />
                <h3 className="text-sm font-semibold text-ink">Pull Requests & Reviews</h3>
              </div>
              <span className="text-xs text-ink2 font-medium">
                {ghData.pull_requests?.length || 0} PRs
              </span>
            </div>

            <div className="space-y-2.5 flex-1 max-h-[460px] overflow-y-auto pr-1">
              {ghData.pull_requests?.length > 0 ? (
                ghData.pull_requests.map((pr) => (
                  <div key={pr.number} className="p-3 rounded-lg border border-line bg-card2 hover:bg-hov transition text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-ink hover:text-brand transition leading-tight line-clamp-2"
                      >
                        #{pr.number}: {pr.title}
                      </a>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                        pr.is_merged
                          ? 'bg-purple-100 text-purple-700'
                          : pr.state === 'open'
                          ? 'bg-ok/15 text-ok'
                          : 'bg-line text-ink2'
                      }`}>
                        {pr.is_merged ? 'Merged' : pr.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11.5px] text-ink2 pt-1 border-t border-line/60">
                      <span className="font-mono text-[11px]">By @{pr.author_login}</span>
                      {pr.mapped_member && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand font-medium text-[10.5px]">
                          <UserCheck size={11} />
                          <span>{pr.mapped_member}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-8 text-center text-xs text-ink2">No pull requests found in this repository</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-10 text-center bg-card border border-line rounded-xl space-y-3">
          <Github size={36} className="mx-auto text-ink2 opacity-70" />
          <h4 className="text-base font-semibold text-ink">Connect GitHub to View Real Development Activity</h4>
          <p className="text-xs text-ink2 max-w-md mx-auto">
            Zentriq fetches verified commits, pull requests, and reviews directly from GitHub REST API and maps them to your team members.
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brandh text-white text-xs font-medium transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Connect GitHub Repository</span>
          </button>
        </div>
      )}
    </div>
  );
}
