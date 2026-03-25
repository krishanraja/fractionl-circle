import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, Bell, ChevronRight,
  LogOut, Moon, CreditCard, Sparkles, Crown, ExternalLink, BarChart3, FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBadge } from '@/components/billing/SubscriptionBadge';
import { PricingPage } from '@/components/billing/PricingPage';
import { GoogleSheetsExportSheet } from '@/components/settings/GoogleSheetsExportSheet';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';

export const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const {
    effectiveTier, isTrialing, trialDaysRemaining,
    usage, getUsagePercent, getLimit, isAtLimit,
    openPortal, isPastDue, cancelAtPeriodEnd,
  } = useSubscription();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [showPricing, setShowPricing] = useState(false);
  const [showSheetsExport, setShowSheetsExport] = useState(false);

  const handleToggle = async (key: string, value: boolean) => {
    haptics.tap();
    if (!user?.id) return;
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch {
      toast.error('Failed to save preference');
    }
  };

  if (showPricing) {
    return (
      <div className="pb-28">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setShowPricing(false)}
            className="text-caption text-primary"
          >
            ← Back
          </button>
        </div>
        <PricingPage onClose={() => setShowPricing(false)} />
      </div>
    );
  }

  const settingsSections = [
    {
      title: 'Profile',
      items: [
        {
          icon: User,
          label: 'Account',
          description: user?.email || 'Not signed in',
          action: 'chevron' as const,
        },
      ],
    },
    {
      title: 'Schedule',
      items: [
        {
          icon: Calendar,
          label: 'Schedule & Reminders',
          description: 'Work week, check-ins, weekly summary',
          action: 'badge' as const,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: 'Get reminders to log activity',
          action: 'toggle' as const,
          value: pushNotifications,
          onChange: (v: boolean) => { setPushNotifications(v); handleToggle('browser_notifications', v); },
        },
        {
          icon: Bell,
          label: 'Email Digest',
          description: 'Weekly summary via email',
          action: 'toggle' as const,
          value: emailDigest,
          onChange: (v: boolean) => { setEmailDigest(v); handleToggle('email_notifications', v); },
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: Moon,
          label: 'Dark Mode',
          description: 'Use dark theme',
          action: 'toggle' as const,
          value: darkMode,
          onChange: (v: boolean) => {
            setDarkMode(v);
            document.documentElement.classList.toggle('dark', v);
            handleToggle('dark_mode', v);
          },
        },
      ],
    },
  ];

  const voiceLimit = getLimit('voice_logs');
  const aiLimit = getLimit('ai_queries');
  const showUsage = voiceLimit !== Infinity || aiLimit !== Infinity;

  return (
    <motion.div
      className="flex flex-col gap-6 p-4 pb-28"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="text-center">
        <div className="w-20 h-20 rounded-full bg-primary-muted flex items-center justify-center mx-auto mb-3">
          <User className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-title-2 text-foreground">
          {profile?.full_name || 'Your Profile'}
        </h1>
        <p className="text-caption text-foreground-secondary mb-2">
          {user?.email}
        </p>
        <SubscriptionBadge />
      </motion.div>

      {/* Subscription Section */}
      <motion.div variants={staggerItem} className="space-y-2">
        <h2 className="text-caption-bold text-foreground-secondary uppercase tracking-wider px-1">
          Subscription
        </h2>

        <Card className="bg-background-elevated border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Current Plan */}
            <div
              className="w-full flex items-center gap-3 p-4 min-h-[56px] hover:bg-secondary/50 active:bg-secondary/50 transition-colors cursor-pointer border-b border-border"
              onClick={() => { setShowPricing(true); haptics.light(); }}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                {effectiveTier === 'executive' ? (
                  <Crown className="w-5 h-5 text-primary" />
                ) : (
                  <Sparkles className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="text-body-bold text-foreground">
                  {effectiveTier === 'free' ? 'Free Plan' : effectiveTier === 'pro' ? 'Pro Plan' : 'Executive Plan'}
                  {isTrialing && (
                    <span className="text-caption text-warning ml-2">
                      ({trialDaysRemaining}d trial remaining)
                    </span>
                  )}
                </div>
                <div className="text-caption text-foreground-secondary">
                  {effectiveTier === 'free'
                    ? 'Upgrade for unlimited access'
                    : cancelAtPeriodEnd
                    ? 'Cancels at end of period'
                    : 'Active subscription'}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </div>

            {/* Past Due Warning */}
            {isPastDue && (
              <div className="px-4 py-3 bg-destructive/10 border-b border-border">
                <p className="text-caption text-destructive font-medium">
                  Payment failed. Please update your billing info to keep your subscription.
                </p>
              </div>
            )}

            {/* Usage Meters */}
            {showUsage && (
              <div className="p-4 space-y-3">
                <p className="text-caption-bold text-foreground-secondary">This Month's Usage</p>

                {voiceLimit !== Infinity && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-caption">
                      <span className="text-foreground-secondary">Voice Logs</span>
                      <span className={cn(
                        "font-medium",
                        isAtLimit('voice_logs') ? "text-destructive" : "text-foreground"
                      )}>
                        {usage.voice_logs} / {voiceLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercent('voice_logs')} className="h-1.5" />
                  </div>
                )}

                {aiLimit !== Infinity && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-caption">
                      <span className="text-foreground-secondary">AI Insights</span>
                      <span className={cn(
                        "font-medium",
                        isAtLimit('ai_queries') ? "text-destructive" : "text-foreground"
                      )}>
                        {usage.ai_queries} / {aiLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercent('ai_queries')} className="h-1.5" />
                  </div>
                )}
              </div>
            )}

            {/* Manage Billing */}
            {effectiveTier !== 'free' && !isTrialing && (
              <div
                className="w-full flex items-center gap-3 p-4 min-h-[56px] hover:bg-secondary/50 active:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => { openPortal(); haptics.light(); }}
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-foreground-secondary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-body-bold text-foreground">Manage Billing</div>
                  <div className="text-caption text-foreground-secondary">
                    Update payment, view invoices
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-foreground-muted" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <motion.div key={section.title} variants={staggerItem} className="space-y-2">
          <h2 className="text-caption-bold text-foreground-secondary uppercase tracking-wider px-1">
            {section.title}
          </h2>

          <Card className="bg-background-elevated border-border overflow-hidden">
            <CardContent className="p-0">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === section.items.length - 1;

                return (
                  <div
                    key={item.label}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 min-h-[56px]",
                      item.action === 'chevron' && "hover:bg-secondary/50 active:bg-secondary/50 transition-colors cursor-pointer",
                      item.action === 'badge' && "opacity-60",
                      !isLast && "border-b border-border"
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground-secondary" />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="text-body-bold text-foreground">
                        {item.label}
                      </div>
                      <div className="text-caption text-foreground-secondary">
                        {item.description}
                      </div>
                    </div>

                    {item.action === 'chevron' && (
                      <ChevronRight className="w-5 h-5 text-foreground-muted" />
                    )}
                    {item.action === 'badge' && (
                      <Badge variant="secondary" className="text-[10px] text-foreground-muted font-normal">
                        Coming soon
                      </Badge>
                    )}
                    {item.action === 'toggle' && (
                      <Switch
                        checked={item.value}
                        onCheckedChange={item.onChange}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Data Export */}
      <motion.div variants={staggerItem} className="space-y-2">
        <h2 className="text-caption-bold text-foreground-secondary uppercase tracking-wider px-1">
          Data
        </h2>
        <Card className="bg-background-elevated border-border overflow-hidden">
          <CardContent className="p-0">
            <div
              className="w-full flex items-center gap-3 p-4 min-h-[56px] hover:bg-secondary/50 active:bg-secondary/50 transition-colors cursor-pointer"
              onClick={() => { setShowSheetsExport(true); haptics.light(); }}
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-foreground-secondary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-body-bold text-foreground">Export to Google Sheets</div>
                <div className="text-caption text-foreground-secondary">
                  Get a beautiful CRM spreadsheet
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sign Out */}
      <motion.div variants={staggerItem}>
        <Button
          variant="outline"
          onClick={() => { haptics.medium(); signOut(); }}
          className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>

      {/* Google Sheets Export Sheet */}
      <GoogleSheetsExportSheet
        open={showSheetsExport}
        onOpenChange={setShowSheetsExport}
      />

      {/* Footer */}
      <motion.div
        variants={staggerItem}
        className="text-center text-caption text-foreground-muted pt-4"
      >
        <p>Circle by Fractionl</p>
        <p className="mt-1">Version 2.0.0</p>
      </motion.div>
    </motion.div>
  );
};
