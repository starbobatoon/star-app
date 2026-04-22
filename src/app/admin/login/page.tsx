'use client';

import { useState } from 'react';
import { colors, typography, radius, spacing } from '@/styles/design-tokens';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Successful login - redirect to admin dashboard
      window.location.href = '/admin';
    } catch (err) {
      setError('Network error. Please try again.');
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
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        padding: spacing.md,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: colors.surface.container,
          borderRadius: radius.lg,
          border: `1px solid ${colors.outlineVariant}`,
          padding: spacing.xl,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: spacing.lg }}>
          <div style={{ marginBottom: spacing.md }}>
            <img src="/logo.png" alt="Star Speaker AI" style={{ height: '48px', objectFit: 'contain' }} />
          </div>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              marginTop: spacing.xs,
            }}
          >
            Sign in to manage the platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}
        >
          {error && (
            <div
              style={{
                padding: spacing.sm,
                backgroundColor: colors.errorContainer || '#3a1a1a',
                color: colors.error || '#ff6b6b',
                borderRadius: radius.DEFAULT,
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor="email"
              style={{ ...typography.uiLabel, color: colors.onSurfaceVariant }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...typography.uiBody,
                backgroundColor: colors.surface.containerLow,
                color: colors.onSurface,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                padding: `${spacing.sm} ${spacing.md}`,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.outlineVariant;
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor="password"
              style={{ ...typography.uiLabel, color: colors.onSurfaceVariant }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                ...typography.uiBody,
                backgroundColor: colors.surface.containerLow,
                color: colors.onSurface,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                padding: `${spacing.sm} ${spacing.md}`,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.outlineVariant;
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...typography.uiLabel,
              fontSize: '15px',
              backgroundColor: loading ? colors.outlineVariant : colors.primary,
              color: loading ? colors.outline : colors.onPrimary,
              border: 'none',
              borderRadius: radius.DEFAULT,
              padding: `${spacing.sm} ${spacing.md}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition: 'background-color 0.2s',
              marginTop: spacing.xs,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: spacing.md }}>
          <a
            href="/admin/forgot-password"
            style={{ color: colors.secondary, textDecoration: 'none', fontSize: '13px' }}
          >
            Forgot Password?
          </a>
        </p>

        <p
          style={{
            ...typography.caption,
            color: colors.outline,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
        >
          Protected area. Authorized personnel only.
        </p>
      </div>
    </div>
  );
}