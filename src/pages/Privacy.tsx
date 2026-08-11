import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircleBrand } from '@/components/circle/CircleBrand';
import { PrivacySettings } from '@/components/compliance/PrivacySettings';
import '@/pathroom/circle-system.css';
import './legal.css';

export default function Privacy() {
  return (
    <main className="circle-system legal-page">
      <header className="legal-topbar">
        <CircleBrand />
        <Link to="/" className="legal-back"><ArrowLeft aria-hidden="true" />Back</Link>
      </header>

      <div className="legal-shell legal-privacy-shell">
        <section className="legal-intro">
          <div className="legal-eyebrow">Your data</div>
          <h1>Privacy, made clear.</h1>
          <p>Choose what Circle can use. Download your data or delete it at any time.</p>
        </section>
        <PrivacySettings />
      </div>
    </main>
  );
}
