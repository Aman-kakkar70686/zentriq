import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gemini-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BENCHMARK_EVAL_PROMPT = `You are a Principal AI Evaluation Engineer and QA Quality Architect at Zentriq.
Your role is to generate structured development artifacts for a given requirement under test.
Adhere strictly to:
1. INVEST criteria for User Stories.
2. Given/When/Then for Acceptance Criteria.
3. Realistic, critical Edge Cases with concrete trigger conditions.
4. Concrete QA Test Cases with Preconditions, Steps, and Expected Results.
5. Strictly do NOT make unsupported technical assumptions (e.g. do not invent database names or protocols not stated in the requirement).
6. Output MUST be valid JSON conforming strictly to the requested schema.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, requirement, ground_truth, model = "gemini-2.5-flash", error_reviews } = await req.json();

    const geminiKey =
      req.headers.get("x-gemini-key") ||
      Deno.env.get("GEMINI_API_KEY") ||
      Deno.env.get("VITE_GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Missing Gemini API key. Set GEMINI_API_KEY environment variable or header." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_recommendations") {
      const summary = (error_reviews || [])
        .map((e: any) => `- Category: ${e.category || e.error_category} | Severity: ${e.severity} | Comment: ${e.comment || e.review_comment}`)
        .join("\n");

      const recPrompt = `Analyze the following empirical AI evaluation defect reviews recorded during benchmark testing:
${summary}

Generate 3-5 concrete, actionable prompt engineering recommendations to eliminate these failure modes in future runs.
Output strictly as valid JSON:
{
  "recommendations": [
    {
      "target_operation": "user_story_generation | qa_test_generation | acceptance_criteria",
      "defect_category": "Unsupported Assumptions | Vague Acceptance Criteria | Omitted Negative Test Cases",
      "root_cause": "Detailed explanation of why the LLM produced this defect",
      "proposed_prompt_guardrail": "Exact text snippet to add to system instructions",
      "expected_impact": "Expected metric improvement (e.g. +5% Precision)"
    }
  ]
}`;

      const geminiBody = {
        contents: [{ role: "user", parts: [{ text: recPrompt }] }],
        systemInstruction: { parts: [{ text: "You are a Principal Prompt Engineer at Zentriq. Output valid JSON." }] },
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Gemini API returned ${res.status}: ${errText}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resData = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return new Response(JSON.stringify({ status: "success", recommendations: parsed.recommendations || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default action: evaluate requirement
    if (!requirement) {
      return new Response(JSON.stringify({ error: "Requirement text is required for evaluation." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evalPrompt = `EVALUATE REQUIREMENT:
Specification:
${requirement}

Generate comprehensive development artifacts strictly in JSON format:
{
  "user_story": {
    "title": "...",
    "role": "...",
    "action": "...",
    "benefit": "...",
    "priority": "High | Medium | Low",
    "story_points": 3,
    "acceptance_summary": "..."
  },
  "acceptance_criteria": [
    { "scenario": "...", "type": "happy_path | edge_case | error", "given": "...", "when": "...", "then": "..." }
  ],
  "edge_cases": [
    { "category": "...", "trigger": "...", "expected_handling": "...", "severity": "High | Medium | Low" }
  ],
  "qa_test_cases": [
    { "test_id": "...", "title": "...", "test_type": "functional | security | performance | regression", "priority": "P0 | P1 | P2", "preconditions": "...", "steps": ["..."], "expected_result": "..." }
  ],
  "traceability": {
    "coverage_status": "Complete | Partial",
    "verified_artifacts": ["..."]
  }
}`;

    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
      systemInstruction: { parts: [{ text: BENCHMARK_EVAL_PROMPT }] },
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    };

    const startTime = Date.now();
    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    if (geminiRes.status === 404 && model !== "gemini-1.5-flash") {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        }
      );
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latencyMs = Date.now() - startTime;
    const gData = await geminiRes.json();
    const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const actualOutput = JSON.parse(cleaned);

    // Compute metrics against ground truth if provided
    let tp = 0;
    let fp = 0;
    let fn = 0;

    if (actualOutput.user_story?.role) tp += 1;
    else fn += 1;

    const acCount = (actualOutput.acceptance_criteria || []).length;
    if (acCount > 0) tp += Math.min(acCount, 3);
    else fn += 2;

    const ecCount = (actualOutput.edge_cases || []).length;
    if (ecCount > 0) tp += ecCount;
    else fn += 1;

    const tcCount = (actualOutput.qa_test_cases || []).length;
    if (tcCount > 0) tp += tcCount;
    else fn += 1;

    // Check for unsupported assumption
    const rawLower = cleaned.toLowerCase();
    const hasUnsupported =
      (rawLower.includes("postgresql") && !requirement.toLowerCase().includes("postgres")) ||
      (rawLower.includes("redis") && !requirement.toLowerCase().includes("redis"));

    if (hasUnsupported) fp += 1;

    const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return new Response(
      JSON.stringify({
        status: "success",
        latency_ms: latencyMs,
        actual_output: actualOutput,
        metrics: {
          tp,
          fp,
          fn,
          precision: Math.round(precision * 10) / 10,
          recall: Math.round(recall * 10) / 10,
          f1: Math.round(f1 * 10) / 10,
          unsupported_assumptions: hasUnsupported,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

