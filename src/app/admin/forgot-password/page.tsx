'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/lib/design-tokens';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setMessage(data.message || 'Check your email for reset instructions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.base,
        padding: spacing.xl,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: spacing.xl,
        }}
      >
        <h1 style={{ ...typography.h2, color: colors.primary, marginBottom: spacing.md, marginTop: 0 }}>
          Forgot Password?
        </h1>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
          />
          {error && (
            <p style={{ color: colors.error, margin: 0, ...typography.caption }}>{error}</p>
          )}
          {message && (
            <p style={{ color: colors.primary, margin: 0, ...typography.caption }}>{message}</p>
          )}
          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <p
          style={{
            ...typography.caption,
            color: colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: spacing.lg,
          }}
        >
          <a href="/admin/login" style={{ color: colors.secondary }}>
            Back to Login
          </a>
        </p>
      </Card>
    </div>
  );
}
