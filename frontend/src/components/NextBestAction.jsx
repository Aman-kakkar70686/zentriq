import { UserX, Video } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { meetingTime } from '../lib/format';
import { Btn, Dot } from './ui';

export default function NextBestAction({ nba, meeting, onStopMeeting }) {
  const { openDrawer, openInAppMeeting } = useApp();
  const dot = { blocked: 'bg-amber', decision: 'bg-brand', review: 'bg-sage', clear: 'bg-ok' }[nba.kind];
  return (
    <div className={`mt-7 grid gap-6 ${meeting ? 'lg:grid-cols-[3fr_2fr]' : ''}`}>
      <div className="flex items-center gap-4 bg-brands border border-[#DCE3D6] border-l-[3px] border-l-brand rounded-xl px-5 py-4">
        <Dot className={dot} />
        <div className="flex-1 min-w-0">
          <small className="block text-[11px] font-semibold tracking-wider text-mute">NEXT BEST ACTION</small>
          <b className="font-semibold">{nba.title}</b> <span className="text-[13px] text-ink2">{nba.text}</span>
        </div>
        {nba.target && <Btn variant="primary" onClick={() => openDrawer(nba.target.type, nba.target.id)}>{nba.action} →</Btn>}
      </div>
      {meeting && (
        <div className="flex items-center gap-4 bg-card border border-line rounded-xl px-5 py-4">
          <div className="flex-1 min-w-0">
            <small className="block text-[11px] font-semibold tracking-wider text-mute">NEXT MEETING</small>
            <b className="font-semibold">{meeting.title}</b>
            <div className="text-[13px] text-ink2">{meetingTime(meeting.starts_at)} · {meeting.participants} participants</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => openInAppMeeting(meeting)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-brand hover:bg-brandh text-white text-[12.5px] font-medium transition shadow-sm"
              title="Join In-App Video Call"
            >
              <Video size={13.5} />
              <span>Join In-App</span>
            </button>
            {onStopMeeting && (
              <button
                onClick={onStopMeeting}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-line bg-card hover:bg-red-50 hover:border-red-200 text-ink2 hover:text-red-600 text-[12.5px] font-medium transition"
                title="Stop meeting / I'm not available"
              >
                <UserX size={13.5} />
                <span className="hidden sm:inline">Not Available</span>
              </button>
            )}
            <Btn onClick={() => openDrawer('meetings')}>Details</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
