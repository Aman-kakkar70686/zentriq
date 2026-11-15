import api, { errMsg } from './client';

const GEMINI_LOCAL_KEY = 'pf_gemini_key';

export function getStoredGeminiKey() {
  return localStorage.getItem(GEMINI_LOCAL_KEY) || '';
}

export function setStoredGeminiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem(GEMINI_LOCAL_KEY, key.trim());
  } else {
    localStorage.removeItem(GEMINI_LOCAL_KEY);
  }
}

/**
 * Fetch AI configuration and status.
 */
export async function getAiConfig() {
  try {
    const res = await api.get('/ai/config');
    return res.data;
  } catch (e) {
    return {
      configured: Boolean(getStoredGeminiKey()),
      default_model: 'gemini-2.5-flash',
      supported_models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Primary / Recommended', description: 'Fast, structured, high reasoning' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Fast', description: 'Low latency generation' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', badge: 'Stable Fallback', description: 'Long context window, high stability' },
      ],
    };
  }
}

/**
 * Call Gemini AI to analyze problem statement and generate PRD.
 */
export async function generatePRD({
  projectId,
  featureName,
  problemStatement,
  targetAudience,
  businessObjective,
  additionalContext,
  modelName = 'gemini-2.5-flash',
}) {
  const customKey = getStoredGeminiKey();
  const headers = {};
  if (customKey) {
    headers['X-Gemini-Key'] = customKey;
  }

  // 1. Try backend API endpoint (FastAPI with Gemini 2.5 Flash)
  try {
    const res = await api.post(
      '/ai/generate-prd',
      {
        project_id: projectId,
        feature_name: featureName,
        problem_statement: problemStatement,
        target_audience: targetAudience || null,
        business_objective: businessObjective || null,
        additional_context: additionalContext || null,
        model_name: modelName,
      },
      { headers }
    );
    return res.data;
  } catch (err) {
    // If backend reports missing key and we have a customKey in browser, or if backend is unreachable, try direct call
    const isKeyError = err?.response?.status === 400 && err?.response?.data?.detail?.includes('key');
    if (!customKey && isKeyError) {
      throw new Error('A Gemini API key is required. Please add your key in the AI Copilot settings panel.');
    }

    if (customKey && (isKeyError || err?.code === 'ERR_NETWORK' || !err?.response)) {
      return await directGeminiPRDCall({
        apiKey: customKey,
        projectId,
        featureName,
        problemStatement,
        targetAudience,
        businessObjective,
        additionalContext,
        modelName,
      });
    }

    throw new Error(errMsg(err));
  }
}

/**
 * Direct browser fallback call to Gemini API if backend is unavailable or needs direct testing.
 */
async function directGeminiPRDCall({
  apiKey,
  projectId,
  featureName,
  problemStatement,
  targetAudience,
  businessObjective,
  additionalContext,
  modelName = 'gemini-2.5-flash',
}) {
  const startTime = Date.now();
  const prompt = `You are an elite Principal Technical Product Manager. Generate an exhaustive, professional Product Requirements Document (PRD) in strict JSON format.

Feature / Product Name: ${featureName}
Problem Statement:
${problemStatement}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${businessObjective ? `Business Objective: ${businessObjective}` : ''}
${additionalContext ? `Additional Context & Constraints: ${additionalContext}` : ''}

Strict JSON output format:
{
  "title": "Title",
  "version": "1.0.0",
  "status": "Ready for Engineering Review",
  "executiveSummary": "2-3 paragraphs...",
  "problemStatement": {
    "summary": "...",
    "rootCauses": ["...", "..."],
    "userPainPoints": ["...", "..."],
    "impactAndUrgency": "..."
  },
  "targetAudience": {
    "primaryPersona": "...",
    "secondaryPersona": "...",
    "userNeeds": ["...", "..."]
  },
  "goalsAndSuccessMetrics": {
    "primaryGoal": "...",
    "kpis": [{ "metric": "...", "current": "...", "target": "...", "timeline": "..." }]
  },
  "userStories": [{ "id": "US-01", "asA": "...", "iWantTo": "...", "soThat": "...", "acceptanceCriteria": ["..."] }],
  "functionalRequirements": [{ "id": "FR-01", "title": "...", "description": "...", "priority": "P0", "complexity": "Medium" }],
  "nonFunctionalRequirements": [{ "category": "Performance", "requirement": "..." }],
  "assumptionsAndRisks": [{ "risk": "...", "impact": "High", "mitigation": "..." }],
  "rolloutPlan": [{ "phase": "Phase 1: Alpha", "timeline": "Week 1-2", "scope": "..." }]
}`;

  let activeModel = modelName;
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });

  if (res.status === 404 && activeModel !== 'gemini-1.5-flash') {
    activeModel = 'gemini-1.5-flash';
    url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error status ${res.status}`);
  }

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('No candidate content received from Gemini.');

  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);
  const latencyMs = Date.now() - startTime;
  const tokensUsed = json?.usageMetadata?.totalTokenCount || 0;

  return {
    success: true,
    prd: parsed,
    model_used: activeModel,
    latency_ms: latencyMs,
    tokens_used: tokensUsed,
    project_id: projectId,
    feature_name: featureName,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Save PRD to database.
 */
export async function savePRD(prdData) {
  const res = await api.post('/ai/prds', prdData);
  return res.data;
}

/**
 * Fetch all saved PRDs.
 */
export async function listPRDs(projectId = null) {
  const params = projectId ? { project_id: projectId } : {};
  const res = await api.get('/ai/prds', { params });
  return res.data;
}

/**
 * Fetch single PRD by ID.
 */
export async function getPRD(id) {
  const res = await api.get(`/ai/prds/${id}`);
  return res.data;
}

/**
 * Delete a saved PRD.
 */
export async function deletePRD(id) {
  const res = await api.delete(`/ai/prds/${id}`);
  return res.data;
}

/**
 * Convert PRD functional requirements into actionable project tasks.
 */
export async function convertPRDToTasks(id) {
  const res = await api.post(`/ai/prds/${id}/convert-to-tasks`);
  return res.data;
}

/**
 * Format PRD JSON into beautiful GitHub-compatible Markdown.
 */
export function prdToMarkdown(prd, meta = {}) {
  if (!prd) return '';

  const projectName = meta.projectName || 'Zentriq Project';
  const featureName = meta.featureName || prd.title || 'Feature Specification';
  const modelUsed = meta.modelName || 'Gemini 2.5 Flash';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# ${prd.title || featureName} — Product Requirements Document (PRD)\n\n`;
  md += `**Project:** ${projectName}  \n`;
  md += `**Status:** ${prd.status || 'Ready for Review'} | **Version:** ${prd.version || '1.0.0'}  \n`;
  md += `**Author:** Zentriq AI PM Copilot (${modelUsed})  \n`;
  md += `**Date:** ${dateStr}  \n\n`;
  md += `---\n\n`;

  if (prd.executiveSummary) {
    md += `## 1. Executive Summary\n\n${prd.executiveSummary}\n\n`;
  }

  if (prd.problemStatement) {
    md += `## 2. Problem Statement & Root Cause Analysis\n\n`;
    if (prd.problemStatement.summary) {
      md += `### 2.1 Problem Overview\n${prd.problemStatement.summary}\n\n`;
    }
    if (prd.problemStatement.rootCauses?.length) {
      md += `### 2.2 Root Causes\n`;
      prd.problemStatement.rootCauses.forEach((rc, i) => {
        md += `${i + 1}. ${rc}\n`;
      });
      md += `\n`;
    }
    if (prd.problemStatement.userPainPoints?.length) {
      md += `### 2.3 User Pain Points\n`;
      prd.problemStatement.userPainPoints.forEach((pp) => {
        md += `- ${pp}\n`;
      });
      md += `\n`;
    }
    if (prd.problemStatement.impactAndUrgency) {
      md += `### 2.4 Impact & Urgency\n${prd.problemStatement.impactAndUrgency}\n\n`;
    }
  }

  if (prd.targetAudience) {
    md += `## 3. Target Audience & Personas\n\n`;
    if (prd.targetAudience.primaryPersona) {
      md += `- **Primary Persona:** ${prd.targetAudience.primaryPersona}\n`;
    }
    if (prd.targetAudience.secondaryPersona) {
      md += `- **Secondary Persona:** ${prd.targetAudience.secondaryPersona}\n`;
    }
    if (prd.targetAudience.userNeeds?.length) {
      md += `\n**Core User Needs:**\n`;
      prd.targetAudience.userNeeds.forEach((n) => {
        md += `- ${n}\n`;
      });
    }
    md += `\n`;
  }

  if (prd.goalsAndSuccessMetrics) {
    md += `## 4. Goals & Success Metrics\n\n`;
    if (prd.goalsAndSuccessMetrics.primaryGoal) {
      md += `**Primary Goal:** ${prd.goalsAndSuccessMetrics.primaryGoal}\n\n`;
    }
    if (prd.goalsAndSuccessMetrics.kpis?.length) {
      md += `| Metric | Baseline | Target | Timeline |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      prd.goalsAndSuccessMetrics.kpis.forEach((k) => {
        md += `| ${k.metric || '-'} | ${k.current || '-'} | ${k.target || '-'} | ${k.timeline || '-'} |\n`;
      });
      md += `\n`;
    }
  }

  if (prd.userStories?.length) {
    md += `## 5. User Stories & Acceptance Criteria\n\n`;
    prd.userStories.forEach((us, i) => {
      md += `### ${us.id || `US-0${i + 1}`}\n`;
      md += `**As a** ${us.asA || 'user'}, **I want to** ${us.iWantTo || 'perform action'}, **so that** ${us.soThat || 'I get value'}.\n\n`;
      if (us.acceptanceCriteria?.length) {
        md += `*Acceptance Criteria:*\n`;
        us.acceptanceCriteria.forEach((ac) => {
          md += `- [ ] ${ac}\n`;
        });
        md += `\n`;
      }
    });
  }

  if (prd.functionalRequirements?.length) {
    md += `## 6. Functional Requirements\n\n`;
    md += `| ID | Priority | Title | Complexity | Description |\n`;
    md += `| :--- | :---: | :--- | :---: | :--- |\n`;
    prd.functionalRequirements.forEach((fr) => {
      md += `| ${fr.id || '-'} | **${fr.priority || 'P1'}** | ${fr.title || '-'} | ${fr.complexity || '-'} | ${fr.description || '-'} |\n`;
    });
    md += `\n`;
  }

  if (prd.nonFunctionalRequirements?.length) {
    md += `## 7. Non-Functional Requirements\n\n`;
    prd.nonFunctionalRequirements.forEach((nfr) => {
      md += `- **${nfr.category || 'General'}:** ${nfr.requirement}\n`;
    });
    md += `\n`;
  }

  if (prd.assumptionsAndRisks?.length) {
    md += `## 8. Assumptions, Risks & Mitigations\n\n`;
    md += `| Risk | Impact | Mitigation Strategy |\n`;
    md += `| :--- | :---: | :--- |\n`;
    prd.assumptionsAndRisks.forEach((ar) => {
      md += `| ${ar.risk || '-'} | ${ar.impact || '-'} | ${ar.mitigation || '-'} |\n`;
    });
    md += `\n`;
  }

  if (prd.rolloutPlan?.length) {
    md += `## 9. Phased Rollout Plan\n\n`;
    prd.rolloutPlan.forEach((rp) => {
      md += `### ${rp.phase || 'Phase'} (${rp.timeline || 'TBD'})\n${rp.scope || ''}\n\n`;
    });
  }

  return md;
}

/**
 * Execute AI Requirement Intelligence Engine on an existing PRD.
 */
export async function analysePRDRequirements({ prdId, modelName = 'gemini-2.5-flash' }) {
  const customKey = getStoredGeminiKey();
  const headers = {};
  if (customKey) {
    headers['X-Gemini-Key'] = customKey;
  }

  try {
    const res = await api.post(
      '/ai/analyse-requirements',
      { prd_id: prdId, model_name: modelName },
      { headers }
    );
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

/**
 * List all previous analyses for a PRD.
 */
export async function listPRDAnalyses(prdId) {
  try {
    const res = await api.get(`/ai/analyses/${prdId}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

/**
 * Get detailed analysis by analysis ID.
 */
export async function getAnalysisDetail(analysisId) {
  try {
    const res = await api.get(`/ai/analyses/detail/${analysisId}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

/**
 * Review an individual requirement issue.
 */
export async function reviewIssue(issueId, { review_status, suggested_improvement, resolution_note }) {
  try {
    const res = await api.patch(`/ai/issues/${issueId}`, {
      review_status,
      suggested_improvement,
      resolution_note,
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

/**
 * Apply approved suggestions into the PRD.
 */
export async function applyAcceptedSuggestions(analysisId, { issue_ids, target_version }) {
  try {
    const res = await api.post(`/ai/analyses/${analysisId}/apply-suggestions`, {
      issue_ids,
      target_version,
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

/**
 * Compare two requirement analyses.
 */
export async function compareAnalyses(idA, idB) {
  try {
    const res = await api.get(`/ai/analyses/compare/${idA}/${idB}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

/**
 * Run evaluation against benchmark dataset.
 */
export async function runBenchmarkEvaluation(modelName = 'gemini-2.5-flash') {
  const customKey = getStoredGeminiKey();
  const headers = {};
  if (customKey) {
    headers['X-Gemini-Key'] = customKey;
  }

  try {
    const res = await api.post(
      '/ai/benchmark-evaluation',
      { model_name: modelName },
      { headers }
    );
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}
