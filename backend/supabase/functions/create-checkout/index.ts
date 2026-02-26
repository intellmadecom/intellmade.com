import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Must return 200 with proper headers for preflight to pass
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // ✅ PLANS defined inside handler — avoids top-level Deno.env crash on cold start
    const PLANS: Record<string, { priceId: string; credits: number }> = {
      personal: { priceId: Deno.env.get('STRIPE_PRICE_PERSONAL')!, credits: 600 },
      creator:  { priceId: Deno.env.get('STRIPE_PRICE_CREATOR')!,  credits: 1800 },
      studio:   { priceId: Deno.env.get('STRIPE_PRICE_STUDIO')!,   credits: 5000 },
      flex:     { priceId: Deno.env.get('STRIPE_PRICE_FLEX')!,     credits: 120 },
    }

    const { plan, email } = await req.json()
    const planData = PLANS[plan]

    if (!planData) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid plan' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://intellmade.com'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{ price: planData.priceId, quantity: 1 }],
      mode: 'payment',
      // ✅ Use query params on the root path (not hash) so window.location.search works
      success_url: `${frontendUrl}?payment=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}?payment=canceled`,
      metadata: { plan, credits: planData.credits.toString() },
    }

    // Pre-fill email if provided
    if (email) {
      sessionParams.customer_email = email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ success: true, data: { checkoutUrl: session.url } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})