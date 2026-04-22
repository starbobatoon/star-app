'use client';

"use client";

import { colors, typography, radius, spacing } from "@/styles/design-tokens";

export default function AdminLoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface.base,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        padding: spacing.md,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: colors.surface.container,
          borderRadius: radius.lg,
          border: `1px solid ${colors.outlineVariant}`,
          padding: spacing.xl,
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: spacing.lg }}>
          <h1
            style={{
              ...typography.h2,
              color: colors.primary,
              margin: 0,
            }}
          >
            STAR Admin
          </h1>
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

        {/* Login Form */}
        <form
          method="POST"
          action="/api/auth/login"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label
              htmlFor="email"
              style={{
                ...typography.uiLabel,
                color: colors.onSurfaceVariant,
              }}
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
              style={{
                ...typography.uiBody,
                backgroundColor: colors.surface.containerLow,
                color: colors.onSurface,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                padding: `${spacing.sm} ${spacing.md}`,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.outlineVariant;
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label
              htmlFor="password"
              style={{
                ...typography.uiLabel,
                color: colors.onSurfaceVariant,
              }}
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
              style={{
                ...typography.uiBody,
                backgroundColor: colors.surface.containerLow,
                color: colors.onSurface,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                padding: `${spacing.sm} ${spacing.md}`,
                outline: "none",
                transition: "border-color 0.2s",
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
            style={{
              ...typography.uiLabel,
              fontSize: "15px",
              backgroundColor: colors.primary,
              color: colors.onPrimary,
              border: "none",
              borderRadius: radius.DEFAULT,
              padding: `${spacing.sm} ${spacing.md}`,
              cursor: "pointer",
              fontWeight: 600,
              letterSpacing: "0.02em",
              transition: "background-color 0.2s",
              marginTop: spacing.xs,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primaryContainer;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
            }}
          >
            Sign In
          </button>
        </form>

        <p
          style={{
            ...typography.caption,
            color: colors.outline,
            textAlign: "center",
            marginTop: spacing.lg,
          }}
        >
          Protected area. Authorized personnel only.
        </p>
        <p style={{ textAlign: 'center', marginTop: spacing.sm }}>
          <a
            href="/admin/forgot-password"
            style={{
              color: colors.secondary,
              textDecoration: 'none',
            }}
          >
            Forgot Password?
          </a>
        </p>
      </div>
    </div>
  );
}