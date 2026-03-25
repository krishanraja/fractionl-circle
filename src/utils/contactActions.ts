/**
 * Contact action utilities for talent network
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
  } catch (error) {
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
