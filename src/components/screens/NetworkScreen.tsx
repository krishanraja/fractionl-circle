import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Filter, Keyboard, Mic, Camera, Instagram, Linkedin, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { TalentContactCard } from '@/components/talent/TalentContactCard';
import { QuickAddSheet } from '@/components/talent/QuickAddSheet';
import { TalentContactForm } from '@/components/talent/TalentContactForm';
import { ContactFABMenu } from '@/components/talent/ContactFABMenu';
import { VoiceAddContact } from '@/components/talent/VoiceAddContact';
import { PhotoImportSheet } from '@/components/talent/PhotoImportSheet';
import { InstagramImportSheet } from '@/components/talent/InstagramImportSheet';
import { PhoneContactsImport } from '@/components/talent/PhoneContactsImport';
import { LinkedInImportSheet } from '@/components/talent/LinkedInImportSheet';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { useSkills } from '@/hooks/useSkills';
import { RecentActivity } from '@/components/activity/RecentActivity';

const SKILL_CATEGORIES = [
  'All', 'Design', 'Development', 'Product', 'Marketing',
  'Content', 'Data', 'Operations', 'Strategy', 'Sales',
  'Creative', 'Research', 'Finance', 'Legal',
];

const AVAILABILITY_COLORS: Record<string, string> = {
  available: '#10B981',
  busy: '#F59E0B',
  unavailable: '#6B7280',
};

export const CircleScreen = () => {
  const { contacts, loading: isLoading, deleteContact, createContact, updateContact } = useTalentContacts();
  const { skills } = useSkills();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);

  // Sheet states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [showVoiceAdd, setShowVoiceAdd] = useState(false);
  const [showPhotoImport, setShowPhotoImport] = useState(false);
  const [showInstagramImport, setShowInstagramImport] = useState(false);
  const [showPhoneImport, setShowPhoneImport] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

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

  return (
    <motion.div
      className="flex flex-col h-full"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Search + filter row */}
      <motion.div variants={staggerItem} className="px-4 pt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, skill, company, city..."
              className="pl-10 bg-input border-border text-foreground h-11"
            />
          </div>
          <Button
            variant={availableOnly ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 flex-shrink-0"
            onClick={() => setAvailableOnly(!availableOnly)}
            title="Available only"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Category chips */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-1">
            {SKILL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground-secondary hover:bg-secondary/80"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      </motion.div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-2">
        <AnimatePresence>
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-[88px] rounded-xl bg-background-elevated animate-pulse" />
            ))
          ) : isEmptyState ? (
            /* Rich empty state with import options */
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Your Black Book is empty</h2>
                <p className="text-sm text-foreground-secondary mt-1">Add people you want to remember</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <ImportOptionCard
                  icon={<Smartphone className="w-5 h-5" />}
                  label="Phone Contacts"
                  description="Import from your phone"
                  color="bg-emerald-500/12 text-emerald-600"
                  onClick={() => setShowPhoneImport(true)}
                  delay={0}
                />
                <ImportOptionCard
                  icon={<Camera className="w-5 h-5" />}
                  label="Scan Card"
                  description="Photo or screenshot"
                  color="bg-amber-500/12 text-amber-600"
                  onClick={() => setShowPhotoImport(true)}
                  delay={0.05}
                />
                <ImportOptionCard
                  icon={<Mic className="w-5 h-5" />}
                  label="Voice Add"
                  description="Say their details"
                  color="bg-rose-500/12 text-rose-600"
                  onClick={() => setShowVoiceAdd(true)}
                  delay={0.1}
                />
                <ImportOptionCard
                  icon={<Keyboard className="w-5 h-5" />}
                  label="Quick Add"
                  description="Type it in"
                  color="bg-primary/12 text-primary"
                  onClick={() => setShowQuickAdd(true)}
                  delay={0.15}
                />
                <ImportOptionCard
                  icon={<Linkedin className="w-5 h-5" />}
                  label="LinkedIn"
                  description="URL or CSV import"
                  color="bg-[#0A66C2]/12 text-[#0A66C2]"
                  onClick={() => setShowLinkedInImport(true)}
                  delay={0.2}
                />
                <ImportOptionCard
                  icon={<Instagram className="w-5 h-5" />}
                  label="Instagram"
                  description="Add by handle"
                  color="bg-[#E1306C]/12 text-[#E1306C]"
                  onClick={() => setShowInstagramImport(true)}
                  delay={0.25}
                />
              </div>
            </motion.div>
          ) : isFilteredEmpty ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-body-bold text-foreground">No matches</p>
                <p className="text-caption text-foreground-secondary mt-1">
                  Try a different search or filter
                </p>
              </div>
            </motion.div>
          ) : (
            sorted.map((contact, i) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
              >
                <TalentContactCard
                  contact={contact}
                  onEdit={() => { setEditingContact(contact); setShowFullForm(true); }}
                  onDelete={() => deleteContact(contact.id)}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Recent circle activity */}
      <div className="px-4 pt-4 pb-4">
        <RecentActivity contactsOnly initialCount={3} />
      </div>

      {/* Expandable FAB menu (replaces old single + button) */}
      <ContactFABMenu
        onQuickAdd={() => setShowQuickAdd(true)}
        onVoiceAdd={() => setShowVoiceAdd(true)}
        onPhotoImport={() => setShowPhotoImport(true)}
        onInstagramImport={() => setShowInstagramImport(true)}
        onLinkedInImport={() => setShowLinkedInImport(true)}
        onPhoneImport={() => setShowPhoneImport(true)}
      />

      {/* All sheets / drawers */}
      <QuickAddSheet
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onOpenFullForm={() => { setShowQuickAdd(false); setShowFullForm(true); }}
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 border border-border text-left active:bg-secondary transition-colors"
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
