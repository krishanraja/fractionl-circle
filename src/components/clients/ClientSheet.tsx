import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, Clock, DollarSign, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients, ClientInput } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

const COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editClient?: { id: string } & ClientInput;
}

export const ClientSheet = ({ open, onOpenChange, editClient }: ClientSheetProps) => {
  const { addClient, updateClient, getRandomColor } = useClients();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<ClientInput>({
    name: editClient?.name || '',
    color: editClient?.color || getRandomColor(),
    engagement_type: editClient?.engagement_type || 'retainer',
    monthly_revenue_target: editClient?.monthly_revenue_target || null,
    hours_weekly: editClient?.hours_weekly || null,
    notes: editClient?.notes || null,
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      if (editClient?.id) {
        await updateClient(editClient.id, form);
      } else {
        await addClient(form);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-background border-border h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-foreground">
            {editClient ? 'Edit Client' : 'Add Client'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-8">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Company / Client Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Acme Corp"
                className="pl-10 bg-input border-border text-foreground"
                autoFocus
              />
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Colour</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className={cn(
                    "w-9 h-9 rounded-lg transition-all",
                    form.color === color && "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Engagement type */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Engagement Type</Label>
            <Select
              value={form.engagement_type}
              onValueChange={v => setForm(f => ({ ...f, engagement_type: v as any }))}
            >
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retainer">Retainer</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Revenue target */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Monthly Revenue Target (optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                type="number"
                value={form.monthly_revenue_target || ''}
                onChange={e => setForm(f => ({ ...f, monthly_revenue_target: e.target.value ? Number(e.target.value) : null }))}
                placeholder="5000"
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
          </div>

          {/* Hours per week */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Hours per Week (optional)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                type="number"
                value={form.hours_weekly || ''}
                onChange={e => setForm(f => ({ ...f, hours_weekly: e.target.value ? Number(e.target.value) : null }))}
                placeholder="10"
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Notes (optional)</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-foreground-muted" />
              <Textarea
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                placeholder="Key context about this client..."
                className="pl-10 bg-input border-border text-foreground min-h-20"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.name.trim() || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Saving...' : editClient ? 'Save Changes' : 'Add Client'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
