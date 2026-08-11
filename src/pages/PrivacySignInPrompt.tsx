import { ArrowLeft, ArrowUpRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircleBrand } from '@/components/circle/CircleBrand';
import '@/pathroom/circle-system.css';
import './legal.css';

export function PrivacySignInPrompt() {
  return (
    <main className="circle-system legal-page">
      <header className="legal-topbar">
        <CircleBrand />
        <Link to="/" className="legal-back"><ArrowLeft aria-hidden="true" />Back</Link>
      </header>
      <section className="legal-signin">
        <div className="legal-shield" aria-hidden="true"><Shield /></div>
        <div className="legal-eyebrow">Your data</div>
        <h1>Sign in to change it.</h1>
        <p>Manage what Circle can use, download your data, or delete your account.</p>
        <Link to="/" className="legal-primary">Sign in to Circle <ArrowUpRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
