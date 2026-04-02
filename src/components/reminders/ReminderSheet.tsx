import { useState } from 'react';
import { Clock, Calendar, Bell, Check, Loader2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReminders } from '@/hooks/useReminders';
import { useClients } from '@/hooks/useClients';
import { haptics } from '@/utils/haptics';

interface ReminderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: { title?: string; clientId?: string };
}

export const ReminderSheet = ({ open, onOpenChange, prefill }: ReminderSheetProps) => {
  const { addReminder } = useReminders();
  const { clients } = useClients();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: prefill?.title || '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    client_id: prefill?.clientId || '',
    repeat_pattern: 'none',
  });

  // Reset form when opened with new prefill
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && prefill) {
      setForm(f => ({
        ...f,
        title: prefill.title || f.title,
        client_id: prefill.clientId || f.client_id,
      }));
    }
    if (!isOpen) {
      setForm({
        title: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
        time: '09:00',
        client_id: '',
        repeat_pattern: 'none',
      });
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      await addReminder({
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_at: scheduledAt,
        client_id: form.client_id || null,
        repeat_pattern: form.repeat_pattern === 'none' ? null : form.repeat_pattern,
      });
      haptics.success();
      handleOpenChange(false);
    } catch {
      // handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[85dvh]">
        <div className="overflow-y-auto pb-safe-bottom">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-xl flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Set Reminder
            </DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4 px-4">
            <div className="space-y-1">
              <Label className="text-foreground-secondary text-xs">What</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Follow up with client, review proposal..."
                className="bg-input border-border text-foreground"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
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
              <div className="flex-1 space-y-1">
                <Label className="text-foreground-secondary text-xs">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <Input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="pl-10 bg-input border-border text-foreground h-10"
                  />
                </div>
              </div>
            </div>

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

            <div className="space-y-1">
              <Label className="text-foreground-secondary text-xs">Repeat</Label>
              <Select value={form.repeat_pattern} onValueChange={v => setForm(f => ({ ...f, repeat_pattern: v }))}>
                <SelectTrigger className="bg-input border-border text-foreground h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-foreground-secondary text-xs">Notes (optional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional context..."
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <DrawerFooter className="pt-4 pb-6">
            <Button
              onClick={handleSubmit}
              disabled={!form.title.trim() || isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Reminder'}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
