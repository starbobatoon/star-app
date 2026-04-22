'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { createClient } from '@supabase/supabase-js';
import { colors, spacing, typography } from '@/lib/design-tokens';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // In Supabase PKCE flow, the reset email link contains token_hash and type in the URL hash
  // or as query params depending on the redirect configuration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Get the hash fragment from the URL (Supabase puts the access token there)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      if (!access_token) {
        // Fallback: try query params (for non-PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');

        if (!token || type !== 'recovery') {
          setError('Invalid or expired reset link. Please request a new one.');
          setLoading(false);
          return;
        }

        // Verify the OTP token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        } as any);

        if (verifyError) throw verifyError;
      } else {
        // PKCE flow: set the session first, then update password
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? '',
        });
        if (sessionError) throw sessionError;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.base }}>
      <Card cardStyle={{ width: '100%', maxWidth: '400px', padding: spacing.xl }}>
        <h1 style={{ ...typography.h2, color: colors.primary, marginBottom: spacing.md }}>Reset Password</h1>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
          Enter your new password.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: colors.error, margin: 0 }}>{error}</p>}
          {message && <p style={{ color: colors.primary, margin: 0 }}>{message}</p>}
          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
        <p style={{ ...typography.caption, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.lg }}>
          <a href="/admin/login" style={{ color: colors.secondary }}>Back to Login</a>
        </p>
      </Card>
    </div>
  );
}