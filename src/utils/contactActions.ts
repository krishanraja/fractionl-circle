/**
 * Contact action utilities for talent circle
 * Handles email, phone, WhatsApp, LinkedIn, and clipboard operations
 */

import { toast } from "sonner";
import { parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js';

/**
 * Opens email client with pre-filled recipient
 */
export const sendEmail = (email: string | null | undefined, name?: string) => {
  if (!email) {
    toast.error("No email address available");
    return;
  }

  const subject = name ? `Re: ${name}` : '';
  window.location.href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
};

/**
 * Parse a phone number string, defaulting to US if no country code provided
 */
function parsePhone(phone: string): PhoneNumber | undefined {
  return parsePhoneNumberFromString(phone, 'US');
}

/**
 * Normalize a phone number to E.164 format for storage
 * Returns null if the number is invalid
 */
export const normalizePhoneToE164 = (phone: string): string | null => {
  const parsed = parsePhone(phone);
  if (!parsed?.isValid()) return null;
  return parsed.number;
};

/**
 * Opens phone dialer with number
 */
export const callPhone = (phone: string | null | undefined) => {
  if (!phone) {
    toast.error("No phone number available");
    return;
  }

  const parsed = parsePhone(phone);
  const telUri = parsed?.getURI() ?? `tel:${phone.replace(/[^\d+]/g, '')}`;
  window.location.href = telUri;
};

/**
 * Opens WhatsApp with contact
 * Works on both mobile and desktop (WhatsApp Web)
 */
export const openWhatsApp = (phone: string | null | undefined, name?: string) => {
  if (!phone) {
    toast.error("No phone number available");
    return;
  }

  const parsed = parsePhone(phone);
  // WhatsApp wants country code + number, no + prefix
  const whatsappNumber = parsed
    ? parsed.number.replace(/^\+/, '')
    : phone.replace(/[^\d]/g, '').replace(/^0+/, '');

  const message = name ? `Hi ${name},` : 'Hi,';
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
};

/**
 * Opens SMS compose via native sms: protocol
 * Falls back to the device's messaging app
 */
export const sendSMS = (phone: string | null | undefined, name?: string) => {
  if (!phone) {
    toast.error("No phone number available");
    return;
  }

  const parsed = parsePhone(phone);
  const number = parsed?.number ?? phone.replace(/[^\d+]/g, '');
  const body = name ? `Hi ${name},` : '';
  // sms: protocol works on both iOS and Android
  window.location.href = `sms:${number}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
};

/**
 * Opens LinkedIn profile
 */
export const openLinkedIn = (linkedinUrl: string | null | undefined) => {
  if (!linkedinUrl) {
    toast.error("No LinkedIn profile available");
    return;
  }

  // Ensure URL has protocol
  const url = linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`;
  window.open(url, '_blank');
};

/**
 * Opens portfolio URL
 */
export const openPortfolio = (portfolioUrl: string | null | undefined) => {
  if (!portfolioUrl) {
    toast.error("No portfolio available");
    return;
  }

  // Ensure URL has protocol
  const url = portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`;
  window.open(url, '_blank');
};

// ---------------------------------------------------------------------------
// Social-platform deep links (Phase A contactability).
// Each helper accepts either a bare handle ("@jenna.park", "jenna.park"),
// a platform URL, or null. Returns silently if nothing usable is passed.
// Tries the native app deep link first via <meta refresh>-style redirect,
// falls back to the https web URL in a new tab so browsers without the
// app installed still land somewhere sensible.
// ---------------------------------------------------------------------------

/**
 * Extract a handle from either a platform URL or a plain @handle string.
 * Returns null if nothing looks handle-ish.
 */
function extractHandle(
  input: string | null | undefined,
  urlPatterns: RegExp[],
): { handle: string | null; url: string | null } {
  if (!input) return { handle: null, url: null };
  const trimmed = input.trim();
  if (!trimmed) return { handle: null, url: null };

  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const handle = match[1].replace(/^@/, '');
      return { handle: handle || null, url: trimmed.startsWith('http') ? trimmed : `https://${trimmed}` };
    }
  }

  // Plain handle; strip leading @ / whitespace.
  const plain = trimmed.replace(/^@+/, '').trim();
  if (!plain || plain.includes('/') || plain.includes(' ')) {
    return { handle: null, url: trimmed.startsWith('http') ? trimmed : null };
  }
  return { handle: plain, url: null };
}

function openWithNativeFallback(nativeUrl: string, webUrl: string) {
  // Schema-based deep links on the web need the new tab to exist so a
  // Universal Link can intercept; we open the https variant, which OS link
  // handlers promote to the native app when installed.
  window.open(webUrl, '_blank');

  // On mobile, a same-tab hop to the scheme URL fires the app if present
  // without stranding the user: if the OS doesn't intercept, the tab we
  // opened above is already on the web fallback.
  if (typeof window !== 'undefined' && /(Mobi|Android|iPhone)/i.test(navigator.userAgent)) {
    const hop = document.createElement('iframe');
    hop.style.display = 'none';
    hop.src = nativeUrl;
    document.body.appendChild(hop);
    setTimeout(() => hop.remove(), 500);
  }
}

/**
 * Opens an Instagram profile by handle or URL.
 */
export const openInstagram = (input: string | null | undefined) => {
  const { handle, url } = extractHandle(input, [
    /instagram\.com\/([^/?#]+)/i,
  ]);
  if (!handle && !url) {
    toast.error("No Instagram handle available");
    return;
  }
  const web = handle ? `https://instagram.com/${handle}` : url!;
  if (handle) {
    openWithNativeFallback(`instagram://user?username=${handle}`, web);
  } else {
    window.open(web, '_blank');
  }
};

/**
 * Opens a TikTok profile by handle or URL.
 */
export const openTikTok = (input: string | null | undefined) => {
  const { handle, url } = extractHandle(input, [
    /tiktok\.com\/@([^/?#]+)/i,
  ]);
  if (!handle && !url) {
    toast.error("No TikTok handle available");
    return;
  }
  const web = handle ? `https://www.tiktok.com/@${handle}` : url!;
  if (handle) {
    // snssdk1128 is the TikTok app scheme; web fallback covers everything else.
    openWithNativeFallback(`snssdk1128://user/profile/${handle}`, web);
  } else {
    window.open(web, '_blank');
  }
};

/**
 * Opens an X (formerly Twitter) profile by handle or URL.
 */
export const openTwitter = (input: string | null | undefined) => {
  const { handle, url } = extractHandle(input, [
    /(?:twitter|x)\.com\/([^/?#]+)/i,
  ]);
  if (!handle && !url) {
    toast.error("No X / Twitter handle available");
    return;
  }
  const web = handle ? `https://x.com/${handle}` : url!;
  if (handle) {
    openWithNativeFallback(`twitter://user?screen_name=${handle}`, web);
  } else {
    window.open(web, '_blank');
  }
};

/**
 * Copies text to clipboard
 */
export const copyToClipboard = async (text: string | null | undefined, label: string = "Text") => {
  if (!text) {
    toast.error(`No ${label.toLowerCase()} to copy`);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch (_error) {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};

/**
 * Copy email to clipboard
 */
export const copyEmail = (email: string | null | undefined) => {
  return copyToClipboard(email, "Email");
};

/**
 * Copy phone to clipboard
 */
export const copyPhone = (phone: string | null | undefined) => {
  return copyToClipboard(formatPhoneNumber(phone) || phone, "Phone number");
};

/**
 * Copy LinkedIn URL to clipboard
 */
export const copyLinkedIn = (linkedinUrl: string | null | undefined) => {
  return copyToClipboard(linkedinUrl, "LinkedIn URL");
};

/**
 * Share contact via native share API (mobile)
 */
export const shareContact = async (contact: {
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
}) => {
  if (!navigator.share) {
    toast.error("Sharing not supported on this device");
    return;
  }

  const shareData: ShareData = {
    title: contact.name,
    text: `
${contact.name}
${contact.email ? `Email: ${contact.email}\n` : ''}
${contact.phone ? `Phone: ${contact.phone}\n` : ''}
${contact.linkedinUrl ? `LinkedIn: ${contact.linkedinUrl}\n` : ''}
    `.trim(),
  };

  try {
    await navigator.share(shareData);
    toast.success("Contact shared");
  } catch (error) {
    // User cancelled or error occurred
    if ((error as Error).name !== 'AbortError') {
      toast.error("Failed to share contact");
    }
  }
};

/**
 * Format phone number for display (international-aware)
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';

  const parsed = parsePhone(phone);
  if (!parsed) return phone;

  // Use national format for US numbers, international for others
  return parsed.country === 'US'
    ? parsed.formatNational()
    : parsed.formatInternational();
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (international-aware)
 */
export const isValidPhone = (phone: string): boolean => {
  const parsed = parsePhone(phone);
  return parsed?.isValid() ?? false;
};

/**
 * Extract LinkedIn username from URL
 */
export const extractLinkedInUsername = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
  return match ? match[1] : null;
};
