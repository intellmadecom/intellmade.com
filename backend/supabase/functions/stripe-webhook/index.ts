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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    const signature = req.headers.get('stripe-signature')!
    const body = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.payment_status !== 'paid') {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const plan = session.metadata?.plan || 'personal'
      const creditsToAdd = PLAN_CREDITS[plan] || 600
      const email = session.customer_email!
      const sessionId = session.id

      // Check if already credited
      const { data: existing } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single()

      if (!existing) {
        const { data: currentCredits } = await supabase
          .from('user_credits')
          .select('credits')
          .eq('email', email)
          .single()

        const newTotal = (currentCredits?.credits || 0) + creditsToAdd

        await supabase.from('user_credits').upsert({
          email,
          credits: newTotal,
        }, { onConflict: 'email' })

        await supabase.from('credit_transactions').insert({
          email,
          amount: creditsToAdd,
          type: 'purchase',
          stripe_session_id: sessionId,
          description: `Purchase: ${plan}`,
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})