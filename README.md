# Zentriq: AI-Powered Product Management Platform

Full-stack enterprise AI Product Management and Development Intelligence Platform.

| Layer | Technology |
|---|---|
| Front end | React 18 + Tailwind CSS (Vite) |
| Back end | Python + FastAPI |
| Database | SQLite / PostgreSQL on Supabase |
| ORM | SQLAlchemy 2.0 |
| AI Copilot | Google Gemini 2.5 Flash |
| Email Service | Resend API Integration |
| Version Control | GitHub Integration (`Aman-kakkar70686/zentriq`) |
| Authentication | JWT |
| API communication | REST + Axios |

```
productflow/
  backend/    FastAPI app  (app/main.py, models.py, routers/, services.py, seed.py)
  frontend/   React app    (src/pages/Overview.jsx, src/components/, src/api/client.js)
```

## 1. Database (Supabase)

1. Create a project at https://supabase.com.
2. Open **Project Settings > Database > Connection string** and copy the URI.
3. You do not need to create tables by hand. The API creates them on first start.

## 2. Back end

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows   (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # Mac/Linux: cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` to your Supabase connection string and `JWT_SECRET` to a long random string.
If you leave `DATABASE_URL` as it is, the app uses a local SQLite file so you can try it without Supabase.

```bash
python -m app.seed              # optional: loads demo projects, tasks and decisions
uvicorn app.main:app --reload   # API on http://localhost:8000  (docs at /docs)
```

Login credentials: **amankakkar70686@gmail.com / aman1234**

## 3. Front end

```bash
cd frontend
npm install
copy .env.example .env          # Mac/Linux: cp .env.example .env
npm run dev                     # http://localhost:5173
```

`VITE_API_URL` in `frontend/.env` must point to the API (default `http://localhost:8000/api`).
If the front end runs on a different address, add it to `CORS_ORIGINS` in `backend/.env`.

## How the Overview works

`GET /api/dashboard/overview` returns everything the screen needs in one call. The rules live in
`backend/app/services.py` and are plain Python, no AI:

- **My Focus**: blocked tasks first, then a pending decision, then a review, then the rest, then what is moving.
- **Next Best Action**: longest blocked task, else the oldest pending decision, else a task waiting for review.
- **Product Flow**: task counts per stage. The bottleneck is the busiest stage between Planned and Ready.
- **Project Pulse**: progress is shipped tasks / all tasks. At Risk means at least one overdue task. Momentum compares tasks completed this week with last week.
- **Team capacity**: one dot per open task. Warns when someone is within one task of `CAPACITY_LIMIT` (8).

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Create account, sign in (returns JWT) |
| GET | /api/auth/me | Current user |
| GET | /api/dashboard/overview | Everything for the Overview page |
| GET / POST | /api/projects | List, create |
| GET | /api/projects/{id} | One project |
| GET / POST | /api/tasks | List (filter `?stage=`, `?project_id=`), create |
| GET / PATCH | /api/tasks/{id} | Read, update |
| POST | /api/tasks/{id}/advance | Move to the next stage |
| POST | /api/tasks/{id}/resolve | Unblock, or approve a task in review |
| POST | /api/tasks/{id}/snooze | Hide from My Focus until tomorrow |
| GET / POST | /api/decisions | List (`?status=pending`), create |
| POST | /api/decisions/{id}/decide | Record the chosen option |
| GET / POST | /api/meetings | Upcoming meetings, schedule one |
| GET | /api/team/capacity, /api/activity, /api/users | Supporting data |
| GET | /api/ai/config | AI configuration status and supported models |
| POST | /api/ai/generate-prd | Analyze problem and generate PRD via Gemini 2.5 Flash |
| GET / POST | /api/ai/prds | List and save generated PRDs |
| GET / DELETE | /api/ai/prds/{id} | Read or delete a saved PRD |
| POST | /api/ai/prds/{id}/convert-to-tasks | Convert PRD functional requirements to project tasks |

## AI Product Manager Copilot (Week 1)

The AI PM Copilot enables Product Managers to input raw product problem statements and generate comprehensive, structured Product Requirements Documents (PRDs) via Google Gemini 2.5 Flash.

### Features
- **Sidebar AI Workspace**: Direct access to AI PM Copilot and PRD History.
- **Problem Input with Presets**: One-click example problem statements (e.g. checkout abandonment, B2B onboarding, notification fatigue).
- **Dual Inference Engine**:
  - **FastAPI Endpoint**: Real Gemini 2.5 Flash inference with JSON Schema validation and fallback to Gemini 1.5 Flash.
  - **Supabase Edge Function**: `supabase/functions/generate-prd/index.ts` for serverless edge deployment.
- **Structured PRD Viewer**: Complete breakdown across 8 sections:
  1. Executive Summary & Root Cause Analysis
  2. Target Personas & Core User Needs
  3. Goals & Measurable KPI Metrics
  4. User Stories & Acceptance Criteria
  5. Prioritized Functional Requirements (P0 / P1 / P2)
  6. Non-Functional Requirements (Security, Performance, etc.)
  7. Assumptions, Risks & Mitigations
  8. Phased Rollout Plan
- **PM Superpowers**:
  - One-click copy and download as GitHub-compatible Markdown (`.md`) or structured JSON.
  - Convert PRD requirements directly into active project tasks in ProductFlow.
  - Audit trail in PRD History with project filtering.
  - In-app Gemini API Key configuration with connection testing.

### Setup Gemini API Key
You can set your Gemini API key in two ways:
1. In `backend/.env`: `GEMINI_API_KEY=your_key_here`
2. In the AI Copilot UI: Click **"Configure Gemini Key"** in the top-right corner to store your key in browser storage.
Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

## AI Requirement Intelligence & Quality Engine (Week 2)

Upgrades the AI PM Copilot with a comprehensive Requirement Intelligence Engine that analyzes existing PRDs to detect requirement defects and compute a transparent Quality Score (0–100).

### Features
- **Defect Detection Across 4 Vectors**:
  1. **Missing Requirements**: Omitted roles, permissions, error handling, security, workflows, and edge cases.
  2. **Ambiguous Requirements**: Non-verifiable adjectives (e.g. "fast", "user-friendly", "full control") with highlighted phrases and measurable recommendations.
  3. **Conflicting Requirements**: Contradictions between statements across auth, permissions, or scope with cross-referenced statements.
  4. **Incomplete Requirements**: Specifications lacking actor, trigger conditions, validation rules, or acceptance criteria.
- **Deterministic Requirement Quality Score (0–100)**:
  - Completeness: 25 points
  - Clarity: 20 points
  - Testability: 20 points
  - Feasibility: 15 points
  - Consistency: 10 points
  - Risk & Dependency Coverage: 10 points
- **Human-in-the-Loop Review**:
  - Accept, Edit, Reject, Mark as Needs Clarification, or Mark as Resolved.
  - Apply accepted improvements to update the PRD into a new version (e.g. `v1.0.0` -> `v1.1.0`).
- **Re-Analysis & Score Improvement Comparison**:
  - Compare previous analysis runs side-by-side with score deltas (e.g. `+18 points`) and category breakdowns.
- **AI Evaluation & Benchmark Test Suite**:
  - Run empirical precision, recall, and F1 calculations against 5 benchmark PRDs.
- **Supabase Edge Function**: `supabase/functions/analyse-prd-requirements/index.ts` for edge deployment.

## GitHub Live Activity Tracking
- **Direct Repository Integration**: Connected to `Aman-kakkar70686/zentriq` via GitHub REST API.
- **Automatic Team Mapping**: Maps commits and pull requests to registered team members (e.g. Aman Kakkar, Alfie Mathew).
- **Dashboard Synchronization**: Real-time commits feed on the Team Workspace tab and automatic activity logging on the Overview Dashboard.

## Notes

- Task stages are Ideas, Planned, Building, Review, Ready and Shipped (the stages shown on the dashboard).
- Tables are created with `Base.metadata.create_all`. For a larger project, add Alembic for migrations.
- Passwords are stored as bcrypt hashes. Tokens expire after `ACCESS_TOKEN_MINUTES`.
