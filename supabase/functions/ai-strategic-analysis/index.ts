 import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/compliance.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const assistantId = Deno.env.get('OPENAI_ASSISTANT_ID');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Parse and validate JWT token manually for better error handling
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authorization required',
        details: 'Please ensure you are logged in' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authorization.replace('Bearer ', '');
    console.log('Processing request with JWT token length:', token.length);

    const { question, context, conversationType = 'quick_insight', loadBusinessContext = false } = await req.json();
    
    // Initialize Supabase client with service role for better JWT handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with anon key first for JWT verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Enhanced JWT validation and user authentication
    console.log('Validating JWT token and extracting user...');
    let user;
    let userId;
    
    try {
      // First try with the provided JWT
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError) {
        console.error('JWT validation error:', authError.message, 'Status:', authError.status);
        
        // Try to decode JWT to get user ID directly for debugging
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT payload user ID:', payload.sub, 'Expires:', new Date(payload.exp * 1000));
          
          if (payload.exp * 1000 < Date.now()) {
            return new Response(JSON.stringify({ 
              error: 'Token expired',
              details: 'Your session has expired. Please refresh the page and log in again.',
              code: 401
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (decodeError) {
          console.error('JWT decode error:', decodeError);
        }
        
        return new Response(JSON.stringify({ 
          error: 'Authentication failed',
          details: `Session validation failed: ${authError.message}. Please refresh the page and try again.`,
          code: authError.status || 401
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!authUser) {
        console.error('No user found in validated JWT');
        return new Response(JSON.stringify({ 
          error: 'Authentication failed',
          details: 'No valid user found in session. Please refresh the page and log in again.',
          code: 401
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      user = authUser;
      userId = user.id;
      console.log('JWT validation successful for user:', userId);
      
    } catch (error) {
      console.error('Unexpected authentication error:', error);
      return new Response(JSON.stringify({ 
        error: 'Authentication system error',
        details: 'Authentication service temporarily unavailable. Please try again.',
        code: 500
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing AI request:', { question, conversationType, loadBusinessContext, userId });

    // Handle business context loading from Assistant
    if (loadBusinessContext && assistantId) {
      console.log('Loading business context from Assistant...');
      try {
        // Create a thread with the Assistant
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({}),
        });

        if (!threadResponse.ok) {
          console.error('Failed to create thread:', threadResponse.status, threadResponse.statusText);
          throw new Error(`Failed to create thread: ${threadResponse.statusText}`);
        }

        const thread = await threadResponse.json();
        console.log('Thread created:', thread.id);

        // Send message to get business context
        const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            role: 'user',
            content: 'Please provide a comprehensive summary of the business details in JSON format with the following structure: {"business_type": "", "target_market": "", "main_challenges": [""], "priorities": [""]}. Include specific details about the business.',
          }),
        });

        if (!messageResponse.ok) {
          console.error('Failed to send message:', messageResponse.status, messageResponse.statusText);
          throw new Error(`Failed to send message: ${messageResponse.statusText}`);
        }

        console.log('Message sent to assistant');

        // Run the assistant
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            assistant_id: assistantId,
          }),
        });

        if (!runResponse.ok) {
          console.error('Failed to run assistant:', runResponse.status, runResponse.statusText);
          throw new Error(`Failed to run assistant: ${runResponse.statusText}`);
        }

        const run = await runResponse.json();
        console.log('Assistant run started:', run.id, 'Status:', run.status);

        // Poll for completion
        let runStatus = run.status;
        let attempts = 0;
        const maxAttempts = 30;

        while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            runStatus = statusData.status;
            console.log(`Run status attempt ${attempts + 1}:`, runStatus);
          }
          attempts++;
        }

        if (runStatus === 'completed') {
          console.log('Assistant run completed, fetching messages...');
          // Get the assistant's response
          const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          });

          if (messagesResponse.ok) {
            const messages = await messagesResponse.json();
            const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
            
            if (assistantMessage && assistantMessage.content[0]?.text?.value) {
              const businessContextText = assistantMessage.content[0].text.value;
              console.log('Assistant response received:', businessContextText);
              
              // Try to parse JSON from the response or use simple parsing
              let parsedContext;
              try {
                // Try to extract JSON from the response
                const jsonMatch = businessContextText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  parsedContext = JSON.parse(jsonMatch[0]);
                } else {
                  throw new Error('No JSON found in response');
                }
              } catch (parseError) {
                console.log('JSON parsing failed, using text parsing:', parseError);
                // Fallback to text parsing
                parsedContext = {
                  business_type: businessContextText.match(/business type[:\s]*(.*?)(?:
|\.)/i)?.[1]?.trim() || '',
                  target_market: businessContextText.match(/target market[:\s]*(.*?)(?:
|\.)/i)?.[1]?.trim() || '',
                  main_challenges: businessContextText.match(/challenges?[:\s]*(.*?)(?:

|\. [A-Z])/i)?.[1]?.split(/[,;]/).map(c => c.trim()).filter(Boolean) || [],
                  priorities: businessContextText.match(/priorities?[:\s]*(.*?)(?:

|\. [A-Z])/i)?.[1]?.split(/[,;]/).map(p => p.trim()).filter(Boolean) || [],
                };
              }

              console.log('Parsed business context:', parsedContext);

              // Save the business context to the database using UPSERT
              const { error: saveError } = await supabase
                .from('user_business_context')
                .upsert({
                  user_id: userId,
                  business_type: parsedContext.business_type,
                  target_market: parsedContext.target_market,
                  main_challenges: parsedContext.main_challenges,
                  priorities: parsedContext.priorities,
                }, {
                  onConflict: 'user_id'
                });

              if (saveError) {
                console.error('Error saving business context to database:', saveError);
                throw new Error(`Failed to save business context: ${saveError.message}`);
              }

              console.log('Business context saved to database successfully');
              
              return new Response(JSON.stringify({ 
                businessContext: parsedContext,
                rawResponse: businessContextText,
                success: true 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } else {
              console.error('No assistant message content found');
              throw new Error('No content in assistant response');
            }
          } else {
            console.error('Failed to fetch messages:', messagesResponse.status, messagesResponse.statusText);
            throw new Error('Failed to fetch assistant messages');
          }
        } else {
          console.error('Assistant run failed or timed out. Final status:', runStatus);
          throw new Error(`Assistant run failed with status: ${runStatus}`);
        }
      } catch (error) {
        console.error('Error loading business context from assistant:', error);
        
        // Create a default business context as fallback
        const defaultContext = {
          business_type: 'Business (Auto-sync pending)',
          target_market: 'Target market analysis pending',
          main_challenges: ['Assistant configuration needed'],
          priorities: ['Complete AI Assistant setup'],
        };

        // Save the default context using UPSERT
        try {
          const { error: saveError } = await supabase
            .from('user_business_context')
            .upsert({
              user_id: userId,
              business_type: defaultContext.business_type,
              target_market: defaultContext.target_market,
              main_challenges: defaultContext.main_challenges,
              priorities: defaultContext.priorities,
            }, {
              onConflict: 'user_id'
            });

          if (!saveError) {
            console.log('Default business context saved');
          }
        } catch (saveError) {
          console.error('Failed to save default context:', saveError);
        }

        return new Response(JSON.stringify({ 
          error: error.message,
          businessContext: defaultContext,
          fallback: true 
        }), {
          status: 200, // Return 200 so frontend can handle gracefully
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Regular AI conversation handling
    let systemPrompt = '';
    let apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    let requestBody: any;
    let headers: any = {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    };

    // Use Assistant API if assistant is configured and this is not a quick insight
    if (assistantId && conversationType !== 'quick_insight') {
      // Create thread for assistant conversation
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          ...headers,
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({}),
      });

      if (threadResponse.ok) {
        const thread = await threadResponse.json();

        // Send message
        await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          method: 'POST',
          headers: {
            ...headers,
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            role: 'user',
            content: `${question}

Context: ${JSON.stringify(context)}`,
          }),
        });

        // Run assistant
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
          method: 'POST',
          headers: {
            ...headers,
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            assistant_id: assistantId,
          }),
        });

        if (runResponse.ok) {
          const run = await runResponse.json();
          
          // Poll for completion
          let runStatus = run.status;
          let attempts = 0;
          const maxAttempts = 30;

          while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
              headers: {
                ...headers,
                'OpenAI-Beta': 'assistants=v2',
              },
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              runStatus = statusData.status;
            }
            attempts++;
          }

          if (runStatus === 'completed') {
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
              headers: {
                ...headers,
                'OpenAI-Beta': 'assistants=v2',
              },
            });

            if (messagesResponse.ok) {
              const messages = await messagesResponse.json();
              const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
              
              if (assistantMessage && assistantMessage.content[0]?.text?.value) {
                const aiResponse = assistantMessage.content[0].text.value;
                
                // Store the conversation
                await supabase
                  .from('ai_conversations')
                  .insert({
                    user_id: userId,
                    question,
                    response: aiResponse,
                    context,
                    conversation_type: conversationType
                  });

                return new Response(JSON.stringify({ 
                  response: aiResponse,
                  conversationType,
                  usedAssistant: true
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
        }
      }
      
      console.log('Assistant API failed, falling back to chat completions');
    }

    // Handle chat messages with conversational context
    if (conversationType === 'chat' && question) {
      console.log('Processing chat message:', question);
      
      try {
        const fullContext = `
          Business Context:
          - Type: ${context?.businessContext?.business_type || 'Not specified'}
          - Target Market: ${context?.businessContext?.target_market || 'Not specified'}
          - Challenges: ${context?.businessContext?.main_challenges?.join(', ') || 'None specified'}
          - Priorities: ${context?.businessContext?.priorities?.join(', ') || 'None specified'}
          
          Current Metrics: ${JSON.stringify(context?.currentMetrics || {})}
          Monthly Goals: ${JSON.stringify(context?.monthlyGoals || {})}
          
          Recent Conversation: ${context?.conversationHistory?.map(msg => `${msg.role}: ${msg.content}`).join('
') || 'No recent context'}
          
          Current User Message: ${question}
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an AI business strategist and advisor. Provide helpful, actionable advice based on the user's business context and metrics. Keep responses conversational but informative. Focus on practical insights that can help improve their business performance.`
              },
              {
                role: 'user',
                content: fullContext
              }
            ],
            max_tokens: 800,
            temperature: 0.7,
            store: false,
          }),
        });

        if (!response.ok) {
          console.error('OpenAI API error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('OpenAI error details:', errorText);
          throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        return new Response(JSON.stringify({ 
          response: aiResponse,
          success: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Error in chat processing:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          response: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment."
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle summary generation
    if (conversationType === 'summary') {
      console.log('Generating conversation summary');
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a business analyst. Create a concise 2-3 sentence summary of the key strategic insights and recommendations from the conversation.'
              },
              {
                role: 'user',
                content: question
              }
            ],
            max_tokens: 200,
            temperature: 0.3,
            store: false,
          }),
        });

        if (!response.ok) {
          console.error('OpenAI API error:', response.status, response.statusText);
          throw new Error(`OpenAI API call failed: ${response.status}`);
        }

        const data = await response.json();
        const summary = data.choices[0].message.content;

        return new Response(JSON.stringify({ 
          response: summary,
          success: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Error generating summary:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          response: "Unable to generate summary at this time."
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback to regular chat completions
    if (conversationType === 'quick_insight') {
      systemPrompt = `You are a strategic business advisor providing quick, actionable insights. 
      
      Context about the user's business metrics: ${JSON.stringify(context)}
      
      Provide a brief, actionable response (2-3 sentences max) that directly addresses their question while considering their current metrics. Focus on immediate, practical advice.`;
    } else {
      systemPrompt = `You are a strategic business advisor providing comprehensive analysis and recommendations.
      
      Context about the user's business metrics: ${JSON.stringify(context)}
      
      Provide detailed, strategic analysis with specific recommendations. Consider trends, patterns, and long-term implications. Be thorough but practical.`;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_completion_tokens: conversationType === 'quick_insight' ? 150 : 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Store the conversation in the database
    const { error: insertError } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        question,
        response: aiResponse,
        context,
        conversation_type: conversationType
      });

    if (insertError) {
      console.error('Error storing conversation:', insertError);
      // Don't throw here, just log the error
    }

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      conversationType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI strategic analysis:', error);
    
    // Determine if this is an authentication error vs OpenAI API error
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('OpenAI API error')) {
      errorMessage = 'OpenAI API connection failed. Please check your API key configuration.';
      statusCode = 503;
    } else if (error.message.includes('Authorization') || error.message.includes('Authentication')) {
      errorMessage = 'Authentication failed. Please check your login status.';
      statusCode = 401;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
