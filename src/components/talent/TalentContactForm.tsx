import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ResponsiveDialog } from '@/components/navigation/ResponsiveDialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSkills } from '@/hooks/useSkills';
import type { TalentContactWithSkills } from '@/hooks/useTalentContacts';
import type { Database } from '@/integrations/supabase/types';
import { isValidPhone, normalizePhoneToE164 } from '@/utils/contactActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type TalentContactInsert = Database['public']['Tables']['talent_contacts']['Insert'];

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().refine(
    (val) => !val || isValidPhone(val),
    { message: 'Enter a valid phone number (e.g. +44 20 7946 0958)' }
  ),
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolio_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  specialty_summary: z.string().optional(),
  working_style_notes: z.string().optional(),
  rate_min: z.coerce.number().min(0).optional().or(z.literal('')),
  rate_max: z.coerce.number().min(0).optional().or(z.literal('')),
  rate_type: z.enum(['hourly', 'daily', 'project']).optional(),
  trust_rating: z.coerce.number().min(1).max(5).optional(),
  availability_status: z.enum(['available', 'busy', 'unavailable']).default('available'),
});

type FormData = z.infer<typeof formSchema>;

interface TalentContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (contact: TalentContactInsert, skillIds: string[]) => Promise<void>;
  contact?: TalentContactWithSkills;
}

export function TalentContactForm({
  open,
  onOpenChange,
  onSubmit,
  contact
}: TalentContactFormProps) {
  const { skills, skillsByCategory, loading: skillsLoading } = useSkills();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedEmail, setEnrichedEmail] = useState<string | null>(null);

  const enrichFromEmail = async (email: string) => {
    if (!email || !email.includes('@') || email === enrichedEmail) return;
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-enrich', {
        body: { email: email.trim() },
      });
      if (error) throw error;
      const enriched = data?.enriched;
      if (enriched) {
        setEnrichedEmail(email);
        const currentValues = form.getValues();
        // Only fill empty fields
        if (!currentValues.name && enriched.name) form.setValue('name', enriched.name);
        if (!currentValues.linkedin_url && enriched.linkedin_url) form.setValue('linkedin_url', enriched.linkedin_url);
        if (!currentValues.specialty_summary && enriched.specialty_summary) form.setValue('specialty_summary', enriched.specialty_summary);
        toast.success('Contact details auto-filled', { duration: 2000 });
      }
    } catch {
      // Enrichment is best-effort, don't show errors
    } finally {
      setIsEnriching(false);
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      linkedin_url: '',
      portfolio_url: '',
      specialty_summary: '',
      working_style_notes: '',
      rate_min: '' as any,
      rate_max: '' as any,
      rate_type: 'hourly',
      trust_rating: undefined,
      availability_status: 'available',
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        linkedin_url: contact.linkedin_url || '',
        portfolio_url: contact.portfolio_url || '',
        specialty_summary: contact.specialty_summary || '',
        working_style_notes: contact.working_style_notes || '',
        rate_min: contact.rate_min || '' as any,
        rate_max: contact.rate_max || '' as any,
        rate_type: (contact.rate_type as any) || 'hourly',
        trust_rating: contact.trust_rating || undefined,
        availability_status: (contact.availability_status as any) || 'available',
      });
      setSelectedSkills(contact.skills.map(s => s.id));
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        portfolio_url: '',
        specialty_summary: '',
        working_style_notes: '',
        rate_min: '' as any,
        rate_max: '' as any,
        rate_type: 'hourly',
        trust_rating: undefined,
        availability_status: 'available',
      });
      setSelectedSkills([]);
    }
  }, [contact, form]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const contactData: TalentContactInsert = {
        name: data.name,
        email: data.email || null,
        phone: data.phone ? (normalizePhoneToE164(data.phone) || data.phone) : null,
        linkedin_url: data.linkedin_url || null,
        portfolio_url: data.portfolio_url || null,
        specialty_summary: data.specialty_summary || null,
        working_style_notes: data.working_style_notes || null,
        rate_min: data.rate_min || null,
        rate_max: data.rate_max || null,
        rate_type: data.rate_type || null,
        trust_rating: data.trust_rating || null,
        availability_status: data.availability_status,
      };

      await onSubmit(contactData, selectedSkills);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Email
                  {isEnriching && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    {...field}
                    onBlur={(e) => {
                      field.onBlur();
                      enrichFromEmail(e.target.value.trim());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 555 123 4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linkedin_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://linkedin.com/in/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portfolio_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Skills Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Skills</FormLabel>
            <button
              type="button"
              onClick={() => setSkillsExpanded(!skillsExpanded)}
              className="text-xs text-primary flex items-center gap-1"
            >
              {skillsExpanded ? 'Collapse' : 'Expand'}
              {skillsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Selected skills chips */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map(id => {
                const skill = skills.find(s => s.id === id);
                return skill ? (
                  <Badge
                    key={id}
                    variant="default"
                    className="cursor-pointer gap-1 py-1.5 px-3"
                    onClick={() => toggleSkill(id)}
                  >
                    {skill.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {/* Expandable skills list */}
          {skillsExpanded && (
            <div className="space-y-4 rounded-xl border border-border p-3 max-h-60 overflow-y-auto">
              {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium mb-2 text-foreground-secondary uppercase tracking-wider">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map(skill => (
                      <Badge
                        key={skill.id}
                        variant={selectedSkills.includes(skill.id) ? 'default' : 'outline'}
                        className="cursor-pointer py-1.5 px-3 active:scale-95 transition-transform"
                        onClick={() => toggleSkill(skill.id)}
                      >
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedSkills.length > 0 && (
            <FormDescription>
              {selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''} selected
            </FormDescription>
          )}
        </div>

        {/* Professional Details */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="specialty_summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialty Summary</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of their specialty..."
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
            name="working_style_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Working Style Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes about their working style..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Rate & Availability - single column on mobile */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="rate_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Rate</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="150" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Rate</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="trust_rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trust Rating</FormLabel>
                  <FormControl>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <Button
                          key={rating}
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => field.onChange(rating)}
                        >
                          <Star
                            className={cn(
                              'h-7 w-7',
                              field.value && rating <= field.value
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            )}
                          />
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Availability</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions - sticky on mobile */}
        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background pb-safe-bottom">
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
            {isSubmitting ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contact ? 'Edit Contact' : 'Add Contact'}
      description={contact ? 'Update contact information' : 'Add a new contact to your network'}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
