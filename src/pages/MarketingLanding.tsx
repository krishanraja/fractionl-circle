import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Sparkles, Moon, ArrowRight, Check } from 'lucide-react';
import { TIERS } from '@/lib/tiers';
import { AuthLegalFooter } from '@/components/auth/AuthLegalFooter';
import { ProductPreview } from '@/components/marketing/ProductPreview';

// Public marketing landing for logged-OUT visitors at "/".
// Sealed-letter identity: warm cream surfaces, Seal Red (--primary) as the single
// accent, Source Serif (text-display / text-title-*) for headline voice. No purple,
// no glow, no gradient. Mobile-first (390px). Honest per AGENT_BRIEFING.md section 9:
// "Talk once, wake to a drafted Move" is the PROMISE, not a present-tense automatic claim.

// Entrance motion is opt-out via prefers-reduced-motion: index.css forces
// transition/animation durations to ~0 under that media query, so framer-motion
// transitions collapse and content lands immediately.

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const fadeUpTransition = {
  duration: 0.5,
  ease: [0, 0, 0.2, 1] as [number, number, number, number],
};

interface Step {
  icon: typeof Mic;
  label: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Mic,
    label: 'Talk',
    title: 'Talk for 90 seconds',
    body: 'Say what you have been working on. Circle pulls out sellable Ideas with a title, ICP, price band, and one-liner.',
  },
  {
    icon: Sparkles,
    label: 'Match',
    title: 'Your network, unified',
    body: 'Drop in a LinkedIn CSV or connect your contacts. Everyone you know dedupes into one Circle, scored against each Idea.',
  },
  {
    icon: Moon,
    label: 'Move',
    title: 'Wake to a drafted Move',
    body: 'The Match Engine cross-references what you sell against who you know and hands you a hand-drafted Move. You hit send.',
  },
];

interface Persona {
  who: string;
  detail: string;
}

const PERSONAS: Persona[] = [
  { who: 'Fractional CMO, CFO, CTO', detail: '2 to 7 retainers, a network too big for a spreadsheet.' },
  { who: 'Independent advisors', detail: 'Pipeline that stays invisible until a deal hits the bank.' },
  { who: 'Authors and operators', detail: 'Audience and revenue that live in two different worlds.' },
];

export default function MarketingLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md px-6 md:max-w-2xl lg:max-w-6xl lg:px-12 xl:max-w-7xl">
        {/* Brand mark */}
        <motion.header
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={fadeUpTransition}
          className="flex items-center justify-between pt-8 pb-2"
        >
          <img
            src="/brand/fractionl-wordmark.png"
            alt="Circle"
            className="h-7"
          />
          <button
            onClick={() => navigate('/auth')}
            className="text-caption font-medium text-primary hover:underline underline-offset-4"
          >
            Sign in
          </button>
        </motion.header>

        {/* Hero */}
        <section className="pt-12 pb-16 text-center md:pt-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-20 lg:pb-24 lg:text-left xl:gap-16">
          <div>
            <motion.h1
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ ...fadeUpTransition, delay: 0.05 }}
              className="text-display-sentence text-foreground md:text-[3rem] md:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.05]"
            >
              Talk once. Wake to a drafted Move on the right person.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ ...fadeUpTransition, delay: 0.15 }}
              className="mx-auto mt-5 max-w-md text-body text-foreground-secondary lg:mx-0"
            >
              Circle is the relationship-to-revenue engine for fractional executives,
              advisors, and portfolio operators. The AI is the operator. You are the
              relationship.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ ...fadeUpTransition, delay: 0.25 }}
              className="mt-9 lg:mt-10"
            >
              <div className="flex flex-col gap-3 lg:flex-row">
                <button
                  onClick={() => navigate('/try')}
                  className="btn-touch flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-body font-semibold text-primary-foreground shadow-md lg:w-auto lg:px-8"
                >
                  Try it now
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-touch flex h-14 w-full items-center justify-center rounded-full border border-border bg-card text-body font-medium text-foreground lg:w-auto lg:px-8"
                >
                  Sign in
                </button>
              </div>
              <p className="mt-3 text-caption text-foreground-muted">
                No signup needed to try. Talk for a few seconds and watch your Ideas land.
              </p>
            </motion.div>
          </div>

          {/* Product preview — desktop only */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.3 }}
            className="hidden lg:block"
          >
            <ProductPreview />
          </motion.div>
        </section>

        {/* How it works */}
        <section className="border-t border-border py-14 lg:py-20">
          <motion.h2
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.4 }}
            transition={fadeUpTransition}
            className="text-title-1 text-foreground"
          >
            How it works
          </motion.h2>
          <p className="mt-2 text-caption text-foreground-muted">
            The pattern fractionals already close with, run for you.
          </p>

          <div className="mt-8 space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  variants={fadeUp}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ ...fadeUpTransition, delay: i * 0.08 }}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-title-3 text-foreground">{step.title}</h3>
                    <p className="mt-1 text-caption text-foreground-secondary">{step.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-6 text-caption text-foreground-muted">
            Today the Match and the drafted Move are real and surfaced on demand. The
            overnight, while-you-sleep version is where we are headed.
          </p>
        </section>

        {/* Who it is for */}
        <section className="border-t border-border py-14 lg:py-20">
          <motion.h2
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.4 }}
            transition={fadeUpTransition}
            className="text-title-1 text-foreground"
          >
            Who it is for
          </motion.h2>
          <p className="mt-2 text-caption text-foreground-muted">
            If your circle is your business, this is for you.
          </p>

          <div className="mt-8 space-y-3 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.who}
                variants={fadeUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.4 }}
                transition={{ ...fadeUpTransition, delay: i * 0.08 }}
                className="border-l-2 border-primary pl-4"
              >
                <h3 className="text-body font-semibold text-foreground">{p.who}</h3>
                <p className="mt-0.5 text-caption text-foreground-secondary">{p.detail}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border py-14 lg:py-20">
          <motion.h2
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.4 }}
            transition={fadeUpTransition}
            className="text-title-1 text-foreground"
          >
            Pricing
          </motion.h2>
          <p className="mt-2 text-caption text-foreground-muted">
            Start free. Most operators upgrade in week two.
          </p>

          <div className="mt-8 space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 lg:items-start">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.slug}
                variants={fadeUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...fadeUpTransition, delay: i * 0.08 }}
                className={
                  'rounded-2xl border bg-card p-6 ' +
                  (tier.highlighted
                    ? 'border-primary lg:scale-[1.02] lg:shadow-lg'
                    : 'border-border')
                }
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-title-2 text-foreground">{tier.name}</h3>
                  <div className="text-right">
                    <span className="text-title-2 text-foreground">{tier.priceMonthlyLabel}</span>
                    {tier.priceMonthly > 0 && (
                      <span className="text-caption text-foreground-muted">/mo</span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-caption font-medium text-primary">{tier.tagline}</p>
                {tier.highlighted && (
                  <span className="mt-3 inline-block rounded-full bg-primary-muted px-3 py-1 text-micro text-primary">
                    Most popular
                  </span>
                )}
                <ul className="mt-4 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-caption text-foreground-secondary">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => navigate('/auth')}
            className="btn-touch mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-body font-semibold text-primary-foreground shadow-md lg:mx-auto lg:mt-10 lg:max-w-md"
          >
            Start free
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-center text-caption text-foreground-muted">
            New accounts get a 14-day Operator trial. No card to start.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-10 text-center">
          <p className="text-caption text-foreground-muted">Built by Fractionl</p>
          <AuthLegalFooter />
        </footer>
      </div>
    </div>
  );
}
