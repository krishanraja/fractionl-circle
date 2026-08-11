import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircleBrand } from '@/components/circle/CircleBrand';
import '@/pathroom/circle-system.css';
import './legal.css';

const terms = [
  {
    number: '01',
    title: 'Use Circle safely',
    body: 'Use Circle lawfully and keep your account secure. You are responsible for the contacts and messages you send through email, LinkedIn, and other services.',
  },
  {
    number: '02',
    title: 'Paid plans',
    body: 'Stripe handles paid plans. You can manage or cancel a plan from billing settings when billing is available on your account.',
  },
  {
    number: '03',
    title: 'When terms change',
    body: 'We may update these terms as Circle changes. If you keep using Circle after an update, the new terms apply.',
  },
];

export default function Terms() {
  return (
    <main className="circle-system legal-page">
      <header className="legal-topbar">
        <CircleBrand />
        <Link to="/" className="legal-back"><ArrowLeft aria-hidden="true" />Back</Link>
      </header>

      <div className="legal-shell">
        <section className="legal-intro">
          <div className="legal-eyebrow">Plain rules</div>
          <h1>Terms of use.</h1>
          <p>What you agree to when you use Circle.</p>
          <div className="legal-date">Last updated May 2026</div>
        </section>

        <article className="legal-stack">
          {terms.map((term) => (
            <section className="legal-card" key={term.number}>
              <div className="legal-number">{term.number}</div>
              <div>
                <h2>{term.title}</h2>
                <p>{term.body}</p>
              </div>
            </section>
          ))}

          <section className="legal-card legal-card-link">
            <div className="legal-number">04</div>
            <div>
              <h2>Your data</h2>
              <p>See what Circle keeps, choose how it is used, export it, or delete it.</p>
              <Link to="/privacy">Open privacy settings <ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </section>

          <footer className="legal-support">
            <span>Questions?</span>
            <a className="inline-flex min-h-11 items-center" href="mailto:support@fractionl.ai">support@fractionl.ai</a>
          </footer>
        </article>
      </div>
    </main>
  );
}
