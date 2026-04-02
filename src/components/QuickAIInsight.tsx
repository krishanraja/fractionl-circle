import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuickAIInsightProps {
  currentMetrics: any;
}

export const QuickAIInsight = ({ currentMetrics }: QuickAIInsightProps) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getAIInsight = async () => {
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        description: "Ask about your biggest challenge, priority, or what to focus on.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Enhanced session validation and token refresh
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast({
          title: "Authentication Error",
          description: "Session validation failed. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (!session || !session.access_token) {
        console.error('No valid session or access token found');
        toast({
          title: "Authentication Required",
          description: "Please refresh the page and log in again.",
          variant: "destructive",
        });
        return;
      }

      // Check if token is about to expire (within 5 minutes)
      const tokenExp = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      if (tokenExp && (tokenExp - now) < 300) {
        console.log('Token expiring soon, refreshing...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Token refresh failed:', refreshError);
          toast({
            title: "Session Expired",
            description: "Please refresh the page and log in again.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Making AI function call with valid session');
      const { data, error } = await supabase.functions.invoke('ai-strategic-analysis', {
        body: {
          question,
          context: {
            currentMetrics,
            timestamp: new Date().toISOString()
          },
          conversationType: 'quick_insight'
        },
      });

      if (error) {
        console.error('AI function error:', error);
        
        // Enhanced error handling for different failure types
        if (error.message?.includes('Token expired') || error.message?.includes('session has expired')) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please refresh the page and log in again.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message?.includes('Authentication') || error.message?.includes('401') || error.message?.includes('Authorization')) {
          toast({
            title: "Authentication Error",
            description: "Authentication failed. Please refresh the page and try again.",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }

      if (data && data.response) {
        setResponse(data.response);
        setQuestion(''); // Clear the input after successful response
      } else {
        throw new Error('No response received from AI service');
      }
    } catch (error) {
      console.error('Error getting AI insight:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API key')) {
        toast({
          title: "AI Service Issue",
          description: "The AI service configuration needs attention. Please contact support.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast({
          title: "Connection Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error getting AI insight",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      getAIInsight();
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Zap className="h-4 w-4" />
          Quick AI Guidance
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="What's your biggest challenge today? What should I focus on?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={getAIInsight}
            disabled={isLoading || !question.trim()}
            size="sm"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Get Guidance'
            )}
          </Button>
        </div>

        {response && (
          <div className="p-3 bg-card rounded-lg border text-sm">
            <div className="flex items-center gap-2 mb-2 text-primary font-medium">
              <Zap className="h-4 w-4" />
              AI Recommendation
            </div>
            <p className="text-muted-foreground leading-relaxed">{response}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Need more detailed analysis? Visit the{' '}
          <button 
            className="text-primary hover:underline font-medium"
            onClick={() => {
              // We'll implement navigation to AI Strategy section
              toast({
                title: "AI Strategy Hub",
                description: "Advanced AI features coming soon!",
              });
            }}
          >
            AI Strategy Hub →
          </button>
        </div>
      </div>
    </Card>
  );
};