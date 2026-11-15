import { useState, useEffect, useMemo } from 'react';
import {
  Mail, Send, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Search, Filter, ExternalLink, RotateCcw, Eye, ShieldCheck,
  Check, X, Settings2, User, Calendar, CheckSquare, Sparkles,
  Inbox, ChevronRight
} from 'lucide-react';
import {
  getEmailMetrics,
  getEmailLogs,
  getEmailLogDetail,
  retryEmailLog,
  getEmailPreferences,
  updateEmailPreferences
} from '../api/email';
import EmailComposerModal from '../components/email/EmailComposerModal';
import { Btn } from '../components/ui';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Drawer from '../components/Drawer';
import QuickCreate from '../components/QuickCreate';
import CommandPalette from '../components/CommandPalette';
import Toast from '../components/Toast';

export default function EmailCenter({ openDrawer: propOpenDrawer, toast: propToast }) {
  const app = useApp();
  const openDrawer = propOpenDrawer || app?.openDrawer;
  const toast = propToast || app?.toast;
  const [metrics, setMetrics] = useState({
    total_sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    delivery_rate: 100,
    by_type: {},
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Panels
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  // Preferences modal
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    notify_task_assigned: true,
    notify_meeting_invite: true,
    notify_meeting_update: true,
    notify_direct_email: true,
    email_digest: false,
  });
  const [savingPref, setSavingPref] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, logsRes] = await Promise.all([
        getEmailMetrics(),
        getEmailLogs({ limit: 100 }),
      ]);
      setMetrics(metricsRes);
      setLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Error fetching email center data:', err);
      if (toast) toast(err.message || 'Failed to load email logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logs locally based on search and filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'task' && !log.email_type?.startsWith('task_')) return false;
        if (typeFilter === 'meeting' && !log.email_type?.startsWith('meeting_')) return false;
        if (typeFilter === 'direct' && log.email_type !== 'direct') return false;
      }

      // Status filter
      if (statusFilter !== 'all' && log.delivery_status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const recipient = (log.recipient_email || '').toLowerCase();
        const subject = (log.subject || '').toLowerCase();
        const type = (log.email_type || '').toLowerCase();
        return recipient.includes(query) || subject.includes(query) || type.includes(query);
      }

      return true;
    });
  }, [logs, typeFilter, statusFilter, searchTerm]);

  // View Log Detail
  const handleViewDetail = async (log) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const detail = await getEmailLogDetail(log.id);
      setSelectedLog(detail);
    } catch (err) {
      console.warn('Could not load full email body', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Retry Failed Email
  const handleRetry = async (logId) => {
    setRetryingId(logId);
    try {
      await retryEmailLog(logId);
      if (toast) toast('Email retried successfully!');
      await loadData();
      if (detailModalOpen && selectedLog?.id === logId) {
        setDetailModalOpen(false);
      }
    } catch (err) {
      if (toast) toast(err.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  // Open Preferences Modal
  const handleOpenPreferences = async () => {
    setPrefModalOpen(true);
    try {
      const res = await getEmailPreferences();
      if (res?.preferences) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.warn('Could not load email preferences', err);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPref(true);
    try {
      await updateEmailPreferences(preferences);
      if (toast) toast('Notification preferences updated.');
      setPrefModalOpen(false);
    } catch (err) {
      if (toast) toast(err.message || 'Failed to update preferences');
    } finally {
      setSavingPref(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#DCE9DF] text-[#174B3A]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2F765A]" />
            Delivered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Failed
          </span>
        );
      case 'pending':
      case 'sent':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'task_assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CheckSquare className="w-3 h-3 text-blue-500" />
            Task Assigned
          </span>
        );
      case 'task_updated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CheckSquare className="w-3 h-3 text-blue-500" />
            Task Reassigned
          </span>
        );
      case 'meeting_invitation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Calendar className="w-3 h-3 text-purple-500" />
            Meeting Invite
          </span>
        );
      case 'meeting_updated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Calendar className="w-3 h-3 text-indigo-500" />
            Meeting Update
          </span>
        );
      case 'meeting_cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
            <Calendar className="w-3 h-3 text-red-500" />
            Meeting Cancelled
          </span>
        );
      case 'direct':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#DCE9DF]/50 text-[#174B3A] border border-[#DCE9DF]">
            <Mail className="w-3 h-3 text-[#2F765A]" />
            Direct Email
          </span>
        );
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5]">
      <Sidebar />
      <div className="lg:ml-56">
        <TopBar />
        <main className="max-w-[1240px] px-4 lg:px-10 pt-6 pb-24 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#78847C] mb-1">
              <span>Zentriq</span>
              <span>/</span>
              <span className="text-[#174B3A] font-medium">Communication</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#202923] flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-[#174B3A]" />
              Email & Notification Center
            </h1>
            <p className="text-sm text-[#78847C] mt-1">
              Audit, trace, and manage enterprise email communications across tasks, meetings, and team members.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenPreferences}
              className="px-3 py-2 rounded-xl border border-[#E5EAE5] bg-white text-xs font-medium text-[#202923] hover:bg-[#F7F8F5] transition-colors flex items-center gap-1.5 shadow-xs"
              title="Notification Settings"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#78847C]" />
              Preferences
            </button>
            <button
              onClick={loadData}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl border border-[#E5EAE5] bg-white text-xs font-medium text-[#202923] hover:bg-[#F7F8F5] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#78847C] ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setComposerInitial({});
                setComposerOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#174B3A] text-white text-xs font-medium hover:bg-[#2F765A] transition-colors flex items-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Compose Email
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sent */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE5] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#78847C] uppercase tracking-wider">Total Dispatched</div>
              <div className="text-2xl font-bold text-[#202923] mt-1">{metrics.total_sent || 0}</div>
              <div className="text-[11px] text-[#78847C] mt-1 flex items-center gap-1">
                <span>All communication channels</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] flex items-center justify-center text-[#174B3A]">
              <Mail className="w-5 h-5" />
            </div>
          </div>

          {/* Delivered */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE5] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#78847C] uppercase tracking-wider">Delivered</div>
              <div className="text-2xl font-bold text-[#174B3A] mt-1">{metrics.delivered || 0}</div>
              <div className="text-[11px] text-[#2F765A] mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{metrics.delivery_rate || 100}% delivery rate</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#DCE9DF]/50 border border-[#DCE9DF] flex items-center justify-center text-[#174B3A]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Failed */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE5] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#78847C] uppercase tracking-wider">Failed / Undelivered</div>
              <div className={`text-2xl font-bold mt-1 ${metrics.failed > 0 ? 'text-red-600' : 'text-[#202923]'}`}>
                {metrics.failed || 0}
              </div>
              <div className="text-[11px] text-[#78847C] mt-1">
                {metrics.failed > 0 ? 'Review and retry delivery below' : 'Zero delivery anomalies'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE5] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#78847C] uppercase tracking-wider">Pending / In-Queue</div>
              <div className="text-2xl font-bold text-[#202923] mt-1">{metrics.pending || 0}</div>
              <div className="text-[11px] text-[#78847C] mt-1">Provider dispatch status</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EAE5] shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: 'All Channels' },
                { id: 'task', label: 'Tasks' },
                { id: 'meeting', label: 'Meetings' },
                { id: 'direct', label: 'Direct Messages' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    typeFilter === tab.id
                      ? 'bg-[#174B3A] text-white shadow-xs'
                      : 'bg-[#F7F8F5] text-[#78847C] hover:text-[#202923] border border-[#E5EAE5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status & Search */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-[#F7F8F5] border border-[#E5EAE5] text-[#202923] focus:outline-none focus:border-[#174B3A]"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered Only</option>
                <option value="failed">Failed Only</option>
                <option value="pending">Pending Only</option>
              </select>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#78847C]" />
                <input
                  type="text"
                  placeholder="Search recipient or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F8F5] border border-[#E5EAE5] rounded-lg focus:outline-none focus:border-[#174B3A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Email Logs Table */}
        <div className="bg-white rounded-2xl border border-[#E5EAE5] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5EAE5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#202923]">Delivery Audit Trail</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F7F8F5] border border-[#E5EAE5] text-[#78847C]">
                {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}
              </span>
            </div>
            {typeFilter !== 'all' || statusFilter !== 'all' || searchTerm ? (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs text-[#2F765A] hover:underline"
              >
                Reset Filters
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#78847C]">
              <div className="w-6 h-6 border-2 border-[#174B3A]/30 border-t-[#174B3A] rounded-full animate-spin mx-auto mb-2" />
              Loading email logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center">
              <Inbox className="w-10 h-10 text-[#78847C]/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#202923]">No Email Records Found</h3>
              <p className="text-xs text-[#78847C] max-w-sm mx-auto mt-1">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No email records match the selected filters.'
                  : 'Emails dispatched automatically on task assignment, meeting scheduling, or direct messages will appear here.'}
              </p>
              <button
                onClick={() => {
                  setComposerInitial({});
                  setComposerOpen(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#174B3A] text-white text-xs font-medium hover:bg-[#2F765A] transition-colors inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Compose First Email
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5EAE5] bg-[#F7F8F5]/60 text-[11px] font-semibold text-[#78847C] uppercase tracking-wider">
                    <th className="py-3 px-5">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Dispatched By</th>
                    <th className="py-3 px-4">Sent At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAE5] text-xs">
                  {filteredLogs.map((log) => {
                    return (
                      <tr key={log.id} className="hover:bg-[#F7F8F5]/50 transition-colors group">
                        {/* Recipient */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#174B3A]/10 text-[#174B3A] font-semibold text-xs grid place-items-center shrink-0">
                              {(log.recipient_email || 'U').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="truncate max-w-[180px]">
                              <div className="font-medium text-[#202923] truncate">
                                {log.recipient_email}
                              </div>
                              {log.cc && (
                                <div className="text-[10px] text-[#78847C] truncate">
                                  CC: {log.cc}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <div className="font-medium text-[#202923] truncate" title={log.subject}>
                            {log.subject}
                          </div>
                          {log.error_message && (
                            <div className="text-[10px] text-red-600 truncate mt-0.5" title={log.error_message}>
                              Error: {log.error_message}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getTypeBadge(log.email_type)}
                        </td>

                        {/* Sender */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#78847C]">
                          {log.sender_name || 'System Automation'}
                        </td>

                        {/* Sent At */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#78847C]">
                          {formatDate(log.sent_at || log.created_at)}
                        </td>

                        {/* Delivery Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(log.delivery_status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewDetail(log)}
                              className="px-2.5 py-1 rounded-lg border border-[#E5EAE5] bg-white hover:bg-[#F7F8F5] text-[11px] font-medium text-[#202923] transition-colors flex items-center gap-1 shadow-2xs"
                              title="View Email Contents"
                            >
                              <Eye className="w-3 h-3 text-[#78847C]" />
                              Preview
                            </button>

                            {log.delivery_status === 'failed' && (
                              <button
                                onClick={() => handleRetry(log.id)}
                                disabled={retryingId === log.id}
                                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[11px] font-medium text-red-700 transition-colors flex items-center gap-1"
                                title="Retry sending"
                              >
                                <RotateCcw className={`w-3 h-3 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                                Retry
                              </button>
                            )}

                            {log.related_task_id && openDrawer && (
                              <button
                                onClick={() => openDrawer('task', { id: log.related_task_id })}
                                className="p-1 rounded-lg hover:bg-black/5 text-[#78847C] hover:text-[#174B3A]"
                                title="View Linked Task"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {log.related_meeting_id && openDrawer && (
                              <button
                                onClick={() => openDrawer('meetings')}
                                className="p-1 rounded-lg hover:bg-black/5 text-[#78847C] hover:text-[#174B3A]"
                                title="View Linked Meeting"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </main>
      </div>

      {/* Email Composer Modal */}
      <EmailComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialData={composerInitial}
        onSent={() => loadData()}
        toast={toast}
      />

      {/* Email Details / Preview Modal */}
      {detailModalOpen && selectedLog && (
        <div
          className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
          onMouseDown={(e) => e.target === e.currentTarget && setDetailModalOpen(false)}
        >
          <div className="w-full max-w-2xl bg-white border border-[#E5EAE5] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAE5] bg-[#F7F8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#174B3A] text-white flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#202923]">Email Audit Log</h3>
                  <div className="text-[11px] text-[#78847C]">ID: {selectedLog.id}</div>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-[#78847C] hover:text-[#202923] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Meta Grid */}
              <div className="bg-[#F7F8F5] p-3.5 rounded-xl border border-[#E5EAE5] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#78847C]">Recipient:</span>
                  <div className="font-semibold text-[#202923] truncate">{selectedLog.recipient_email}</div>
                </div>
                <div>
                  <span className="text-[#78847C]">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedLog.delivery_status)}</div>
                </div>
                <div>
                  <span className="text-[#78847C]">Dispatched By:</span>
                  <div className="font-medium text-[#202923]">{selectedLog.sender_name || 'System Automation'}</div>
                </div>
                <div>
                  <span className="text-[#78847C]">Timestamp:</span>
                  <div className="font-medium text-[#202923]">{formatDate(selectedLog.sent_at || selectedLog.created_at)}</div>
                </div>
                {selectedLog.provider_message_id && (
                  <div className="col-span-2">
                    <span className="text-[#78847C]">Provider Message ID:</span>
                    <div className="font-mono text-[11px] text-[#202923] truncate">{selectedLog.provider_message_id}</div>
                  </div>
                )}
                {selectedLog.error_message && (
                  <div className="col-span-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    <strong>Error Message:</strong> {selectedLog.error_message}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <span className="text-xs font-semibold text-[#78847C] block mb-1">Subject</span>
                <div className="text-sm font-semibold text-[#202923] p-2.5 bg-[#F7F8F5] rounded-xl border border-[#E5EAE5]">
                  {selectedLog.subject}
                </div>
              </div>

              {/* Rendered HTML / Body */}
              <div>
                <span className="text-xs font-semibold text-[#78847C] block mb-1">Email Body Preview</span>
                {loadingDetail ? (
                  <div className="p-8 text-center text-xs text-[#78847C]">
                    <div className="w-5 h-5 border-2 border-[#174B3A]/30 border-t-[#174B3A] rounded-full animate-spin mx-auto mb-2" />
                    Loading body content...
                  </div>
                ) : selectedLog.email_body ? (
                  <div className="border border-[#E5EAE5] rounded-xl overflow-hidden bg-white">
                    <iframe
                      srcDoc={selectedLog.email_body}
                      title="Email Preview"
                      className="w-full h-[320px] border-none"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#78847C] bg-[#F7F8F5] rounded-xl border border-[#E5EAE5]">
                    No HTML body recorded for this entry.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-[#E5EAE5] bg-[#F7F8F5]">
              <div>
                {selectedLog.delivery_status === 'failed' && (
                  <button
                    onClick={() => handleRetry(selectedLog.id)}
                    disabled={retryingId === selectedLog.id}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${retryingId === selectedLog.id ? 'animate-spin' : ''}`} />
                    Retry Delivery
                  </button>
                )}
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-[#E5EAE5] bg-white text-xs font-medium text-[#202923] hover:bg-[#F7F8F5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {prefModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
          onMouseDown={(e) => e.target === e.currentTarget && setPrefModalOpen(false)}
        >
          <div className="w-full max-w-md bg-white border border-[#E5EAE5] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAE5] bg-[#F7F8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#174B3A] text-white flex items-center justify-center">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#202923]">Notification Preferences</h3>
                  <div className="text-[11px] text-[#78847C]">Customize your personal email triggers</div>
                </div>
              </div>
              <button
                onClick={() => setPrefModalOpen(false)}
                className="p-1.5 rounded-lg text-[#78847C] hover:text-[#202923] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                {
                  key: 'notify_task_assigned',
                  label: 'Task Assignments',
                  desc: 'Receive emails when a new task is assigned or reassigned to you.',
                },
                {
                  key: 'notify_meeting_invite',
                  label: 'Meeting Invitations',
                  desc: 'Receive invitation emails when scheduled as a meeting attendee.',
                },
                {
                  key: 'notify_meeting_update',
                  label: 'Meeting Updates & Cancellations',
                  desc: 'Receive notices if meeting times, agendas, or statuses change.',
                },
                {
                  key: 'notify_direct_email',
                  label: 'Direct Team Communications',
                  desc: 'Receive direct emails composed by managers and peers.',
                },
                {
                  key: 'email_digest',
                  label: 'Daily Summary Digest',
                  desc: 'Receive a daily morning overview of open tasks and meetings.',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F7F8F5] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!preferences[item.key]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="mt-1 rounded text-[#174B3A] focus:ring-[#174B3A] h-4 w-4 border-[#E5EAE5]"
                  />
                  <div>
                    <div className="text-xs font-medium text-[#202923]">{item.label}</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#E5EAE5] bg-[#F7F8F5]">
              <button
                type="button"
                onClick={() => setPrefModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5EAE5] bg-white text-xs font-medium text-[#78847C] hover:text-[#202923]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPref}
                className="px-4 py-1.5 rounded-xl bg-[#174B3A] text-white text-xs font-medium hover:bg-[#2F765A] transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {savingPref ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Drawer />
      <QuickCreate />
      <CommandPalette />
      <Toast />
    </div>
  );
}
