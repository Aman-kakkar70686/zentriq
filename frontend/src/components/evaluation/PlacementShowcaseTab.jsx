import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Database,
  Download,
  FileCheck2,
  FolderGit2,
  Layers,
  LineChart,
  Play,
  Presentation,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import PresentationBuilderModal from './PresentationBuilderModal';
import { useApp } from '../../context/AppContext';

export default function PlacementShowcaseTab({ overviewData }) {
  const { navigateToCopilot, navigateToRequirementIntelligence, navigateToStoryQA } = useApp();
  const [builderOpen, setBuilderOpen] = useState(false);

  const metrics = overviewData?.metrics || {};
  const hasData = overviewData?.has_data;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero Executive Summary Banner */}
      <div className="bg-gradient-to-br from-[#174B3A] via-[#205844] to-[#2F765A] rounded-3xl p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles size={13} className="text-[#DCE9DF]" />
            Placement & Architecture Showcase
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Zentriq: AI-Powered Product Management Intelligence Platform
          </h1>
          <p className="text-sm sm:text-base text-[#DCE9DF] leading-relaxed">
            From raw problem statement to test-ready engineering execution. An end-to-end enterprise platform combining
            AI PRD authoring, requirement quality scoring, automated user story/QA generation, and empirical evaluation.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setBuilderOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-white text-[#174B3A] text-xs font-bold hover:bg-[#DCE9DF] shadow-sm flex items-center gap-2 transition"
            >
              <Presentation size={15} />
              Open Presentation Builder (18 Slides)
            </button>
            <span className="text-xs text-[#DCE9DF]">
              Fully editable presentation deck with interview speaker notes
            </span>
          </div>
        </div>

        {/* Ambient watermark */}
        <div className="absolute -right-8 -bottom-8 opacity-10 text-white pointer-events-none select-none">
          <Layers size={260} />
        </div>
      </div>

      {/* 1. The Core Problem Statement */}
      <div className="bg-white rounded-2xl border border-[#E5EAE5] p-6 sm:p-7 shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-bold text-[#174B3A] uppercase tracking-wider">The Engineering Problem</span>
          <h2 className="text-lg font-bold text-[#202923] mt-0.5">Why Traditional Product Engineering Fails at Scale</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1.5">
            <span className="text-red-700 font-bold block text-sm">45% Defect Origin</span>
            <p className="font-semibold text-[#202923]">Ambiguous Requirements</p>
            <p className="text-[#78847C] leading-relaxed">
              Industry studies show nearly half of all production bugs originate not in code, but in incomplete,
              contradictory, or subjective requirement specifications.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1.5">
            <span className="text-amber-700 font-bold block text-sm">The Handoff Chasm</span>
            <p className="font-semibold text-[#202923]">Disconnected QA & Dev</p>
            <p className="text-[#78847C] leading-relaxed">
              Engineers make unsupported technical assumptions, while QA teams author test cases post-hoc,
              lacking bi-directional traceability back to business requirements.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1.5">
            <span className="text-[#174B3A] font-bold block text-sm">Unverified AI Copilots</span>
            <p className="font-semibold text-[#202923]">Hallucinated Artifacts</p>
            <p className="text-[#78847C] leading-relaxed">
              Generic LLM chatbots output plausible-sounding user stories that invent database architectures, omit
              boundary edge cases, and provide zero verifiable accuracy benchmarks.
            </p>
          </div>
        </div>
      </div>

      {/* 2. The Complete 4-Stage Workflow Diagram */}
      <div className="bg-white rounded-2xl border border-[#E5EAE5] p-6 sm:p-7 shadow-xs space-y-5">
        <div>
          <span className="text-[11px] font-bold text-[#174B3A] uppercase tracking-wider">End-to-End Workflow</span>
          <h2 className="text-lg font-bold text-[#202923] mt-0.5">The Four Integrated Pillars of Zentriq</h2>
          <p className="text-xs text-[#78847C]">
            Each stage functions as a quality gate ensuring only verified artifacts propagate to the next tier.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Week 1 */}
          <div className="p-4 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] flex flex-col justify-between hover:border-[#174B3A] transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCE9DF] text-[#174B3A]">Week 1</span>
                <Sparkles size={15} className="text-[#174B3A]" />
              </div>
              <h3 className="font-bold text-[#202923] text-sm">AI PM Copilot</h3>
              <p className="text-[#78847C] text-[11px] leading-relaxed">
                Problem analysis, persona synthesis, comprehensive PRD generation, and version tracking.
              </p>
            </div>
            <button
              onClick={navigateToCopilot}
              className="mt-3 text-[11px] font-bold text-[#174B3A] flex items-center gap-1 hover:underline pt-2 border-t border-[#E5EAE5]"
            >
              Open Copilot <ArrowRight size={12} />
            </button>
          </div>

          {/* Week 2 */}
          <div className="p-4 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] flex flex-col justify-between hover:border-[#174B3A] transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCE9DF] text-[#174B3A]">Week 2</span>
                <ShieldCheck size={15} className="text-[#174B3A]" />
              </div>
              <h3 className="font-bold text-[#202923] text-sm">Requirement Intelligence</h3>
              <p className="text-[#78847C] text-[11px] leading-relaxed">
                4-vector defect detection: Missing, Ambiguous, Conflicting, and Incomplete specs with IEEE 830 scoring.
              </p>
            </div>
            <button
              onClick={navigateToRequirementIntelligence}
              className="mt-3 text-[11px] font-bold text-[#174B3A] flex items-center gap-1 hover:underline pt-2 border-t border-[#E5EAE5]"
            >
              Open Intelligence <ArrowRight size={12} />
            </button>
          </div>

          {/* Week 3 */}
          <div className="p-4 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] flex flex-col justify-between hover:border-[#174B3A] transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCE9DF] text-[#174B3A]">Week 3</span>
                <FileCheck2 size={15} className="text-[#174B3A]" />
              </div>
              <h3 className="font-bold text-[#202923] text-sm">Story & QA Studio</h3>
              <p className="text-[#78847C] text-[11px] leading-relaxed">
                INVEST user stories, Gherkin criteria, boundary edge cases, test cases, and bi-directional traceability.
              </p>
            </div>
            <button
              onClick={navigateToStoryQA}
              className="mt-3 text-[11px] font-bold text-[#174B3A] flex items-center gap-1 hover:underline pt-2 border-t border-[#E5EAE5]"
            >
              Open Studio <ArrowRight size={12} />
            </button>
          </div>

          {/* Week 4 */}
          <div className="p-4 rounded-xl border-2 border-[#174B3A] bg-[#174B3A]/5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#174B3A] text-white">Week 4 (Current)</span>
                <LineChart size={15} className="text-[#174B3A]" />
              </div>
              <h3 className="font-bold text-[#174B3A] text-sm">AI Evaluation Lab</h3>
              <p className="text-[#78847C] text-[11px] leading-relaxed">
                Empirical benchmark suite, human-verified ground truth, true precision/recall, and defect analysis.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-bold text-[#174B3A] pt-2 border-t border-[#174B3A]/20">
              Active Module
            </span>
          </div>
        </div>
      </div>

      {/* 3. Verified Technology Stack */}
      <div className="bg-white rounded-2xl border border-[#E5EAE5] p-6 sm:p-7 shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-bold text-[#174B3A] uppercase tracking-wider">Engineering Architecture</span>
          <h2 className="text-lg font-bold text-[#202923] mt-0.5">Verified Full-Stack & AI Infrastructure</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <div className="flex items-center gap-2 text-[#174B3A] font-bold mb-1">
              <Code2 size={16} />
              Frontend Layer
            </div>
            <p className="font-semibold text-[#202923]">React 18 + Vite</p>
            <p className="text-[#78847C] text-[11px]">
              Tailwind CSS, Lucide icons, responsive split-pane workspaces, optimistic UI updates, zero bloated chart libs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <div className="flex items-center gap-2 text-[#2F765A] font-bold mb-1">
              <Server size={16} />
              Backend Service
            </div>
            <p className="font-semibold text-[#202923]">FastAPI + Python 3.11</p>
            <p className="text-[#78847C] text-[11px]">
              SQLAlchemy 2.0 ORM, Pydantic v2 schemas, async HTTPX connection pooling, robust CSV stream exports.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <div className="flex items-center gap-2 text-[#3B82F6] font-bold mb-1">
              <Database size={16} />
              Database & Edge
            </div>
            <p className="font-semibold text-[#202923]">PostgreSQL / SQLite + Supabase</p>
            <p className="text-[#78847C] text-[11px]">
              Deno TypeScript Edge Functions, RLS security policies, audit logging tables, and relational constraints.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <div className="flex items-center gap-2 text-[#10B981] font-bold mb-1">
              <Zap size={16} />
              AI Intelligence
            </div>
            <p className="font-semibold text-[#202923]">Google Gemini 2.5 Flash</p>
            <p className="text-[#78847C] text-[11px]">
              Deterministic temperature=0.2 inference, structured JSON output schemas, and multi-model fallback.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Live Empirical Benchmark Results */}
      <div className="bg-white rounded-2xl border border-[#E5EAE5] p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#174B3A] uppercase tracking-wider">Evaluation Veracity</span>
            <h2 className="text-lg font-bold text-[#202923] mt-0.5">Empirical Evaluation Results (Live Data)</h2>
            <p className="text-xs text-[#78847C]">
              Calculated dynamically from real completed evaluation runs against approved ground truth.
            </p>
          </div>
          <span className="text-xs font-bold text-[#174B3A] bg-[#DCE9DF] px-2.5 py-1 rounded-full">
            Zero Mock Data
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] text-center">
            <span className="text-[#78847C] block mb-1">Precision (Relevance)</span>
            <span className="text-2xl font-bold text-[#174B3A]">
              {hasData && metrics.precision !== null ? `${metrics.precision}%` : 'N/A'}
            </span>
            <span className="text-[10px] text-[#78847C] block mt-1">TP / (TP + FP)</span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] text-center">
            <span className="text-[#78847C] block mb-1">Recall (Completeness)</span>
            <span className="text-2xl font-bold text-[#2F765A]">
              {hasData && metrics.recall !== null ? `${metrics.recall}%` : 'N/A'}
            </span>
            <span className="text-[10px] text-[#78847C] block mt-1">TP / (TP + FN)</span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] text-center">
            <span className="text-[#78847C] block mb-1">Overall F1-Score</span>
            <span className="text-2xl font-bold text-[#202923]">
              {hasData && metrics.f1 !== null ? `${metrics.f1}%` : 'N/A'}
            </span>
            <span className="text-[10px] text-[#78847C] block mt-1">Harmonic Balance</span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] text-center">
            <span className="text-[#78847C] block mb-1">JSON Schema Validity</span>
            <span className="text-2xl font-bold text-[#10B981]">
              {hasData && metrics.json_validity !== null ? `${metrics.json_validity}%` : 'N/A'}
            </span>
            <span className="text-[10px] text-[#78847C] block mt-1">Zero Schema Drift</span>
          </div>
        </div>
      </div>

      {/* 5. Known Limitations & Technical Debt (Engineering Honesty) */}
      <div className="bg-white rounded-2xl border border-[#E5EAE5] p-6 sm:p-7 shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Engineering Honesty</span>
          <h2 className="text-lg font-bold text-[#202923] mt-0.5">Known Limitations & Production Trade-Offs</h2>
          <p className="text-xs text-[#78847C]">
            Transparent disclosure of architectural boundaries and current technical constraints.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
            <p className="font-bold text-amber-900">Context Window Chunking</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Large PRDs exceeding 25 pages require chapter-based token chunking to avoid context truncation during
              whole-document defect analysis.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
            <p className="font-bold text-amber-900">Synchronous Evaluation Latency</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Evaluating 10 complex benchmark scenarios takes ~14-18 seconds. Production scaling requires Celery/Redis
              asynchronous background queueing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
            <p className="font-bold text-amber-900">Semantic Nuance Verification</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              While keyword & INVEST rule validation is automated, human expert review remains strictly required to catch
              subtle domain logic divergences.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Future Scope & Roadmap (Weeks 5-8) */}
      <div className="bg-white rounded-2xl border border-[#E5EAE5] p-6 sm:p-7 shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-bold text-[#174B3A] uppercase tracking-wider">Strategic Vision</span>
          <h2 className="text-lg font-bold text-[#202923] mt-0.5">Future Scope & Platform Roadmap</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <span className="font-bold text-[#174B3A] block">Week 5</span>
            <p className="font-semibold text-[#202923]">Jira & Linear Sync</p>
            <p className="text-[#78847C] text-[11px]">Bi-directional sprint backlog pushing and issue status synchronization.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <span className="font-bold text-[#174B3A] block">Week 6</span>
            <p className="font-semibold text-[#202923]">Automated Test Code</p>
            <p className="text-[#78847C] text-[11px]">Generate ready-to-run Playwright, Cypress, and Pytest test automation scripts.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <span className="font-bold text-[#174B3A] block">Week 7</span>
            <p className="font-semibold text-[#202923]">Multi-LLM Leaderboard</p>
            <p className="text-[#78847C] text-[11px]">Comparative benchmarking across Gemini 2.5 Flash, Claude 3.5 Sonnet, and GPT-4o.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E5EAE5] space-y-1">
            <span className="font-bold text-[#174B3A] block">Week 8</span>
            <p className="font-semibold text-[#202923]">Self-Healing Tests</p>
            <p className="text-[#78847C] text-[11px]">Link CI test failures back to requirement diffs to automatically patch broken assertions.</p>
          </div>
        </div>
      </div>

      {/* Presentation Builder Modal */}
      {builderOpen && (
        <PresentationBuilderModal
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
        />
      )}
    </div>
  );
}

