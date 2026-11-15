import { useState } from 'react';
import { AlertCircle, AlertTriangle, Bug, CheckCircle, CheckCircle2, Clock, Filter, Folder, RefreshCw, ShieldCheck, User, Users } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Btn, Dot } from '../ui';

export default function QATestingTab({ data, onReload, toast }) {
  const qa = data?.qa || {};
  const testers = qa.qa_testers || [];
  const testingTasks = qa.testing_tasks || [];
  const bugsReported = qa.bugs_reported || [];
  const bugsAwaitingFixes = qa.bugs_awaiting_fixes || [];
  const retestingQueue = qa.retesting_queue || [];
  const metrics = qa.metrics || {};

  const [updatingId, setUpdatingId] = useState(null);

  const handleUpdateStatus = async (taskId, qaStatus, note = null) => {
    setUpdatingId(taskId);
    try {
      await api.post(`/team/tasks/${taskId}/qa-status`, {
        qa_status: qaStatus,
        note: note || `QA status updated to ${qaStatus}`,
      });
      if (toast) toast(`QA updated: ${qaStatus.toUpperCase()}`);
      if (onReload) await onReload();
    } catch (e) {
      if (toast) toast(errMsg(e));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* 1. QA Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">TEST PASS RATE</span>
            <ShieldCheck size={16} className="text-ok" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ok">{metrics.pass_rate || 85}%</span>
            <span className="text-xs text-ink2">Quality score</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">TOTAL TESTED</span>
            <CheckCircle2 size={16} className="text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{metrics.total_tested || 0}</span>
            <span className="text-xs text-ink2">Completed & validated</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">BUGS AWAITING FIX</span>
            <Bug size={16} className="text-amber" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber">{bugsAwaitingFixes.length}</span>
            <span className="text-xs text-amber font-medium">Action needed</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-line rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-ink2 mb-1">
            <span className="text-[12px] font-semibold tracking-wider uppercase text-mute">RETESTING QUEUE</span>
            <Clock size={16} className="text-sage" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{retestingQueue.length}</span>
            <span className="text-xs text-ink2">Ready for verification</span>
          </div>
        </div>
      </div>

      {/* 2. QA Testers & Project Assignments */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-ink">QA Testers & Coverage</h3>
          </div>
          <span className="text-xs text-ink2 font-medium">{testers.length} QA Engineers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testers.map((t) => (
            <div key={t.id} className="p-3.5 rounded-xl border border-line bg-card2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sage/30 text-sagedk font-semibold grid place-items-center text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <b className="block text-sm font-semibold text-ink">{t.name}</b>
                  <p className="text-xs text-ink2">{t.designation || 'QA Engineer'}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {t.assigned_projects?.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-card border border-line text-ink2 font-medium">
                        <Folder size={10} className="text-brand" />
                        <span>{p}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-ink">{t.active_tasks_count} test items</span>
                <span className="block text-[11px] text-ok mt-0.5">Coverage active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bugs Awaiting Fixes & Retesting Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bugs Reported & Awaiting Fixes */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Bug size={16} className="text-amber" />
              <h3 className="text-sm font-semibold text-ink">Bugs Reported & Awaiting Fixes</h3>
            </div>
            <span className="text-xs font-semibold text-amber bg-amber/10 px-2 py-0.5 rounded-full">
              {bugsAwaitingFixes.length} open
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {bugsAwaitingFixes.length > 0 ? (
              bugsAwaitingFixes.map((b) => (
                <div key={b.id} className="p-3 rounded-lg border border-line bg-card2 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Dot className="bg-amber" />
                      <b className="font-semibold text-ink">{b.title}</b>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      b.bug_severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber/15 text-amber'
                    }`}>
                      {b.bug_severity || 'Defect'}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-ink2 pl-4">
                    Project: <span className="text-ink font-medium">{b.project}</span> · Assigned Developer: <span className="text-ink font-medium">{b.assignee || 'Unassigned'}</span>
                  </p>

                  {b.blocked_reason && (
                    <div className="ml-4 p-2 rounded bg-amber/5 border border-amber/20 text-[11px] text-amber">
                      Issue: {b.blocked_reason}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-xs text-ink2">No open bugs reported</p>
            )}
          </div>
        </div>

        {/* Retesting Queue */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-brand" />
              <h3 className="text-sm font-semibold text-ink">Retesting Queue</h3>
            </div>
            <span className="text-xs text-ink2">{retestingQueue.length} pending review</span>
          </div>

          <div className="space-y-2.5 flex-1">
            {retestingQueue.length > 0 ? (
              retestingQueue.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-line bg-card2 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Dot className="bg-sage" />
                      <b className="font-semibold text-ink">{item.title}</b>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sage/20 text-sagedk">
                      In Review
                    </span>
                  </div>

                  <p className="text-[11.5px] text-ink2 pl-4">
                    {item.project} · Assigned to {item.assignee || 'Unassigned'}
                  </p>

                  <div className="pl-4 flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'passed')}
                      disabled={updatingId === item.id}
                      className="h-7 px-2.5 rounded-md bg-ok hover:bg-ok/90 text-white font-medium text-[11px] transition inline-flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle size={12} />
                      <span>Pass Test</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'failed', 'Defect detected in retesting')}
                      disabled={updatingId === item.id}
                      className="h-7 px-2.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-[11px] transition inline-flex items-center gap-1"
                    >
                      <Bug size={12} />
                      <span>Report Bug</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-xs text-ink2">Retesting queue is clear</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Complete Testing Tasks Overview */}
      <div className="bg-card border border-line rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-ink mb-3">All Active Testing Tasks ({testingTasks.length})</h3>
        <div className="divide-y divide-line">
          {testingTasks.map((t) => (
            <div key={t.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <Dot className={t.qa_status === 'passed' ? 'bg-ok' : t.qa_status === 'failed' ? 'bg-amber' : 'bg-sage'} />
                <span className="font-semibold text-ink truncate">{t.title}</span>
                <span className="text-ink2 bg-card2 px-1.5 py-0.5 rounded border border-line text-[11px]">{t.project}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold uppercase ${
                  t.qa_status === 'passed' ? 'bg-ok/15 text-ok' : t.qa_status === 'failed' ? 'bg-amber/15 text-amber' : 'bg-line text-ink2'
                }`}>
                  {t.qa_status || t.status}
                </span>
                <span className="text-ink2 text-[11px]">Tester: {t.assignee || 'Unassigned'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
