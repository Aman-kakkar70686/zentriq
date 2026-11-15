import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gemini-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIREMENT_ANALYSIS_SYSTEM_PROMPT = `You are an elite Principal Business Analyst and Lead Requirements Quality Reviewer at a top-tier technology firm.
Your responsibility is to critically evaluate a Product Requirements Document (PRD) across four defect vectors:

1. MISSING REQUIREMENTS:
Identify important gaps relevant to the product context: user roles/permissions, business rules, workflows, validation, error handling, security, performance, success metrics, and dependencies.
Only report gaps genuinely relevant to this specific product context.
Distinguish:
- "confirmed" missing information
- "potential" missing information
- "needs_clarification" (requires PM decision)

2. AMBIGUOUS REQUIREMENTS:
Identify requirements that are unclear, subjective, vague, or non-verifiable.
Examples: "system should be fast", "users should have an easy experience", "full control", "promptly", "clean UI".
For each issue: identify the ambiguous phrase, explain why it cannot be tested objectively, suggest a concrete verifiable alternative without inventing arbitrary metrics, and ask a clarification question.

3. CONFLICTING REQUIREMENTS:
Identify genuine contradictions or conflicting constraints between statements across user roles, permissions, auth, business rules, workflow steps, data requirements, or non-functional criteria.
You MUST identify BOTH statements (Statement A and Statement B) with their requirement references and explain why they cannot coexist. Distinguish genuine contradictions from conditional rules.

4. INCOMPLETE REQUIREMENTS:
Identify functional requirements lacking essential criteria: actor, trigger condition, expected result, business rules, validation, edge cases, error handling, or acceptance criteria.
Suggest missing acceptance criteria in Given-When-Then format.

Output MUST be strictly valid JSON conforming exactly to this structure:
{
  "missingRequirements": [
    {
      "id": "MISS-01",
      "title": "Clear short title of missing requirement",
      "category": "error_handling | security | permissions | validation | workflow | performance | data",
      "severity": "Critical | High | Medium | Low",
      "section": "PRD section where this belongs",
      "confidence": "confirmed | potential | needs_clarification",
      "explanation": "Detailed explanation of what is missing",
      "whyItMatters": "Business or engineering risk if not specified",
      "suggestedRequirement": "Concrete requirement text ready to add to the PRD",
      "clarificationQuestion": "Targeted question for the PM to clarify requirements",
      "evidence": "Evidence showing the gap in the current PRD"
    }
  ],
  "ambiguousRequirements": [
    {
      "id": "AMB-01",
      "requirementReference": "Requirement ID or section e.g. FR-02 or NFR-01",
      "originalText": "Exact text containing ambiguity",
      "ambiguousPhrase": "Specific ambiguous word or phrase",
      "severity": "Critical | High | Medium | Low",
      "explanation": "Why this phrase is subjective or difficult to test",
      "suggestedImprovement": "Clear, specific, verifiable replacement requirement",
      "clarificationQuestion": "Clarification question if exact metric target is unknown",
      "evidence": "Supporting context from the PRD"
    }
  ],
  "conflictingRequirements": [
    {
      "id": "CONF-01",
      "requirementRefA": "ID of Requirement A",
      "statementA": "Exact text of statement A",
      "requirementRefB": "ID of Requirement B",
      "statementB": "Exact text of statement B",
      "conflictType": "genuine | conditional",
      "severity": "Critical | High | Medium | Low",
      "explanation": "Why statement A and statement B contradict each other",
      "potentialImpact": "Technical or product failure if implemented as-is",
      "suggestedResolution": "Suggested compromise or rule adjustment",
      "clarificationRequired": "Question asking PM to choose or clarify condition",
      "evidence": "Cross-reference comparison"
    }
  ],
  "incompleteRequirements": [
    {
      "id": "INC-01",
      "requirementReference": "Requirement ID e.g. FR-01",
      "originalText": "Original requirement statement",
      "severity": "Critical | High | Medium | Low",
      "missingElements": ["Trigger Condition", "Validation Rules", "Acceptance Criteria", "Error Handling"],
      "explanation": "What specific operational criteria are absent",
      "suggestedImprovement": "Complete requirement specifying actor, trigger, and expected result",
      "suggestedAcceptanceCriteria": ["Given [context], When [action], Then [outcome]"],
      "evidence": "Missing elements in current formulation"
    }
  ],
  "assessmentSummary": {
    "prdTitle": "Title",
    "totalRequirementsAnalyzed": 12,
    "completenessObservation": "Observations on completeness",
    "clarityObservation": "Observations on clarity",
    "consistencyObservation": "Observations on consistency",
    "testabilityObservation": "Observations on testability"
  }
}`;

function calculateScores(analysisData: any, prdContent: any) {
  const missing = analysisData.missingRequirements || [];
  const ambiguous = analysisData.ambiguousRequirements || [];
  const conflicting = analysisData.conflictingRequirements || [];
  const incomplete = analysisData.incompleteRequirements || [];

  const weight: Record<string, number> = { Critical: 1.0, High: 0.6, Medium: 0.35, Low: 0.15 };

  // 1. Completeness (25)
  let comp = 25.0;
  for (const m of missing) {
    comp -= 5.0 * (weight[m.severity] || 0.35);
  }
  for (const inc of incomplete) {
    if ((inc.missingElements || []).some((e: string) => e.includes("Validation") || e.includes("Error"))) {
      comp -= 1.0;
    }
  }
  comp = Math.max(0, Math.min(25, Math.round(comp * 10) / 10));

  // 2. Clarity (20)
  let clar = 20.0;
  for (const amb of ambiguous) {
    clar -= 4.0 * (weight[amb.severity] || 0.35);
  }
  clar = Math.max(0, Math.min(20, Math.round(clar * 10) / 10));

  // 3. Testability (20)
  let test = 20.0;
  for (const inc of incomplete) {
    test -= 3.5 * (weight[inc.severity] || 0.35);
  }
  test = Math.max(0, Math.min(20, Math.round(test * 10) / 10));

  // 4. Feasibility (15)
  let feas = 15.0;
  for (const m of missing) {
    if (["security", "performance", "integration"].includes(m.category) && ["Critical", "High"].includes(m.severity)) {
      feas -= 2.0;
    }
  }
  feas = Math.max(0, Math.min(15, Math.round(feas * 10) / 10));

  // 5. Consistency (10)
  let cons = 10.0;
  for (const c of conflicting) {
    cons -= 3.5 * (weight[c.severity] || 0.35);
  }
  cons = Math.max(0, Math.min(10, Math.round(cons * 10) / 10));

  // 6. Risk & Dependencies (10)
  let risk = 10.0;
  if (!(prdContent.assumptionsAndRisks && prdContent.assumptionsAndRisks.length > 0)) {
    risk -= 4.0;
  }
  risk = Math.max(0, Math.min(10, Math.round(risk * 10) / 10));

  const total = Math.max(0, Math.min(100, Math.round(comp + clar + test + feas + cons + risk)));

  let label = "Needs Improvement";
  if (total >= 90) label = "Excellent";
  else if (total >= 75) label = "Good";
  else if (total >= 60) label = "Needs Improvement";
  else if (total >= 40) label = "Poor";
  else label = "Critical";

  const allIssues = [...missing, ...ambiguous, ...conflicting, ...incomplete];
  const bySeverity: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const iss of allIssues) {
    const s = iss.severity || "Medium";
    if (bySeverity[s] !== undefined) bySeverity[s]++;
  }

  return {
    overall_score: total,
    score_label: label,
    category_scores: {
      completeness: { score: comp, max_score: 25, percentage: Math.round((comp / 25) * 100) },
      clarity: { score: clar, max_score: 20, percentage: Math.round((clar / 20) * 100) },
      testability: { score: test, max_score: 20, percentage: Math.round((test / 20) * 100) },
      feasibility: { score: feas, max_score: 15, percentage: Math.round((feas / 15) * 100) },
      consistency: { score: cons, max_score: 10, percentage: Math.round((cons / 10) * 100) },
      risk_dependencies: { score: risk, max_score: 10, percentage: Math.round((risk / 10) * 100) },
    },
    issue_summary: {
      total_issues: allIssues.length,
      missing_count: missing.length,
      ambiguous_count: ambiguous.length,
      conflicting_count: conflicting.length,
      incomplete_count: incomplete.length,
      by_severity: bySeverity,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prdId, prdTitle, problemStatement, prdContent, modelName } = await req.json();

    if (!prdContent) {
      return new Response(JSON.stringify({ error: "Missing required prdContent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headerKey = req.headers.get("x-gemini-key");
    const apiKey = headerKey || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key is required. Please set secret or pass x-gemini-key header." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let model = modelName || "gemini-2.5-flash";

    const promptText = `Analyze the following Product Requirements Document (PRD) for defects:
PRD TITLE: ${prdTitle || "PRD"}
PROBLEM: ${problemStatement || "N/A"}
CONTENT:
${JSON.stringify(prdContent, null, 2)}
`;

    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: REQUIREMENT_ANALYSIS_SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.15, responseMimeType: "application/json" },
    };

    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (resp.status === 404 && model !== "gemini-1.5-flash") {
      model = "gemini-1.5-flash";
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    }

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: errJson?.error?.message || `Status ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: "Empty response received from Gemini" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    const scoreData = calculateScores(parsed, prdContent);

    return new Response(
      JSON.stringify({
        success: true,
        prd_id: prdId,
        prd_title: prdTitle,
        model_used: model,
        overall_score: scoreData.overall_score,
        score_label: scoreData.score_label,
        category_scores: scoreData.category_scores,
        issue_summary: scoreData.issue_summary,
        parsed_analysis: parsed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Edge Function Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
