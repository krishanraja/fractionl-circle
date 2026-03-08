import { useState, useEffect } from 'react';
import { DollarSign, Calendar } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { toast } from 'sonner';

interface RevenueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RevenueSheet = ({ open, onOpenChange }: RevenueSheetProps) => {
  const { user } = useAuth();
  const { clients } = useClients();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    source: 'advisory' as string,
    client_id: '' as string,
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async () => {
    if (!user?.id || !form.amount) return;
    setIsSubmitting(true);
    try {
      const currentMonth = new Date(form.date).toISOString().slice(0, 7);
      const { error } = await supabase
        .from('revenue_entries')
        .insert({
          user_id: user.id,
          amount: Number(form.amount),
          source: form.source,
          client_id: form.client_id || null,
          description: form.description || null,
          date: form.date,
          month: currentMonth,
        });
      if (error) throw error;
      toast.success(`$${Number(form.amount).toLocaleString()} logged`);
      onOpenChange(false);
      setForm({ amount: '', source: 'advisory', client_id: '', description: '', date: new Date().toISOString().slice(0, 10) });
    } catch {
      toast.error('Failed to log revenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-background border-border">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-foreground">Log Revenue</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="pl-10 bg-input border-border text-foreground text-2xl h-14 font-semibold"
                autoFocus
              />
            </div>
          </div>

          {/* Client */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <Label className="text-foreground-secondary">Client (optional)</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific client</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Source</Label>
            <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retainer">Retainer</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="lecture">Speaking</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-foreground-secondary">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.amount || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Saving...' : 'Log Revenue'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
