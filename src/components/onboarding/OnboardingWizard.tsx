import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  User, Briefcase, Target, CheckCircle, ArrowRight, ArrowLeft,
  Check, Building2, DollarSign, Users, Lightbulb, Mic, Crown, Zap, Brain
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { haptics } from '@/utils/haptics';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const BUSINESS_TYPES = [
  { id: 'fractional_executive', label: 'Fractional Executive', icon: Briefcase, description: 'CMO, CFO, CTO, COO for multiple companies' },
  { id: 'portfolio_consultant', label: 'Portfolio Consultant', icon: Building2, description: 'Strategy, advisory, and specialized expertise' },
  { id: 'thought_leader', label: 'Thought Leader', icon: Lightbulb, description: 'Speaker, author, workshop facilitator' },
  { id: 'multi_service', label: 'Multi-Service Pro', icon: Users, description: 'Coach + consultant + trainer combinations' },
];

const REVENUE_RANGES = [
  { id: '0-100k', label: 'Under $100K' },
  { id: '100k-250k', label: '$100K - $250K' },
  { id: '250k-500k', label: '$250K - $500K' },
  { id: '500k-1m', label: '$500K - $1M' },
  { id: '1m+', label: '$1M+' },
];

const SERVICE_TYPES = [
  { id: 'workshops', label: 'Workshops & Training' },
  { id: 'advisory', label: 'Advisory & Consulting' },
  { id: 'lectures', label: 'Speaking & Lectures' },
  { id: 'coaching', label: 'Executive Coaching' },
  { id: 'content', label: 'Content & Media' },
];

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { profile, updateProfile, completeOnboardingStep } = useUserProfile();
  const { trackFeatureUse } = useBehaviorTracking();
  const [currentStep, setCurrentStep] = useState(profile?.onboarding_step || 0);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    business_type: profile?.business_type || '',
    industry: profile?.industry || '',
    years_experience: profile?.years_experience || null,
    revenue_range: profile?.revenue_range || '',
    target_market: profile?.target_market || '',
    service_types: profile?.service_types || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboardingStep(currentStep + 1);
      await updateProfile(formData);
      trackFeatureUse('onboarding', `complete_step_${currentStep + 1}`);
      
      if (currentStep === totalSteps - 1) {
        onComplete();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const toggleServiceType = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      service_types: prev.service_types.includes(serviceId)
        ? prev.service_types.filter(s => s !== serviceId)
        : [...prev.service_types, serviceId]
    }));
  };

  const stepVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-4 sm:mb-8">
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-1.5">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1.5 sm:h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-8">
          {[User, Briefcase, DollarSign, Target, CheckCircle].map((Icon, index) => (
            <div
              key={index}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                index < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index === currentStep
                  ? 'bg-primary/20 text-primary ring-2 ring-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-lg">
              {currentStep === 0 && (
                <>
                  <CardHeader className="text-center pb-2 sm:pb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                      <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">Welcome to Circle</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Let's personalize your experience. First, tell us a bit about yourself.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="text-base sm:text-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="industry">Your Industry</Label>
                      <Input
                        id="industry"
                        placeholder="e.g., Technology, Finance, Healthcare"
                        value={formData.industry}
                        onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        placeholder="e.g., 15"
                        value={formData.years_experience || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || null }))}
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <CardHeader className="text-center pb-2 sm:pb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                      <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">Your Business Model</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      How would you best describe your portfolio business?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2">
                      {BUSINESS_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = formData.business_type === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setFormData(prev => ({ ...prev, business_type: type.id }))}
                            className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}>
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base">{type.label}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{type.description}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <CardHeader className="text-center pb-2 sm:pb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                      <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">Revenue & Services</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Help us understand your business scale and service offerings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-8">
                    <div className="space-y-2 sm:space-y-4">
                      <Label className="text-sm">Annual Revenue Range</Label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {REVENUE_RANGES.map((range) => (
                          <button
                            key={range.id}
                            onClick={() => setFormData(prev => ({ ...prev, revenue_range: range.id }))}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                              formData.revenue_range === range.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-4">
                      <Label className="text-sm">Services You Offer (select all that apply)</Label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {SERVICE_TYPES.map((service) => {
                          const isSelected = formData.service_types.includes(service.id);
                          return (
                            <button
                              key={service.id}
                              onClick={() => toggleServiceType(service.id)}
                              className={`p-2 sm:p-3 rounded-lg border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'bg-primary text-primary-foreground' : 'border border-border'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                </div>
                                <span className="font-medium text-xs sm:text-sm">{service.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <CardHeader className="text-center pb-2 sm:pb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                      <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">Your Goals</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      What are you hoping to achieve with Circle?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="target_market">Target Market</Label>
                      <Textarea
                        id="target_market"
                        placeholder="Describe your ideal clients or target market..."
                        value={formData.target_market}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_market: e.target.value }))}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <CardHeader className="text-center pb-2 sm:pb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">You're All Set!</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      You have a 14-day Pro trial. Here's what's unlocked:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className="bg-primary/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <Crown className="w-5 h-5" />
                        <span>Pro Features - 14 Days Free</span>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2.5">
                          <Brain className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>AI Morning Briefing & Smart Nudges</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Unlimited voice logging & voice commands</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Unlimited clients & relationship health scores</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Full desktop dashboard & data export</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                      <p className="text-caption font-medium text-foreground">After your trial:</p>
                      <p className="text-caption text-foreground-secondary">
                        Continue free with up to 3 clients, 20 voice logs/month, and basic features.
                        Or upgrade to Pro for $29/mo to keep everything unlocked.
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between p-4 sm:p-6 pt-0">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : currentStep === totalSteps - 1 ? (
                    <>
                      Get Started
                      <CheckCircle className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
