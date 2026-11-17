import { useState } from 'react';
import { CalendarPlus, CalendarX, Video } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import ActivityTimeline from '../components/ActivityTimeline';
import CommandPalette from '../components/CommandPalette';
import DeadlineRadar from '../components/DeadlineRadar';
import DecisionCenter from '../components/DecisionCenter';
import Drawer from '../components/Drawer';
import FocusFeed from '../components/FocusFeed';
import JoinMeetingModal from '../components/JoinMeetingModal';
import Metrics from '../components/Metrics';
import NextBestAction from '../components/NextBestAction';
import ProductFlow from '../components/ProductFlow';
import ProjectPulse from '../components/ProjectPulse';
import QuickCreate from '../components/QuickCreate';
import Sidebar from '../components/Sidebar';
import StopMeetingModal from '../components/StopMeetingModal';
import Toast from '../components/Toast';
import TopBar from '../components/TopBar';
import { TeamsIcon } from '../components/ui';

export default function Overview() {
  const { data, error, reload, setCreateType, toast, openInAppMeeting } = useApp();
  const { user, logout } = useAuth();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="transition-all duration-300 lg:ml-60">
        <TopBar />
        <main className="max-w-[1240px] px-4 lg:px-10 pt-9 pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <h1 className="text-[30px] leading-tight font-semibold tracking-tight">Good morning, {(data?.me?.name || user?.name || 'Aman').split(' ')[0]}.</h1>
              <p className="text-[15px] text-ink2 mt-1.5">Here's where your attention is needed today.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                id="btn-schedule-meeting"
                onClick={() => setCreateType('meeting')}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-line bg-card hover:bg-hov text-ink text-[13px] font-medium transition shadow-sm hover:border-ink/20 active:scale-[0.98]"
                title="Schedule a new meeting"
              >
                <CalendarPlus size={15} className="text-brand" />
                <span>Schedule Meeting</span>
              </button>
              <button
                id="btn-join-meeting"
                onClick={() => {
                  if (data?.meeting) {
                    openInAppMeeting(data.meeting);
                  } else {
                    setJoinModalOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-brand hover:bg-brandh text-white text-[13px] font-medium transition shadow-sm hover:shadow-md active:scale-[0.98]"
                title={data?.meeting ? `Join ${data.meeting.title} in Zentriq` : "Join meeting"}
              >
                <Video size={15} />
                <span>Join In-App Meeting</span>
              </button>
              {data?.meeting && (
                <button
                  id="btn-not-available"
                  onClick={() => setStopModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-700 text-[13px] font-medium transition shadow-sm active:scale-[0.98]"
                  title="Stop meeting / I am not available"
                >
                  <CalendarX size={15} />
                  <span>Not Available</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-8 bg-card border border-line rounded-xl p-6">
              <p className="text-amber font-medium">Could not load the dashboard: {error}</p>
              <p className="text-sm text-ink2 mt-1">Check that the API is running and that VITE_API_URL points to it.</p>
              <div className="flex gap-2 mt-4">
                <button onClick={reload} className="h-8 px-3 rounded-lg border border-line text-[13px] font-medium hover:bg-hov">Try again</button>
                <button onClick={logout} className="h-8 px-3 rounded-lg border border-line text-[13px] font-medium hover:bg-hov">Log out</button>
              </div>
            </div>
          )}
          {!data && !error && <p className="mt-8 text-ink2">Loading…</p>}

          {data && (
            <>
              <Metrics metrics={data?.metrics} />
              <NextBestAction
                nba={data?.next_best_action}
                meeting={data?.meeting}
                onStopMeeting={() => setStopModalOpen(true)}
              />
              <div className="grid gap-6 mt-7 lg:grid-cols-2">
                <FocusFeed focus={data?.focus} />
                <DecisionCenter decisions={data?.decisions} />
              </div>
              <ProductFlow flow={data?.flow} bottleneck={data?.bottleneck} />
              <div className="grid gap-6 mt-7 lg:grid-cols-2">
                <ProjectPulse projects={data?.projects} />
                <DeadlineRadar deadlines={data?.deadlines} count={data?.metrics?.deadlines || 0} />
              </div>
              <ActivityTimeline activity={data?.activity} signal={data?.team?.signal} />
            </>
          )}
        </main>
      </div>
      <QuickCreate />
      <Drawer />
      <CommandPalette />
      <Toast />
      <JoinMeetingModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        meeting={data?.meeting}
        onScheduleNew={() => setCreateType('meeting')}
        onStopMeeting={() => setStopModalOpen(true)}
        toast={toast}
      />
      <StopMeetingModal
        isOpen={stopModalOpen}
        onClose={() => setStopModalOpen(false)}
        meeting={data?.meeting}
        reload={reload}
        toast={toast}
      />
    </div>
  );
}
