import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_MAP: Record<string, number> = {
  personal: 600,
  creator: 1800,
  studio: 5000,
  flex: 125,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { sessionId } = await req.json();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripe = new Stripe(stripeKey!, { apiVersion: "2023-10-16" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const plan = session.metadata?.plan;
    const creditsToAdd = CREDITS_MAP[plan] || 0;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already credited
    const { data: existing } = await supabase
      .from("payment_sessions")
      .select("id")
      .eq("session_id", sessionId)
      .single();

    if (existing) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      return new Response(JSON.stringify({ success: true, data: { alreadyCredited: true, credits: profile?.credits || 0 } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Add credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    const newCredits = (profile?.credits || 0) + creditsToAdd;

    await supabase.from("profiles").update({ credits: newCredits }).eq("id", user.id);

    // Record session to prevent double-crediting
    await supabase.from("payment_sessions").insert({ session_id: sessionId, user_id: user.id, plan, credits_added: creditsToAdd });

    return new Response(
      JSON.stringify({ success: true, data: { added: creditsToAdd, credits: newCredits, plan } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
