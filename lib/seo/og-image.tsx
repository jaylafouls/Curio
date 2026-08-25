import { ImageResponse } from 'next/og'

/**
 * Shared Open Graph image renderer (chantier SEO part 1, decision D003).
 *
 * A single branded template every route's opengraph-image can reuse, so social
 * cards stay consistent. Rendered dynamically via next/og — no binary asset is
 * committed and there is no dependency on a not-yet-existing brand PNG.
 *
 * On-token: Cosmic background (#0D0E15), violet accent (#785CFF), off-white
 * foreground (#FAFBF2), matching tailwind.config.ts and the Welcome mockup.
 * Fonts are kept to a system serif/sans stack so the image renders on the edge
 * runtime with no font fetch; swap in DM Serif Display here if brand fidelity of
 * the OG card later warrants the extra font load.
 */

/** OG images are 1200×630 by convention (the size Twitter/Facebook expect). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const COSMIC = '#0D0E15'
const VIOLET = '#785CFF'
const FOREGROUND = '#FAFBF2'

type OgImageOptions = {
  /** Large display line, e.g. the page title. */
  title: string
  /** Small supporting line under the title (optional). */
  subtitle?: string
}

/** Renders the branded OG card as a PNG ImageResponse. */
export function renderOgImage({ title, subtitle }: OgImageOptions): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: COSMIC,
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row: orbital C mark + wordmark. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '96px',
              height: '96px',
              borderRadius: '9999px',
              border: `2px solid ${VIOLET}66`,
              color: FOREGROUND,
              fontSize: '56px',
              fontFamily: 'serif',
            }}
          >
            C
          </div>
          <div
            style={{
              color: FOREGROUND,
              fontSize: '40px',
              fontFamily: 'serif',
              letterSpacing: '-0.02em',
            }}
          >
            curio
          </div>
        </div>

        {/* Title block, bottom-anchored to match the mockup rhythm. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              color: FOREGROUND,
              fontSize: '68px',
              fontFamily: 'serif',
              lineHeight: 1.1,
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                color: `${FOREGROUND}B3`,
                fontSize: '30px',
                maxWidth: '900px',
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
