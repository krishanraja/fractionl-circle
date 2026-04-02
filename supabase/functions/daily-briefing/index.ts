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

    // Gather data for briefing
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel data fetching
    const [clientsRes, recentLogsRes, opportunitiesRes, goalsRes, profileRes] = await Promise.all([
      supabase.from('clients').select('id, name, last_activity_date, monthly_revenue_target, status, color')
        .eq('user_id', user.id).eq('status', 'active'),
      supabase.from('activity_logs').select('client_id, activity_type, revenue, duration_minutes, logged_at, summary')
        .eq('user_id', user.id).gte('logged_at', sevenDaysAgo.toISOString()).order('logged_at', { ascending: false }),
      supabase.from('opportunities').select('id, title, stage, estimated_value, probability, updated_at, company')
        .eq('user_id', user.id),
      supabase.from('monthly_goals').select('*').eq('user_id', user.id).eq('month', now.toISOString().slice(0, 7)).single(),
      supabase.from('user_profiles').select('full_name').eq('id', user.id).single(),
    ]);

    const clients = clientsRes.data || [];
    const recentLogs = recentLogsRes.data || [];
    const opportunities = opportunitiesRes.data || [];
    const goals = goalsRes.data;
    const userName = profileRes.data?.full_name || 'there';

    // Calculate key metrics
    const monthRevenue = recentLogs
      .filter(l => new Date(l.logged_at) >= monthStart)
      .reduce((sum, l) => sum + (l.revenue || 0), 0);

    const staleClients = clients.filter(c => {
      if (!c.last_activity_date) return true;
      return (now.getTime() - new Date(c.last_activity_date).getTime()) > 7 * 86400000;
    });

    const staleOpportunities = opportunities.filter(o => {
      if (!o.updated_at) return false;
      return (now.getTime() - new Date(o.updated_at).getTime()) > 14 * 86400000;
    });

    const revenueTarget = goals?.revenue_target || goals?.revenue_forecast || 0;
    const revenuePacing = revenueTarget > 0 ? ((monthRevenue / revenueTarget) * 100) : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const expectedPacing = (dayOfMonth / daysInMonth) * 100;

    // Build context for AI
    const context = {
      user_name: userName,
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
      total_clients: clients.length,
      stale_clients: staleClients.map(c => ({
        name: c.name,
        days_since: c.last_activity_date
          ? Math.floor((now.getTime() - new Date(c.last_activity_date).getTime()) / 86400000)
          : 'never',
      })),
      revenue: { current: monthRevenue, target: revenueTarget, pacing_percent: revenuePacing.toFixed(0), expected_pacing: expectedPacing.toFixed(0) },
      stale_opportunities: staleOpportunities.map(o => ({
        title: o.title,
        stage: o.stage,
        value: o.estimated_value,
        days_stale: Math.floor((now.getTime() - new Date(o.updated_at).getTime()) / 86400000),
      })),
      recent_activity_count: recentLogs.length,
      active_opportunities: opportunities.length,
      pipeline_value: opportunities.reduce((s, o) => s + (o.estimated_value || 0), 0),
    };

    // Generate briefing with OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        max_tokens: 500,
        store: false,
        messages: [
          {
            role: 'system',
            content: `You are Circle AI, a proactive assistant for fractional executives. Generate a morning briefing in JSON format.

Return this exact structure:
{
  "greeting": "Warm, personalized greeting using their first name and day of week. Do NOT start with Good morning/afternoon/evening - the app header already shows that.",
  "headline": "One-line summary of their portfolio status (max 15 words)",
  "alerts": [
    { "type": "client_stale|revenue|pipeline|momentum", "priority": "high|medium|low", "message": "Brief actionable alert (max 20 words)", "client_name": "optional" }
  ],
  "actions": [
    { "label": "Suggested action button text (3-5 words)", "type": "log|call|review|plan" }
  ],
  "mood": "positive|neutral|attention"
}

Keep alerts to max 4, actions to max 3. Be encouraging but honest. Focus on what matters TODAY.`
          },
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const briefing = JSON.parse(aiResult.choices[0].message.content);

    // Add raw metrics to response
    briefing.metrics = {
      revenue_current: monthRevenue,
      revenue_target: revenueTarget,
      revenue_pacing: parseFloat(revenuePacing.toFixed(1)),
      clients_active: clients.length,
      clients_needing_attention: staleClients.length,
      pipeline_value: context.pipeline_value,
      opportunities_active: opportunities.length,
      opportunities_stale: staleOpportunities.length,
      activities_this_week: recentLogs.length,
    };

    return new Response(
      JSON.stringify(briefing),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Briefing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate briefing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
