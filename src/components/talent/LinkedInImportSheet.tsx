import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Link, FileUp, Check, Loader2, ExternalLink } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { fadeInUp } from '@/constants/animation';

interface ImportContact {
  name: string;
  email?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  selected: boolean;
}

type ImportState = 'choose' | 'url-input' | 'url-loading' | 'url-confirm' | 'csv-preview' | 'importing' | 'success';

interface LinkedInImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkedInImportSheet = ({ open, onOpenChange }: LinkedInImportSheetProps) => {
  const { createContact } = useTalentContacts();
  const [state, setState] = useState<ImportState>('choose');
  const [url, setUrl] = useState('');
  const [urlContact, setUrlContact] = useState<ImportContact | null>(null);
  const [csvContacts, setCsvContacts] = useState<ImportContact[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL paste ─────────────────────────────────────────
  const handleUrlSearch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Extract name from URL for search
    const slugMatch = trimmed.match(/linkedin\.com\/in\/([^/?]+)/);
    const searchName = slugMatch
      ? slugMatch[1].replace(/-/g, ' ').replace(/\d+/g, '').trim()
      : trimmed;

    setState('url-loading');
    try {
      const { data, error } = await supabase.functions.invoke('contact-enrich', {
        body: { name: searchName, linkedin_search: true },
      });

      if (error) throw error;

      const results = data?.results || [];
      // Find best match or use first result
      const match = results.find((r: any) =>
        r.url?.includes(slugMatch?.[1] || '')
      ) || results[0];

      if (match) {
        setUrlContact({
          name: match.name || searchName,
          company: match.company,
          title: match.title,
          linkedin_url: match.url || trimmed,
          selected: true,
        });
        setState('url-confirm');
      } else {
        // No enrichment found, use URL directly
        setUrlContact({
          name: searchName.split(' ').map((w: string) =>
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' '),
          linkedin_url: trimmed.includes('linkedin.com') ? trimmed : undefined,
          selected: true,
        });
        setState('url-confirm');
      }
    } catch {
      toast.error('Could not look up profile');
      setState('url-input');
    }
  };

  const handleSaveUrlContact = async () => {
    if (!urlContact?.name) return;
    setIsSubmitting(true);
    try {
      await createContact({
        name: urlContact.name,
        email: urlContact.email || null,
        company: urlContact.company || null,
        specialty_summary: urlContact.title ? `${urlContact.title}${urlContact.company ? ` at ${urlContact.company}` : ''}` : null,
        linkedin_url: urlContact.linkedin_url || null,
        source: 'linkedin' as any,
      }, []);

      setState('success');
      haptics.success();
      toast.success(`${urlContact.name} added to your Black Book`);
      setTimeout(() => { handleReset(); onOpenChange(false); }, 800);
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── CSV upload ────────────────────────────────────────
  const handleCSVSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const contacts = parseLinkedInCSV(text);
      if (!contacts.length) {
        toast.error('No contacts found in CSV');
        return;
      }
      setCsvContacts(contacts);
      setState('csv-preview');
    } catch {
      toast.error('Could not read CSV file');
    }
    e.target.value = '';
  };

  const parseLinkedInCSV = (text: string): ImportContact[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const firstNameIdx = header.findIndex(h => h.includes('first name') || h === 'first');
    const lastNameIdx = header.findIndex(h => h.includes('last name') || h === 'last');
    const emailIdx = header.findIndex(h => h.includes('email'));
    const companyIdx = header.findIndex(h => h.includes('company'));
    const positionIdx = header.findIndex(h => h.includes('position') || h.includes('title'));
    const urlIdx = header.findIndex(h => h.includes('url') || h.includes('profile'));

    // Need at least first name column
    if (firstNameIdx === -1 && !header.some(h => h.includes('name'))) return [];

    const contacts: ImportContact[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (!cols.length) continue;

      const firstName = firstNameIdx >= 0 ? cols[firstNameIdx]?.trim() : '';
      const lastName = lastNameIdx >= 0 ? cols[lastNameIdx]?.trim() : '';
      const name = [firstName, lastName].filter(Boolean).join(' ');

      if (!name) continue;

      contacts.push({
        name,
        email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
        company: companyIdx >= 0 ? cols[companyIdx]?.trim() || undefined : undefined,
        title: positionIdx >= 0 ? cols[positionIdx]?.trim() || undefined : undefined,
        linkedin_url: urlIdx >= 0 ? cols[urlIdx]?.trim() || undefined : undefined,
        selected: true,
      });
    }
    return contacts;
  };

  // Simple CSV line parser that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const toggleContact = (index: number) => {
    setCsvContacts(prev => prev.map((c, i) =>
      i === index ? { ...c, selected: !c.selected } : c
    ));
  };

  const handleBatchImport = async () => {
    const toImport = csvContacts.filter(c => c.selected);
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
          company: contact.company || null,
          specialty_summary: contact.title ? `${contact.title}${contact.company ? ` at ${contact.company}` : ''}` : null,
          linkedin_url: contact.linkedin_url || null,
          source: 'linkedin' as any,
        }, []);
        count++;
      } catch {
        // Skip failed, continue
      }
      setProgress(p => ({ ...p, current: p.current + 1 }));
    }

    setImportedCount(count);
    setState('success');
    haptics.success();
    toast.success(`${count} contact${count !== 1 ? 's' : ''} imported`);
    setTimeout(() => { handleReset(); onOpenChange(false); }, 1500);
  };

  const handleReset = () => {
    setState('choose');
    setUrl('');
    setUrlContact(null);
    setCsvContacts([]);
    setProgress({ current: 0, total: 0 });
    setImportedCount(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const selectedCount = csvContacts.filter(c => c.selected).length;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border">
        <div className="overflow-y-auto pb-safe-bottom">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVSelect}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {/* Choose method */}
            {state === 'choose' && (
              <motion.div key="choose" {...fadeInUp} className="px-6 py-6">
                <DrawerHeader className="pb-4 pt-0 px-0">
                  <DrawerTitle className="text-xl flex items-center gap-2">
                    <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                    Import from LinkedIn
                  </DrawerTitle>
                </DrawerHeader>

                <div className="space-y-3">
                  <button
                    onClick={() => setState('url-input')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border active:bg-secondary transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#0A66C2]/15 flex items-center justify-center flex-shrink-0">
                      <Link className="w-6 h-6 text-[#0A66C2]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Paste Profile URL</p>
                      <p className="text-[11px] text-foreground-secondary mt-0.5">Add a single contact from their LinkedIn</p>
                    </div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border active:bg-secondary transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <FileUp className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Upload Connections CSV</p>
                      <p className="text-[11px] text-foreground-secondary mt-0.5">Bulk import from LinkedIn data export</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* URL input */}
            {state === 'url-input' && (
              <motion.div key="url-input" {...fadeInUp} className="px-6 py-6">
                <DrawerHeader className="pb-4 pt-0 px-0">
                  <DrawerTitle className="text-lg">Paste LinkedIn URL</DrawerTitle>
                  <p className="text-sm text-foreground-secondary mt-1">
                    Paste their LinkedIn profile URL or name
                  </p>
                </DrawerHeader>

                <div className="space-y-4">
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="linkedin.com/in/sarahchen or Sarah Chen"
                    className="bg-input border-border text-foreground text-base"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleUrlSearch()}
                  />
                  <Button onClick={handleUrlSearch} disabled={!url.trim()} size="xl" className="w-full">
                    Look Up Profile
                  </Button>
                </div>
              </motion.div>
            )}

            {/* URL loading */}
            {state === 'url-loading' && (
              <motion.div key="url-loading" {...fadeInUp} className="flex flex-col items-center gap-5 px-6 py-12">
                <Loader2 className="w-10 h-10 text-[#0A66C2] animate-spin" />
                <p className="text-lg font-semibold text-foreground">Looking up profile...</p>
              </motion.div>
            )}

            {/* URL confirm */}
            {state === 'url-confirm' && urlContact && (
              <motion.div key="url-confirm" {...fadeInUp} className="px-4 py-4">
                <DrawerHeader className="pb-3 pt-0">
                  <DrawerTitle className="text-lg">Confirm Contact</DrawerTitle>
                </DrawerHeader>

                <div className="mx-2 p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
                  <p className="text-base font-semibold text-foreground">{urlContact.name}</p>
                  {urlContact.title && (
                    <p className="text-sm text-foreground-secondary">{urlContact.title}</p>
                  )}
                  {urlContact.company && (
                    <p className="text-sm text-foreground-secondary">{urlContact.company}</p>
                  )}
                  {urlContact.linkedin_url && (
                    <a
                      href={urlContact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#0A66C2] text-xs mt-1"
                    >
                      <Linkedin className="w-3 h-3" />
                      <span className="truncate">{urlContact.linkedin_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  )}
                </div>

                <div className="flex gap-3 mt-5 px-2 pb-4">
                  <Button variant="outline" onClick={() => setState('url-input')} className="flex-1" disabled={isSubmitting}>
                    Back
                  </Button>
                  <Button onClick={handleSaveUrlContact} className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                      <Check className="w-4 h-4 mr-1" /> Save
                    </>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* CSV preview */}
            {state === 'csv-preview' && (
              <motion.div key="csv-preview" {...fadeInUp} className="px-4 py-4">
                <DrawerHeader className="pb-2 pt-0">
                  <DrawerTitle className="text-lg">
                    {csvContacts.length} connection{csvContacts.length !== 1 ? 's' : ''} found
                  </DrawerTitle>
                  <p className="text-sm text-foreground-secondary">
                    {selectedCount} selected to import
                  </p>
                </DrawerHeader>

                <div className="space-y-1 max-h-[50vh] overflow-y-auto px-2">
                  {csvContacts.map((contact, i) => (
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
                          {[contact.title, contact.company].filter(Boolean).join(' at ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <DrawerFooter className="pt-3 pb-4 px-2">
                  <Button
                    onClick={handleBatchImport}
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
                <Loader2 className="w-10 h-10 text-[#0A66C2] animate-spin" />
                <p className="text-lg font-semibold text-foreground">
                  Importing... {progress.current}/{progress.total}
                </p>
                <div className="w-full max-w-xs h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0A66C2] rounded-full"
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
                  {importedCount > 1 ? `${importedCount} contacts imported` : 'Added to your circle'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
