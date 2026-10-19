import { Link } from 'react-router-dom';
import { COMPANY_NOTE } from './company';

/** Quiet footer for the public legal pages: the two legal links and the company note. */
export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <nav aria-label="Legal">
        <Link to="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms">Terms</Link>
      </nav>
      <p>{COMPANY_NOTE}</p>
    </footer>
  );
}
