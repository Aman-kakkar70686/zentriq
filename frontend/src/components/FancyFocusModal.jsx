import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Target, X, Volume2, VolumeX, Sparkles, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, ShieldAlert, Check,
  Layers, ExternalLink, RefreshCw, Volume1
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Btn, Dot } from './ui';
import { fmtDate, timeAgo } from '../lib/format';

// Select natural, clear female voice across Windows, Edge, Chrome, and Mac
const selectFemaleVoice = (voices) => {
  if (!voices || voices.length === 0) return null;

  const enVoices = voices.filter(v => v.lang && v.lang.startsWith('en'));
  const candidatePool = enVoices.length > 0 ? enVoices : voices;

  // Ranked female voice names across platforms:
  // Windows: Zira, Susan, Hazel
  // Edge Natural: Jenny, Aria, Neerja, Swara
  // Chrome: Google US English (Female)
  // Mac/iOS: Samantha, Victoria, Karen
  const preferredFemaleNames = [
    'zira',
    'jenny',
    'aria',
    'google us english',
    'google uk english female',
    'neerja',
    'swara',
    'samantha',
    'victoria',
    'karen',
    'susan',
    'hazel',
    'female'
  ];

  for (const nameKey of preferredFemaleNames) {
    const match = candidatePool.find(v => v.name.toLowerCase().includes(nameKey));
    if (match) return match;
  }

  // Fallback: exclude explicit male voices
  const nonMale = candidatePool.find(v => {
    const n = v.name.toLowerCase();
    return !n.includes('david') && !n.includes('mark') && !n.includes('george') &&
           !n.includes('ravi') && !n.includes('guy') && !n.includes('male') &&
           !n.includes('prabhat');
  });

  return nonMale || candidatePool[0];
};

export default function FancyFocusModal({ isOpen, onClose }) {
  const { data, openDrawer, navigateToProjects } = useApp();
  const { user } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState(-1);
  const [activeVoiceName, setActiveVoiceName] = useState('AI Female Voice');
  const [completedItems, setCompletedItems] = useState(new Set());

  const focusList = data?.focus || [];
  const userName = user?.name ? user.name.split(' ')[0] : 'Aman';

  const hoverTimerRef = useRef(null);

  // Stop all active speech synthesis safely
  const stopAllSpeech = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentSpeakingIndex(-1);
  }, []);

  // 1. Speak ONLY short, crisp Welcome greeting on modal open
  const speakWelcomeGreeting = useCallback((force = false) => {
    if (!('speechSynthesis' in window)) return;
    if (speechMuted && !force) return;

    stopAllSpeech();

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = selectFemaleVoice(voices);
    if (femaleVoice?.name) {
      const cleanName = femaleVoice.name.replace(/Microsoft |Online \(Natural\) |Google |Desktop /g, '').split('-')[0].trim();
      setActiveVoiceName(`${cleanName} (Female)`);
    }

    const greetingText = `Welcome ${userName} sir, here are today's tasks.`;
    const utterance = new SpeechSynthesisUtterance(greetingText);
    utterance.rate = 1.05;
    utterance.pitch = 1.15;
    utterance.lang = 'en-US';
    if (femaleVoice) utterance.voice = femaleVoice;

    setCurrentSpeakingIndex(-1);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [userName, speechMuted, stopAllSpeech]);

  // 2. Speak concise details when user hovers on a specific task
  const speakTaskOnHover = useCallback((f, idx) => {
    if (!('speechSynthesis' in window) || speechMuted) return;

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    hoverTimerRef.current = setTimeout(() => {
      // Cancel previous utterance immediately
      window.speechSynthesis.cancel();

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = selectFemaleVoice(voices);

      // Short, crisp summary of the hovered task
      let speech = f.title;
      if (f.project) speech += ` in ${f.project}.`;
      if (f.context) speech += ` ${f.context}.`;

      const utterance = new SpeechSynthesisUtterance(speech);
      utterance.rate = 1.08; // Fast, responsive, snappy speech
      utterance.pitch = 1.15; // Natural pleasant female pitch
      utterance.lang = 'en-US';
      if (femaleVoice) utterance.voice = femaleVoice;

      setCurrentSpeakingIndex(idx);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
      };

      window.speechSynthesis.speak(utterance);
    }, 120); // 120ms debounce for smooth hovering
  }, [speechMuted]);

  const handleTaskHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  // Trigger only the welcome greeting when modal opens
  useEffect(() => {
    if (isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }

      const timer = setTimeout(() => {
        speakWelcomeGreeting();
      }, 200);

      return () => {
        clearTimeout(timer);
        stopAllSpeech();
      };
    } else {
      stopAllSpeech();
    }
  }, [isOpen, speakWelcomeGreeting, stopAllSpeech]);

  if (!isOpen) return null;

  const toggleMute = () => {
    if (isSpeaking) {
      stopAllSpeech();
      setSpeechMuted(true);
    } else {
      setSpeechMuted(false);
      speakWelcomeGreeting(true);
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
            Hover over any task below to hear its live audio details, or click to review.
          </p>

          {/* Audio Visualizer Pill */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* Sound wave bars */}
              <div className="flex items-center gap-0.5 h-4">
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-4 animate-bounce' : 'h-1.5'}`} />
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-3 animate-pulse delay-75' : 'h-2'}`} />
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-5 animate-bounce delay-150' : 'h-3'}`} />
                <span className={`w-1 rounded-full bg-emerald-300 ${isSpeaking ? 'h-2 animate-pulse delay-100' : 'h-1.5'}`} />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-emerald-200 block leading-tight">
                  {isSpeaking
                    ? (currentSpeakingIndex >= 0 ? `Reading: ${focusList[currentSpeakingIndex]?.title}` : 'Welcome Aman Sir!')
                    : 'Hover over any task to listen'}
                </span>
                <span className="text-[10px] text-emerald-200/70">
                  {activeVoiceName} • Natural Audio
                </span>
              </div>
            </div>

            <button
              onClick={toggleMute}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition active:scale-95 shadow-xs"
            >
              {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isSpeaking ? 'Mute Voice' : 'Replay Welcome'}</span>
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
              const isCurrentlyBeingSpoken = isSpeaking && currentSpeakingIndex === idx;

              return (
                <div
                  key={f.id}
                  onMouseEnter={() => speakTaskOnHover(f, idx)}
                  onMouseLeave={handleTaskHoverLeave}
                  onClick={() => {
                    if (f.kind === 'decision') openDrawer('decision', f.ref);
                    else if (f.kind === 'moving') navigateToProjects(f.ref);
                    else openDrawer('task', f.ref);
                    onClose();
                  }}
                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    isCurrentlyBeingSpoken
                      ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/60 shadow-md scale-[1.01]'
                      : isChecked
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      {isCurrentlyBeingSpoken && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-white animate-pulse">
                          <Volume2 size={11} /> Speaking Now
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs font-bold text-ink leading-snug group-hover:text-brand transition ${
                      isChecked ? 'line-through text-mute' : ''
                    }`}>
                      {f.title}
                    </h4>

                    {f.context && (
                      <p className="text-[11px] text-mute mt-0.5 line-clamp-1">
                        {f.context}
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
