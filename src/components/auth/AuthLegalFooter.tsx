import { Link } from 'react-router-dom';
import { COMPANY_NOTE } from '@/components/legal/company';

export function AuthLegalFooter() {
  return (
    <>
      <p className="text-center text-xs text-foreground-muted pt-6">
        <Link to="/privacy" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground underline-offset-2 hover:underline">
          Privacy
        </Link>
        <span className="mx-2 text-border">·</span>
        <Link to="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground underline-offset-2 hover:underline">
          Terms
        </Link>
      </p>
      <p className="text-center text-xs text-foreground-muted [text-wrap:balance]">{COMPANY_NOTE}</p>
    </>
  );
}
