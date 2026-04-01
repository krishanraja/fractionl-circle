import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileUp, Check, Loader2, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { normalizePhoneToE164 } from '@/utils/contactActions';
import { fadeInUp } from '@/constants/animation';

interface ImportContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  selected: boolean;
}

type ImportState = 'choose' | 'preview' | 'importing' | 'success';

interface PhoneContactsImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Check if Contact Picker API is available
const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

export const PhoneContactsImport = ({ open, onOpenChange }: PhoneContactsImportProps) => {
  const { createContact, contacts: existingContacts } = useTalentContacts();
  const [state, setState] = useState<ImportState>('choose');
  const [importContacts, setImportContacts] = useState<ImportContact[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Contact Picker API (Chrome Android)
  const handlePickContacts = async () => {
    try {
      const props = ['name', 'email', 'tel'];
      // @ts-ignore - Contact Picker API types not in standard TS lib
      const contacts = await navigator.contacts.select(props, { multiple: true });

      if (!contacts?.length) return;

      const mapped: ImportContact[] = contacts.map((c: any) => ({
        name: c.name?.[0] || '',
        email: c.email?.[0] || undefined,
        phone: c.tel?.[0] || undefined,
        selected: true,
      })).filter((c: ImportContact) => c.name);

      deduplicateAndSet(mapped);
    } catch (err: any) {
      if (err.name !== 'TypeError') {
        console.error('Contact picker error:', err);
        toast.error('Could not access contacts');
      }
    }
  };

  // Parse vCard (.vcf) file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const contacts = parseVCard(text);
      if (!contacts.length) {
        toast.error('No contacts found in file');
        return;
      }
      deduplicateAndSet(contacts);
    } catch (err) {
      console.error('vCard parse error:', err);
      toast.error('Could not read contacts file');
    }
    e.target.value = '';
  };

  // Simple vCard parser
  const parseVCard = (text: string): ImportContact[] => {
    const cards = text.split('BEGIN:VCARD');
    const contacts: ImportContact[] = [];

    for (const card of cards) {
      if (!card.trim()) continue;

      const getName = (card: string): string => {
        // Try FN first (formatted name)
        const fn = card.match(/^FN[;:](.+)$/m);
        if (fn) return fn[1].trim();
        // Try N (structured name)
        const n = card.match(/^N[;:]([^;]*);([^;]*)/m);
        if (n) return [n[2], n[1]].filter(Boolean).join(' ').trim();
        return '';
      };

      const getField = (card: string, field: string): string | undefined => {
        const re = new RegExp(`^${field}[;:](.+)$`, 'm');
        const match = card.match(re);
        // Clean value type prefixes
        return match ? match[1].replace(/^[^:]*:/, '').trim() || undefined : undefined;
      };

      const name = getName(card);
      if (!name) continue;

      contacts.push({
        name,
        email: getField(card, 'EMAIL'),
        phone: getField(card, 'TEL'),
        company: getField(card, 'ORG'),
        title: getField(card, 'TITLE'),
        selected: true,
      });
    }

    return contacts;
  };

  const deduplicateAndSet = (contacts: ImportContact[]) => {
    // Mark duplicates by checking email and phone against existing
    const existingEmails = new Set(existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existingContacts.map(c => c.phone).filter(Boolean));

    const deduplicated = contacts.map(c => {
      const isDuplicate =
        (c.email && existingEmails.has(c.email.toLowerCase())) ||
        (c.phone && existingPhones.has(normalizePhoneToE164(c.phone) || c.phone));
      return { ...c, selected: !isDuplicate };
    });

    setImportContacts(deduplicated);
    setState('preview');
  };

  const toggleContact = (index: number) => {
    setImportContacts(prev => prev.map((c, i) =>
      i === index ? { ...c, selected: !c.selected } : c
    ));
  };

  const handleImport = async () => {
    const toImport = importContacts.filter(c => c.selected);
    if (!toImport.length) {
      toast.error('Select at least one contact');
      return;
    }

    setState('importing');
    setProgress({ current: 0, total: toImport.length });
    let count = 0;

    for (const contact of toImport) {
      try {
        await createContact({
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone ? (normalizePhoneToE164(contact.phone) || contact.phone) : null,
          company: contact.company || null,
          specialty_summary: contact.title || null,
        }, []);
        count++;
      } catch {
        // Skip failed contacts, continue importing
      }
      setProgress(p => ({ ...p, current: p.current + 1 }));
    }

    setImportedCount(count);
    setState('success');
    haptics.success();
    toast.success(`${count} contact${count !== 1 ? 's' : ''} imported`);

    setTimeout(() => {
      handleReset();
      onOpenChange(false);
    }, 1500);
  };

  const handleReset = () => {
    setState('choose');
    setImportContacts([]);
    setProgress({ current: 0, total: 0 });
    setImportedCount(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const selectedCount = importContacts.filter(c => c.selected).length;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[90dvh]">
        <div className="overflow-y-auto pb-safe-bottom">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".vcf,.vcard"
            onChange={handleFileSelect}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {/* Choose method */}
            {state === 'choose' && (
              <motion.div key="choose" {...fadeInUp} className="px-6 py-6">
                <DrawerHeader className="pb-4 pt-0 px-0">
                  <DrawerTitle className="text-xl">Import Phone Contacts</DrawerTitle>
                  <p className="text-sm text-foreground-secondary mt-1">
                    {hasContactPicker
                      ? 'Pick contacts from your phone or upload a .vcf file'
                      : 'Upload a .vcf contacts file from your phone or computer'}
                  </p>
                </DrawerHeader>

                <div className="space-y-3">
                  {hasContactPicker && (
                    <button
                      onClick={handlePickContacts}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border active:bg-secondary transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Pick from Phone</p>
                        <p className="text-[11px] text-foreground-secondary mt-0.5">Select contacts to import</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border active:bg-secondary transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <FileUp className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Upload .vcf File</p>
                      <p className="text-[11px] text-foreground-secondary mt-0.5">Import from a contacts export file</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Preview */}
            {state === 'preview' && (
              <motion.div key="preview" {...fadeInUp} className="px-4 py-4">
                <DrawerHeader className="pb-2 pt-0">
                  <DrawerTitle className="text-lg">
                    {importContacts.length} contact{importContacts.length !== 1 ? 's' : ''} found
                  </DrawerTitle>
                  <p className="text-sm text-foreground-secondary">
                    {selectedCount} selected to import
                  </p>
                </DrawerHeader>

                <div className="space-y-1 max-h-[50vh] overflow-y-auto px-2">
                  {importContacts.map((contact, i) => (
                    <button
                      key={i}
                      onClick={() => toggleContact(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                        contact.selected ? "bg-primary/10" : "bg-transparent opacity-50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        contact.selected ? "bg-primary border-primary" : "border-foreground-muted"
                      )}>
                        {contact.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                        <p className="text-[11px] text-foreground-secondary truncate">
                          {[contact.email, contact.phone, contact.company].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <DrawerFooter className="pt-3 pb-4 px-2">
                  <Button
                    onClick={handleImport}
                    disabled={selectedCount === 0}
                    size="xl"
                    className="w-full"
                  >
                    Import {selectedCount} Contact{selectedCount !== 1 ? 's' : ''}
                  </Button>
                </DrawerFooter>
              </motion.div>
            )}

            {/* Importing */}
            {state === 'importing' && (
              <motion.div key="importing" {...fadeInUp} className="flex flex-col items-center gap-5 px-6 py-12">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">
                    Importing... {progress.current}/{progress.total}
                  </p>
                </div>
                <div className="w-full max-w-xs h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Success */}
            {state === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 px-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4"
                >
                  <Check className="w-8 h-8 text-success" />
                </motion.div>
                <p className="text-lg font-semibold text-foreground">
                  {importedCount} contact{importedCount !== 1 ? 's' : ''} imported
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
