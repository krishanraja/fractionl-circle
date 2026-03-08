import { useState } from 'react';
import { Loader2, Linkedin, ArrowRight, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { toast } from 'sonner';

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullForm: () => void;
}

export const QuickAddSheet = ({ open, onOpenChange, onOpenFullForm }: QuickAddSheetProps) => {
  const { addContact } = useTalentContacts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: '', linkedin_url: '' });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      await addContact({
        name: form.name.trim(),
        specialty_summary: form.specialty.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        // Enrichment happens async after save via enrich-contact edge fn
      });
      toast.success(`${form.name} added to your Black Book`);
      setForm({ name: '', specialty: '', linkedin_url: '' });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-background border-border">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-foreground">Quick Add</SheetTitle>
          <p className="text-caption text-foreground-secondary">3 fields. Done in seconds.</p>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-foreground-secondary text-xs">Name *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Sarah Chen"
              className="bg-input border-border text-foreground h-12 text-base"
              autoFocus
            />
          </div>

          {/* What they do */}
          <div className="space-y-1.5">
            <Label className="text-foreground-secondary text-xs">What they do</Label>
            <Input
              value={form.specialty}
              onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
              placeholder="Brand designer, $150-200/hr, based in LA"
              className="bg-input border-border text-foreground h-12 text-base"
            />
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-foreground-secondary text-xs">LinkedIn URL</Label>
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                ✨ Autofills profile
              </Badge>
            </div>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                value={form.linkedin_url}
                onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="linkedin.com/in/sarahchen"
                className="pl-10 bg-input border-border text-foreground h-12 text-base"
              />
            </div>
            {form.linkedin_url && (
              <p className="text-[10px] text-foreground-muted px-1">
                LinkedIn enrichment coming soon — name, title, company will auto-fill
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onOpenFullForm}
              className="flex-1 gap-1.5"
            >
              Full form
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || isSubmitting}
              className="flex-1 gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Save <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
