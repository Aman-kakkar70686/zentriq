import { useState } from 'react';
import { Check, Copy, ExternalLink, Maximize2, Minimize2, PhoneOff, Shield, Users, Video, X } from 'lucide-react';
import { meetingTime } from '../lib/format';

export default function InAppMeetingModal({ meeting, onClose, toast }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!meeting) return null;

  // Resolve room URL
  let roomUrl = meeting.roomUrl || meeting.teams_link || meeting.location || '';
  if (!roomUrl || !roomUrl.startsWith('http')) {
    const slug = (meeting.title || 'room').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);
    roomUrl = `https://meet.jit.si/zentriq-${meeting.id || 'room'}-${slug}`;
  }

  // Ensure Jitsi config flags for clean in-app experience
  const embedUrl = roomUrl.includes('#')
    ? roomUrl
    : `${roomUrl}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    if (toast) toast('Meeting link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    window.open(roomUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-ink/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 transition-all"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full bg-[#111827] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700/60 transition-all duration-200 ${
          isFullscreen ? 'fixed inset-2 sm:inset-4 w-auto h-auto rounded-xl' : 'max-w-5xl h-[86vh]'
        }`}
      >
        {/* Top Meeting Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1F2937] border-b border-gray-700/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Live In-App Meeting
              </span>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-100 truncate leading-tight">
                {meeting.title}
              </h3>
              {meeting.starts_at && (
                <p className="text-[11.5px] text-gray-400 truncate">
                  Scheduled for {meetingTime(meeting.starts_at)}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition border border-gray-600/60"
              title="Copy room link for attendees"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy link'}</span>
            </button>

            <button
              onClick={handleOpenExternal}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition border border-gray-600/60"
              title="Open in new window"
            >
              <ExternalLink size={13} />
              <span className="hidden md:inline">Open in tab</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition border border-gray-600/60"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition shadow-sm ml-1"
              title="Leave meeting"
            >
              <PhoneOff size={13} />
              <span>Leave Call</span>
            </button>
          </div>
        </div>

        {/* Meeting Video Body */}
        <div className="flex-1 bg-black relative flex flex-col min-h-0">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 text-gray-300 gap-3">
              <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400 font-medium">Connecting to Zentriq Video Room…</p>
            </div>
          )}

          <iframe
            src={embedUrl}
            title={`Meeting: ${meeting.title}`}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker-selection"
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0 flex-1"
          />
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-4 py-2 bg-[#1F2937] border-t border-gray-700/80 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-emerald-400" />
            <span>End-to-End Encrypted In-App Video Conference</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Allow camera & microphone when prompted by your browser</span>
          </div>
        </div>
      </div>
    </div>
  );
}

