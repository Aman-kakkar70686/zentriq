import { useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Sparkles, UserX, Video, X } from 'lucide-react';
import { meetingTime } from '../lib/format';
import { useApp } from '../context/AppContext';
import { Btn, TeamsIcon, TeamsLogo } from './ui';

export default function JoinMeetingModal({ isOpen, onClose, meeting, onScheduleNew, onStopMeeting, toast }) {
  const { openInAppMeeting } = useApp();
  const [customLink, setCustomLink] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(meeting ? 'upcoming' : 'custom');
  const [isLinking, setIsLinking] = useState(false);
  const [teamsLinked, setTeamsLinked] = useState(true); // Connected / Ready status

  if (!isOpen) return null;

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (toast) toast('Teams link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinCustomLink = (e) => {
    e.preventDefault();
    const target = customLink.trim();
    if (!target) return;
    
    // Check if it's already a full URL or add https://
    const url = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    onClose();
    openInAppMeeting({ title: 'Ad-Hoc Video Meeting', roomUrl: url });
  };

  const handleJoinById = (e) => {
    e.preventDefault();
    if (!meetingId.trim()) return;
    // Microsoft Teams meetup-join link format with ID
    const url = `https://teams.microsoft.com/l/meetup-join/19:meeting_${encodeURIComponent(meetingId.trim())}@thread.v2/0?context=${encodeURIComponent(JSON.stringify({ Passcode: passcode.trim() }))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleLaunchTeamsApp = () => {
    // Attempt to launch desktop client protocol
    window.location.href = 'msteams:/';
    if (toast) toast('Opening Microsoft Teams application...');
  };

  const handleLinkTeamsAccount = () => {
    setIsLinking(true);
    setTimeout(() => {
      setIsLinking(false);
      setTeamsLinked(true);
      if (toast) toast('Microsoft Teams account linked successfully');
    }, 1200);
  };

  const teamsMeetingUrl = meeting?.teams_link || 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_zentriq_demo%40thread.v2/0';

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-card border border-line rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card2">
          <div className="flex items-center gap-3">
            <TeamsLogo className="w-7 h-7" />
            <div>
              <h3 className="font-semibold text-base text-ink leading-tight">Join Meeting</h3>
              <p className="text-[12px] text-ink2">Microsoft Teams integration</p>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-line px-6 bg-card">
          {meeting && (
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-3 px-3 text-[13px] font-medium border-b-2 -mb-px transition ${
                activeTab === 'upcoming'
                  ? 'border-[#505AC9] text-[#505AC9] font-semibold'
                  : 'border-transparent text-ink2 hover:text-ink'
              }`}
            >
              Upcoming Meeting
            </button>
          )}
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-3 text-[13px] font-medium border-b-2 -mb-px transition ${
              activeTab === 'custom'
                ? 'border-[#505AC9] text-[#505AC9] font-semibold'
                : 'border-transparent text-ink2 hover:text-ink'
            }`}
          >
            Join with Link or ID
          </button>
          <button
            onClick={() => setActiveTab('teams-app')}
            className={`py-3 px-3 text-[13px] font-medium border-b-2 -mb-px transition ${
              activeTab === 'teams-app'
                ? 'border-[#505AC9] text-[#505AC9] font-semibold'
                : 'border-transparent text-ink2 hover:text-ink'
            }`}
          >
            Teams Connection
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: Upcoming Meeting */}
          {activeTab === 'upcoming' && meeting && (
            <div className="space-y-4">
              <div className="bg-brands/40 border border-[#DCE3D6] rounded-xl p-4.5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-ok animate-pulse"></span>
                    <span className="text-[11px] font-semibold tracking-wider text-sagedk uppercase">UPCOMING IN YOUR SCHEDULE</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink2 bg-card px-2 py-0.5 rounded border border-line">
                    {meeting.participants} participants
                  </span>
                </div>

                <h4 className="text-lg font-semibold text-ink tracking-tight mb-1">{meeting.title}</h4>
                <p className="text-[13px] text-ink2 mb-4">
                  Starts at <span className="text-ink font-medium">{meetingTime(meeting.starts_at)}</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openInAppMeeting(meeting);
                    }}
                    className="w-full sm:flex-1 h-10 rounded-lg bg-brand hover:bg-brandh text-white font-medium text-[13px] inline-flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Video size={16} />
                    <span>Join In-App Video Call</span>
                  </button>

                  <a
                    href={teamsMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition"
                    title="Open in external browser window"
                  >
                    <ExternalLink size={14} className="text-ink2" />
                    <span>External Tab</span>
                  </a>

                  <button
                    onClick={() => handleCopy(teamsMeetingUrl)}
                    className="w-full sm:w-auto h-10 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition"
                    title="Copy Meeting Link"
                  >
                    {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} className="text-ink2" />}
                    <span>{copied ? 'Copied' : 'Copy link'}</span>
                  </button>
                </div>

                {onStopMeeting && (
                  <div className="mt-3.5 pt-3 border-t border-[#DCE3D6] flex items-center justify-between">
                    <span className="text-[12px] text-ink2">Can't attend this meeting?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStopMeeting();
                      }}
                      className="text-[12px] font-medium text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
                    >
                      <UserX size={13} />
                      <span>I'm not available / Stop meeting</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-card2 border border-line text-[12px] text-ink2">
                <Sparkles size={16} className="text-[#505AC9] shrink-0 mt-0.5" />
                <span>
                  This meeting will open in Microsoft Teams. You can join directly from your browser or through the Microsoft Teams desktop client.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Custom link or ID */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <form onSubmit={handleJoinCustomLink} className="space-y-2">
                <label className="block text-[13px] font-medium text-ink">
                  Enter Microsoft Teams Link
                  <div className="mt-1 relative">
                    <input
                      type="url"
                      placeholder="https://teams.microsoft.com/l/meetup-join/..."
                      value={customLink}
                      onChange={(e) => setCustomLink(e.target.value)}
                      className="w-full h-10 rounded-lg border border-line bg-card pl-9 pr-3 text-[13px] outline-none focus:border-[#505AC9] transition font-mono"
                    />
                    <Link2 size={15} className="absolute left-3 top-3 text-ink2" />
                  </div>
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!customLink.trim()}
                    className="h-9 px-4 rounded-lg bg-[#505AC9] hover:bg-[#434BAF] disabled:opacity-50 text-white text-[13px] font-medium transition inline-flex items-center gap-1.5"
                  >
                    <span>Join Link</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </form>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line"></div></div>
                <span className="relative bg-card px-2.5 text-[11px] font-semibold tracking-wider text-mute uppercase">OR JOIN BY MEETING ID</span>
              </div>

              <form onSubmit={handleJoinById} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] text-ink2 mb-1">Meeting ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 293 847 102 938"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-line bg-card px-3 text-[13px] outline-none focus:border-[#505AC9] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[12.5px] text-ink2 mb-1">Passcode (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 7kF9xP"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full h-9 rounded-lg border border-line bg-card px-3 text-[13px] outline-none focus:border-[#505AC9] font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!meetingId.trim()}
                    className="h-9 px-4 rounded-lg bg-card border border-line hover:bg-hov text-ink disabled:opacity-50 text-[13px] font-medium transition inline-flex items-center gap-1.5"
                  >
                    <TeamsIcon className="w-3.5 h-3.5 fill-[#505AC9]" />
                    <span>Join with ID</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Microsoft Teams Integration & App Launcher */}
          {activeTab === 'teams-app' && (
            <div className="space-y-4">
              <div className="bg-card2 border border-line rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeamsLogo className="w-5 h-5" />
                    <span className="text-sm font-semibold text-ink">Microsoft Teams Integration</span>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    teamsLinked ? 'bg-ok/10 text-ok border border-ok/20' : 'bg-amber/10 text-amber border border-amber/20'
                  }`}>
                    {teamsLinked ? 'Teams Ready' : 'Not Linked'}
                  </span>
                </div>

                <p className="text-[12.5px] text-ink2 leading-relaxed">
                  Link with Microsoft 365 / Azure Active Directory to sync upcoming Teams meetings, view attendee presence, and automatically generate Microsoft Teams meeting links for Zentriq.
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleLinkTeamsAccount}
                    disabled={isLinking}
                    className="h-8 px-3 rounded-lg bg-[#505AC9] hover:bg-[#434BAF] text-white text-[12px] font-medium transition inline-flex items-center gap-1.5"
                  >
                    <TeamsIcon className="w-3.5 h-3.5 fill-white" />
                    <span>{isLinking ? 'Connecting Microsoft 365…' : teamsLinked ? 'Re-authorize Microsoft Teams' : 'Connect Microsoft 365'}</span>
                  </button>
                </div>
              </div>

              <div className="border border-line rounded-xl p-4 space-y-2">
                <div className="text-xs font-semibold tracking-wider text-mute uppercase mb-2">Direct Teams Launchers</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleLaunchTeamsApp}
                    className="h-9 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-[12.5px] font-medium inline-flex items-center justify-center gap-2 transition"
                  >
                    <Video size={14} className="text-[#505AC9]" />
                    <span>Open Teams App</span>
                  </button>
                  <a
                    href="https://teams.microsoft.com"
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-3 rounded-lg border border-line bg-card hover:bg-hov text-ink text-[12.5px] font-medium inline-flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink size={14} className="text-ink2" />
                    <span>Open Teams Web</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-line bg-card2 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              if (onScheduleNew) onScheduleNew();
            }}
            className="text-[12.5px] text-brand hover:underline font-medium"
          >
            + Need to schedule instead?
          </button>
          <Btn onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
}
