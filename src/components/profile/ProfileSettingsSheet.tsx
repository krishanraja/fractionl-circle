import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Palette,
  Bell,
  Brain,
  Shield,
  Settings,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProfileSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ThemeValue = 'light' | 'dark' | 'system';

const themeOptions: { value: ThemeValue; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const aiPersonalities = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
];

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
];

const fiscalMonths = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function SectionHeader({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-5 pb-2">
      <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
      <span className="text-label text-foreground-secondary">{label}</span>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ProfileSettingsSheet({ open, onOpenChange }: ProfileSettingsSheetProps) {
  const { user, signOut } = useAuth();
  const { profile, preferences, updateProfile, updatePreferences } = useUserProfile();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const avatarInitial = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : '?';

  const handleStartEditName = useCallback(() => {
    setNameValue(profile?.full_name || '');
    setEditingName(true);
  }, [profile?.full_name]);

  const handleSaveName = useCallback(async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ full_name: nameValue.trim() });
      setEditingName(false);
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  }, [nameValue, updateProfile]);

  const handleTogglePreference = useCallback(
    async (key: string, value: boolean) => {
      try {
        await updatePreferences({ [key]: value });
      } catch {
        toast.error('Failed to update setting');
      }
    },
    [updatePreferences]
  );

  const handleSelectPreference = useCallback(
    async (key: string, value: string | number) => {
      try {
        if (key === 'fiscal_year_start') {
          await updateProfile({ [key]: value });
        } else if (key === 'currency') {
          await updateProfile({ [key]: value });
        } else {
          await updatePreferences({ [key]: value });
        }
      } catch {
        toast.error('Failed to update setting');
      }
    },
    [updateProfile, updatePreferences]
  );

  const handleSignOut = useCallback(() => {
    onOpenChange(false);
    signOut();
  }, [onOpenChange, signOut]);

  const handlePrivacy = useCallback(() => {
    onOpenChange(false);
    navigate('/privacy');
  }, [onOpenChange, navigate]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-left pb-0">
          <DrawerTitle className="font-display text-xl">Profile & Settings</DrawerTitle>
          <DrawerDescription>Manage your account, appearance, and preferences.</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4 pb-8">
          {/* ── Profile ────────────────────────── */}
          <SectionHeader icon={User} label="Profile" />

          <div className="flex items-center gap-4 py-3">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-lg font-semibold text-primary-foreground">
                {avatarInitial}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-9 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={saving || !nameValue.trim()}
                    className="h-9 px-3"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditName}
                  className="text-left w-full group"
                >
                  <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {profile?.full_name || 'Set your name'}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">
                    {user?.email || 'No email'}
                  </p>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground-muted mb-1 block">Industry</label>
              <Input
                defaultValue={profile?.industry || ''}
                placeholder="e.g. Technology"
                className="h-9 text-sm"
                onBlur={(e) => {
                  if (e.target.value !== (profile?.industry || '')) {
                    updateProfile({ industry: e.target.value || null });
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted mb-1 block">Business type</label>
              <Input
                defaultValue={profile?.business_type || ''}
                placeholder="e.g. Consulting"
                className="h-9 text-sm"
                onBlur={(e) => {
                  if (e.target.value !== (profile?.business_type || '')) {
                    updateProfile({ business_type: e.target.value || null });
                  }
                }}
              />
            </div>
          </div>

          <div className="py-2">
            <label className="text-xs font-medium text-foreground-muted mb-1 block">Target market</label>
            <Input
              defaultValue={profile?.target_market || ''}
              placeholder="e.g. Series A startups"
              className="h-9 text-sm"
              onBlur={(e) => {
                if (e.target.value !== (profile?.target_market || '')) {
                  updateProfile({ target_market: e.target.value || null });
                }
              }}
            />
          </div>

          <Separator className="my-1" />

          {/* ── Appearance ────────────────────── */}
          <SectionHeader icon={Palette} label="Appearance" />

          <SettingRow label="Theme">
            <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleSelectPreference('theme', value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    preferences?.theme === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Compact mode"
            description="Reduce spacing for denser layouts"
          >
            <Switch
              checked={preferences?.compact_mode ?? false}
              onCheckedChange={(v) => handleTogglePreference('compact_mode', v)}
            />
          </SettingRow>

          <SettingRow
            label="Animations"
            description="Enable motion and transitions"
          >
            <Switch
              checked={preferences?.animations_enabled ?? true}
              onCheckedChange={(v) => handleTogglePreference('animations_enabled', v)}
            />
          </SettingRow>

          <Separator className="my-1" />

          {/* ── Notifications ────────────────── */}
          <SectionHeader icon={Bell} label="Notifications" />

          <SettingRow label="Email notifications">
            <Switch
              checked={preferences?.email_notifications ?? true}
              onCheckedChange={(v) => handleTogglePreference('email_notifications', v)}
            />
          </SettingRow>

          <SettingRow label="Browser notifications">
            <Switch
              checked={preferences?.browser_notifications ?? false}
              onCheckedChange={(v) => handleTogglePreference('browser_notifications', v)}
            />
          </SettingRow>

          <SettingRow label="Daily digest">
            <Switch
              checked={preferences?.daily_digest ?? true}
              onCheckedChange={(v) => handleTogglePreference('daily_digest', v)}
            />
          </SettingRow>

          <SettingRow label="Weekly summary">
            <Switch
              checked={preferences?.weekly_summary ?? true}
              onCheckedChange={(v) => handleTogglePreference('weekly_summary', v)}
            />
          </SettingRow>

          <SettingRow label="Goal reminders">
            <Switch
              checked={preferences?.goal_reminders ?? true}
              onCheckedChange={(v) => handleTogglePreference('goal_reminders', v)}
            />
          </SettingRow>

          <Separator className="my-1" />

          {/* ── AI Preferences ───────────────── */}
          <SectionHeader icon={Brain} label="AI Preferences" />

          <SettingRow label="AI personality">
            <Select
              value={preferences?.ai_personality || 'professional'}
              onValueChange={(v) => handleSelectPreference('ai_personality', v)}
            >
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aiPersonalities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Proactive suggestions"
            description="Let AI surface opportunities unprompted"
          >
            <Switch
              checked={preferences?.ai_proactive_suggestions ?? true}
              onCheckedChange={(v) => handleTogglePreference('ai_proactive_suggestions', v)}
            />
          </SettingRow>

          <SettingRow
            label="Auto-insights"
            description="Generate insights from your activity"
          >
            <Switch
              checked={preferences?.ai_auto_insights ?? true}
              onCheckedChange={(v) => handleTogglePreference('ai_auto_insights', v)}
            />
          </SettingRow>

          <Separator className="my-1" />

          {/* ── Account ──────────────────────── */}
          <SectionHeader icon={Settings} label="Account" />

          <SettingRow label="Currency">
            <Select
              value={profile?.currency || 'USD'}
              onValueChange={(v) => handleSelectPreference('currency', v)}
            >
              <SelectTrigger className="w-[120px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Fiscal year starts">
            <Select
              value={String(profile?.fiscal_year_start || 1)}
              onValueChange={(v) => handleSelectPreference('fiscal_year_start', Number(v))}
            >
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fiscalMonths.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator className="my-1" />

          {/* ── Data & Privacy ───────────────── */}
          <SectionHeader icon={Shield} label="Data & Privacy" />

          <button
            onClick={handlePrivacy}
            className="flex items-center justify-between w-full py-3 group"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Privacy settings
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground-muted" />
          </button>

          <Separator className="my-1" />

          {/* ── Sign Out ─────────────────────── */}
          <div className="pt-4 pb-2">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          <p className="text-center text-xs text-foreground-muted pt-2 pb-4">
            {user?.email}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
