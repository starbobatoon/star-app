'use client';

import { useState, useCallback, type CSSProperties } from 'react';
import { colors, typography, radius, spacing } from '@/styles/design-tokens';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Tag } from '@/components/ui/Tag';

// ─── Types ────────────────────────────────────────────────────────

type FeedsSection = 'map' | 'hook' | 'story' | 'point' | 'cta' | 'exit' | 'meta';

interface Question {
  id: string;
  displayOrder: number;
  questionText: string;
  feedsSection: FeedsSection;
  isRequired: boolean;
  isVisible: boolean;
  ghlFieldKey: string | null;
}

// ─── Section options ───────────────────────────────────────────────

const SECTION_OPTIONS: SelectOption[] = [
  { value: 'map', label: 'Map' },
  { value: 'hook', label: 'Hook' },
  { value: 'story', label: 'Story' },
  { value: 'point', label: 'Point' },
  { value: 'cta', label: 'CTA' },
  { value: 'exit', label: 'Exit' },
  { value: 'meta', label: 'Meta' },
];

const SECTION_LABEL_MAP: Record<FeedsSection, string> = {
  map: 'Map',
  hook: 'Hook',
  story: 'Story',
  point: 'Point',
  cta: 'CTA',
  exit: 'Exit',
  meta: 'Meta',
};

// ─── Mock GHL Custom Fields ───────────────────────────────────────

const GHL_FIELD_OPTIONS: SelectOption[] = [
  { value: '', label: 'None' },
  { value: 'custom_field_core_message', label: 'Core Message' },
  { value: 'custom_field_audience', label: 'Primary Audience' },
  { value: 'custom_field_tone', label: 'Tonal Qualities' },
  { value: 'custom_field_references', label: 'Historical References' },
  { value: 'custom_field_cta', label: 'Call to Action' },
  { value: 'custom_field_sensitive', label: 'Sensitive Subjects' },
  { value: 'custom_field_duration', label: 'Target Duration' },
  { value: 'custom_field_multimedia', label: 'Multimedia Aids' },
  { value: 'custom_field_stakeholders', label: 'Key Stakeholders' },
  { value: 'custom_field_anecdote', label: 'Thematic Anchor' },
  { value: 'custom_field_venue', label: 'Venue / Setting' },
  { value: 'custom_field_dress_code', label: 'Dress Code' },
  { value: 'custom_field_event_type', label: 'Event Type' },
  { value: 'custom_field_speaker_name', label: 'Speaker Name' },
];

// ─── Mock Data (10 default questions from database seed) ──────────

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    displayOrder: 1,
    questionText: 'What is the core message or thesis of this address?',
    feedsSection: 'map',
    isRequired: true,
    isVisible: true,
    ghlFieldKey: 'custom_field_core_message',
  },
  {
    id: 'q2',
    displayOrder: 2,
    questionText: 'Who comprises the primary audience for this delivery?',
    feedsSection: 'map',
    isRequired: true,
    isVisible: true,
    ghlFieldKey: 'custom_field_audience',
  },
  {
    id: 'q3',
    displayOrder: 3,
    questionText: 'What specific tonal qualities are required? (e.g., Solemn, Uplifting, Aggressive)',
    feedsSection: 'hook',
    isRequired: false,
    isVisible: true,
    ghlFieldKey: 'custom_field_tone',
  },
  {
    id: 'q4',
    displayOrder: 4,
    questionText: 'List any mandatory historical references or quotes.',
    feedsSection: 'story',
    isRequired: false,
    isVisible: false,
    ghlFieldKey: 'custom_field_references',
  },
  {
    id: 'q5',
    displayOrder: 5,
    questionText: 'What is the desired call to action or concluding instruction?',
    feedsSection: 'cta',
    isRequired: true,
    isVisible: true,
    ghlFieldKey: 'custom_field_cta',
  },
  {
    id: 'q6',
    displayOrder: 6,
    questionText: 'Are there any sensitive subjects or names to explicitly avoid?',
    feedsSection: 'meta',
    isRequired: false,
    isVisible: true,
    ghlFieldKey: 'custom_field_sensitive',
  },
  {
    id: 'q7',
    displayOrder: 7,
    questionText: 'What is the target duration (in minutes) for the delivery?',
    feedsSection: 'meta',
    isRequired: true,
    isVisible: true,
    ghlFieldKey: 'custom_field_duration',
  },
  {
    id: 'q8',
    displayOrder: 8,
    questionText: 'Will this be accompanied by any multi-media or visual aids?',
    feedsSection: 'point',
    isRequired: false,
    isVisible: true,
    ghlFieldKey: 'custom_field_multimedia',
  },
  {
    id: 'q9',
    displayOrder: 9,
    questionText: 'Identify any key stakeholders or individuals requiring specific acknowledgment.',
    feedsSection: 'story',
    isRequired: true,
    isVisible: true,
    ghlFieldKey: 'custom_field_stakeholders',
  },
  {
    id: 'q10',
    displayOrder: 10,
    questionText: 'What personal anecdote should serve as the thematic anchor?',
    feedsSection: 'story',
    isRequired: false,
    isVisible: true,
    ghlFieldKey: 'custom_field_anecdote',
  },
];

// ─── Sidebar ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', href: '/admin', active: false },
  { icon: 'settings_input_component', label: 'Model Settings', href: '/admin/settings', active: false },
  { icon: 'settings_voice', label: 'Voice Config', href: '/admin/voice', active: false },
  { icon: 'quiz', label: 'Question Manager', href: '/admin/questions', active: true },
  { icon: 'analytics', label: 'Analytics', href: '/admin/analytics', active: false },
];

function AdminSidebar() {
  return (
    <nav
      style={{
        backgroundColor: '#1A1A1A',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        width: 288,
        borderRight: `1px solid #2A2A2A`,
        display: 'flex',
        flexDirection: 'column',
        padding: spacing.lg,
        zIndex: 40,
      } as CSSProperties}
    >
      {/* Brand */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2
          style={{
            ...typography.h2,
            fontSize: '20px',
            color: colors.primaryContainer,
            margin: 0,
            marginBottom: spacing.lg,
          } as CSSProperties}
        >
          ELOCUTIONIST
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              backgroundColor: colors.surface.containerHigh,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${colors.outlineVariant}`,
            }}
          >
            <span
              style={{
                ...typography.uiBody,
                color: colors.onSurface,
                fontSize: '20px',
              } as CSSProperties}
            >
              👤
            </span>
          </div>
          <div>
            <div
              style={{
                ...typography.uiLabel,
                color: colors.onSurface,
              } as CSSProperties}
            >
              Admin Console
            </div>
            <div
              style={{
                ...typography.caption,
                color: colors.onSurfaceVariant,
              } as CSSProperties}
            >
              Elocutionist v1.0
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radius.DEFAULT,
                color: item.active ? colors.primaryContainer : '#A0A0A0',
                backgroundColor: item.active ? '#2A2A2A' : 'transparent',
                borderLeft: item.active ? `2px solid ${colors.primaryContainer}` : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                ...typography.uiBody,
                fontSize: '14px',
              } as CSSProperties}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: item.active ? "'FILL' 1" : undefined }}>
                {item.icon}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Toggle Switch ──────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, opacity: disabled ? 0.5 : 1 }}>
      <span
        style={{
          ...typography.uiLabel,
          fontSize: '10px',
          color: colors.onSurfaceVariant,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
        } as CSSProperties}
      >
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 40,
          height: 20,
          borderRadius: radius.full,
          backgroundColor: checked ? colors.primaryContainer : colors.surface.containerHigh,
          border: checked ? 'none' : `1px solid ${colors.outlineVariant}`,
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s ease',
          position: 'relative',
        } as CSSProperties}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: radius.full,
            backgroundColor: checked ? colors.onPrimaryContainer : colors.outline,
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 0.2s ease, background-color 0.2s ease',
          }}
        />
      </button>
    </div>
  );
}

// ─── Section Tag ───────────────────────────────────────────────────

const SECTION_TAG_VARIANT: Record<FeedsSection, 'default' | 'primary' | 'secondary' | 'error' | 'success'> = {
  map: 'secondary',
  hook: 'primary',
  story: 'success',
  point: 'default',
  cta: 'primary',
  exit: 'default',
  meta: 'secondary',
};

// ─── Edit/Add Modal ────────────────────────────────────────────────

interface QuestionFormData {
  questionText: string;
  feedsSection: FeedsSection;
  isRequired: boolean;
  isVisible: boolean;
  ghlFieldKey: string;
}

function QuestionFormModal({
  open,
  onClose,
  onSave,
  initialData,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: QuestionFormData) => void;
  initialData: QuestionFormData;
  mode: 'add' | 'edit';
}) {
  const [formData, setFormData] = useState<QuestionFormData>(initialData);

  // Reset form when modal opens with new data
  const handleOpen = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  // We'll reset whenever open changes to true
  useState(() => {
    if (open) handleOpen();
  });

  // Sync form when initialData changes (e.g., editing different question)
  if (open && formData.questionText !== initialData.questionText && mode === 'edit') {
    setFormData(initialData);
  }

  const handleSave = () => {
    if (!formData.questionText.trim()) return;
    onSave(formData);
    onClose();
  };

  const fieldGroupStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'flex-start',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Question' : 'Edit Question'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Question Text */}
        <div style={fieldGroupStyle}>
          <Input
            label="Question Text"
            value={formData.questionText}
            onChange={(e) => setFormData((prev) => ({ ...prev, questionText: e.target.value }))}
            placeholder="e.g., What is the core message of this address?"
            required
          />
        </div>

        {/* Section + GHL Field Row */}
        <div style={rowStyle}>
          <div style={{ flex: 1, ...fieldGroupStyle }}>
            <Select
              label="Feeds Section"
              options={SECTION_OPTIONS}
              value={formData.feedsSection}
              onChange={(val) => setFormData((prev) => ({ ...prev, feedsSection: val as FeedsSection }))}
              placeholder="Select section..."
            />
          </div>
          <div style={{ flex: 1, ...fieldGroupStyle }}>
            <Select
              label="Maps to GHL Field"
              options={GHL_FIELD_OPTIONS}
              value={formData.ghlFieldKey}
              onChange={(val) => setFormData((prev) => ({ ...prev, ghlFieldKey: val }))}
              placeholder="Select GHL field..."
            />
          </div>
        </div>

        {/* Toggles Row */}
        <div style={{ ...rowStyle, alignItems: 'center' }}>
          <ToggleSwitch
            checked={formData.isRequired}
            onChange={(val) => setFormData((prev) => ({ ...prev, isRequired: val }))}
            label="Required"
          />
          <ToggleSwitch
            checked={formData.isVisible}
            onChange={(val) => setFormData((prev) => ({ ...prev, isVisible: val }))}
            label="Visible"
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!formData.questionText.trim()}>
            {mode === 'add' ? 'Add Question' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete Confirmation Modal ─────────────────────────────────────

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  questionText,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  questionText: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Question">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <p style={{ ...typography.uiBody, color: colors.onSurface, margin: 0 } as CSSProperties}>
          Are you sure you want to delete this question?
        </p>
        <div
          style={{
            backgroundColor: colors.surface.containerLow,
            border: `1px solid ${colors.outlineVariant}`,
            borderRadius: radius.DEFAULT,
            padding: spacing.md,
          }}
        >
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurface,
              margin: 0,
              fontStyle: 'italic',
            } as CSSProperties}
          >
            &ldquo;{questionText}&rdquo;
          </p>
        </div>
        <p style={{ ...typography.caption, color: colors.error, margin: 0 } as CSSProperties}>
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ backgroundColor: colors.error, color: colors.onError }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Question Row ──────────────────────────────────────────────────

function QuestionRow({
  question,
  index,
  onToggleRequired,
  onToggleVisible,
  onEdit,
  onDelete,
  onSectionChange,
  onGhlFieldChange,
  onMoveUp,
  onMoveDown,
  total,
}: {
  question: Question;
  index: number;
  onToggleRequired: (id: string, val: boolean) => void;
  onToggleVisible: (id: string, val: boolean) => void;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
  onSectionChange: (id: string, val: FeedsSection) => void;
  onGhlFieldChange: (id: string, val: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  total: number;
}) {
  const [showSectionSelect, setShowSectionSelect] = useState(false);
  const [showGhlSelect, setShowGhlSelect] = useState(false);

  const isHidden = !question.isVisible;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        backgroundColor: colors.surface.containerLow,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: radius.lg,
        opacity: isHidden ? 0.6 : 1,
        transition: 'background-color 0.2s ease, opacity 0.2s ease',
      } as CSSProperties}
      onMouseEnter={(e) => {
        if (!isHidden) {
          e.currentTarget.style.backgroundColor = colors.surface.containerHighest;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.surface.containerLow;
      }}
    >
      {/* Left side: drag + order + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 }}>
        {/* Reorder controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            style={{
              background: 'none',
              border: 'none',
              color: index === 0 ? colors.outlineVariant : colors.outline,
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              padding: '1px 4px',
              fontSize: '12px',
              lineHeight: 1,
            }}
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            style={{
              background: 'none',
              border: 'none',
              color: index === total - 1 ? colors.outlineVariant : colors.outline,
              cursor: index === total - 1 ? 'not-allowed' : 'pointer',
              padding: '1px 4px',
              fontSize: '12px',
              lineHeight: 1,
            }}
            aria-label="Move down"
          >
            ▼
          </button>
        </div>

        {/* Display order */}
        <span
          style={{
            ...typography.uiLabel,
            color: colors.outline,
            width: 32,
            flexShrink: 0,
          } as CSSProperties}
        >
          {String(question.displayOrder).padStart(2, '0')}.
        </span>

        {/* Question text */}
        <span
          style={{
            ...typography.uiBody,
            color: colors.onSurface,
            textDecoration: isHidden ? 'line-through' : 'none',
            textDecorationColor: colors.outline,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          } as CSSProperties}
        >
          {question.questionText}
        </span>

        {/* Section Tag */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => setShowSectionSelect(!showSectionSelect)}>
            <Tag
              variant={SECTION_TAG_VARIANT[question.feedsSection]}
            >
              {SECTION_LABEL_MAP[question.feedsSection]}
            </Tag>
          </div>
          {showSectionSelect && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: spacing.xs,
                backgroundColor: colors.surface.container,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                padding: spacing.xs,
                zIndex: 50,
                minWidth: 120,
              } as CSSProperties}
            >
              {SECTION_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    cursor: 'pointer',
                    ...typography.uiBody,
                    fontSize: '13px',
                    color: opt.value === question.feedsSection ? colors.secondary : colors.onSurface,
                    backgroundColor: opt.value === question.feedsSection ? `${colors.secondary}15` : 'transparent',
                    borderRadius: radius.sm,
                  } as CSSProperties}
                  onClick={() => {
                    onSectionChange(question.id, opt.value as FeedsSection);
                    setShowSectionSelect(false);
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== question.feedsSection) {
                      e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (opt.value !== question.feedsSection) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: GHL field + toggles + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, flexShrink: 0, marginLeft: spacing.md }}>
        {/* GHL Field mapping */}
        <div style={{ position: 'relative', minWidth: 140 }}>
          <button
            type="button"
            onClick={() => setShowGhlSelect(!showGhlSelect)}
            style={{
              ...typography.caption,
              color: question.ghlFieldKey ? colors.tertiary : colors.outline,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: radius.DEFAULT,
              padding: `${spacing.xs} ${spacing.sm}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              whiteSpace: 'nowrap',
              transition: 'border-color 0.2s ease',
            } as CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.tertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.outlineVariant;
            }}
          >
            <span style={{ fontSize: '14px' }}>🔗</span>
            {question.ghlFieldKey
              ? GHL_FIELD_OPTIONS.find((f) => f.value === question.ghlFieldKey)?.label ?? 'Mapped'
              : 'Map GHL'}
          </button>
          {showGhlSelect && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: spacing.xs,
                backgroundColor: colors.surface.container,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                padding: spacing.xs,
                zIndex: 50,
                minWidth: 200,
                maxHeight: 240,
                overflowY: 'auto',
              } as CSSProperties}
            >
              {GHL_FIELD_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    cursor: 'pointer',
                    ...typography.uiBody,
                    fontSize: '13px',
                    color: opt.value === question.ghlFieldKey ? colors.tertiary : colors.onSurface,
                    backgroundColor: opt.value === question.ghlFieldKey ? `${colors.tertiary}15` : 'transparent',
                    borderRadius: radius.sm,
                  } as CSSProperties}
                  onClick={() => {
                    onGhlFieldChange(question.id, opt.value);
                    setShowGhlSelect(false);
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== question.ghlFieldKey) {
                      e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (opt.value !== question.ghlFieldKey) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {opt.label || 'None'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Required toggle */}
        <ToggleSwitch
          checked={question.isRequired}
          onChange={(val) => onToggleRequired(question.id, val)}
          label={question.isRequired ? 'Required' : 'Optional'}
        />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: spacing.xs, color: colors.outline }}>
          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => onToggleVisible(question.id, !question.isVisible)}
            style={{
              padding: spacing.xs,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: question.isVisible ? colors.outline : colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.DEFAULT,
              transition: 'color 0.2s ease',
              fontSize: '18px',
            } as CSSProperties}
            aria-label={question.isVisible ? 'Hide question' : 'Show question'}
            title={question.isVisible ? 'Hide question' : 'Show question'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = question.isVisible ? colors.outline : colors.primary;
            }}
          >
            {question.isVisible ? '👁' : '👁‍🗨'}
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(question)}
            style={{
              padding: spacing.xs,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.outline,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.DEFAULT,
              transition: 'color 0.2s ease',
              fontSize: '18px',
            } as CSSProperties}
            aria-label="Edit question"
            title="Edit question"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.outline;
            }}
          >
            ✏️
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(question)}
            style={{
              padding: spacing.xs,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.outline,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.DEFAULT,
              transition: 'color 0.2s ease',
              fontSize: '18px',
            } as CSSProperties}
            aria-label="Delete question"
            title="Delete question"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.error;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.outline;
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────

export default function QuestionManagerPage() {
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [editModal, setEditModal] = useState<{ open: boolean; mode: 'add' | 'edit'; question: Question | null }>({
    open: false,
    mode: 'add',
    question: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; question: Question | null }>({
    open: false,
    question: null,
  });

  // Re-index display orders whenever questions change
  const reindex = (qs: Question[]): Question[] =>
    qs.map((q, i) => ({ ...q, displayOrder: i + 1 }));

  const handleToggleRequired = useCallback((id: string, val: boolean) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, isRequired: val } : q)));
  }, []);

  const handleToggleVisible = useCallback((id: string, val: boolean) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, isVisible: val } : q)));
  }, []);

  const handleSectionChange = useCallback((id: string, val: FeedsSection) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, feedsSection: val } : q)));
  }, []);

  const handleGhlFieldChange = useCallback((id: string, val: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ghlFieldKey: val || null } : q)),
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return reindex(next);
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setQuestions((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return reindex(next);
    });
  }, []);

  const handleEdit = useCallback((q: Question) => {
    setEditModal({ open: true, mode: 'edit', question: q });
  }, []);

  const handleAdd = useCallback(() => {
    setEditModal({
      open: true,
      mode: 'add',
      question: {
        id: '',
        displayOrder: 0,
        questionText: '',
        feedsSection: 'map',
        isRequired: false,
        isVisible: true,
        ghlFieldKey: '',
      },
    });
  }, []);

  const handleSave = useCallback(
    (data: QuestionFormData) => {
      if (editModal.mode === 'add') {
        const newId = `q${Date.now()}`;
        setQuestions((prev) =>
          reindex([
            ...prev,
            {
              id: newId,
              displayOrder: prev.length + 1,
              questionText: data.questionText,
              feedsSection: data.feedsSection,
              isRequired: data.isRequired,
              isVisible: data.isVisible,
              ghlFieldKey: data.ghlFieldKey || null,
            },
          ]),
        );
      } else if (editModal.question) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === editModal.question!.id
              ? {
                  ...q,
                  questionText: data.questionText,
                  feedsSection: data.feedsSection,
                  isRequired: data.isRequired,
                  isVisible: data.isVisible,
                  ghlFieldKey: data.ghlFieldKey || null,
                }
              : q,
          ),
        );
      }
    },
    [editModal],
  );

  const handleDelete = useCallback(
    (q: Question) => {
      setDeleteModal({ open: true, question: q });
    },
    [],
  );

  const confirmDelete = useCallback(() => {
    if (deleteModal.question) {
      setQuestions((prev) => reindex(prev.filter((q) => q.id !== deleteModal.question!.id)));
    }
  }, [deleteModal.question]);

  // Close dropdown menus when clicking outside
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const getEditFormData = (): QuestionFormData => {
    if (editModal.question) {
      return {
        questionText: editModal.question.questionText,
        feedsSection: editModal.question.feedsSection,
        isRequired: editModal.question.isRequired,
        isVisible: editModal.question.isVisible,
        ghlFieldKey: editModal.question.ghlFieldKey ?? '',
      };
    }
    return {
      questionText: '',
      feedsSection: 'map',
      isRequired: false,
      isVisible: true,
      ghlFieldKey: '',
    };
  };

  return (
    <div
      style={{
        backgroundColor: colors.background,
        color: colors.onBackground,
        minHeight: '100vh',
        display: 'flex',
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
      } as CSSProperties}
    >
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: 288,
          padding: spacing.xl,
          overflowY: 'auto',
        } as CSSProperties}
      >
        <div style={{ maxWidth: spacing.containerMax, margin: '0 auto' }}>
          {/* Header */}
          <header
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: spacing.xl,
              paddingBottom: spacing.lg,
              borderBottom: `1px solid ${colors.surface.containerHigh}`,
            } as CSSProperties}
          >
            <div>
              <h1
                style={{
                  ...typography.h1,
                  color: colors.onSurface,
                  margin: 0,
                  marginBottom: spacing.sm,
                } as CSSProperties}
              >
                Question Manager
              </h1>
              <p
                style={{
                  ...typography.uiBody,
                  color: colors.onSurfaceVariant,
                  margin: 0,
                } as CSSProperties}
              >
                Configure the primary intake questionnaire for new speech sessions.
              </p>
            </div>
            <Button variant="primary" onClick={handleAdd}>
              <span style={{ marginRight: spacing.xs }}>+</span>
              Add New Question
            </Button>
          </header>

          {/* Question Count */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            } as CSSProperties}
          >
            <span
              style={{
                ...typography.uiLabel,
                color: colors.onSurfaceVariant,
              } as CSSProperties}
            >
              {questions.length} QUESTION{questions.length !== 1 ? 'S' : ''}
            </span>
            <span
              style={{
                ...typography.caption,
                color: colors.outline,
              } as CSSProperties}
            >
              Use ▲▼ to reorder
            </span>
          </div>

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {questions.map((q, idx) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={idx}
                onToggleRequired={handleToggleRequired}
                onToggleVisible={handleToggleVisible}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSectionChange={handleSectionChange}
                onGhlFieldChange={handleGhlFieldChange}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                total={questions.length}
              />
            ))}
          </div>

          {/* Empty State */}
          {questions.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: spacing.xxl,
                color: colors.onSurfaceVariant,
              } as CSSProperties}
            >
              <p style={{ ...typography.uiBody, margin: 0 } as CSSProperties}>
                No questions configured yet.
              </p>
              <div style={{ marginTop: spacing.md }}>
                <Button variant="primary" onClick={handleAdd}>
                  Add Your First Question
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit/Add Modal */}
      <QuestionFormModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, mode: 'add', question: null })}
        onSave={handleSave}
        initialData={getEditFormData()}
        mode={editModal.mode}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, question: null })}
        onConfirm={confirmDelete}
        questionText={deleteModal.question?.questionText ?? ''}
      />
    </div>
  );
}