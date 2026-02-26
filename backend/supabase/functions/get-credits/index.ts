// supabase/functions/get-credits/index.ts
// Reads from user_credits table (email-based, consistent with all edge functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Not logged in.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // ✅ user_credits is the single source of truth
    const { data: row } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('email', user.email)
      .single()

    if (row) {
      return new Response(JSON.stringify({
        success: true,
        data: { credits: row.credits, plan: 'free' }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ✅ New user — grant 100 free credits
    await supabase.from('user_credits').insert({ email: user.email, credits: 100 })
    await supabase.from('credit_transactions').insert({
      email: user.email,
      amount: 100,
      type: 'free_grant',
      description: 'Welcome: 100 free credits',
    })

    return new Response(JSON.stringify({
      success: true,
      data: { credits: 100, plan: 'free' }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})