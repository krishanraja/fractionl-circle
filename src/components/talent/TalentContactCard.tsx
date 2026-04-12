import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Phone, Linkedin, Globe, MessageCircle, MessageSquare,
  Star, MoreVertical, Edit, Trash2, ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import type { TalentContactWithSkills } from '@/hooks/useTalentContacts';
import {
  sendEmail, sendSMS, callPhone, openWhatsApp,
  openLinkedIn, openPortfolio,
} from '@/utils/contactActions';

interface TalentContactCardProps {
  contact: TalentContactWithSkills;
  onEdit?: (contact: TalentContactWithSkills) => void;
  onDelete?: (contact: TalentContactWithSkills) => void;
  onLogReferral?: (contact: TalentContactWithSkills) => void;
}

const availabilityConfig = {
  available: { label: 'Available', color: 'bg-green-500' },
  busy: { label: 'Busy', color: 'bg-yellow-500' },
  unavailable: { label: 'Unavailable', color: 'bg-gray-400' },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function getWarmthClass(dateStr: string | null): string {
  if (!dateStr) return 'card-cold';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 7) return 'card-warm';
  if (days <= 21) return 'card-cool';
  return 'card-cold';
}

function getWarmthColor(dateStr: string | null): string {
  if (!dateStr) return '#ef4444';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 7) return '#22c55e';
  if (days <= 21) return '#f59e0b';
  return '#ef4444';
}

export function TalentContactCard({
  contact,
  onEdit,
  onDelete,
  onLogReferral,
}: TalentContactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const availability = availabilityConfig[contact.availability_status as keyof typeof availabilityConfig] || availabilityConfig.available;

  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const topSkill = contact.skills[0];
  const warmthClass = getWarmthClass(contact.last_interaction_date);
  const warmthColor = getWarmthColor(contact.last_interaction_date);
  const lastSeen = timeAgo(contact.last_interaction_date);

  // Predictive quick actions: show only the 2 most likely
  const quickActions = [];
  if (contact.phone) {
    quickActions.push({ key: 'call', label: 'Call', icon: Phone, action: () => callPhone(contact.phone) });
    quickActions.push({ key: 'sms', label: 'SMS', icon: MessageSquare, action: () => sendSMS(contact.phone, contact.name) });
  }
  if (contact.email) {
    quickActions.push({ key: 'email', label: 'Email', icon: Mail, action: () => sendEmail(contact.email, contact.name) });
  }
  if (contact.phone) {
    quickActions.push({ key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, action: () => openWhatsApp(contact.phone, contact.name) });
  }
  if (contact.linkedin_url) {
    quickActions.push({ key: 'linkedin', label: 'LinkedIn', icon: Linkedin, action: () => openLinkedIn(contact.linkedin_url) });
  }
  if (contact.portfolio_url) {
    quickActions.push({ key: 'portfolio', label: 'Portfolio', icon: Globe, action: () => openPortfolio(contact.portfolio_url) });
  }

  const primaryActions = quickActions.slice(0, 2);
  const moreActions = quickActions.slice(2);

  // Swipe actions
  const swipeLeftActions = [];
  if (onEdit) {
    swipeLeftActions.push({
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      color: '#3b82f6',
      onClick: () => { haptics.swipeAction(); onEdit(contact); },
    });
  }
  if (onDelete) {
    swipeLeftActions.push({
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      color: '#ef4444',
      onClick: () => { haptics.swipeAction(); onDelete(contact); },
    });
  }

  const swipeRightActions = (() => {
    if (quickActions.length === 0) return [];
    const firstAction = primaryActions[0];
    if (!firstAction) return [];
    const SwipeIcon = firstAction.icon;
    return [{
      label: firstAction.label,
      icon: <SwipeIcon className="w-4 h-4" />,
      color: '#22c55e',
      onClick: () => { haptics.swipeAction(); firstAction.action(); },
    }];
  })();

  return (
    <div className="mb-2">
      <SwipeableRow rightActions={swipeLeftActions} leftActions={swipeRightActions}>
        <Card
          className={cn(
            "overflow-hidden transition-all duration-200 shadow-depth-1 hover:shadow-depth-2",
            warmthClass,
          )}
        >
          <CardContent className="p-4">
            {/* ─── Compact Header ─── */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-11 w-11 ring-2" style={{ '--tw-ring-color': `${warmthColor}20` } as any}>
                  <AvatarImage src={contact.photo_url || undefined} alt={contact.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {(contact.needs_review || contact.enrichment_status === 'failed' || contact.enrichment_status === 'conflict') && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-background"
                    title={contact.enrichment_failure_reason || 'Needs review'}
                    aria-label="Needs review"
                  />
                )}
              </div>

              {/* Name + Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[15px] text-foreground truncate">{contact.name}</h3>
                  {topSkill && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] flex-shrink-0">
                      {topSkill.name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', availability.color)} />
                  {contact.specialty_summary ? (
                    <p className="text-xs text-foreground-secondary truncate">{contact.specialty_summary}</p>
                  ) : contact.company ? (
                    <p className="text-xs text-foreground-secondary truncate">{contact.title ? `${contact.title} at ` : ''}{contact.company}</p>
                  ) : (
                    <span className="text-xs text-foreground-muted">{availability.label}</span>
                  )}
                </div>
              </div>

              {/* Time-ago + Menu */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md" style={{
                  backgroundColor: `${warmthColor}12`,
                  color: warmthColor,
                }}>
                  {lastSeen}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
                      <MoreVertical className="h-4 w-4 text-foreground-muted" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onLogReferral && (
                      <>
                        <DropdownMenuItem onClick={() => onLogReferral(contact)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Log Referral
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(contact)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(contact)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ─── Quick Actions (always visible) ─── */}
            {primaryActions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {primaryActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <Button
                      key={qa.key}
                      variant="outline"
                      className="flex-1 h-9 gap-1.5 text-xs rounded-xl active:scale-95 transition-transform"
                      onClick={() => { qa.action(); haptics.light(); }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {qa.label}
                    </Button>
                  );
                })}

                {/* Expand for more actions */}
                {moreActions.length > 0 && (
                  <Button
                    variant="outline"
                    className="h-9 w-9 p-0 rounded-xl flex-shrink-0"
                    onClick={() => { setExpanded(!expanded); haptics.tap(); }}
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                  </Button>
                )}
              </div>
            )}

            {/* ─── Expanded Section ─── */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    {/* More action buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {moreActions.map((qa) => {
                        const Icon = qa.icon;
                        return (
                          <Button
                            key={qa.key}
                            variant="outline"
                            className="h-10 gap-1.5 text-xs rounded-xl active:scale-95 transition-transform"
                            onClick={() => { qa.action(); haptics.light(); }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {qa.label}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Rate and trust rating */}
                    <div className="flex items-center justify-between pt-1">
                      {contact.rate_min && contact.rate_max ? (
                        <div className="text-sm font-medium text-foreground">
                          ${contact.rate_min}-${contact.rate_max}
                          {contact.rate_type && (
                            <span className="text-foreground-muted">/{contact.rate_type === 'hourly' ? 'hr' : contact.rate_type === 'daily' ? 'day' : 'proj'}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-foreground-muted">Rate not set</div>
                      )}

                      {contact.trust_rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-3.5 w-3.5',
                                i < contact.trust_rating!
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Additional skills */}
                    {contact.skills.length > 1 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {contact.skills.slice(1, 5).map((skill) => (
                          <Badge key={skill.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            {skill.name}
                          </Badge>
                        ))}
                        {contact.skills.length > 5 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{contact.skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </SwipeableRow>
    </div>
  );
}
