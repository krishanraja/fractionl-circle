import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders } from '../_shared/compliance.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { command } = await req.json();
    if (!command) {
      return new Response(
        JSON.stringify({ error: 'No command provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user context for smarter responses
    const [clientsRes, revenueRes, pipelineRes] = await Promise.all([
      supabase.from('clients').select('name, status, last_activity_date')
        .eq('user_id', user.id).eq('status', 'active'),
      supabase.from('revenue_entries').select('amount, date')
        .eq('user_id', user.id)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('opportunities').select('title, stage, estimated_value')
        .eq('user_id', user.id),
    ]);

    const monthRevenue = (revenueRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);
    const clients = clientsRes.data || [];
    const opportunities = pipelineRes.data || [];

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        max_tokens: 300,
        store: false,
        messages: [
          {
            role: 'system',
            content: `You are Circle AI, a voice assistant for a fractional executive CRM. Classify the user's voice command and provide a response.

User context:
- Active clients: ${clients.map(c => c.name).join(', ') || 'None'}
- Month revenue: $${monthRevenue.toLocaleString()}
- Pipeline: ${opportunities.length} opportunities worth $${opportunities.reduce((s, o) => s + (o.estimated_value || 0), 0).toLocaleString()}

Return JSON:
{
  "intent": "query|navigate|action|unknown",
  "action": "show_revenue|show_pipeline|show_clients|add_contact|log_activity|set_reminder|filter_pipeline|navigate_tab|unknown",
  "response": "Natural language response to speak back to the user",
  "navigate_to": "pulse|log|history|circle|settings|null",
  "data": {} // Optional structured data for the UI to use
}`
          },
          { role: 'user', content: command },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const parsed = JSON.parse(aiResult.choices[0].message.content);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Voice command error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Command processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
