import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, Bell, ChevronRight,
  LogOut, Moon, CreditCard, Layers, Crown, ExternalLink, BarChart3, FileSpreadsheet,
  Smartphone, Download
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
import { useInstallPrompt, isIOS } from '@/hooks/useInstallPrompt';

// iCloud link to the "Add to Circle" Apple Shortcut. Built from docs/screenshot-to-contact.md.
// TODO: replace with the real iCloud URL once the Shortcut is exported; see Task 5 of the rollout.
const IOS_SHORTCUT_URL = '/shortcuts/add-from-circle.shortcut';

interface SettingsScreenProps {
  initialShowPricing?: boolean;
  onPricingShown?: () => void;
}

export const SettingsScreen = ({ initialShowPricing, onPricingShown }: SettingsScreenProps = {}) => {
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
  const [showPricing, setShowPricing] = useState(initialShowPricing ?? false);
  const [showSheetsExport, setShowSheetsExport] = useState(false);
  const { canInstall, install } = useInstallPrompt();
  const showIOSShortcut = isIOS();

  useEffect(() => {
    if (initialShowPricing) {
      setShowPricing(true);
      onPricingShown?.();
    }
  }, [initialShowPricing, onPricingShown]);

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
        <div className="flex items-center justify-between px-5 py-4">
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

  const avatarInitial = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : '?';

  const settingsSections = [
    {
      title: 'Profile',
      items: [
        {
          icon: User,
          label: 'Account',
          description: user?.email || 'Not signed in',
          action: 'chevron' as const,
          onClick: () => toast.info('Profile editing coming soon'),
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
          onChange: async (v: boolean) => {
            if (v && 'Notification' in window) {
              const permission = await Notification.requestPermission();
              if (permission !== 'granted') {
                toast.error('Notification permission was denied. Enable it in your browser settings.');
                return;
              }
            }
            setPushNotifications(v);
            handleToggle('browser_notifications', v);
          },
        },
        {
          icon: Bell,
          label: 'Email Digest',
          description: 'Weekly summary via email (coming soon)',
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
      className="flex flex-col gap-7 px-5 pt-6 pb-28"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header — compact profile */}
      <motion.div variants={staggerItem} className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-title-1 font-semibold text-primary">{avatarInitial}</span>
        </div>
        <h1 className="text-title-2 text-foreground">
          {profile?.full_name || 'Your Profile'}
        </h1>
        <p className="text-caption text-foreground-muted mt-0.5 mb-2">
          {user?.email}
        </p>
        <SubscriptionBadge />
      </motion.div>

      {/* Subscription Section */}
      <motion.div variants={staggerItem} className="space-y-2">
        <h2 className="text-label text-foreground-muted px-0.5">
          Subscription
        </h2>

        <Card className="bg-background-elevated border-border/40 overflow-hidden">
          <CardContent className="p-0">
            <div
              className="w-full flex items-center gap-3 p-4 min-h-[52px] hover:bg-secondary/40 active:bg-secondary/40 transition-colors cursor-pointer border-b border-border/30"
              onClick={() => { setShowPricing(true); haptics.light(); }}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                {effectiveTier === 'executive' ? (
                  <Crown className="w-4 h-4 text-primary" />
                ) : (
                  <Layers className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="text-body-bold text-foreground">
                  {effectiveTier === 'free' ? 'Free Plan' : effectiveTier === 'pro' ? 'Pro Plan' : 'Executive Plan'}
                  {isTrialing && (
                    <span className="text-caption text-warning ml-2">
                      ({trialDaysRemaining}d trial)
                    </span>
                  )}
                </div>
                <div className="text-caption text-foreground-muted">
                  {effectiveTier === 'free'
                    ? 'Upgrade for unlimited access'
                    : cancelAtPeriodEnd
                    ? 'Cancels at end of period'
                    : 'Active subscription'}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-muted" />
            </div>

            {isPastDue && (
              <div className="px-4 py-3 bg-destructive/8 border-b border-border/30">
                <p className="text-caption text-destructive font-medium">
                  Payment failed. Please update your billing info.
                </p>
              </div>
            )}

            {showUsage && (
              <div className="p-4 space-y-3">
                <p className="text-label text-foreground-muted">This Month's Usage</p>

                {voiceLimit !== Infinity && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-caption">
                      <span className="text-foreground-muted">Voice Logs</span>
                      <span className={cn(
                        "font-medium",
                        isAtLimit('voice_logs') ? "text-destructive" : "text-foreground"
                      )}>
                        {usage.voice_logs} / {voiceLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercent('voice_logs')} className="h-1" />
                  </div>
                )}

                {aiLimit !== Infinity && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-caption">
                      <span className="text-foreground-muted">AI Insights</span>
                      <span className={cn(
                        "font-medium",
                        isAtLimit('ai_queries') ? "text-destructive" : "text-foreground"
                      )}>
                        {usage.ai_queries} / {aiLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercent('ai_queries')} className="h-1" />
                  </div>
                )}
              </div>
            )}

            {effectiveTier !== 'free' && !isTrialing && (
              <div
                className="w-full flex items-center gap-3 p-4 min-h-[52px] hover:bg-secondary/40 active:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => { openPortal(); haptics.light(); }}
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-foreground-muted" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-body-bold text-foreground">Manage Billing</div>
                  <div className="text-caption text-foreground-muted">
                    Update payment, view invoices
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-foreground-muted" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <motion.div key={section.title} variants={staggerItem} className="space-y-2">
          <h2 className="text-label text-foreground-muted px-0.5">
            {section.title}
          </h2>

          <Card className="bg-background-elevated border-border/40 overflow-hidden">
            <CardContent className="p-0">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === section.items.length - 1;

                return (
                  <div
                    key={item.label}
                    onClick={() => {
                      if (item.action === 'chevron' && (item as any).onClick) {
                        haptics.light();
                        (item as any).onClick();
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 min-h-[52px]",
                      item.action === 'chevron' && "hover:bg-secondary/40 active:bg-secondary/40 transition-colors cursor-pointer",
                      item.action === 'badge' && "opacity-60",
                      !isLast && "border-b border-border/30"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground-muted" />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="text-body-bold text-foreground">
                        {item.label}
                      </div>
                      <div className="text-caption text-foreground-muted">
                        {item.description}
                      </div>
                    </div>

                    {item.action === 'chevron' && (
                      <ChevronRight className="w-4 h-4 text-foreground-muted" />
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

      {/* Install / Shortcut */}
      {(showIOSShortcut || canInstall) && (
        <motion.div variants={staggerItem} className="space-y-2">
          <h2 className="text-label text-foreground-muted px-0.5">
            Install
          </h2>
          <Card className="bg-background-elevated border-border/40 overflow-hidden">
            <CardContent className="p-0">
              {showIOSShortcut && (
                <div
                  className="w-full flex items-center gap-3 p-4 min-h-[52px] hover:bg-secondary/40 active:bg-secondary/40 transition-colors cursor-pointer border-b border-border/30"
                  onClick={() => { haptics.light(); window.open(IOS_SHORTCUT_URL, '_blank'); }}
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-foreground-muted" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-body-bold text-foreground">Add from Screenshot (iOS)</div>
                    <div className="text-caption text-foreground-muted">
                      Install the Shortcut to add contacts from screenshots
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-foreground-muted" />
                </div>
              )}
              {canInstall && (
                <div
                  className="w-full flex items-center gap-3 p-4 min-h-[52px] hover:bg-secondary/40 active:bg-secondary/40 transition-colors cursor-pointer"
                  onClick={() => { haptics.light(); install(); }}
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Download className="w-4 h-4 text-foreground-muted" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-body-bold text-foreground">Install Circle as App</div>
                    <div className="text-caption text-foreground-muted">
                      Add to home screen for screenshot sharing
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Export */}
      <motion.div variants={staggerItem} className="space-y-2">
        <h2 className="text-label text-foreground-muted px-0.5">
          Data
        </h2>
        <Card className="bg-background-elevated border-border/40 overflow-hidden">
          <CardContent className="p-0">
            <div
              className="w-full flex items-center gap-3 p-4 min-h-[52px] hover:bg-secondary/40 active:bg-secondary/40 transition-colors cursor-pointer"
              onClick={() => { setShowSheetsExport(true); haptics.light(); }}
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-foreground-muted" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-body-bold text-foreground">Export to Google Sheets</div>
                <div className="text-caption text-foreground-muted">
                  Export your CRM data
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-muted" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sign Out */}
      <motion.div variants={staggerItem}>
        <Button
          variant="outline"
          onClick={() => { haptics.medium(); signOut(); }}
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>

      <GoogleSheetsExportSheet
        open={showSheetsExport}
        onOpenChange={setShowSheetsExport}
      />

      {/* Footer */}
      <motion.div
        variants={staggerItem}
        className="text-center text-caption text-foreground-muted pt-2"
      >
        <p>Circle by Fractionl</p>
        <p className="mt-0.5">Version 2.0.0</p>
      </motion.div>
    </motion.div>
  );
};
