import { useState } from 'react';
import { DollarSign, Calendar, Delete } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-border">
        <div className="overflow-y-auto pb-safe-bottom">
          <DrawerHeader className="pb-4">
            <DrawerTitle className="text-foreground">Log Revenue</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-8">
            {/* Amount display */}
            <div className="flex items-baseline justify-center gap-1 py-4">
              <DollarSign className="w-6 h-6 text-foreground-muted self-center" />
              <span className="text-4xl font-bold text-foreground tabular-nums">
                {form.amount || '0'}
              </span>
            </div>

            {/* Source & Date row */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-foreground-secondary text-xs">Source</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-10">
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
              <div className="flex-1 space-y-1">
                <Label className="text-foreground-secondary text-xs">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="pl-10 bg-input border-border text-foreground h-10"
                  />
                </div>
              </div>
            </div>

            {/* Client */}
            {clients.length > 0 && (
              <div className="space-y-1">
                <Label className="text-foreground-secondary text-xs">Client (optional)</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-10">
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

            {/* Calculator pad — prevent drag-to-dismiss on these buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2" data-vaul-no-drag>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'backspace') {
                      setForm(f => ({ ...f, amount: f.amount.slice(0, -1) }));
                    } else if (key === '.') {
                      if (!form.amount.includes('.')) {
                        setForm(f => ({ ...f, amount: f.amount + '.' }));
                      }
                    } else {
                      // Limit to 2 decimal places
                      const dotIndex = form.amount.indexOf('.');
                      if (dotIndex !== -1 && form.amount.length - dotIndex > 2) return;
                      setForm(f => ({ ...f, amount: f.amount + key }));
                    }
                  }}
                  className="h-12 rounded-lg bg-input border border-border text-foreground text-xl font-medium active:bg-primary/20 transition-colors flex items-center justify-center"
                >
                  {key === 'backspace' ? <Delete className="w-5 h-5" /> : key}
                </button>
              ))}
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
        </div>
      </DrawerContent>
    </Drawer>
  );
};
