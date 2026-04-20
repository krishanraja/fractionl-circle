// Circle — LinkedIn Capture: content script.
//
// Runs on https://www.linkedin.com/in/* pages the user actively visits in
// their own authenticated session. Reads the page DOM + any embedded
// JSON-LD, ships a structured profile to the background worker which
// forwards it to our extension-ingest edge function.
//
// No scraping of pages the user isn't viewing. No background crawling.

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Lightweight DOM-level extractor with multiple fallback selectors. LinkedIn
  // churns its class names; we hedge by trying several and merging results.
  // -------------------------------------------------------------------------

  function txt(el) {
    return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function firstText(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const t = txt(el);
      if (t) return t;
    }
    return null;
  }

  function getCanonicalUrl() {
    const canon = document.querySelector('link[rel="canonical"]');
    const href = canon?.getAttribute('href') ?? window.location.href;
    try {
      const u = new URL(href);
      return `${u.origin}${u.pathname}`;
    } catch {
      return window.location.origin + window.location.pathname;
    }
  }

  function getJsonLd() {
    const nodes = document.querySelectorAll('script[type="application/ld+json"]');
    for (const n of nodes) {
      try {
        const parsed = JSON.parse(n.textContent ?? '');
        const graph = Array.isArray(parsed) ? parsed : Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
        for (const item of graph) {
          if (item && (item['@type'] === 'Person' || (Array.isArray(item['@type']) && item['@type'].includes('Person')))) {
            return item;
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }
    return null;
  }

  function extractName(jsonld) {
    if (jsonld?.name && typeof jsonld.name === 'string') return jsonld.name.trim();
    return firstText([
      'h1.text-heading-xlarge',
      'h1.top-card-layout__title',
      'main h1',
      'h1',
    ]);
  }

  function extractHeadline(jsonld) {
    if (jsonld?.jobTitle && typeof jsonld.jobTitle === 'string') return jsonld.jobTitle.trim();
    return firstText([
      '.text-body-medium.break-words',
      '.top-card-layout__headline',
      'div[data-generated-suggestion-target]',
    ]);
  }

  function extractLocation() {
    return firstText([
      '.text-body-small.inline.t-black--light.break-words',
      '.top-card__subline-item.top-card__subline-item--bullet',
      'span.top-card-layout__first-subline + span',
    ]);
  }

  function extractCompanyFromHeadline(headline) {
    if (!headline) return null;
    // Common pattern: "Fractional CMO at Acme" -> "Acme"
    const atIdx = headline.lastIndexOf(' at ');
    if (atIdx > -1) return headline.slice(atIdx + 4).trim() || null;
    return null;
  }

  function extractTitleFromHeadline(headline) {
    if (!headline) return null;
    const atIdx = headline.lastIndexOf(' at ');
    if (atIdx > -1) return headline.slice(0, atIdx).trim() || null;
    return headline;
  }

  function extractCompanyFromJsonLd(jsonld) {
    const org = jsonld?.worksFor;
    if (!org) return null;
    if (typeof org === 'string') return org.trim();
    if (typeof org === 'object' && typeof org.name === 'string') return org.name.trim();
    if (Array.isArray(org) && org[0]?.name) return String(org[0].name).trim();
    return null;
  }

  function extractAvatarUrl() {
    const img = document.querySelector('.pv-top-card-profile-picture__image, img.profile-photo-edit__preview, main img[alt*="profile photo"]');
    return img?.getAttribute('src') ?? null;
  }

  // -------------------------------------------------------------------------
  // Collate extraction, ship to the background worker.
  // -------------------------------------------------------------------------

  function buildProfile() {
    const jsonld = getJsonLd();
    const url = getCanonicalUrl();
    if (!/\/in\/[^/?#]+/.test(url)) return null;

    const name = extractName(jsonld);
    if (!name) return null;

    const headline = extractHeadline(jsonld);
    const company =
      extractCompanyFromJsonLd(jsonld) ??
      extractCompanyFromHeadline(headline);
    const title = extractTitleFromHeadline(headline) ?? headline ?? null;

    return {
      source: 'linkedin_extension',
      linkedin_url: url,
      display_name: name,
      title: title,
      company: company,
      headline: headline,
      location: extractLocation(),
      avatar_url: extractAvatarUrl(),
      captured_at: new Date().toISOString(),
      raw: {
        has_jsonld: !!jsonld,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Trigger: capture once on load; re-capture if the user navigates within
  // LinkedIn's SPA (pushState-based navigation on /in/* pages).
  // -------------------------------------------------------------------------

  let lastCapturedUrl = null;

  async function captureIfNew() {
    const profile = buildProfile();
    if (!profile) return;
    if (lastCapturedUrl === profile.linkedin_url) return;
    lastCapturedUrl = profile.linkedin_url;

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'ingest_profile',
        profile,
      });
      if (!res?.ok) {
        if (res?.error === 'not_paired') {
          // Stay quiet; the popup tells the user how to pair.
          return;
        }
        console.warn('Circle capture failed:', res?.error);
      }
    } catch (e) {
      console.warn('Circle capture error:', e);
    }
  }

  // Fire on initial load.
  captureIfNew();

  // LinkedIn uses pushState for in-app nav. Observe URL changes.
  const urlWatcher = setInterval(() => {
    const current = window.location.pathname;
    if (lastCapturedUrl && !current.startsWith('/in/')) {
      lastCapturedUrl = null;
      return;
    }
    if (/^\/in\/[^/]+\/?$/.test(current) && (!lastCapturedUrl || !lastCapturedUrl.endsWith(current.replace(/\/$/, '')))) {
      // Debounce: wait a tick for LinkedIn to fill in the DOM after nav.
      setTimeout(captureIfNew, 1200);
    }
  }, 1500);

  window.addEventListener('pagehide', () => clearInterval(urlWatcher));
})();
