import { LEGAL_LAST_UPDATED, OPERATOR_STATEMENT, PRIVACY_EMAIL, PRIVACY_RESPONSIBILITY } from './company';

/** "Who we are" block for the privacy pages: operator, responsibility, contact and date. */
export function LegalOperator() {
  return (
    <section className="legal-operator" aria-labelledby="legal-operator-title">
      <h2 id="legal-operator-title">Who we are</h2>
      <p>{OPERATOR_STATEMENT}</p>
      <p>{PRIVACY_RESPONSIBILITY}</p>
      <p>
        Questions about your data: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
      </p>
      <div className="legal-date">{LEGAL_LAST_UPDATED}</div>
    </section>
  );
}
