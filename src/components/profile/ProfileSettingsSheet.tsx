import { useState, useCallback, useEffect } from 'react';
import { applyTheme } from '@/lib/applyUserPreferences';
import { Link } from 'react-router-dom';
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
import { useInstallPrompt, isIOS } from '@/hooks/useInstallPrompt';
import { Download } from 'lucide-react';

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

const roleOptions: { value: string; label: string }[] = [
  { value: 'cmo', label: 'CMO' },
  { value: 'coo', label: 'COO' },
  { value: 'cfo', label: 'CFO' },
  { value: 'cro', label: 'CRO' },
  { value: 'cpo', label: 'CPO' },
  { value: 'cto', label: 'CTO' },
  { value: 'chief_of_staff', label: 'Chief of Staff' },
  { value: 'other', label: 'Other' },
];

const engagementOptions: { value: string; label: string }[] = [
  { value: 'fractional_executive', label: 'Fractional executive' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'interim', label: 'Interim' },
  { value: 'consulting_firm', label: 'Consulting firm' },
];

const stageOptions: { value: string; label: string }[] = [
  { value: 'pre_seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c_plus', label: 'Series C+' },
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'pe_backed', label: 'PE-backed' },
];

const verticalOptions: { value: string; label: string }[] = [
  { value: 'saas', label: 'SaaS' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'ai_ml', label: 'AI / ML' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'dev_tools', label: 'Dev tools' },
  { value: 'marketplace', label: 'Marketplaces' },
  { value: 'dtc', label: 'DTC / Consumer' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'climate', label: 'Climate' },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium',
        'border transition-all whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-surface-muted text-foreground-secondary border-border hover:border-primary/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  multi,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  multi: boolean;
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-xs font-medium text-foreground-muted">{label}</label>
        {multi && (
          <span className="text-[10px] text-foreground-muted">Select all that apply</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Chip
            key={opt.value}
            active={selected.includes(opt.value)}
            onClick={() => onToggle(opt.value)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

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
  const { canInstall, install } = useInstallPrompt();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [positioning, setPositioning] = useState('');

  useEffect(() => {
    if (!open) return;
    setPositioning(profile?.positioning ?? '');
  }, [open, profile?.positioning]);

  const role = profile?.role ?? null;
  const engagementModel = profile?.business_type ?? null;
  const clientStages = profile?.client_stages ?? [];
  const clientVerticals = profile?.client_verticals ?? [];

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

  const savePositioning = useCallback(async () => {
    const trimmed = positioning.trim();
    const prev = (profile?.positioning ?? '').trim();
    if (trimmed === prev) return;
    try {
      await updateProfile({ positioning: trimmed || null });
      toast.success('Saved');
    } catch {
      /* toast from updateProfile */
    }
  }, [positioning, profile?.positioning, updateProfile]);

  const handleSelectRole = useCallback(
    async (value: string) => {
      const next = role === value ? null : value;
      try {
        await updateProfile({ role: next });
      } catch {
        /* toast from updateProfile */
      }
    },
    [role, updateProfile]
  );

  const handleSelectEngagement = useCallback(
    async (value: string) => {
      const next = engagementModel === value ? null : value;
      try {
        await updateProfile({ business_type: next });
      } catch {
        /* toast from updateProfile */
      }
    },
    [engagementModel, updateProfile]
  );

  const handleToggleStage = useCallback(
    async (value: string) => {
      const next = clientStages.includes(value)
        ? clientStages.filter((v) => v !== value)
        : [...clientStages, value];
      try {
        await updateProfile({ client_stages: next });
      } catch {
        /* toast from updateProfile */
      }
    },
    [clientStages, updateProfile]
  );

  const handleToggleVertical = useCallback(
    async (value: string) => {
      const next = clientVerticals.includes(value)
        ? clientVerticals.filter((v) => v !== value)
        : [...clientVerticals, value];
      try {
        await updateProfile({ client_verticals: next });
      } catch {
        /* toast from updateProfile */
      }
    },
    [clientVerticals, updateProfile]
  );

  const handleTogglePreference = useCallback(
    async (key: string, value: boolean) => {
      if (key === 'browser_notifications' && value) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast.error('Allow notifications in your browser to enable this.');
            return;
          }
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          toast.error('Notifications are blocked in your browser settings.');
          return;
        }
      }
      try {
        await updatePreferences({ [key]: value });
        toast.success('Saved');
      } catch {
        /* toast from updatePreferences */
      }
    },
    [updatePreferences]
  );

  const handleSelectPreference = useCallback(
    async (key: string, value: string | number) => {
      try {
        if (key === 'fiscal_year_start') {
          await updateProfile({ fiscal_year_start: value as number });
        } else if (key === 'currency') {
          await updateProfile({ currency: value as string });
        } else if (key === 'theme') {
          applyTheme(value as ThemeValue);
          await updatePreferences({ theme: value as ThemeValue });
        } else {
          await updatePreferences({ [key]: value });
        }
        toast.success('Saved');
      } catch {
        /* toast from hooks */
      }
    },
    [updateProfile, updatePreferences]
  );

  const handleSignOut = useCallback(() => {
    onOpenChange(false);
    signOut();
  }, [onOpenChange, signOut]);

  const handlePrivacyNavigate = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

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

          <ChipGroup
            label="Your role"
            options={roleOptions}
            selected={role ? [role] : []}
            onToggle={handleSelectRole}
            multi={false}
          />

          <ChipGroup
            label="How you work"
            options={engagementOptions}
            selected={engagementModel ? [engagementModel] : []}
            onToggle={handleSelectEngagement}
            multi={false}
          />

          <ChipGroup
            label="Stages you serve"
            options={stageOptions}
            selected={clientStages}
            onToggle={handleToggleStage}
            multi
          />

          <ChipGroup
            label="Verticals you serve"
            options={verticalOptions}
            selected={clientVerticals}
            onToggle={handleToggleVertical}
            multi
          />

          <div className="py-2">
            <label className="text-xs font-medium text-foreground-muted mb-1 block">
              Positioning
            </label>
            <Input
              value={positioning}
              onChange={(e) => setPositioning(e.target.value)}
              placeholder="e.g. Helping Series A–C SaaS scale demand gen"
              className="h-9 text-sm"
              onBlur={() => void savePositioning()}
            />
            <p className="text-[11px] text-foreground-muted mt-1 leading-relaxed">
              Optional. Your LinkedIn headline, in one line — we use it to flavor AI suggestions.
            </p>
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

          <SettingRow
            label="Email notifications"
            description="Master switch for product emails from Circle"
          >
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

          <SettingRow
            label="Daily digest"
            description="Saved for morning summary emails (when enabled on our side)"
          >
            <Switch
              checked={preferences?.daily_digest ?? true}
              onCheckedChange={(v) => handleTogglePreference('daily_digest', v)}
            />
          </SettingRow>

          <SettingRow
            label="Weekly summary"
            description="Controls automated Sunday Letter generation for your account"
          >
            <Switch
              checked={preferences?.weekly_summary ?? true}
              onCheckedChange={(v) => handleTogglePreference('weekly_summary', v)}
            />
          </SettingRow>

          <SettingRow
            label="Goal reminders"
            description="Saved for goal nudges (when reminder emails are enabled)"
          >
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
            description="When on, Today nudges you to surface Matches (saved for smarter automation later)"
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

          {(canInstall || isIOS()) && (
            <SettingRow
              label="Install app"
              description={isIOS() ? 'Safari → Share → Add to Home Screen' : 'Install Circle on this device'}
            >
              {canInstall ? (
                <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => void install()}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Install
                </Button>
              ) : (
                <span className="text-xs text-foreground-muted">Use Share menu</span>
              )}
            </SettingRow>
          )}

          <Separator className="my-1" />

          {/* ── Data & Privacy ───────────────── */}
          <SectionHeader icon={Shield} label="Data & Privacy" />

          <Link
            to="/privacy"
            onClick={handlePrivacyNavigate}
            className="flex items-center justify-between w-full py-3 group"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Privacy settings
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground-muted" />
          </Link>

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
