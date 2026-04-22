"use client";

import { useState, useEffect } from "react";
import { colors, typography, radius, spacing } from "@/styles/design-tokens";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────

interface AiInstruction {
  id: string | null;
  system_prompt: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Component ────────────────────────────────────────────────────

export default function InstructionsPage() {
  const [instruction, setInstruction] = useState<AiInstruction | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Load current instruction on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/instructions");
        if (res.ok) {
          const data = await res.json();
          setInstruction(data.instruction);
          setEditContent(data.instruction.system_prompt || "");
        }
      } catch (err) {
        console.error("[Instructions] Failed to load:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setIsDirty(value !== (instruction?.system_prompt ?? ""));
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: editContent.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Save failed", type: "error" });
        return;
      }

      const data = await res.json();
      setInstruction(data.instruction);
      setIsDirty(false);
      setToast({ message: "Instructions saved successfully.", type: "success" });
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCancel = () => {
    setEditContent(instruction?.system_prompt ?? "");
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.background,
          fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
          color: colors.onBackground,
          padding: `${spacing.xl} ${spacing.gutter}`,
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>
            Loading instructions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.background,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
        color: colors.onBackground,
        padding: `${spacing.xl} ${spacing.gutter}`,
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Page Header */}
        <header style={{ marginBottom: spacing.xl }}>
          <h1
            style={{
              ...typography.h2,
              color: colors.onSurface,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            AI Settings
          </h1>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              margin: 0,
            }}
          >
            Edit the instruction set that tells the AI how to write speeches.
            This controls structure, tone, format, and rules. When users submit
            answers, the AI combines these instructions with their responses.
          </p>
        </header>

        {/* Instruction Editor */}
        <Card padding={spacing.lg} cardStyle={{ marginBottom: spacing.xl }}>
          {/* Section Header */}
          <div
            style={{
              borderBottom: `1px solid ${colors.outlineVariant}`,
              paddingBottom: spacing.sm,
              marginBottom: spacing.md,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                ...typography.uiLabel,
                color: colors.onSurface,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              System Prompt
            </h2>
            {instruction?.updated_at && (
              <span
                style={{
                  ...typography.caption,
                  color: colors.onSurfaceVariant,
                }}
              >
                Last saved: {formatDate(instruction.updated_at)}
              </span>
            )}
          </div>

          {/* Description */}
          <p
            style={{
              ...typography.caption,
              color: colors.outline,
              marginBottom: spacing.sm,
            }}
          >
            This instruction set is prepended to every speech generation
            request. It controls how the AI structures and writes the speech
            based on user answers.
          </p>

          {/* Textarea */}
          <div style={{ position: "relative" }}>
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
              rows={16}
              style={{
                width: "100%",
                backgroundColor: colors.surface.containerLowest,
                color: colors.onSurface,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: "14px",
                lineHeight: "1.7",
                padding: spacing.md,
                border: `1px solid ${isDirty ? colors.primary : colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                outline: "none",
                resize: "vertical",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => {
                if (!isDirty) {
                  e.currentTarget.style.borderColor = colors.secondary;
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDirty
                  ? colors.primary
                  : colors.outlineVariant;
              }}
            />
          </div>

          {/* Character count + dirty indicator */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: spacing.xs,
            }}
          >
            <span
              style={{
                ...typography.caption,
                color: isDirty ? colors.primary : colors.onSurfaceVariant,
              }}
            >
              {isDirty ? "Unsaved changes" : "No changes"}
            </span>
            <span
              style={{
                ...typography.caption,
                color: colors.onSurfaceVariant,
              }}
            >
              {editContent.length} characters
            </span>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: spacing.md,
              marginTop: spacing.lg,
              paddingTop: spacing.md,
              borderTop: `1px solid ${colors.outlineVariant}`,
            }}
          >
            {isDirty && (
              <Button variant="tertiary" onClick={handleCancel}>
                Cancel Changes
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!isDirty || !editContent.trim()}
              loading={isSaving}
              onClick={handleSave}
            >
              Save Instructions
            </Button>
          </div>
        </Card>

        {/* Toast notification */}
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: spacing.xl,
              right: spacing.xl,
              backgroundColor:
                toast.type === "success"
                  ? colors.primaryContainer
                  : colors.errorContainer,
              color:
                toast.type === "success"
                  ? colors.onPrimaryContainer
                  : colors.onErrorContainer,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radius.DEFAULT,
              fontFamily: `var(${typography.uiBody.fontFamily})`,
              fontSize: typography.uiBody.fontSize,
              fontWeight: 500,
              zIndex: 1000,
              border: `1px solid ${
                toast.type === "success" ? colors.primary : colors.error
              }`,
              animation: "slideUp 0.3s ease",
            }}
          >
            {toast.message}
            <style>{`
              @keyframes slideUp {
                from {
                  transform: translateY(20px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
