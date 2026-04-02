import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: string; // ISO string
  endDate?: string;  // ISO string (defaults to +1hr)
  location?: string;
}

/**
 * Generate an .ics file and trigger download.
 * Works universally — no OAuth required.
 * Most calendar apps (Apple Calendar, Google, Outlook) can import .ics files.
 */
export function downloadICS(event: CalendarEvent) {
  const start = formatICSDate(new Date(event.startDate));
  const end = formatICSDate(
    event.endDate ? new Date(event.endDate) : new Date(new Date(event.startDate).getTime() + 3600000)
  );

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fractionl Circle//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    `UID:${crypto.randomUUID()}@circle.fractionl.ai`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success('Calendar file downloaded — open it to add to your calendar');
}

/**
 * Add event to Google Calendar via API (requires OAuth connection).
 * Falls back to .ics download if not connected.
 */
export async function addToGoogleCalendar(event: CalendarEvent): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
      body: {
        title: event.title,
        description: event.description,
        start_date: event.startDate,
        end_date: event.endDate,
        location: event.location,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Manually pass action as query param since the edge function reads it from URL
    // Actually, we need to call with action query param
    const { data: result, error: err } = await supabase.functions.invoke(
      'google-sheets-integration?action=create_calendar_event',
      {
        body: {
          title: event.title,
          description: event.description,
          start_date: event.startDate,
          end_date: event.endDate,
          location: event.location,
        },
      }
    );

    if (err) throw err;

    if (result?.error === 'no_integration') {
      // Not connected — fall back to .ics
      downloadICS(event);
      return true;
    }

    if (result?.success) {
      toast.success('Added to Google Calendar');
      return true;
    }

    throw new Error(result?.error || 'Unknown error');
  } catch {
    // Fallback to .ics download
    downloadICS(event);
    return true;
  }
}

/**
 * Smart "Add to Calendar" — tries Google first, falls back to .ics
 */
export async function addToCalendar(event: CalendarEvent) {
  return addToGoogleCalendar(event);
}

// ── Helpers ──────────────────────────────────────────────

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
