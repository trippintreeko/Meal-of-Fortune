import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const username = (body?.username as string) ?? ''
    const prefix = String(username).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'USR'
    const pad = prefix.length < 3 ? prefix.padEnd(3, 'X') : prefix.slice(0, 3)
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const friendCode = `${pad}-${randomDigits}`

    return new Response(JSON.stringify({ friendCode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
