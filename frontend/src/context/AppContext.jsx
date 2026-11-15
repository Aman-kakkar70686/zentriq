import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { errMsg } from '../api/client';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null); // { type, id }
  const [toastMsg, setToastMsg] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createType, setCreateType] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // mobile sidebar

  // Team workspace navigation
  const [currentView, setCurrentView] = useState('overview'); // 'overview' | 'projects' | 'team' | 'copilot' | 'prd-history' | 'email-center'
  const [teamTab, setTeamTab] = useState('overview'); // 'overview' | 'members' | 'workload' | 'github' | 'qa'
  const [teamExpanded, setTeamExpanded] = useState(false);

  // Project workspace navigation
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const navigateToProjects = useCallback((projectId = null) => {
    setSelectedProjectId(projectId);
    setCurrentView('projects');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  // Email & Notification Center state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailComposerData, setEmailComposerData] = useState({});

  const openEmailComposer = useCallback((initialData = {}) => {
    setEmailComposerData(initialData);
    setEmailComposerOpen(true);
  }, []);

  const closeEmailComposer = useCallback(() => {
    setEmailComposerOpen(false);
  }, []);

  const navigateToEmailCenter = useCallback(() => {
    setCurrentView('email-center');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  // In-App Meeting Room state
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null);

  const openInAppMeeting = useCallback((meeting) => {
    if (!meeting) return;
    let url = meeting.teams_link || meeting.location || '';
    if (!url || !url.startsWith('http')) {
      const slug = (meeting.title || 'room').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);
      url = `https://meet.jit.si/zentriq-${meeting.id || 'room'}-${slug}`;
    }
    setActiveMeetingRoom({
      id: meeting.id,
      title: meeting.title || 'Team Meeting',
      roomUrl: url,
      participants: meeting.participants || 1,
      starts_at: meeting.starts_at,
    });
  }, []);

  const closeInAppMeeting = useCallback(() => {
    setActiveMeetingRoom(null);
  }, []);

  // AI Workspace navigation
  const [aiExpanded, setAiExpanded] = useState(true);
  const [activePrd, setActivePrd] = useState(null);

  const reload = useCallback(async () => {
    try {
      setData((await api.get('/dashboard/overview')).data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('showcase') || hash.includes('showcase')) {
      setCurrentView('ai-evaluation');
      setEvaluationTab('showcase');
    }
  }, []);

  const toast = useCallback((m) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(''), 2400);
  }, []);

  const openDrawer = (type, id = null) => { setMenuOpen(false); setDrawer({ type, id }); };
  const closeDrawer = () => setDrawer(null);

  const navigateToTeam = useCallback((tab = 'overview') => {
    setCurrentView('team');
    setTeamTab(tab);
    setTeamExpanded(true);
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  const navigateToOverview = useCallback(() => {
    setCurrentView('overview');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  const navigateToCopilot = useCallback((prdToLoad = null) => {
    if (prdToLoad) setActivePrd(prdToLoad);
    setCurrentView('copilot');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  const navigateToPrdHistory = useCallback(() => {
    setCurrentView('prd-history');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  const navigateToRequirementIntelligence = useCallback((prdToLoad = null) => {
    if (prdToLoad) setActivePrd(prdToLoad);
    setCurrentView('requirement-intelligence');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  const navigateToStoryQA = useCallback(() => {
    setCurrentView('story-qa-studio');
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  // AI Evaluation navigation
  const [evaluationTab, setEvaluationTab] = useState('overview'); // 'overview' | 'benchmark' | 'runs' | 'quality' | 'showcase'

  const navigateToEvaluation = useCallback((tab = 'overview') => {
    setCurrentView('ai-evaluation');
    setEvaluationTab(tab);
    setDrawer(null);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if (e.key === 'Escape') { setPaletteOpen(false); setDrawer(null); setFabOpen(false); setCreateType(null); return; }
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey) return;
      if (e.key === '/') { e.preventDefault(); setPaletteOpen(true); }
      if (e.key === 'c') setFabOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = {
    data, error, reload, drawer, openDrawer, closeDrawer, toast, toastMsg, paletteOpen, setPaletteOpen,
    createType, setCreateType, fabOpen, setFabOpen, menuOpen, setMenuOpen,
    currentView, setCurrentView, teamTab, setTeamTab, teamExpanded, setTeamExpanded,
    selectedProjectId, setSelectedProjectId, navigateToProjects,
    navigateToTeam, navigateToOverview,
    aiExpanded, setAiExpanded, activePrd, setActivePrd, navigateToCopilot, navigateToPrdHistory,
    navigateToRequirementIntelligence, navigateToStoryQA,
    evaluationTab, setEvaluationTab, navigateToEvaluation,
    emailComposerOpen, emailComposerData, openEmailComposer, closeEmailComposer, navigateToEmailCenter,
    activeMeetingRoom, openInAppMeeting, closeInAppMeeting
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
