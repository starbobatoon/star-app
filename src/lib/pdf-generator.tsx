/**
 * PDF Generator for STAR Speech Transcripts
 *
 * Renders a speech transcript (Hook/Story/Point/CTA/Exit) to a styled PDF
 * matching the Elocutionist design system.
 *
 * Server-side only — do NOT import from client components.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Font,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------
// Newsreader (serif) for body text, Inter (sans-serif) for headings/labels.
// Google Fonts URLs provide WOFF2; @react-pdf/renderer handles download.

Font.register({
  family: 'Newsreader',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/newsreader/v19/dXVUVcmDzY4z2T9PShY5NHfRgNN7rg.woff2',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/newsreader/v19/dXVUVcmDzY4z2T9PShY5NHfRgNN7rg.woff2',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: 'https://fonts.gstatic.com/s/newsreader/v19/dXVUVcmDzY4z2T9PShY5NHfRgNN7rg.woff2',
      fontWeight: 700,
      fontStyle: 'normal',
    },
  ],
});

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2',
      fontWeight: 500,
      fontStyle: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2',
      fontWeight: 600,
      fontStyle: 'normal',
    },
  ],
});

// ---------------------------------------------------------------------------
// Design tokens (PDF-appropriate values)
// ---------------------------------------------------------------------------

const SOFT_GOLD = '#f2ca50';
const DARK_TEXT = '#1a1a1a';
const MUTED_TEXT = '#6b6560';
const SECTION_LABEL_COLOR = '#d4af37'; // primaryContainer gold
const DIVIDER_COLOR = '#d0c5af';
const HEADER_BG = '#0A0A0A';
const HEADER_TEXT = '#e5e2e1';
const FOOTER_TEXT = '#99907c';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: 'Newsreader',
    fontSize: 11,
    lineHeight: 1.8,
    color: DARK_TEXT,
  },

  // Branded header bar
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 14,
    color: SOFT_GOLD,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 9,
    color: HEADER_TEXT,
    opacity: 0.6,
    letterSpacing: 1.5,
  },

  // Document content area
  content: {
    paddingHorizontal: 56,
    paddingTop: 32,
    paddingBottom: 24,
  },

  // Title block
  titleBlock: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER_COLOR,
    paddingBottom: 16,
    marginBottom: 24,
  },
  titleLabel: {
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 8,
    color: SECTION_LABEL_COLOR,
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 22,
    color: DARK_TEXT,
    lineHeight: 1.25,
    marginBottom: 8,
  },
  titleMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  titleMetaItem: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 9,
    color: MUTED_TEXT,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 14,
    color: DARK_TEXT,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionBody: {
    fontFamily: 'Newsreader',
    fontWeight: 400,
    fontSize: 11,
    lineHeight: 1.8,
    color: DARK_TEXT,
    textAlign: 'justify',
  },

  // Emphasized text (signature phrase)
  signaturePhrase: {
    fontFamily: 'Newsreader',
    fontWeight: 400,
    fontStyle: 'italic',
    fontSize: 12,
    color: DARK_TEXT,
    lineHeight: 1.8,
    marginTop: 4,
  },

  // Soft gold accent bar before section heading
  sectionAccentBar: {
    width: 24,
    height: 2,
    backgroundColor: SOFT_GOLD,
    marginBottom: 6,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: DIVIDER_COLOR,
    paddingHorizontal: 56,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 7,
    color: FOOTER_TEXT,
    letterSpacing: 2,
  },
  footerPage: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 8,
    color: FOOTER_TEXT,
  },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpeechPDFProps {
  /** Opening hook of the speech */
  hook: string;
  /** Story / narrative section */
  story: string;
  /** Core point / message — may contain a signature phrase */
  point: string;
  /** Call to action */
  cta: string;
  /** Exit / closing */
  exit: string;
  /** Optional speech title (defaults to "Your Speech") */
  title?: string;
  /** Optional author / speaker name */
  authorName?: string;
  /** Optional signature phrase to visually emphasize in the Point section */
  signaturePhrase?: string;
}

// ---------------------------------------------------------------------------
// Speech Section sub-component
// ---------------------------------------------------------------------------

interface SectionProps {
  label: string;
  children: React.ReactNode;
}

const SpeechSection: React.FC<SectionProps> = ({ label, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionAccentBar} />
    <Text style={styles.sectionHeading}>{label}</Text>
    {children}
  </View>
);

// ---------------------------------------------------------------------------
// SpeechPDF Document Component
// ---------------------------------------------------------------------------

export const SpeechPDF: React.FC<SpeechPDFProps> = ({
  hook,
  story,
  point,
  cta,
  exit,
  title,
  authorName,
  signaturePhrase,
}) => {
  const displayTitle = title ?? 'Your Speech';

  // Split the point into parts around the signature phrase for emphasis
  const renderPoint = () => {
    if (!signaturePhrase || !point.includes(signaturePhrase)) {
      // No signature phrase provided or not found — render entire point as body
      return <Text style={styles.sectionBody}>{point}</Text>;
    }

    const parts = point.split(signaturePhrase);
    return (
      <View>
        {parts[0] && <Text style={styles.sectionBody}>{parts[0]}</Text>}
        <Text style={styles.signaturePhrase}>{signaturePhrase}</Text>
        {parts[1] && <Text style={styles.sectionBody}>{parts[1]}</Text>}
      </View>
    );
  };

  return (
    <Document
      title={displayTitle}
      author={authorName ?? 'STAR App'}
      creator="STAR — Speech Transcription & Articulation Resource"
    >
      <Page size="LETTER" style={styles.page}>
        {/* Branded header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerBrand}>STAR</Text>
          <Text style={styles.headerSubtitle}>SPEECH TRANSCRIPT</Text>
        </View>

        {/* Document content */}
        <View style={styles.content}>
          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.titleLabel}>FINAL DRAFT</Text>
            <Text style={styles.title}>{displayTitle}</Text>
            {authorName && (
              <View style={styles.titleMeta}>
                <Text style={styles.titleMetaItem}>
                  Delivered by {authorName}
                </Text>
              </View>
            )}
          </View>

          {/* Five speech sections */}
          <SpeechSection label="Hook">
            <Text style={styles.sectionBody}>{hook}</Text>
          </SpeechSection>

          <SpeechSection label="Story">
            <Text style={styles.sectionBody}>{story}</Text>
          </SpeechSection>

          <SpeechSection label="Point">{renderPoint()}</SpeechSection>

          <SpeechSection label="Call to Action">
            <Text style={styles.sectionBody}>{cta}</Text>
          </SpeechSection>

          <SpeechSection label="Exit">
            <Text style={styles.sectionBody}>{exit}</Text>
          </SpeechSection>
        </View>

        {/* Branded footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>STAR ATELIER</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

// ---------------------------------------------------------------------------
// generatePDF — renders SpeechPDF to a Node Buffer
// ---------------------------------------------------------------------------

export async function generatePDF(
  params: SpeechPDFProps
): Promise<Buffer> {
  const buffer = await renderToBuffer(<SpeechPDF {...params} />);
  return Buffer.from(buffer);
}

export default SpeechPDF;