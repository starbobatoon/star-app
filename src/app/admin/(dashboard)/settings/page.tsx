'use client';

import { useState, useEffect } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [bookingUrl, setBookingUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { setBookingUrl(d.bookingUrl ?? ''); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingUrl }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: spacing.lg, maxWidth: 680 }}>
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ ...typography.h1, color: colors.onSurface, marginBottom: spacing.xs }}>
          App Settings
        </h1>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>
          Global settings for the Star Speaker AI platform.
        </p>
      </div>

      <Card>
        <div style={{ padding: spacing.lg }}>
          <h2 style={{ ...typography.h2, color: colors.onSurface, fontSize: '18px', marginBottom: spacing.xs }}>
            Coaching Session Booking Link
          </h2>
          <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
            This link appears on the speech end screen as a "Schedule a Coaching Session" button.
            Paste your Calendly, GHL booking, or any scheduling page URL here.
          </p>

          {error && (
            <div style={{
              background: `${colors.error}15`,
              border: `1px solid ${colors.error}`,
              borderRadius: radius.DEFAULT,
              padding: spacing.sm,
              marginBottom: spacing.md,
              color: colors.error,
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ color: colors.onSurfaceVariant, fontSize: '14px' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div>
                <label style={{ ...typography.uiLabel, color: colors.onSurfaceVariant, display: 'block', marginBottom: spacing.xs }}>
                  Booking URL
                </label>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://calendly.com/starbobatoon or your GHL booking link"
                  style={{
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: colors.surface.containerLow,
                    color: colors.onSurface,
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: radius.DEFAULT,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.outlineVariant; }}
                />
                <p style={{ fontSize: '12px', color: colors.outline, marginTop: '6px' }}>
                  Leave blank to hide the button on the end screen.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                {saved && (
                  <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 600 }}>
                    ✓ Saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
