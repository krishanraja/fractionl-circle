import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from '../_shared/compliance.ts';

interface BehaviorPattern {
  feature: string;
  usageCount: number;
  lastUsed: string;
  avgTimeSpent: number;
}

interface InsightData {
  category: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedActions: string[];
  confidenceScore: number;
  expiresAt: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Parse request body for optional user_id override (for cron jobs)
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id || userId;

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "No user context available" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating insights for user: ${targetUserId}`);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    // Fetch behavior logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: behaviorLogs } = await supabase
      .from("user_behavior_logs")
      .select("*")
      .eq("user_id", targetUserId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    // Fetch feature usage
    const { data: featureUsage } = await supabase
      .from("feature_usage")
      .select("*")
      .eq("user_id", targetUserId);

    // Fetch monthly goals
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: monthlyGoals } = await supabase
      .from("monthly_goals")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("month", currentMonth)
      .single();

    // Fetch daily progress
    const { data: dailyProgress } = await supabase
      .from("daily_progress")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("month", currentMonth)
      .order("date", { ascending: false })
      .limit(30);

    // Fetch opportunities
    const { data: opportunities } = await supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("month", currentMonth);

    // Fetch revenue entries
    const { data: revenueEntries } = await supabase
      .from("revenue_entries")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("month", currentMonth);

    // Analyze patterns
    const behaviorPatterns = analyzeBehaviorPatterns(behaviorLogs || [], featureUsage || []);
    const goalProgress = analyzeGoalProgress(monthlyGoals, dailyProgress || []);
    const pipelineHealth = analyzePipelineHealth(opportunities || []);
    const revenueTrajectory = analyzeRevenueTrajectory(revenueEntries || [], monthlyGoals);

    // Generate insights using AI
    const insights = await generateAIInsights(
      lovableApiKey,
      {
        profile,
        behaviorPatterns,
        goalProgress,
        pipelineHealth,
        revenueTrajectory,
        featureUsage: featureUsage || [],
      }
    );

    // Store insights in database
    const insightsToStore = insights.map((insight: InsightData) => ({
      user_id: targetUserId,
      insight_type: "ai_generated",
      category: insight.category,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      suggested_actions: insight.suggestedActions,
      confidence_score: insight.confidenceScore,
      expires_at: insight.expiresAt,
      status: "active",
      supporting_data: {
        behaviorPatterns,
        goalProgress,
        pipelineHealth,
        revenueTrajectory,
      },
    }));

    // Mark old insights as expired
    await supabase
      .from("user_insights")
      .update({ status: "expired" })
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString());

    // Insert new insights
    const { data: insertedInsights, error: insertError } = await supabase
      .from("user_insights")
      .insert(insightsToStore)
      .select();

    if (insertError) {
      console.error("Error inserting insights:", insertError);
      throw insertError;
    }

    console.log(`Generated ${insertedInsights?.length || 0} insights for user ${targetUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights: insertedInsights,
        analysis: {
          behaviorPatterns,
          goalProgress,
          pipelineHealth,
          revenueTrajectory,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function analyzeBehaviorPatterns(logs: any[], featureUsage: any[]): BehaviorPattern[] {
  const featureMap = new Map<string, { count: number; lastUsed: string; totalTime: number }>();

  logs.forEach((log) => {
    const feature = log.component_name || log.event_category;
    if (!feature) return;

    const existing = featureMap.get(feature) || { count: 0, lastUsed: log.created_at, totalTime: 0 };
    featureMap.set(feature, {
      count: existing.count + 1,
      lastUsed: log.created_at > existing.lastUsed ? log.created_at : existing.lastUsed,
      totalTime: existing.totalTime + (log.event_value || 0),
    });
  });

  // Merge with feature_usage table
  featureUsage.forEach((usage) => {
    const existing = featureMap.get(usage.feature_key);
    if (existing) {
      existing.count = Math.max(existing.count, usage.usage_count || 0);
      existing.totalTime = usage.avg_time_spent_seconds || existing.totalTime;
    } else {
      featureMap.set(usage.feature_key, {
        count: usage.usage_count || 0,
        lastUsed: usage.last_used_at || "",
        totalTime: usage.avg_time_spent_seconds || 0,
      });
    }
  });

  return Array.from(featureMap.entries())
    .map(([feature, data]) => ({
      feature,
      usageCount: data.count,
      lastUsed: data.lastUsed,
      avgTimeSpent: data.count > 0 ? data.totalTime / data.count : 0,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);
}

function analyzeGoalProgress(goals: any, dailyProgress: any[]): Record<string, any> {
  if (!goals) {
    return { hasGoals: false, message: "No goals set for current month" };
  }

  const categories = ["workshops", "lectures", "advisory", "pr"];
  const progress: Record<string, any> = { hasGoals: true };

  categories.forEach((cat) => {
    const target = goals[`${cat}_target`] || 0;
    const current = dailyProgress.reduce((sum, day) => sum + (day[`${cat}_progress`] || 0), 0);
    const percentage = target > 0 ? (current / target) * 100 : 0;
    
    progress[cat] = {
      target,
      current,
      percentage: Math.round(percentage),
      onTrack: percentage >= getDaysPassedPercentage(),
    };
  });

  progress.revenueTarget = goals.revenue_forecast || 0;
  progress.costBudget = goals.cost_budget || 0;

  return progress;
}

function getDaysPassedPercentage(): number {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (now.getDate() / daysInMonth) * 100;
}

function analyzePipelineHealth(opportunities: any[]): Record<string, any> {
  const stages = ["lead", "proposal", "negotiation", "closed"];
  const stageCount: Record<string, number> = {};
  const stageValue: Record<string, number> = {};
  
  stages.forEach((stage) => {
    stageCount[stage] = 0;
    stageValue[stage] = 0;
  });

  opportunities.forEach((opp) => {
    const stage = opp.stage?.toLowerCase() || "lead";
    if (stages.includes(stage)) {
      stageCount[stage]++;
      stageValue[stage] += opp.estimated_value || 0;
    }
  });

  const totalValue = Object.values(stageValue).reduce((a, b) => a + b, 0);
  const weightedValue = 
    stageValue.lead * 0.1 +
    stageValue.proposal * 0.3 +
    stageValue.negotiation * 0.6 +
    stageValue.closed * 1.0;

  return {
    totalOpportunities: opportunities.length,
    stageCount,
    stageValue,
    totalPipelineValue: totalValue,
    weightedPipelineValue: weightedValue,
    conversionHealth: opportunities.length > 0 
      ? (stageCount.closed / opportunities.length) * 100 
      : 0,
  };
}

function analyzeRevenueTrajectory(entries: any[], goals: any): Record<string, any> {
  const totalRevenue = entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const target = goals?.revenue_forecast || 0;
  const daysPassed = getDaysPassedPercentage();
  const expectedProgress = (daysPassed / 100) * target;
  
  return {
    currentRevenue: totalRevenue,
    targetRevenue: target,
    percentageOfTarget: target > 0 ? (totalRevenue / target) * 100 : 0,
    expectedAtThisPoint: expectedProgress,
    variance: totalRevenue - expectedProgress,
    onTrack: totalRevenue >= expectedProgress,
    entriesCount: entries.length,
  };
}

async function generateAIInsights(
  apiKey: string | undefined,
  data: {
    profile: any;
    behaviorPatterns: BehaviorPattern[];
    goalProgress: Record<string, any>;
    pipelineHealth: Record<string, any>;
    revenueTrajectory: Record<string, any>;
    featureUsage: any[];
  }
): Promise<InsightData[]> {
  if (!apiKey) {
    console.log("No API key, generating rule-based insights");
    return generateRuleBasedInsights(data);
  }

  try {
    const systemPrompt = `You are an expert business intelligence analyst. Analyze the user's business data and generate personalized, actionable insights.

Your insights should:
1. Be specific and actionable
2. Reference actual numbers from the data
3. Provide clear next steps
4. Be encouraging but honest about challenges

Generate 3-5 insights across these categories:
- productivity: Time and efficiency recommendations
- revenue_optimization: Revenue growth opportunities
- goal_alignment: Goal adjustment suggestions
- feature_discovery: Underutilized feature recommendations
- risk_alert: Potential issues detected
- achievement: Celebration of milestones

Each insight must have:
- category: one of the categories above
- title: concise, actionable title (max 60 chars)
- description: detailed explanation (max 200 chars)
- priority: "high", "medium", or "low"
- suggestedActions: array of 2-3 specific actions
- confidenceScore: 0.0 to 1.0 based on data quality`;

    const userPrompt = `Analyze this business data and generate insights:

**User Profile:**
${JSON.stringify(data.profile, null, 2)}

**Behavior Patterns (Top 10):**
${JSON.stringify(data.behaviorPatterns.slice(0, 10), null, 2)}

**Goal Progress:**
${JSON.stringify(data.goalProgress, null, 2)}

**Pipeline Health:**
${JSON.stringify(data.pipelineHealth, null, 2)}

**Revenue Trajectory:**
${JSON.stringify(data.revenueTrajectory, null, 2)}

**Feature Usage Stats:**
${JSON.stringify(data.featureUsage.slice(0, 5), null, 2)}

Generate personalized insights based on this data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate business insights based on user data analysis",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { 
                          type: "string", 
                          enum: ["productivity", "revenue_optimization", "goal_alignment", "feature_discovery", "risk_alert", "achievement"] 
                        },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        suggestedActions: { type: "array", items: { type: "string" } },
                        confidenceScore: { type: "number" },
                      },
                      required: ["category", "title", "description", "priority", "suggestedActions", "confidenceScore"],
                    },
                  },
                },
                required: ["insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status, await response.text());
      return generateRuleBasedInsights(data);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      return parsed.insights.map((insight: any) => ({
        ...insight,
        expiresAt: expiresAt.toISOString(),
      }));
    }

    return generateRuleBasedInsights(data);
  } catch (error) {
    console.error("AI insight generation failed:", error);
    return generateRuleBasedInsights(data);
  }
}

function generateRuleBasedInsights(data: {
  profile: any;
  behaviorPatterns: BehaviorPattern[];
  goalProgress: Record<string, any>;
  pipelineHealth: Record<string, any>;
  revenueTrajectory: Record<string, any>;
  featureUsage: any[];
}): InsightData[] {
  const insights: InsightData[] = [];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const expiresAtStr = expiresAt.toISOString();

  // Revenue trajectory insights
  if (data.revenueTrajectory.percentageOfTarget < 50 && getDaysPassedPercentage() > 40) {
    insights.push({
      category: "risk_alert",
      title: "Revenue Target at Risk",
      description: `You're at ${Math.round(data.revenueTrajectory.percentageOfTarget)}% of your monthly target. Focus on closing existing pipeline opportunities.`,
      priority: "high",
      suggestedActions: [
        "Review and follow up on proposal-stage opportunities",
        "Schedule calls with negotiation-stage prospects",
        "Consider promotional offers to accelerate closes",
      ],
      confidenceScore: 0.85,
      expiresAt: expiresAtStr,
    });
  } else if (data.revenueTrajectory.percentageOfTarget >= 100) {
    insights.push({
      category: "achievement",
      title: "Monthly Revenue Target Achieved! 🎉",
      description: `Congratulations! You've reached ${Math.round(data.revenueTrajectory.percentageOfTarget)}% of your revenue goal.`,
      priority: "medium",
      suggestedActions: [
        "Set a stretch goal for the remainder of the month",
        "Document what strategies worked well",
        "Celebrate this milestone with your team",
      ],
      confidenceScore: 1.0,
      expiresAt: expiresAtStr,
    });
  }

  // Pipeline health insights
  if (data.pipelineHealth.stageCount?.lead > 5 && data.pipelineHealth.stageCount?.proposal < 2) {
    insights.push({
      category: "revenue_optimization",
      title: "Convert More Leads to Proposals",
      description: `You have ${data.pipelineHealth.stageCount.lead} leads but only ${data.pipelineHealth.stageCount.proposal} proposals. Focus on qualification and proposal creation.`,
      priority: "high",
      suggestedActions: [
        "Review lead qualification criteria",
        "Create proposal templates for faster turnaround",
        "Schedule discovery calls with top leads",
      ],
      confidenceScore: 0.8,
      expiresAt: expiresAtStr,
    });
  }

  // Feature discovery insights
  const underusedFeatures = data.featureUsage
    .filter((f) => f.usage_count < 3)
    .slice(0, 3);
  
  if (underusedFeatures.length > 0) {
    insights.push({
      category: "feature_discovery",
      title: "Explore Powerful Features",
      description: `You haven't fully explored features like ${underusedFeatures.map((f) => f.feature_key).join(", ")}. These can boost your productivity.`,
      priority: "low",
      suggestedActions: underusedFeatures.map(
        (f) => `Explore the ${f.feature_key} feature to improve your workflow`
      ),
      confidenceScore: 0.6,
      expiresAt: expiresAtStr,
    });
  }

  // Goal alignment insights
  if (data.goalProgress.hasGoals) {
    const categories = ["workshops", "lectures", "advisory", "pr"];
    const behindCategories = categories.filter(
      (cat) => data.goalProgress[cat] && !data.goalProgress[cat].onTrack && data.goalProgress[cat].percentage < 50
    );

    if (behindCategories.length > 0) {
      insights.push({
        category: "goal_alignment",
        title: "Some Goals Need Attention",
        description: `You're behind on ${behindCategories.join(", ")}. Consider adjusting targets or increasing focus.`,
        priority: "medium",
        suggestedActions: behindCategories.map(
          (cat) => `Review and create action plan for ${cat} goal`
        ),
        confidenceScore: 0.75,
        expiresAt: expiresAtStr,
      });
    }
  }

  // Productivity insights based on behavior
  if (data.behaviorPatterns.length > 0) {
    const topFeature = data.behaviorPatterns[0];
    insights.push({
      category: "productivity",
      title: `You're Most Active in ${topFeature.feature}`,
      description: `You've used ${topFeature.feature} ${topFeature.usageCount} times. Keep up the great engagement!`,
      priority: "low",
      suggestedActions: [
        "Consider setting up shortcuts for your most-used features",
        "Check if there are related features that could help",
      ],
      confidenceScore: 0.9,
      expiresAt: expiresAtStr,
    });
  }

  return insights.slice(0, 5);
}
