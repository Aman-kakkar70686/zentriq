import { Bell, HelpCircle, Menu, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function TopBar() {
  const { setPaletteOpen, setMenuOpen, openDrawer, currentView } = useApp();
  const { user } = useAuth();
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const icon = 'w-8 h-8 rounded-lg grid place-items-center text-ink2 hover:bg-hov';

  const breadcrumbs = {
    overview: { section: 'Workspace', title: 'Overview' },
    team: { section: 'Workspace', title: 'Team Workspace' },
    copilot: { section: 'AI Workspace', title: 'AI PM Copilot' },
    'requirement-intelligence': { section: 'AI Workspace', title: 'Requirement Intelligence' },
    'story-qa-studio': { section: 'AI Workspace', title: 'User Stories & QA' },
    'ai-evaluation': { section: 'AI Workspace', title: 'AI Evaluation & Intelligence' },
    'placement-showcase': { section: 'AI Workspace', title: 'Placement Showcase' },
    'prd-history': { section: 'AI Workspace', title: 'PRD History' },
    'email-center': { section: 'Workspace', title: 'Email & Notification Center' },
  }[currentView] || { section: 'Workspace', title: 'Overview' };

  return (
    <header className="sticky top-0 z-20 h-[52px] bg-canvas/95 border-b border-line grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_minmax(240px,480px)_1fr] items-center gap-4 px-3 lg:px-10">
      <div className="flex items-center gap-2">
        <button className={`${icon} lg:hidden`} onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
        <div className="hidden lg:block text-[13px] text-mute">{breadcrumbs.section} / <b className="text-ink font-semibold">{breadcrumbs.title}</b></div>
      </div>
      <button onClick={() => setPaletteOpen(true)} className="flex items-center gap-2.5 h-9 px-3 rounded-[10px] border border-line bg-card text-mute w-full justify-self-end lg:justify-self-auto hover:border-[#D2D1C6] text-left">
        <Search size={16} />
        <span className="hidden sm:inline text-sm">Find a task, project or person...</span>
        <kbd className="hidden sm:inline ml-auto text-[11px] border border-line rounded px-1.5 bg-card2 text-ink2 font-sans">⌘K</kbd>
      </button>
      <div className="flex items-center justify-end gap-1.5">
        <button className={`${icon} relative`} aria-label="Notifications" onClick={() => openDrawer('activity')}>
          <Bell size={16} /><i className="absolute top-1.5 right-2 w-[7px] h-[7px] rounded-full bg-brand border-[1.5px] border-canvas" />
        </button>
        <button className={`${icon} hidden sm:grid`} aria-label="Help" onClick={() => openDrawer('help')}><HelpCircle size={16} /></button>
        <span className="w-7 h-7 rounded-full bg-line grid place-items-center text-[11px] font-semibold">{initials}</span>
      </div>
    </header>
  );
}
