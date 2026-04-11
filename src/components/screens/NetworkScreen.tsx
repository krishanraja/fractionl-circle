import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Search, Users, Filter, Keyboard, Mic, Camera, Instagram, Linkedin, Smartphone,
  RefreshCw, Sparkles, Phone, Mail, ChevronDown, Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { contactCardStagger, contactCardItem, heroSection, statPill } from '@/constants/animation';
import { TalentContactCard } from '@/components/talent/TalentContactCard';
import { QuickAddSheet } from '@/components/talent/QuickAddSheet';
import { TalentContactForm } from '@/components/talent/TalentContactForm';
import { ContactFABMenu } from '@/components/talent/ContactFABMenu';
import { VoiceAddContact } from '@/components/talent/VoiceAddContact';
import { PhotoImportSheet } from '@/components/talent/PhotoImportSheet';
import { InstagramImportSheet } from '@/components/talent/InstagramImportSheet';
import { PhoneContactsImport } from '@/components/talent/PhoneContactsImport';
import { LinkedInImportSheet } from '@/components/talent/LinkedInImportSheet';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { useSkills } from '@/hooks/useSkills';
import { useCircleInsights } from '@/hooks/useCircleInsights';
import { useIsMobile } from '@/hooks/use-mobile';
import { haptics } from '@/utils/haptics';
import { callPhone, sendEmail, sendSMS, openWhatsApp } from '@/utils/contactActions';

const SKILL_CATEGORIES = [
  'All', 'Design', 'Development', 'Product', 'Marketing',
  'Content', 'Data', 'Operations', 'Strategy', 'Sales',
  'Creative', 'Research', 'Finance', 'Legal',
];

export const CircleScreen = () => {
  const { contacts, loading: isLoading, deleteContact, createContact, updateContact, refetch } = useTalentContacts();
  const { skills } = useSkills();
  const insights = useCircleInsights();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMoreImports, setShowMoreImports] = useState(false);

  // Sheet states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [showVoiceAdd, setShowVoiceAdd] = useState(false);
  const [showPhotoImport, setShowPhotoImport] = useState(false);
  const [showInstagramImport, setShowInstagramImport] = useState(false);
  const [showPhoneImport, setShowPhoneImport] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  // Pull-to-refresh
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePullRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    haptics.pullRefresh();
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [isRefreshing, refetch]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length };
    contacts.forEach(contact => {
      contact.skills?.forEach((skill: any) => {
        const cat = skills.find(s => s.id === skill.id)?.category;
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [contacts, skills]);

  const filtered = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = !search ||
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.specialty_summary?.toLowerCase().includes(search.toLowerCase()) ||
        contact.company?.toLowerCase().includes(search.toLowerCase()) ||
        contact.city?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = activeCategory === 'All' ||
        contact.talent_skills?.some((ts: any) =>
          skills.find(s => s.id === ts.skill_id)?.category === activeCategory
        );

      const matchesAvailability = !availableOnly ||
        contact.availability_status === 'available';

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [contacts, search, activeCategory, availableOnly, skills]);

  // Sort by warmth (most recently interacted first, then by created_at)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aDate = a.last_interaction_date || a.created_at;
      const bDate = b.last_interaction_date || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [filtered]);

  const isEmptyState = !isLoading && contacts.length === 0 && !search && activeCategory === 'All';
  const isFilteredEmpty = !isLoading && sorted.length === 0 && !isEmptyState;
  const hasContacts = contacts.length > 0;

  // Quick reach-out action for a contact
  const getQuickAction = (contact: any) => {
    if (contact.phone) return { label: 'Call', action: () => callPhone(contact.phone), icon: Phone };
    if (contact.email) return { label: 'Email', action: () => sendEmail(contact.email, contact.name), icon: Mail };
    return null;
  };

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* ─── Hero Section (only when user has contacts) ─── */}
      {hasContacts && !isLoading && (
        <motion.div
          {...heroSection}
          className="circle-hero-bg px-5 pt-5 pb-4 space-y-4"
        >
          {/* Network Health + Stats Row */}
          <div className="flex items-center gap-4">
            {/* Health Ring */}
            <motion.div
              className="relative flex-shrink-0"
              whileTap={{ scale: 0.95 }}
              onClick={() => { haptics.heroTap(); }}
            >
              <svg className="w-16 h-16" viewBox="0 0 100 100">
                {/* Background ring */}
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="6"
                  className="health-ring"
                />
                {/* Health progress ring */}
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={insights.networkHealthColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="health-ring"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * insights.networkHealthScore / 100)}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatedNumber
                  value={insights.totalContacts}
                  className="text-lg font-bold text-foreground"
                />
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="flex-1 flex flex-wrap gap-2">
              {insights.availableCount > 0 && (
                <motion.button
                  {...statPill}
                  transition={{ ...statPill.transition, delay: 0 }}
                  onClick={() => { setAvailableOnly(true); haptics.tap(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/8 border border-success/15 active:scale-95 transition-transform"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-xs font-medium text-success">{insights.availableCount} Available</span>
                </motion.button>
              )}
              {insights.newThisMonth > 0 && (
                <motion.button
                  {...statPill}
                  transition={{ ...statPill.transition, delay: 0.05 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15"
                >
                  <span className="text-xs font-medium text-primary">{insights.newThisMonth} New</span>
                </motion.button>
              )}
              {insights.followUpsDue.length > 0 && (
                <motion.button
                  {...statPill}
                  transition={{ ...statPill.transition, delay: 0.1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/8 border border-warning/15"
                >
                  <span className="text-xs font-medium text-warning">{insights.followUpsDue.length} Follow-up{insights.followUpsDue.length !== 1 ? 's' : ''}</span>
                </motion.button>
              )}
            </div>
          </div>

          {/* ─── Reconnect Suggestions ─── */}
          {insights.staleContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Reconnect</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                {insights.staleContacts.slice(0, 5).map((contact, i) => {
                  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const daysSince = contact.last_interaction_date
                    ? Math.floor((Date.now() - new Date(contact.last_interaction_date).getTime()) / 86400000)
                    : null;
                  const quickAction = getQuickAction(contact);

                  return (
                    <motion.button
                      key={contact.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => {
                        haptics.light();
                        if (quickAction) quickAction.action();
                      }}
                      className="reconnect-card flex-shrink-0 flex items-center gap-2.5 pl-2.5 pr-3.5 py-2.5 rounded-2xl active:scale-[0.97] transition-transform"
                    >
                      <Avatar className="h-9 w-9 ring-2 ring-warning/20">
                        <AvatarImage src={contact.photo_url || undefined} alt={contact.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[80px]">{contact.name.split(' ')[0]}</p>
                        <p className="text-[10px] text-warning font-medium">
                          {daysSince ? `${daysSince}d ago` : 'No contact'}
                        </p>
                      </div>
                      {quickAction && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <quickAction.icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Search + Filter Row ─── */}
      {hasContacts && (
        <div className="px-4 pt-3 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, skill, company, city..."
                className="pl-10 bg-input border-border text-foreground h-11 rounded-xl"
              />
            </div>
            <Button
              variant={availableOnly ? "default" : "outline"}
              size="icon"
              className="h-11 w-11 flex-shrink-0 rounded-xl"
              onClick={() => { setAvailableOnly(!availableOnly); haptics.tap(); }}
              title="Available only"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Category chips with counts */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              {SKILL_CATEGORIES.map(cat => {
                const count = categoryCounts[cat] || 0;
                const isActive = activeCategory === cat;
                if (cat !== 'All' && count === 0) return null;

                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); haptics.tap(); }}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/60 text-foreground-secondary hover:bg-secondary"
                    )}
                  >
                    {cat}
                    {count > 0 && cat !== 'All' && (
                      <span className={cn("ml-1", isActive ? "opacity-80" : "opacity-50")}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="h-0" />
          </ScrollArea>
        </div>
      )}

      {/* ─── Pull-to-refresh indicator ─── */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-primary animate-refresh-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Contact List ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-3 pb-32 space-y-2"
        onTouchEnd={() => {
          if (scrollRef.current && scrollRef.current.scrollTop <= -60) {
            handlePullRefresh();
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-[80px] rounded-2xl bg-background-elevated animate-pulse" />
            ))
          ) : isEmptyState ? (
            /* ─── Premium Empty State ─── */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 px-1"
            >
              {/* Animated network illustration */}
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  {/* Center node */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center z-10">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  {/* Orbiting nodes */}
                  <div className="absolute top-2 left-6 w-8 h-8 rounded-full bg-success/12 flex items-center justify-center animate-float-node">
                    <div className="w-3 h-3 rounded-full bg-success/40" />
                  </div>
                  <div className="absolute top-6 right-4 w-7 h-7 rounded-full bg-warning/12 flex items-center justify-center animate-float-node-delayed">
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
                  </div>
                  <div className="absolute bottom-4 left-3 w-7 h-7 rounded-full bg-primary/12 flex items-center justify-center animate-float-node-delayed">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
                  </div>
                  <div className="absolute bottom-8 right-6 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center animate-float-node">
                    <div className="w-2 h-2 rounded-full bg-destructive/30" />
                  </div>
                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
                    <line x1="64" y1="64" x2="30" y2="18" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                    <line x1="64" y1="64" x2="100" y2="30" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                    <line x1="64" y1="64" x2="24" y2="96" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                    <line x1="64" y1="64" x2="98" y2="84" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                  </svg>
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-title-2 text-foreground mb-1">Build your network</h2>
                <p className="text-body text-foreground-secondary">Add people you want to remember and stay connected with</p>
              </div>

              {/* Primary action */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => { setShowQuickAdd(true); haptics.medium(); }}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold text-base shadow-lg shadow-primary/25 active:scale-[0.97] transition-transform mb-3"
              >
                <Plus className="w-5 h-5" />
                Add your first contact
              </motion.button>

              {/* Top import options */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <ImportOptionCard
                  icon={<Mic className="w-5 h-5" />}
                  label="Voice Add"
                  description="Say their details"
                  color="bg-rose-500/10 text-rose-600"
                  onClick={() => setShowVoiceAdd(true)}
                  delay={0.15}
                />
                <ImportOptionCard
                  icon={<Linkedin className="w-5 h-5" />}
                  label="LinkedIn"
                  description="URL or CSV import"
                  color="bg-[#0A66C2]/10 text-[#0A66C2]"
                  onClick={() => setShowLinkedInImport(true)}
                  delay={0.2}
                />
              </div>

              {/* More ways expandable */}
              <AnimatePresence>
                {showMoreImports && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <ImportOptionCard
                        icon={<Smartphone className="w-5 h-5" />}
                        label="Phone Contacts"
                        description="Import from your phone"
                        color="bg-emerald-500/10 text-emerald-600"
                        onClick={() => setShowPhoneImport(true)}
                        delay={0}
                      />
                      <ImportOptionCard
                        icon={<Camera className="w-5 h-5" />}
                        label="Scan Card"
                        description="Photo or screenshot"
                        color="bg-amber-500/10 text-amber-600"
                        onClick={() => setShowPhotoImport(true)}
                        delay={0.05}
                      />
                      <ImportOptionCard
                        icon={<Instagram className="w-5 h-5" />}
                        label="Instagram"
                        description="Add by handle"
                        color="bg-[#E1306C]/10 text-[#E1306C]"
                        onClick={() => setShowInstagramImport(true)}
                        delay={0.1}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowMoreImports(!showMoreImports)}
                className="w-full flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-foreground-muted hover:text-foreground-secondary transition-colors"
              >
                {showMoreImports ? 'Less options' : 'More ways to add'}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMoreImports && "rotate-180")} />
              </button>
            </motion.div>
          ) : isFilteredEmpty ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary-muted flex items-center justify-center">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-body-bold text-foreground">No matches</p>
                <p className="text-caption text-foreground-secondary mt-1">
                  Try a different search or filter
                </p>
              </div>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => { setShowQuickAdd(true); haptics.light(); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add &ldquo;{search}&rdquo; as contact
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div variants={contactCardStagger} initial="initial" animate="animate">
              {sorted.map((contact) => (
                <motion.div
                  key={contact.id}
                  variants={contactCardItem}
                  layout
                >
                  <TalentContactCard
                    contact={contact}
                    onEdit={() => { setEditingContact(contact); setShowFullForm(true); }}
                    onDelete={() => deleteContact(contact.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable FAB menu */}
      <ContactFABMenu
        onQuickAdd={() => setShowQuickAdd(true)}
        onVoiceAdd={() => setShowVoiceAdd(true)}
        onPhotoImport={() => setShowPhotoImport(true)}
        onInstagramImport={() => setShowInstagramImport(true)}
        onLinkedInImport={() => setShowLinkedInImport(true)}
        onPhoneImport={() => setShowPhoneImport(true)}
        topSuggestion={insights.topSuggestion}
        contactCount={contacts.length}
        searchActive={!!search && isFilteredEmpty}
      />

      {/* All sheets / drawers */}
      <QuickAddSheet
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onOpenFullForm={(contact) => {
          setShowQuickAdd(false);
          if (contact) setEditingContact(contact);
          setShowFullForm(true);
        }}
      />
      <TalentContactForm
        open={showFullForm}
        onOpenChange={(open) => { setShowFullForm(open); if (!open) setEditingContact(null); }}
        contact={editingContact}
        onSubmit={async (contactData, skillIds) => {
          if (editingContact) {
            await updateContact(editingContact.id, contactData, skillIds);
          } else {
            await createContact(contactData, skillIds);
          }
        }}
      />
      <VoiceAddContact
        open={showVoiceAdd}
        onOpenChange={setShowVoiceAdd}
      />
      <PhotoImportSheet
        open={showPhotoImport}
        onOpenChange={setShowPhotoImport}
      />
      <InstagramImportSheet
        open={showInstagramImport}
        onOpenChange={setShowInstagramImport}
        onScanScreenshot={() => setShowPhotoImport(true)}
      />
      <PhoneContactsImport
        open={showPhoneImport}
        onOpenChange={setShowPhoneImport}
      />
      <LinkedInImportSheet
        open={showLinkedInImport}
        onOpenChange={setShowLinkedInImport}
      />
    </motion.div>
  );
};

// Import option card for the empty state
function ImportOptionCard({ icon, label, description, color, onClick, delay }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => { onClick(); haptics.light(); }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 border border-border/60 text-left active:scale-[0.97] transition-transform"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-foreground-secondary">{description}</p>
      </div>
    </motion.button>
  );
}
