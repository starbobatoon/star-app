import type { Metadata } from 'next';
import Link from 'next/link';
import { colors, spacing, typeScale } from '@/lib/design-tokens';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Terms of Service · Star Speaker AI',
  description: 'Terms of Service for Star Speaker AI.',
};

const sections: { h: string; p: string }[] = [
  {
    h: '1. Acceptance of Terms',
    p: 'By accessing or using Star Speaker AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.',
  },
  {
    h: '2. The Service',
    p: 'Star Speaker AI helps you compose speeches from a short set of guided questions and generates an audio narration of the resulting speech. Output is generated with the assistance of automated systems and is provided for your personal and professional use.',
  },
  {
    h: '3. Your Content',
    p: 'You retain ownership of the answers you provide and the speeches generated for you. You are responsible for ensuring your inputs do not infringe the rights of others and for how you use the generated speeches.',
  },
  {
    h: '4. Acceptable Use',
    p: 'You agree not to use the Service to create unlawful, harmful, deceptive, or infringing content, or to attempt to disrupt or reverse-engineer the Service.',
  },
  {
    h: '5. Communications',
    p: 'If you provide an email address or phone number, you consent to receiving your generated speech and related notifications through the channels the Service has configured.',
  },
  {
    h: '6. Disclaimer',
    p: 'The Service is provided "as is" without warranties of any kind. Generated content may require review and editing before use.',
  },
  {
    h: '7. Changes',
    p: 'We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
  },
];

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.surface.base,
        color: colors.onSurface,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          padding: `0 ${spacing.lg}`,
          borderBottom: `1px solid ${colors.outlineVariant}`,
          backgroundColor: colors.surface.dim,
        }}
      >
        <Link href="/" aria-label="Star Speaker AI home" style={{ display: 'inline-flex', textDecoration: 'none' }}>
          <Logo size={26} />
        </Link>
        <Link href="/" style={{ color: colors.onSurfaceVariant, textDecoration: 'none', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>
          Home
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: `${spacing.xl} ${spacing.lg} 96px` }}>
        <h1 style={{ ...typeScale.hero, fontSize: 'clamp(2rem, 4vw + 1rem, 3rem)', color: colors.onSurface, margin: `0 0 ${spacing.sm}` }}>
          Terms of Service
        </h1>
        <p style={{ ...typeScale.ui, color: colors.onSurfaceVariant, margin: `0 0 ${spacing.xl}` }}>
          Last updated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {sections.map(({ h, p }) => (
          <section key={h} style={{ marginBottom: spacing.xl }}>
            <h2 style={{ ...typeScale.section, fontSize: '1.375rem', color: colors.onSurface, margin: `0 0 ${spacing.sm}` }}>{h}</h2>
            <p style={{ ...typeScale.bodySerif, color: colors.onSurfaceVariant, margin: 0 }}>{p}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
