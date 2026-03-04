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
    const code = (body?.group_code as string) ?? (body?.code as string) ?? ''

    if (!code || String(code).trim().length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Group code required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: rows, error } = await supabase.rpc('get_group_by_code', {
      p_code: String(code).trim()
    })

    const group = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    if (error || !group) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired group code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        valid: true,
        group_id: group.id,
        group_name: group.name,
        group_code: group.group_code
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
