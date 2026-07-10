import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

const consultationHref = 'https://calendar.app.google/UqNdDvK2Ya1VQ4Rm6';

function CTA({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}) {
  const className =
    variant === 'primary'
      ? 'border-[var(--substrata-cyan)] bg-[var(--substrata-cyan)] text-white shadow-[0_12px_28px_rgba(31,154,232,0.22)] hover:bg-[var(--substrata-steel)] focus-visible:ring-[var(--substrata-cyan)]'
      : 'border-slate-300 bg-white text-[var(--substrata-ink)] hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400';

  const sharedClassName = `inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`;

  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={sharedClassName}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={sharedClassName}>
      {children}
    </Link>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--substrata-fog)] text-[var(--substrata-ink)]">
      <header className="border-b border-white/70 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/substrata-mark.png"
              alt="Substrata mark"
              width={36}
              height={36}
              className="h-9 w-9"
              priority
            />
            <div>
              <p className="text-base font-semibold tracking-tight text-[var(--substrata-ink)]">Substrata</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Compliance workspace
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="hover:text-[var(--substrata-ink)]" href="/">
              Product
            </Link>
            <Link className="hover:text-[var(--substrata-ink)]" href="/app">
              Workspace
            </Link>
            <CTA href={consultationHref}>Schedule a consultation</CTA>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(31,154,232,0.14),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(52,198,239,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))]"
          />
          <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(to_right,rgba(31,154,232,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,50,79,0.045)_1px,transparent_1px)] bg-[size:28px_28px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8 lg:py-18">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--substrata-steel)]">
              Pricing
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--substrata-ink)] md:text-6xl">
              Talk to us.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Substrata is priced around review workflow needs, document volume, team structure, and implementation support. We work directly with hardware compliance teams to scope the right operating model.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CTA href={consultationHref}>Schedule a consultation</CTA>
              <CTA href="mailto:substrata@junglegrid.dev?subject=Substrata%20pricing" variant="secondary">
                Email us
              </CTA>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[var(--substrata-fog)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--substrata-steel)]">
              How we scope it
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--substrata-ink)] md:text-4xl">
              Pricing follows the compliance workflow, not generic AI seat math.
            </h2>
          </div>
          <div className="grid gap-4">
            {[
              [
                'Review operations',
                'How many datasheets move through recommended review paths, memo drafting, and human approval workflows.',
              ],
              [
                'Team setup',
                'How many reviewers, analysts, admins, and stakeholders need shared access to the compliance workspace.',
              ],
              [
                'Implementation support',
                'What level of onboarding, operating-model design, and deployment planning your team needs.',
              ],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-[color:rgba(16,50,79,0.12)] bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-[var(--substrata-ink)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <div className="rounded-[1.5rem] border border-[color:rgba(31,154,232,0.18)] bg-[var(--substrata-fog)] p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--substrata-steel)]">
              Next step
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--substrata-ink)]">
              See the review workflow with your team.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              We can walk through document intake, extracted technical facts, recommended review paths, memo drafting, and human review workflow in one session.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTA href={consultationHref}>Schedule a consultation</CTA>
              <CTA href="/app" variant="secondary">Open workspace</CTA>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[var(--substrata-ink)] text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-8">
          <p className="font-medium text-white">Substrata</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-white">Product</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <a href={consultationHref} target="_blank" rel="noreferrer" className="hover:text-white">
              Talk to our team
            </a>
            <a href="mailto:substrata@junglegrid.dev?subject=Substrata%20pricing" className="hover:text-white">
              substrata@junglegrid.dev
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
