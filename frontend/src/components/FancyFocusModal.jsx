import { useEffect, useState, useRef } from 'react';
import {
  Target, X, Volume2, VolumeX, Sparkles, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, ShieldAlert, Check,
  Layers, ExternalLink, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Btn, Dot } from './ui';
import { fmtDate, timeAgo } from '../lib/format';

export default function FancyFocusModal({ isOpen, onClose }) {
  const { data, openDrawer, navigateToProjects } = useApp();
  const { user } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [completedItems, setCompletedItems] = useState(new Set());

  const focusList = data?.focus || [];
  const userName = user?.name ? user.name.split(' ')[0] : 'Aman';

  // Speak voice greeting using browser Web Speech API
  const speakFocusBriefing = (force = false) => {
    if (!('speechSynthesis' in window)) return;
    if (speechMuted && !force) return;

    window.speechSynthesis.cancel(); // Stop any previous speech

    const topTasks = focusList.slice(0, 3).map(f => f.title).join(', ');
    const speechText = focusList.length > 0
      ? `Welcome ${userName} sir, today's tasks are: ${topTasks}.`
      : `Welcome ${userName} sir, today's tasks are all completed. You are all clear for today!`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick best English voice if available
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Jenny'))
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;
    };

    setVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Trigger speech when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow user interaction context
      const timer = setTimeout(() => {
        speakFocusBriefing();
      }, 250);
      return () => {
        clearTimeout(timer);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      };
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }, [isOpen, focusList.length]);

  if (!isOpen) return null;

  const toggleMute = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechMuted(true);
    } else {
      setSpeechMuted(false);
      speakFocusBriefing(true);
    }
  };

  const handleMarkDone = (id, e) => {
    e.stopPropagation();
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark frosted backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Fancy Floating Glass Modal */}
      <div className="relative w-full max-w-xl bg-card border border-brand/30 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Glowing Ambient Header Banner */}
        <div className="relative bg-gradient-to-r from-[#174B3A] via-[#1F634D] to-[#174B3A] text-white p-6 overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center shadow-inner">
              <Target size={22} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Priority Briefing
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white leading-tight">
                Welcome {userName} Sir 🌟
              </h2>
            </div>
          </div>

          <p className="text-xs text-emerald-100/90 leading-relaxed max-w-md">
            Here are the critical priority tasks & decision bottlenecks requiring your attention today.
          </p>

          {/* Audio Visualizer Pill */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Sound wave bars */}
              <div className="flex items-center gap-0.5 h-4">
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-4 animate-bounce' : 'h-1.5'}`} />
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-3 animate-pulse delay-75' : 'h-2'}`} />
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-5 animate-bounce delay-150' : 'h-3'}`} />
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-2 animate-pulse delay-100' : 'h-1.5'}`} />
              </div>
              <span className="text-xs font-semibold text-emerald-200">
                {isSpeaking ? 'AI Voice Briefing Active...' : 'Audio Greeting Ready'}
              </span>
            </div>

            <button
              onClick={toggleMute}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition active:scale-95"
            >
              {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isSpeaking ? 'Mute Voice' : 'Replay Audio'}</span>
            </button>
          </div>
        </div>

        {/* Focus Task List Body */}
        <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto">
          {focusList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto border border-emerald-100 shadow-inner">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-sm font-bold text-ink">All Clear Aman Sir!</h4>
              <p className="text-xs text-mute max-w-xs mx-auto">
                No blocked tasks or pending decisions. Your team is on track and moving forward.
              </p>
            </div>
          ) : (
            focusList.map((f, idx) => {
              const isChecked = completedItems.has(f.id);

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    if (f.kind === 'decision') openDrawer('decision', f.ref);
                    else if (f.kind === 'moving') navigateToProjects(f.ref);
                    else openDrawer('task', f.ref);
                    onClose();
                  }}
                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isChecked
                      ? 'bg-slate-50/80 border-slate-200 opacity-60'
                      : f.kind === 'blocked'
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400 hover:shadow-md'
                      : f.kind === 'decision'
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400 hover:shadow-md'
                      : 'bg-card border-line hover:border-brand/40 hover:shadow-md'
                  }`}
                >
                  {/* Complete checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleMarkDone(f.id, e)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition mt-0.5 shrink-0 ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-line hover:border-brand bg-card'
                    }`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </button>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        f.kind === 'blocked'
                          ? 'bg-rose-100 text-rose-800'
                          : f.kind === 'decision'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {f.kind?.toUpperCase() || 'PRIORITY'}
                      </span>
                      {f.project && (
                        <span className="text-[11px] text-mute font-medium truncate">
                          • {f.project}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs font-bold text-ink leading-snug group-hover:text-brand transition ${
                      isChecked ? 'line-through text-mute' : ''
                    }`}>
                      {f.title}
                    </h4>

                    {f.sub && (
                      <p className="text-[11px] text-mute mt-0.5 line-clamp-1">
                        {f.sub}
                      </p>
                    )}
                  </div>

                  {/* Open arrow icon */}
                  <div className="text-mute group-hover:text-brand group-hover:translate-x-0.5 transition shrink-0 self-center">
                    <ArrowRight size={15} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-card2/60 border-t border-line flex items-center justify-between text-xs">
          <span className="text-mute font-medium">
            {focusList.length} total tasks requiring action
          </span>

          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={onClose} className="text-xs">
              Dismiss
            </Btn>
            <Btn
              variant="primary"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              Got it, thanks!
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
