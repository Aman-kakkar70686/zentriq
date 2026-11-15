import { useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Overview from './pages/Overview';
import ProjectWorkspace from './pages/ProjectWorkspace';
import TeamWorkspace from './pages/TeamWorkspace';
import AIPMCopilot from './pages/AIPMCopilot';
import PRDHistory from './pages/PRDHistory';
import RequirementIntelligence from './pages/RequirementIntelligence';
import StoryQAStudio from './pages/StoryQAStudio';
import AIEvaluationStudio from './pages/AIEvaluationStudio';
import EmailCenter from './pages/EmailCenter';
import EmailComposerModal from './components/email/EmailComposerModal';
import InAppMeetingModal from './components/InAppMeetingModal';

function WorkspaceRouter() {
  const { currentView, emailComposerOpen, emailComposerData, closeEmailComposer, activeMeetingRoom, closeInAppMeeting, toast } = useApp();
  
  let content = <Overview />;
  if (currentView === 'projects') {
    content = <ProjectWorkspace />;
  } else if (currentView === 'team') {
    content = <TeamWorkspace />;
  } else if (currentView === 'copilot') {
    content = <AIPMCopilot />;
  } else if (currentView === 'requirement-intelligence') {
    content = <RequirementIntelligence />;
  } else if (currentView === 'story-qa-studio') {
    content = <StoryQAStudio />;
  } else if (currentView === 'ai-evaluation' || currentView === 'placement-showcase') {
    content = <AIEvaluationStudio />;
  } else if (currentView === 'prd-history') {
    content = <PRDHistory />;
  } else if (currentView === 'email-center') {
    content = <EmailCenter />;
  }

  return (
    <>
      {content}
      <EmailComposerModal
        isOpen={emailComposerOpen}
        onClose={closeEmailComposer}
        initialData={emailComposerData}
        toast={toast}
      />
      {activeMeetingRoom && (
        <InAppMeetingModal
          meeting={activeMeetingRoom}
          onClose={closeInAppMeeting}
          toast={toast}
        />
      )}
    </>
  );
}

export default function App() {
  const { token } = useAuth();
  if (!token) return <Login />;
  return (
    <AppProvider>
      <WorkspaceRouter />
    </AppProvider>
  );
}
