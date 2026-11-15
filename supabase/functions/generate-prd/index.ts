import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gemini-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRD_SYSTEM_PROMPT = `You are an elite Principal Technical Product Manager who has led product at top-tier tech companies.
Your responsibility is to analyze raw product problem statements, dissect the underlying customer and business friction, and generate a comprehensive, highly structured Product Requirements Document (PRD).

Your output MUST be strictly valid JSON conforming exactly to the following structure:
{
  "title": "Clear, compelling feature or product title",
  "version": "1.0.0",
  "status": "Ready for Engineering Review",
  "executiveSummary": "Concise 2-3 paragraph executive summary of the feature, business context, and expected impact.",
  "problemStatement": {
    "summary": "Core problem description",
    "rootCauses": [
      "Root cause 1",
      "Root cause 2",
      "Root cause 3"
    ],
    "userPainPoints": [
      "User pain point 1",
      "User pain point 2"
    ],
    "impactAndUrgency": "Quantified business impact and why solving this now matters."
  },
  "targetAudience": {
    "primaryPersona": "Name and brief profile of the primary persona",
    "secondaryPersona": "Name and brief profile of secondary persona",
    "userNeeds": [
      "Core user need 1",
      "Core user need 2"
    ]
  },
  "goalsAndSuccessMetrics": {
    "primaryGoal": "The single most important strategic objective.",
    "kpis": [
      {
        "metric": "Key metric name",
        "current": "Estimated baseline value",
        "target": "Target improvement",
        "timeline": "Measurement window e.g. 60 days post-launch"
      }
    ]
  },
  "userStories": [
    {
      "id": "US-01",
      "asA": "user persona",
      "iWantTo": "action they want to perform",
      "soThat": "benefit or value received",
      "acceptanceCriteria": [
        "Criterion 1 (Given... When... Then...)",
        "Criterion 2"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-01",
      "title": "Requirement title",
      "description": "Specific functional capability to be built.",
      "priority": "P0",
      "complexity": "Low | Medium | High"
    }
  ],
  "nonFunctionalRequirements": [
    {
      "category": "Performance | Security | Scalability | Accessibility",
      "requirement": "Specific non-functional constraint or requirement."
    }
  ],
  "assumptionsAndRisks": [
    {
      "risk": "Identified risk description",
      "impact": "Low | Medium | High",
      "mitigation": "Actionable mitigation strategy"
    }
  ],
  "rolloutPlan": [
    {
      "phase": "Phase 1: Alpha / Internal Dogfooding",
      "timeline": "Week 1-2",
      "scope": "Scope description"
    },
    {
      "phase": "Phase 2: Beta Rollout",
      "timeline": "Week 3",
      "scope": "Scope description"
    },
    {
      "phase": "Phase 3: General Availability (GA)",
      "timeline": "Week 4",
      "scope": "Scope description"
    }
  ]
}

Provide realistic, insightful, and production-grade content with at least 3-4 User Stories, 4-6 Functional Requirements (covering P0, P1, P2), 4 Non-Functional Requirements, 3 Risks, and 3 Rollout Phases. Ensure all JSON syntax is completely valid without markdown formatting or trailing commas.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      projectId,
      projectName,
      featureName,
      problemStatement,
      targetAudience,
      businessObjective,
      additionalContext,
      modelName,
    } = await req.json();

    if (!problemStatement || !featureName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: featureName and problemStatement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headerKey = req.headers.get("x-gemini-key");
    const apiKey = headerKey || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gemini API key is required. Please set GEMINI_API_KEY secret in Supabase or pass via x-gemini-key header.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let model = modelName || "gemini-2.5-flash";

    let userPrompt = `Generate a comprehensive Product Requirements Document (PRD) for the following product problem:

Project Name: ${projectName || "Default Project"}
Feature / Product Name: ${featureName}
Problem Statement:
${problemStatement}
`;
    if (targetAudience) userPrompt += `\nTarget Audience: ${targetAudience}`;
    if (businessObjective) userPrompt += `\nBusiness Objective: ${businessObjective}`;
    if (additionalContext) userPrompt += `\nAdditional Context & Constraints:\n${additionalContext}`;

    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: PRD_SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    const startTime = Date.now();
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
      const msg = errJson?.error?.message || `Gemini API returned status ${resp.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: "No response text received from Gemini" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsedPRD = JSON.parse(cleaned);
    const latencyMs = Date.now() - startTime;
    const tokensUsed = data?.usageMetadata?.totalTokenCount || 0;

    return new Response(
      JSON.stringify({
        success: true,
        prd: parsedPRD,
        model_used: model,
        latency_ms: latencyMs,
        tokens_used: tokensUsed,
        project_id: projectId,
        project_name: projectName,
        feature_name: featureName,
        generated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal Edge Function Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
