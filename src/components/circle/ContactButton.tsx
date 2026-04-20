import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  callPhone,
  copyToClipboard,
  openInstagram,
  openLinkedIn,
  openTikTok,
  openTwitter,
  openWhatsApp,
  sendEmail,
  sendSMS,
} from '@/utils/contactActions';
import {
  primaryContactAction,
  type ContactAction,
  type ContactablePerson,
  type ContactableRaw,
} from '@/lib/primaryContact';

interface ContactButtonProps {
  person: ContactablePerson;
  raws: ContactableRaw[];
  size?: 'sm' | 'md';
  className?: string;
}

// Dispatch a ContactAction to the matching opener in contactActions.ts.
function dispatch(action: ContactAction, displayName: string) {
  switch (action.channel) {
    case 'linkedin':  return openLinkedIn(action.value);
    case 'email':     return sendEmail(action.value, displayName);
    case 'phone':     return callPhone(action.value);
    case 'sms':       return sendSMS(action.value, displayName);
    case 'whatsapp':  return openWhatsApp(action.value, displayName);
    case 'instagram': return openInstagram(action.value);
    case 'tiktok':    return openTikTok(action.value);
    case 'x':         return openTwitter(action.value);
    case 'copy_name': return copyToClipboard(action.value, 'Name');
  }
}

export const ContactButton = ({ person, raws, size = 'md', className }: ContactButtonProps) => {
  const { primary, alternates } = primaryContactAction(person, raws);
  const PrimaryIcon = primary.icon;

  const heightClass = size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm';

  return (
    <div className={cn('inline-flex items-stretch', className)}>
      <button
        onClick={() => dispatch(primary, person.display_name)}
        className={cn(
          heightClass,
          'pl-3 pr-3 rounded-l-full border border-primary/30 bg-primary/10 hover:bg-primary/15',
          'text-primary font-medium inline-flex items-center gap-1.5 transition-colors'
        )}
        title={primary.label}
      >
        <PrimaryIcon className="w-3.5 h-3.5" />
        <span className="truncate max-w-[10rem]">{primary.label}</span>
      </button>
      {alternates.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                heightClass,
                'px-2 rounded-r-full border border-l-0 border-primary/30 bg-primary/10 hover:bg-primary/15',
                'text-primary inline-flex items-center justify-center transition-colors'
              )}
              title="More ways to contact"
              aria-label="More ways to contact"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            {alternates.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={`${action.channel}-${action.value ?? ''}`}
                  onClick={() => dispatch(action, person.display_name)}
                  className="gap-2"
                >
                  <Icon className="w-3.5 h-3.5 text-foreground-secondary" />
                  <span className="text-sm">{action.short}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
