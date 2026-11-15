import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gemini-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STORY_PROMPT = `You are a Senior Technical Product Manager at Zentriq. Transform approved requirements into structured user stories in strict JSON:
{
  "stories": [
    {
      "story_key": "US-01",
      "title": "Clear concise story title",
      "user_role": "Specific role",
      "functionality": "What functionality they want",
      "business_benefit": "Concrete business benefit",
      "user_story_text": "As a [user role], I want [functionality], So that [business benefit].",
      "business_value": "Critical | High | Medium | Low",
      "priority": "P0 | P1 | P2 | P3",
      "requirement_id": "FR-01",
      "dependencies": [],
      "assumptions": [],
      "open_questions": [],
      "split_reason": null,
      "clarification_item": null
    }
  ]
}`;

const CRITERIA_PROMPT = `You are an expert QA Automation Lead. Transform user stories into Given/When/Then acceptance criteria in strict JSON:
{
  "criteria": [
    {
      "criteria_key": "AC-01",
      "title": "Scenario title",
      "scenario_type": "happy_path | failure_workflow | input_validation | permissions | boundary | business_rule",
      "given": "Given [precondition]",
      "when": "When [action]",
      "then": "Then [verifiable system response]"
    }
  ]
}`;

const EDGE_CASE_PROMPT = `You are a Principal Software Reliability Engineer. Identify edge cases and failure modes in strict JSON:
{
  "edge_cases": [
    {
      "edge_case_key": "EC-01",
      "category": "duplicate_submissions | network_failures | boundary_values | empty_input | session_expiration | permissions",
      "scenario": "Scenario description",
      "trigger_condition": "Specific trigger condition",
      "expected_behaviour": "Handled system response",
      "severity": "Critical | High | Medium | Low",
      "evidence_reference": "Reference to PRD requirement",
      "assumptions": "Underlying assumption",
      "clarification_required": null
    }
  ]
}`;

const QA_TEST_PROMPT = `You are a Senior QA Automation Architect. Transform criteria into actionable QA test cases in strict JSON:
{
  "test_cases": [
    {
      "test_case_key": "TC-01",
      "title": "Verify scenario",
      "category": "positive | negative | boundary | validation | error_handling | integration | security_permission",
      "preconditions": "Preconditions required",
      "test_data": "Specific test data",
      "test_steps": ["1. Step 1", "2. Step 2"],
      "expected_result": "Exact verifiable outcome",
      "priority": "P0 | P1 | P2",
      "risk_level": "Critical | High | Medium | Low"
    }
  ]
}`;

const VALIDATION_PROMPT = `You are an Automated QA Evaluator. Validate the artifact for clarity, testability, and traceability in strict JSON:
{
  "valid": true,
  "quality_score": 88,
  "checks": [
    { "rule": "Rule description", "passed": true, "detail": "Observation" }
  ],
  "semantic_feedback": "Actionable feedback"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const operation = body.operation || "generate_user_stories";
    let model = body.model_name || Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

    const customKey = req.headers.get("x-gemini-key");
    const apiKey = customKey || Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key is required. Pass x-gemini-key header or configure GEMINI_API_KEY secret." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = STORY_PROMPT;
    let userPrompt = "";

    if (operation === "generate_user_stories") {
      systemPrompt = STORY_PROMPT;
      userPrompt = `PRD: ${body.prd_title || "PRD"}\nRequirements: ${JSON.stringify(body.requirements || [])}\nSplit: ${body.split_preference || "balanced"}`;
    } else if (operation === "generate_acceptance_criteria") {
      systemPrompt = CRITERIA_PROMPT;
      userPrompt = `User Story: ${body.story_key} - ${body.story_title}\nStory Text: ${body.user_story_text}\nRequirement Ref: ${body.requirement_id}`;
    } else if (operation === "generate_edge_cases") {
      systemPrompt = EDGE_CASE_PROMPT;
      userPrompt = `User Story: ${body.story_key} - ${body.story_title}\nStory Text: ${body.user_story_text}\nCategories: ${JSON.stringify(body.target_categories || [])}`;
    } else if (operation === "generate_qa_test_cases") {
      systemPrompt = QA_TEST_PROMPT;
      userPrompt = `User Story: ${body.story_key}\nCriteria: ${JSON.stringify(body.criteria || [])}\nCategories: ${JSON.stringify(body.categories || [])}`;
    } else if (operation === "validate_generated_artifact") {
      systemPrompt = VALIDATION_PROMPT;
      userPrompt = `Artifact Type: ${body.artifact_type}\nContent: ${JSON.stringify(body.artifact_content || {})}`;
    }

    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        model_used: model,
        tokens_used: data?.usageMetadata?.totalTokenCount || 0,
        result: parsed,
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

