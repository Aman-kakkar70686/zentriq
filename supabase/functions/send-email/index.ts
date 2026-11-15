import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resend-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  from?: string;
  reply_to?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: SendEmailRequest = await req.json();

    if (!body.to || !body.subject || !body.html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || req.headers.get("x-resend-key");
    const fromAddress = body.from || Deno.env.get("EMAIL_FROM_ADDRESS") || "Zentriq <notifications@zentriq.ai>";

    const recipients = Array.isArray(body.to) ? body.to : [body.to];

    if (!resendApiKey) {
      // Development simulated delivery when RESEND_API_KEY is not configured
      const simulatedId = "sim_" + Math.random().toString(36).substring(2, 12);
      console.log(`[send-email Edge Function Dev Mode] Dispatched to ${recipients.join(", ")} | Subject: ${body.subject} | ID: ${simulatedId}`);
      return new Response(
        JSON.stringify({
          success: true,
          id: simulatedId,
          mode: "simulated",
          message: "Email queued in simulated development mode. Set RESEND_API_KEY to send live emails.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      from: fromAddress,
      to: recipients,
      subject: body.subject,
      html: body.html,
    };

    if (body.text) payload.text = body.text;
    if (body.cc && body.cc.length > 0) payload.cc = body.cc;
    if (body.reply_to) payload.reply_to = body.reply_to;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-email Edge Function] Resend API error:", resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: resendData.message || "Failed to send email via Resend",
          details: resendData,
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: resendData.id,
        data: resendData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-email Edge Function] Unhandled error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

