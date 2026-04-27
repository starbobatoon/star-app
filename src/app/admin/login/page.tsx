'use client';

import { useState } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';

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

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, margin: `${spacing.md} 0` }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: colors.outlineVariant }} />
          <span style={{ ...typography.caption, color: colors.outline }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: colors.outlineVariant }} />
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redirectTo: '/admin' }),
              });
              const data = await res.json();
              if (data.url) {
                window.location.href = data.url;
              } else {
                alert(data.error || 'Google sign-in failed');
              }
            } catch {
              alert('Network error');
            }
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: 'transparent',
            color: colors.onSurface,
            border: `1px solid ${colors.outlineVariant}`,
            borderRadius: radius.DEFAULT,
            cursor: 'pointer',
            ...typography.uiLabel,
            fontSize: '15px',
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surface.containerHigh; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

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