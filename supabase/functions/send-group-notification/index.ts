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

  try {
    const body = await req.json().catch(() => ({}))
    const groupId = body?.group_id as string
    const type = (body?.type as string) ?? 'group_invite'
    const title = (body?.title as string) ?? 'Group update'
    const bodyText = (body?.body as string) ?? ''
    const data = (body?.data as Record<string, unknown>) ?? {}

    if (!groupId) {
      return new Response(
        JSON.stringify({ error: 'group_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (membersError || !members?.length) {
      return new Response(
        JSON.stringify({ error: 'Group not found or no members' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    const payload = { ...data, group_id: groupId }
    for (const m of members) {
      const { data: ok, error: rpcErr } = await supabase.rpc('create_in_app_notification_if_allowed', {
        p_user_id: m.user_id,
        p_type: type,
        p_title: title,
        p_body: bodyText,
        p_data: payload
      })
      if (rpcErr) {
        return new Response(
          JSON.stringify({ error: rpcErr.message, sent }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (ok === true) sent += 1
    }

    return new Response(
      JSON.stringify({ sent, skipped: members.length - sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
