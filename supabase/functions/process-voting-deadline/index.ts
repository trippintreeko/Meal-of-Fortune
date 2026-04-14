import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = new Date().toISOString()

  const { data: sessions, error: fetchError } = await supabase
    .from('voting_sessions')
    .select('id, group_id')
    .eq('status', 'active')
    .lt('deadline', now)

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let processed = 0
  for (const session of sessions ?? []) {
    const { data: votes } = await supabase
      .from('votes')
      .select('suggestion_id')
      .eq('session_id', session.id)

    const countBySuggestion: Record<string, number> = {}
    for (const v of votes ?? []) {
      countBySuggestion[v.suggestion_id] = (countBySuggestion[v.suggestion_id] ?? 0) + 1
    }

    const winnerId = Object.keys(countBySuggestion).length > 0
      ? Object.entries(countBySuggestion).sort((a, b) => b[1] - a[1])[0][0]
      : null

    await supabase
      .from('voting_sessions')
      .update({
        status: 'completed',
        winner_suggestion_id: winnerId,
        decided_at: now
      })
      .eq('id', session.id)

    await supabase
      .from('meal_groups')
      .update({ active_voting_session: null })
      .eq('id', session.group_id)
      .eq('active_voting_session', session.id)

    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', session.group_id)

    const winnerSuggestion = winnerId
      ? await supabase.from('meal_suggestions').select('suggestion').eq('id', winnerId).single().then(r => r.data?.suggestion)
      : null

    const bodyText = winnerSuggestion
      ? `The group chose: ${winnerSuggestion}`
      : 'Voting has ended.'
    for (const m of members ?? []) {
      const { error: rpcErr } = await supabase.rpc('create_in_app_notification_if_allowed', {
        p_user_id: m.user_id,
        p_type: 'result_ready',
        p_title: 'Voting results ready',
        p_body: bodyText,
        p_data: { session_id: session.id, group_id: session.group_id }
      })
      if (rpcErr) {
        console.error('[process-voting-deadline] notify member', m.user_id, rpcErr.message)
      }
    }
    processed++
  }

  return new Response(
    JSON.stringify({ processed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
