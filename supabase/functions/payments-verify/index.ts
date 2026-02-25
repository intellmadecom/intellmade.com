import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_CREDITS: Record<string, number> = {
  personal: 600,
  creator: 1800,
  studio: 5000,
  flex: 120,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ success: false, error: 'Payment not completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const plan = session.metadata?.plan || 'personal'
    const creditsToAdd = PLAN_CREDITS[plan] || 600

    // Check if already credited
    const { data: existing } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single()

    if (existing) {
      const { data: userCredits } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('email', session.customer_email)
        .single()

      return new Response(JSON.stringify({
        success: true,
        data: { alreadyCredited: true, credits: userCredits?.credits || 0, plan }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Add credits
    const { data: currentCredits } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('email', session.customer_email)
      .single()

    const newTotal = (currentCredits?.credits || 0) + creditsToAdd

    await supabase.from('user_credits').upsert({
      email: session.customer_email,
      credits: newTotal,
    }, { onConflict: 'email' })

    await supabase.from('credit_transactions').insert({
      email: session.customer_email,
      amount: creditsToAdd,
      type: 'purchase',
      stripe_session_id: sessionId,
      description: `Purchase: ${plan}`,
    })

    return new Response(JSON.stringify({
      success: true,
      data: { added: creditsToAdd, credits: newTotal, plan }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})