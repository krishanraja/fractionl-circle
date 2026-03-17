import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ResponsiveDialog } from '@/components/navigation/ResponsiveDialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { TalentContactWithSkills } from '@/hooks/useTalentContacts';

type TalentReferralInsert = Database['public']['Tables']['talent_referrals']['Insert'];
type TalentReferral = Database['public']['Tables']['talent_referrals']['Row'];

const formSchema = z.object({
  referred_date: z.date(),
  client_name: z.string().min(1, 'Client name is required'),
  project_type: z.string().optional(),
  estimated_value: z.coerce.number().min(0).optional().or(z.literal('')),
  commission_fee: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional(),
  follow_up_date: z.date().optional(),
  outcome_delivered: z.boolean().optional(),
  outcome_notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ReferralFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (referral: TalentReferralInsert) => Promise<void>;
  contact: TalentContactWithSkills;
  referral?: TalentReferral;
}

export function ReferralForm({
  open,
  onOpenChange,
  onSubmit,
  contact,
  referral
}: ReferralFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referred_date: new Date(),
      client_name: '',
      project_type: '',
      estimated_value: '' as any,
      commission_fee: '' as any,
      notes: '',
      follow_up_date: undefined,
      outcome_delivered: undefined,
      outcome_notes: '',
    },
  });

  useEffect(() => {
    if (referral) {
      form.reset({
        referred_date: new Date(referral.referred_date),
        client_name: referral.client_name || '',
        project_type: referral.project_type || '',
        estimated_value: referral.estimated_value || '' as any,
        commission_fee: referral.commission_fee || '' as any,
        notes: referral.notes || '',
        follow_up_date: referral.follow_up_date ? new Date(referral.follow_up_date) : undefined,
        outcome_delivered: referral.outcome_delivered ?? undefined,
        outcome_notes: referral.outcome_notes || '',
      });
    } else {
      form.reset({
        referred_date: new Date(),
        client_name: '',
        project_type: '',
        estimated_value: '' as any,
        commission_fee: '' as any,
        notes: '',
        follow_up_date: undefined,
        outcome_delivered: undefined,
        outcome_notes: '',
      });
    }
  }, [referral, form]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const referralData: TalentReferralInsert = {
        talent_contact_id: contact.id,
        referred_date: format(data.referred_date, 'yyyy-MM-dd'),
        client_name: data.client_name,
        project_type: data.project_type || null,
        estimated_value: data.estimated_value || null,
        commission_fee: data.commission_fee || null,
        notes: data.notes || null,
        follow_up_date: data.follow_up_date ? format(data.follow_up_date, 'yyyy-MM-dd') : null,
        outcome_delivered: data.outcome_delivered ?? null,
        outcome_notes: data.outcome_notes || null,
      };

      await onSubmit(referralData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting referral:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Referral Details */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="referred_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Referral Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Corp" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="project_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Type</FormLabel>
                <FormControl>
                  <Input placeholder="Website redesign, mobile app, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="estimated_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commission_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Fee ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional details about the referral..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="follow_up_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Follow-up Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Set a reminder (optional)</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Outcome Tracking */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium">Outcome Tracking</h4>

          <FormField
            control={form.control}
            name="outcome_delivered"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Did they deliver successfully?</FormLabel>
                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    type="button"
                    variant={field.value === true ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => field.onChange(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Yes, delivered well
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === false ? 'destructive' : 'outline'}
                    className="flex-1"
                    onClick={() => field.onChange(false)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    No, issues occurred
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('outcome_delivered') !== undefined && (
            <FormField
              control={form.control}
              name="outcome_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Details about how the project went..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="md:flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="md:flex-1">
            {isSubmitting ? 'Saving...' : referral ? 'Update Referral' : 'Log Referral'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={referral ? 'Edit Referral' : `Log Referral for ${contact.name}`}
      description={`Track when you send work to ${contact.name}`}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
