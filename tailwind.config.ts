import type { Config } from 'tailwindcss'

/**
 * Curio design tokens — source: docs/CURIO_DESIGN_TOKENS_v1_3.md.
 *
 * Rule (Decisions Log §10 / brief): this config is the single source of truth
 * for tokens. No default Tailwind palette on Curio surfaces, no system fonts.
 * Screens are revalidated against the mockups by direct screenshot comparison.
 *
 * Colors are exposed both as Tailwind utilities AND as CSS variables (see
 * app/globals.css). The variables drive the Cosmic (dark) / Archive (light)
 * mode switch (§8); the static hex map below is what utilities compile to.
 */
const config: Config = {
  darkMode: 'class', // Cosmic mode toggled via a `dark` class, Archive is default.
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  // Topic badge bg utilities are built from a dynamic `bg-badge-${topic}`
  // string (one per Topic), which JIT can't statically detect. Safelist the
  // ten so the palette always ships. Extend when new Topics are added.
  safelist: [
    'bg-badge-travel',
    'bg-badge-design',
    'bg-badge-food',
    'bg-badge-books',
    'bg-badge-culture',
    'bg-badge-ideas',
    'bg-badge-style',
    'bg-badge-photography',
    'bg-badge-beauty',
    'bg-badge-wellness',
  ],
  theme: {
    // Breakpoints — standard Tailwind values (Design Tokens §6). No tablet
    // mockup provided yet; keep in mind for responsive work on public pages.
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        // Mode-aware surface + text. Backed by the R G B channel vars in
        // globals.css so opacity modifiers work (e.g. text-foreground/70); the
        // value flips between Archive and Cosmic with the `.dark` class.
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        // Mode-aware border/divider (globals.css). Archive = sampled light
        // neutral #DADAD6; Cosmic = white hairline at 0.12 alpha. The
        // --border-opacity var carries the per-mode base alpha so
        // `border-border` flips automatically. Use `border-border` /
        // `divide-border` in place of the fixed `border-border-light` on any
        // surface that receives the `.dark` (Cosmic) class. §8.
        border: 'rgb(var(--border) / var(--border-opacity, 1))',
        // Brand palette — CONFIRMED (§1.1)
        cosmic: '#0D0E15', // dark background
        archive: '#FAFBF2', // light background (web default)
        violet: {
          DEFAULT: '#785CFF', // primary CTA, active links, accents
          soft: '#CFC3FF', // hover, soft accent bg, orbit
        },
        beige: '#D9C6A6',
        olive: '#6A7B7A', // canonical per §1.3 (pending designer confirm)
        'brown-light': '#E0DBB8',
        // Neutrals — sampled (§1.4)
        'text-dark': '#111111',
        'border-light': '#DADAD6',
        'button-primary-light': '#0B0E14',
        'button-text-on-dark': '#FAFBF2',
        // Topic badge palette (§1.5) — 3 measured (travel/design/food),
        // 7 provisional (CEO/PO), pending designer confirmation. Changing a
        // provisional hex later is a one-line correction, not a refactor.
        badge: {
          travel: '#D9C6A6',
          design: '#6A7B7A',
          food: '#C1694F',
          books: '#8B6F47',
          culture: '#C98A4B',
          ideas: '#D4A63A',
          style: '#4A4550',
          photography: '#5B7088',
          beauty: '#D9AFAE',
          wellness: '#93AFA8',
        },
      },
      fontFamily: {
        // Wired to next/font CSS variables (app/[locale]/layout.tsx).
        // font-serif = Instrument Serif, weight 400 ONLY + italic. Never rely
        // on font-weight for hierarchy on this token — size only (§2.1).
        serif: ['var(--font-instrument-serif)', 'ui-serif', 'serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typographic scale (§2.2) — proportional estimates from desktop
        // mockups, to be validated against Figma if it becomes available.
        display: ['3.5rem', { lineHeight: '1.05' }], // ~56px
        h1: ['2.5rem', { lineHeight: '1.1' }], // ~40px
        h2: ['1.875rem', { lineHeight: '1.15' }], // ~30px
        h3: ['1.375rem', { lineHeight: '1.2' }], // ~22px (near Instrument Serif floor)
        body: ['1rem', { lineHeight: '1.6' }], // ~16px
        'body-small': ['0.875rem', { lineHeight: '1.5' }], // ~14px
        meta: ['0.75rem', { lineHeight: '1.4' }], // ~12px
        eyebrow: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.08em' }], // ~12px uppercase
      },
      spacing: {
        // 8px grid (§3). Named tokens mirror the design system; Tailwind's
        // numeric scale stays available for ad-hoc values.
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },
      borderRadius: {
        // §4 — pill-heavy: buttons/badges use `full`, cards use lg/xl.
        sm: '8px',
        md: '12px',
        lg: '20px', // 16-20px range, upper bound retained
        xl: '24px',
        full: '9999px',
      },
      boxShadow: {
        // §5 — nearly flat aesthetic. Values estimated; validate by screenshot.
        sm: '0 1px 2px rgba(17,17,17,0.04)',
        md: '0 4px 12px rgba(17,17,17,0.06)',
        'glow-violet': '0 0 24px rgba(120,92,255,0.35)', // CTA halo in Cosmic mode
      },
      transitionDuration: {
        // §7 motion durations. Loop duration (orbital) lives in keyframes below.
        fast: '150ms',
        base: '250ms',
      },
      keyframes: {
        // Orbital: slow continuous rotation (§7). Conservative in V1.
        orbital: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        // fadeIn: fade + light slide-up (~200-300ms ease-out).
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        orbital: 'orbital 30s linear infinite', // 20-40s loop range
        'fade-in': 'fade-in 250ms ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
