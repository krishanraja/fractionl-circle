import { useEffect } from 'react';
import { hideBootSplash } from '@/lib/bootSplash';

/**
 * Shown by main.tsx when the app is built without its Supabase credentials
 * (see isSupabaseConfigured). Deliberately self-contained - no router, no
 * Supabase, no design-system components, only inline styles - so it renders
 * even when the rest of the app can't. This replaces the old failure mode where
 * a module-load throw left a blank page once the splash safety-net faded.
 *
 * Theme colours follow the pre-paint `html.dark` class set by theme-init.js.
 */
export function ConfigError() {
  // Reveal ourselves: drop the boot splash the moment we mount.
  useEffect(() => {
    hideBootSplash();
  }, []);

  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const bg = isDark ? '#0A0A0B' : '#F8F6F2';
  const fg = isDark ? '#F5F3EF' : '#1A1714';
  const muted = isDark ? 'rgba(245,243,239,0.62)' : 'rgba(26,23,20,0.62)';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        inset: 0,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          "'Satoshi', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(224,162,60,0.95), rgba(224,162,60,0.22) 48%, transparent 70%)',
          }}
        />
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px' }}>
          We can&rsquo;t start right now
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.55, color: muted, margin: '0 0 20px' }}>
          The app is missing part of its configuration, so it couldn&rsquo;t
          connect. This is on our side - please try again in a few minutes.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            appearance: 'none',
            border: `1px solid ${border}`,
            background: 'transparent',
            color: fg,
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <p style={{ fontSize: '12px', color: muted, margin: '18px 0 0' }}>
          If this keeps happening, contact support.
        </p>
      </div>
    </div>
  );
}
