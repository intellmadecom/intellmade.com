import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, amount, description } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: currentCredits } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('email', email)
      .single()

    const current = currentCredits?.credits || 0

    if (current < amount) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient credits' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const newTotal = current - amount

    await supabase.from('user_credits').upsert({
      email,
      credits: newTotal,
    }, { onConflict: 'email' })

    await supabase.from('credit_transactions').insert({
      email,
      amount: -amount,
      type: 'usage',
      description: description || 'Credit deduction',
    })

    return new Response(JSON.stringify({ success: true, data: { credits: newTotal } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})