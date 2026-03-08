import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Mic, Users, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { TalentContactCard } from '@/components/talent/TalentContactCard';
import { QuickAddSheet } from '@/components/talent/QuickAddSheet';
import { TalentContactForm } from '@/components/talent/TalentContactForm';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { useSkills } from '@/hooks/useSkills';

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

export const NetworkScreen = () => {
  const { contacts, isLoading, deleteContact } = useTalentContacts();
  const { skills } = useSkills();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
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
          ) : sorted.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-body-bold text-foreground">
                  {search || activeCategory !== 'All' ? 'No matches' : 'Your Black Book is empty'}
                </p>
                <p className="text-caption text-foreground-secondary mt-1">
                  {search || activeCategory !== 'All'
                    ? 'Try a different search or filter'
                    : 'Tap + to add someone you want to remember'}
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

      {/* FAB row: voice add + quick add */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Voice add */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { /* TODO: voice add contact */ }}
          className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center shadow-lg"
        >
          <Mic className="w-5 h-5 text-foreground-secondary" />
        </motion.button>

        {/* Quick add */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowQuickAdd(true)}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      </div>

      {/* Sheets */}
      <QuickAddSheet
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onOpenFullForm={() => { setShowQuickAdd(false); setShowFullForm(true); }}
      />
      <TalentContactForm
        open={showFullForm}
        onOpenChange={(open) => { setShowFullForm(open); if (!open) setEditingContact(null); }}
        editContact={editingContact}
      />
    </motion.div>
  );
};
