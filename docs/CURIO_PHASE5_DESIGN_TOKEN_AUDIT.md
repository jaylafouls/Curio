# CURIO — Phase 5 : Audit d'application des Design Tokens
**Branche `phase5/design-token-audit` — Août 2026**

> Audit de l'application des Design Tokens (`docs/CURIO_DESIGN_TOKENS_v1_3.md`) sur le code.
> Objectif : repérer les valeurs en dur qui devraient référencer un token, les écarts vs `tailwind.config.ts` / `app/globals.css`, et les divergences vs le design system. Corrections mécaniques appliquées ; points nécessitant une décision design remontés, pas improvisés.

---

## 0. Verdict global

**Le socle de tokens est fidèle.** `tailwind.config.ts` et `app/globals.css` traduisent le design system v1.3 sans écart : palette de marque, 10 badges Topic, échelle typographique, spacing 8px, radius, ombres, motion et modes Cosmic/Archive sont tous présents et alignés sur les valeurs documentées. `next/font` (Inter + Instrument Serif, poids 400) est câblé correctement (`app/fonts.ts`).

L'usage dans les composants est majoritairement discipliné : `font-sans`/`font-serif` partout (aucune police système, aucun `font-[…]` arbitraire), tailles via les tokens `text-h1`/`text-body`/`text-meta`, spacing via `px-md`/`gap-xs`, couleurs via `text-foreground`/`bg-violet`/`bg-badge-*`. **Aucune classe Tailwind à valeur hex arbitraire (`bg-[#…]`) dans tout le code.**

Les findings sont peu nombreux et de faible sévérité. Un seul justifiait une correction mécanique immédiate (§2.1) ; les autres sont documentés ci-dessous, dont deux qui touchent à de la cohérence composant plutôt qu'à un écart de token.

---

## 1. Inventaire des valeurs hex en dur

| Emplacement | Valeur | Verdict |
|---|---|---|
| `tailwind.config.ts` | palette complète | ✅ Source de vérité — attendu. |
| `app/globals.css` | `--background`/`--foreground`/`--button-*` | ✅ Miroir CSS-var des tokens — attendu. |
| `lib/seo/og-image.tsx` | `#0D0E15`, `#785CFF`, `#FAFBF2` | ✅ Justifié : `ImageResponse` (edge) ne voit pas Tailwind ; constantes ncommées, sur-token, commentées comme telles. |
| `components/brand/orbital-logo.tsx`, `components/public/brand-lockup.tsx` | `#785CFF`, `rgb(120 92 255 / …)`, `rgb(250 251 242 / …)` | ⚠️ Faible — SVG inline, `fill`/`stroke` n'acceptent pas les classes Tailwind. Valeurs correctes (violet + archive) mais réécrites en littéral. Voir §2.2. |
| `app/[locale]/signup/signup-client.tsx` | `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` | ✅ Justifié : couleurs officielles du logo Google (bouton OAuth), hors design system Curio par nature. |
| `app/[locale]/onboarding/onboarding-wizard.tsx` + `lib/projects/colors.ts` | 5 hexes identiques × 2 | ❌ **Duplication** — corrigé, voir §2.1. |

---

## 2. Findings

### 2.1 [CORRIGÉ] Duplication de la map hex des 5 swatches Universe/Project

**Constat** : `app/[locale]/onboarding/onboarding-wizard.tsx` (`COLOR_HEX`) et `lib/projects/colors.ts` (`PROJECT_COLOR_HEX`) définissaient **la même map de 5 hexes en dur** (`violet/beige/vert/bleu/rose`). `universe_color` et `projects.color` sont le même enum à 5 valeurs (Data Model §2) ; le commentaire de `colors.ts` reconnaissait déjà la duplication (« the same values the onboarding universe picker uses »). Risque réel : si l'olive `#6A7B7A` est reconfirmé par le designer en `#838B71` (point ouvert Design Tokens §1.3), les deux maps divergeraient silencieusement.

**Correction appliquée** : `onboarding-wizard.tsx` importe désormais `PROJECT_COLOR_HEX` de `lib/projects/colors.ts` et l'assigne à `COLOR_HEX` (`Record<UniverseColor, string> = PROJECT_COLOR_HEX`, structurellement compatible car enum identique). `lib/projects/colors.ts` devient la source unique, commentée en conséquence, avec un rappel de synchroniser cette map hex si un token change (elle reste en hex brut car `projects.color` est persisté en texte, pas en classe Tailwind).

**Fichiers** : `app/[locale]/onboarding/onboarding-wizard.tsx`, `lib/projects/colors.ts`.

### 2.2 [Non corrigé — faible] Violet/archive en littéral dans les SVG de marque

**Constat** : `orbital-logo.tsx` et `brand-lockup.tsx` codent le violet (`#785CFF`) et l'archive (`rgb(250 251 242 / …)`) en `fill`/`stroke` littéraux. Les attributs SVG n'acceptent pas les classes Tailwind, donc c'est techniquement contraint — mais ces valeurs pourraient référencer les CSS-vars (`fill="rgb(var(--foreground))"`, ou `currentColor` + `text-violet`) pour rester mode-aware et token-synchrones.

**Recommandation** : basculer les `fill`/`stroke` du logo vers `currentColor` ou les CSS-vars quand le dark mode sera audité (`phase5/dark-mode-audit`, branche #2) — c'est là que la question « ce SVG reste-t-il lisible en Cosmic ? » se pose réellement. Ne pas le faire ici en isolation : le gain sans l'audit dark mode est cosmétique. **Reporté à la branche #2.**

### 2.3 [Non corrigé — faible] Bouton primaire réécrit à la main au lieu du composant `Button`

**Constat** : `about/page.tsx:132`, `public-header.tsx:86` et `:147` réécrivent les classes du bouton primaire (`bg-[var(--button-primary)] text-[var(--button-text)] rounded-full px-… font-sans …`) en dur, alors que `components/ui/button.tsx` variant `primary` produit exactement ce style. Pas un écart de token (les classes utilisent bien les tokens), mais une duplication de composant qui peut diverger.

**Recommandation** : remplacer ces trois occurrences par `<Button variant="primary" size="…">` (avec `asChild`/wrapping `<Link>` selon le cas). Hors périmètre strict « tokens » ; à traiter dans un passage de cohérence composants ou opportunément lors de la branche #4 (`core-web-vitals`) qui touche déjà ces pages. **Noté, non bloquant.**

### 2.4 [Non corrigé — cosmétique] Deux syntaxes pour la même taille de badge count

**Constat** : le compteur de notification s'écrit `text-[10px]` dans `notification-bell.tsx` et `text-[0.625rem]` (= 10px) dans `universe-orbital.tsx`. Même valeur, deux syntaxes ; sous le plancher du token `text-meta` (12px), donc l'arbitraire est justifié (aucun token à 10px). Pas de token à créer pour un cas unique de bulle de comptage.

**Recommandation** : harmoniser sur une seule syntaxe (`text-[0.625rem]`) si on veut la cohérence ; trivial, non prioritaire. **Noté.**

---

## 3. Ce qui est propre (vérifié, aucun finding)

- **Typographie** : `font-serif`/`font-sans` + échelle `text-*` utilisés partout ; aucune police système, aucun `font-weight` forcé sur Instrument Serif (respecte la contrainte graisse-unique §2.1).
- **Spacing** : tokens `px-md`/`gap-xs`/`py-sm`… ; les rares `-[…rem]`/`-[…vh]` restants sont de la géométrie sans équivalent token (diamètre orbital, `max-h-[90vh]` de modal, taille de bulle badge) — légitimes.
- **Radius** : `rounded-full`/`rounded-sm`/`rounded-md` conformes au pattern pill-heavy §4.
- **Couleurs de surface/texte** : `bg-background`/`text-foreground` + modificateurs d'alpha, mode-aware via CSS-vars — aucun hex de surface en dur dans les composants.
- **Badges Topic** : `bg-badge-*` (safelistés dans la config) — pas d'assignation hex en dur côté rendu.

---

## 4. Suite

- Correction §2.1 appliquée sur cette branche.
- §2.2 → reporté à `phase5/dark-mode-audit` (#2), où la question mode-aware est pertinente.
- §2.3 → à traiter en passage cohérence composants (opportunément avec #4 `core-web-vitals`, mêmes pages).
- §2.4 → cosmétique, non prioritaire.
