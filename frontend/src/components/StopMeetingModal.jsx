import { useState } from 'react';
import { AlertCircle, CalendarX, Check, Clock, UserX, X } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { meetingTime } from '../lib/format';
import { Btn } from './ui';

export default function StopMeetingModal({ isOpen, onClose, meeting, reload, toast }) {
  const [reasonType, setReasonType] = useState('not_available');
  const [customNote, setCustomNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !meeting) return null;

  const reasons = [
    {
      id: 'not_available',
      title: "I am not available",
      desc: "Mark that you cannot attend. Clears this meeting from your dashboard and notifies your team.",
      icon: UserX,
      color: 'text-amber',
    },
    {
      id: 'cancelled',
      title: "Cancel meeting",
      desc: "Call off this meeting completely for all participants.",
      icon: CalendarX,
      color: 'text-red-500',
    },
    {
      id: 'finished',
      title: "Finished / End meeting",
      desc: "Meeting concluded early or was already held.",
      icon: Clock,
      color: 'text-ok',
    },
  ];

  const handleStopMeeting = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const selectedReasonObj = reasons.find((r) => r.id === reasonType);
    const finalReason = customNote.trim()
      ? `${selectedReasonObj.title} (${customNote.trim()})`
      : selectedReasonObj.title;

    try {
      await api.post(`/meetings/${meeting.id}/cancel`, {
        status: reasonType === 'finished' ? 'completed' : 'cancelled',
        reason: finalReason,
      });

      if (toast) {
        toast(`Meeting stopped: ${selectedReasonObj.title}`);
      }

      if (reload) {
        await reload();
      }

      onClose();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-card border border-line rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <CalendarX size={17} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-ink leading-tight">Stop / Decline Meeting</h3>
              <p className="text-[12px] text-ink2">Update meeting status on dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink2 hover:text-ink hover:bg-hov transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleStopMeeting} className="p-6 space-y-4">
          {/* Target Meeting summary card */}
          <div className="p-3.5 bg-card2 border border-line rounded-xl">
            <small className="block text-[11px] font-semibold tracking-wider text-mute uppercase mb-0.5">TARGET MEETING</small>
            <b className="block text-ink font-semibold text-[14px]">{meeting.title}</b>
            <span className="text-[12.5px] text-ink2">
              Scheduled for {meetingTime(meeting.starts_at)} · {meeting.participants} participants
            </span>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-ink">Select a reason to stop:</label>
            <div className="space-y-2">
              {reasons.map((r) => {
                const Icon = r.icon;
                const isSelected = reasonType === r.id;
                return (
                  <label
                    key={r.id}
                    onClick={() => setReasonType(r.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-brand bg-brands/50'
                        : 'border-line bg-card hover:bg-card2'
                    }`}
                  >
                    <input
                      type="radio"
                      name="meeting_reason"
                      checked={isSelected}
                      onChange={() => setReasonType(r.id)}
                      className="mt-1 accent-brand"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-[13px] text-ink">
                        <Icon size={14} className={r.color} />
                        <span>{r.title}</span>
                      </div>
                      <p className="text-[11.5px] text-ink2 mt-0.5 leading-snug">{r.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[12.5px] text-ink2 mb-1">Additional note (optional):</label>
            <input
              type="text"
              placeholder="e.g. Rescheduling with client, busy in production release..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full h-9 rounded-lg border border-line bg-card px-3 text-[13px] outline-none focus:border-brand"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Btn type="button" onClick={onClose} disabled={busy}>
              Keep Meeting
            </Btn>
            <button
              type="submit"
              disabled={busy}
              className="h-8 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium transition shadow-sm disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              <CalendarX size={14} />
              <span>{busy ? 'Stopping…' : 'Stop Meeting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
