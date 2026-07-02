// Circle - LinkedIn Capture: content script.
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
  // Lightweight extractor with multiple fallback strategies. LinkedIn
  // rewrites class names every few months; we hedge with JSON-LD, meta
  // tags, data-test-id, and finally generic DOM selectors.
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

  function metaContent(property) {
    const byProp = document.querySelector(`meta[property="${property}"]`);
    if (byProp?.content) return byProp.content.trim();
    const byName = document.querySelector(`meta[name="${property}"]`);
    if (byName?.content) return byName.content.trim();
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
        const graph = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed['@graph'])
            ? parsed['@graph']
            : [parsed];
        for (const item of graph) {
          if (!item) continue;
          const t = item['@type'];
          if (t === 'Person' || (Array.isArray(t) && t.includes('Person'))) {
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
    if (typeof jsonld?.name === 'string') return jsonld.name.trim();
    const og = metaContent('og:title');
    if (og) {
      // og:title is usually "Name - Title - Company | LinkedIn"; keep the name bit.
      const cut = og.split(/[-|–·]/)[0]?.trim();
      if (cut && cut.length >= 2) return cut;
    }
    return firstText([
      'h1.text-heading-xlarge',
      'h1.top-card-layout__title',
      'section.pv-top-card h1',
      'main h1',
      'h1',
    ]);
  }

  function extractHeadline(jsonld) {
    if (typeof jsonld?.jobTitle === 'string') return jsonld.jobTitle.trim();
    const og = metaContent('og:description');
    if (og) return og.trim();
    return firstText([
      '.text-body-medium.break-words',
      '.top-card-layout__headline',
      'div[data-generated-suggestion-target]',
      'section.pv-top-card .text-body-medium',
    ]);
  }

  function extractLocation() {
    return firstText([
      '.text-body-small.inline.t-black--light.break-words',
      'span.top-card-layout__first-subline + span',
      'section.pv-top-card .text-body-small',
    ]);
  }

  function splitHeadline(headline) {
    if (!headline) return { title: null, company: null };
    // "Fractional CMO at Acme" - last "at" wins so "Head of Growth at Acme" beats
    // "Lecturer at Stanford at Acme".
    const atIdx = headline.lastIndexOf(' at ');
    if (atIdx > -1) {
      return {
        title: headline.slice(0, atIdx).trim() || null,
        company: headline.slice(atIdx + 4).trim() || null,
      };
    }
    // "Title @ Company"
    const atSign = headline.indexOf(' @ ');
    if (atSign > -1) {
      return {
        title: headline.slice(0, atSign).trim() || null,
        company: headline.slice(atSign + 3).trim() || null,
      };
    }
    return { title: headline, company: null };
  }

  function extractCompanyFromJsonLd(jsonld) {
    const org = jsonld?.worksFor;
    if (!org) return null;
    if (typeof org === 'string') return org.trim();
    if (typeof org === 'object' && typeof org.name === 'string') return org.name.trim();
    if (Array.isArray(org)) {
      const first = org.find((o) => o && typeof o === 'object' && typeof o.name === 'string');
      if (first) return String(first.name).trim();
    }
    return null;
  }

  function extractAvatarUrl() {
    const img = document.querySelector(
      '.pv-top-card-profile-picture__image, img.profile-photo-edit__preview, section.pv-top-card img, main img[alt*="profile photo"]'
    );
    const src = img?.getAttribute('src');
    if (src && src.startsWith('http')) return src;
    const og = metaContent('og:image');
    return og ?? null;
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
    const split = splitHeadline(headline);
    const company = extractCompanyFromJsonLd(jsonld) ?? split.company;
    const title = split.title ?? headline ?? null;

    return {
      source: 'linkedin_extension',
      linkedin_url: url,
      display_name: name,
      title,
      company,
      headline,
      location: extractLocation(),
      avatar_url: extractAvatarUrl(),
      captured_at: new Date().toISOString(),
      raw: {
        has_jsonld: !!jsonld,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Trigger: capture once on load; re-capture when LinkedIn's SPA pushState
  // moves to a new profile.
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
        if (res?.error === 'not_paired') return; // popup handles this
        console.warn('Circle capture failed:', res?.error);
      }
    } catch (e) {
      console.warn('Circle capture error:', e);
    }
  }

  // Wait for the top-card to render before first capture: LinkedIn injects
  // content async even after document_idle. Poll briefly with a short cap.
  function captureWhenReady() {
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      const built = buildProfile();
      if (built && built.display_name) {
        clearInterval(id);
        captureIfNew();
      } else if (tries > 20) {
        clearInterval(id);
      }
    }, 250);
  }

  captureWhenReady();

  // LinkedIn uses pushState for in-app nav. Observe URL changes.
  let lastPath = window.location.pathname;
  const urlWatcher = setInterval(() => {
    const current = window.location.pathname;
    if (current === lastPath) return;
    lastPath = current;
    if (!/^\/in\/[^/]+\/?$/.test(current)) {
      lastCapturedUrl = null;
      return;
    }
    // Debounce: let LinkedIn fill in the DOM after nav.
    setTimeout(captureWhenReady, 900);
  }, 1000);

  window.addEventListener('pagehide', () => clearInterval(urlWatcher));
})();
