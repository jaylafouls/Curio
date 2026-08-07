# CURIO — Phase 5 : Audit du mode sombre (`.dark` / Cosmic)
**Branche `phase5/dark-mode-audit` — Août 2026**

> Audit de l'application du mode Cosmic (`.dark`) sur les **8 pages connectées** : `/home`, `/my-space`, `/saved`, `/projects`, `/collections/[id]`, `/settings`, `/analytics`, `/notifications`.
> Objectif : repérer les couleurs **figées** (qui ne basculent pas avec `.dark`) posées sur des surfaces qui, elles, basculent — donc illisibles en Cosmic. Corrections mécaniques appliquées ; les points relevant d'une décision design (palette badge, littéraux SVG de marque) sont documentés, pas improvisés. Hérite du repérage **§2.2** différé lors de l'audit design-token (littéraux SVG non mode-aware).

---

## 0. Verdict global

**Le socle Cosmic est sain et la discipline des composants est élevée.** `.dark` est appliqué sur la frontière `data-app-shell` (`components/app/app-shell.tsx`), pas sur `<html>` — le mode Cosmic est donc scopé aux pages authentifiées, la lecture de la préférence est server-side (pas de FOUC). Les variables `--background` / `--foreground` / `--button-*` basculent Archive ⇄ Cosmic dans `app/globals.css` ; l'immense majorité du contenu des pages connectées lit ces variables via `text-foreground` / `bg-background` / `bg-foreground/[0.0x]`, donc bascule correctement.

**La distinction structurante** : deux familles de couleurs coexistent, et c'est voulu —

- **Mode-aware** : `text-foreground` → `rgb(var(--foreground))`, bascule `#111` (Archive) ⇄ `#FAFBF2` (Cosmic). C'est la règle pour tout contenu de page.
- **Figée** : `text-text-dark` → `rgb(17 17 17)` constant, et `bg-archive` / `text-archive` → `#FAFBF2` constant. Légitime **uniquement** sur les surfaces qui ne basculent jamais : cartes toujours-claires en overlay modal (`bg-archive` + `text-text-dark`, cf. `modal.tsx`, `save-flow-modal.tsx`, `collection-modal.tsx`) et texte posé sur une image/scrim ou sur un aplat de marque saturé.

Trois classes de correction ont été appliquées et vérifiées en conditions réelles (§1) : (a) un bug d'initiales d'avatar figées, (b) la bordure/divider universelle qui ne basculait pas, (c) les ombres noires invisibles en Cosmic — plus la levée du §2.2 hérité (littéraux SVG de marque). Les points restants sont soit corrects par construction (§2), soit une décision design à trancher visuellement, pas à improviser (§3).

---

## 1. Findings corrigés

### 1.1 [CORRIGÉ] Initiales d'avatar en `text-text-dark` figé — invisibles en Cosmic

**Constat** : `components/ui/avatar.tsx:66`, le disque d'initiales (fallback sans photo) posait `bg-violet-soft/40` (lavande clair `#CFC3FF` à 40 %) **+ `text-text-dark`** (`#111` figé). En Archive : lavande clair + initiales sombres → correct. En **Cosmic** : `bg-violet-soft/40` composite sur le fond cosmic `#0D0E15` → un violet sombre boueux, et `#111` par-dessus → **initiales quasi invisibles (sombre-sur-sombre)**. L'avatar-fallback apparaît sur plusieurs pages connectées (sidebar sur les 8, cartes collection, `CuratorCard`, notifications), donc l'impact est réel et transverse.

**Correction appliquée** : `text-text-dark` → `text-foreground`. Les initiales deviennent mode-aware : `#111` en Archive, `#FAFBF2` en Cosmic — lisibles dans les deux modes sur la tuile lavande. Le fond `bg-violet-soft/40` est inchangé (l'aplat de marque reste identique dans les deux modes, c'est le texte par-dessus qui devait basculer).

**Fichier** : `components/ui/avatar.tsx`.

**Fichier** : `components/ui/avatar.tsx`.

### 1.2 [CORRIGÉ] Bordure / divider `border-border-light` figée — liseré gris clair trop lumineux en Cosmic

**Constat** : `border-border-light` (`#DADAD6`, §1.4 des tokens) était la bordure/divider universelle — shell, sidebar, top-bar, cards, inputs, tabs, dividers, présente sur les 8 pages. C'est un neutre **clair figé** : posé tel quel sur le fond Cosmic `#0D0E15`, il donne un liseré gris clair trop lumineux. Le design system ne définissait **aucun** token de bordure Cosmic (§8 ne couvrait que 4 propriétés basculables : fond, texte, bouton, glow) — un vrai manque, remonté puis tranché par l'owner.

**Correction appliquée (décision owner, cf. tokens §8.1)** : la bordure devient **mode-aware** via une CSS-var `--border` (+ `--border-opacity`) dans `app/globals.css`, exposée en utilitaire Tailwind `border-border` / `divide-border` / `bg-border`. Archive conserve `#DADAD6` ; **Cosmic = hairline blanc translucide `rgba(255,255,255,0.12)`**. Toutes les surfaces connectées (les 8 pages sous `.dark`) passent de `border-border-light` → `border-border`. Les **feuilles toujours-Archive** (modales/sheets `bg-archive` : `modal.tsx`, `save-flow-provider.tsx`) réépinglent `--border`/`--foreground` aux valeurs Archive sur leur panneau (`[--border:218_218_214] [--border-opacity:1] [--foreground:17_17_17]`), pour que leurs primitives partagées (`Input`, `Button`, dividers) restent cohérentes même rendues sous `.dark`. L'écran `onboarding` (hors des 8 pages) est laissé intact.

**Fichiers** : `app/globals.css`, `tailwind.config.ts`, + swap `border-border-light`→`border-border` sur l'ensemble du socle connecté + primitives partagées.

### 1.3 [CORRIGÉ] Ombres `shadow-sm`/`shadow-md` invisibles en Cosmic → halo violet (§5)

**Constat** : les ombres `shadow-sm`/`shadow-md` sont calibrées `rgba(17,17,17,…)` (noir sur clair) et **disparaissent** sur `#0D0E15`. §5 des tokens prévoit explicitement le halo violet en mode dark (« halo bouton CTA violet en mode dark, halo orbital »).

**Correction appliquée (cf. tokens §8.2)** : les surfaces connectées qui portaient une ombre (repos ou hover) reçoivent `shadow.glow.violet` **en Cosmic uniquement** (`dark:shadow-glow-violet` / `dark:hover:shadow-glow-violet` / `dark:group-hover:shadow-glow-violet`) : plat en Archive, halo violet en Cosmic. Concerne `card.tsx` (hover), les FAB/CTA Save Flow (`save-flow-provider.tsx`), les pastilles orbitales (`universe-orbital.tsx`) et le bouton de détachement (`project-detail-client.tsx`). Les **feuilles toujours-Archive** gardent leur `shadow-md` (ombre normale d'une feuille claire projetée sur le scrim cosmique).

**Fichiers** : `components/ui/card.tsx`, `components/app/save-flow/save-flow-provider.tsx`, `components/app/universe-orbital.tsx`, `components/app/project-detail-client.tsx`.

### 1.4 [CORRIGÉ — levée du §2.2 hérité] Littéraux violet/archive dans les SVG de marque → CSS-vars

**Constat** : `orbital-logo.tsx` codait le « C » en `fill="rgb(250 251 242)"` (archive figé) et le violet en littéral ; `brand-lockup.tsx` avait deux littéraux violet (`#785CFF`, `rgb(120 92 255 / 0.5)`). Les attributs SVG n'acceptent pas les classes Tailwind, mais peuvent référencer des CSS-vars.

**Correction appliquée** : ajout de deux constantes de marque mode-indépendantes dans `app/globals.css` — `--brand-violet: 120 92 255` et `--brand-archive: 250 251 242` (définies au `:root`, non surchargées en `.dark`, donc constantes). Les `fill`/`stroke` littéraux des deux SVG référencent désormais `rgb(var(--brand-violet) / …)` / `rgb(var(--brand-archive) / …)` — rendu identique, mais token-synchrone. Les parties déjà en `currentColor` (glyphe/wordmark de `brand-lockup`) sont conservées telles quelles.

**Fichiers** : `app/globals.css`, `components/brand/orbital-logo.tsx`, `components/public/brand-lockup.tsx`.

> **Note** `orbital-logo.tsx` ne rend que sur `onboarding`/`signup` (light-only, hors des 8 pages). Le passage en CSS-vars ne change pas son rendu ; le « C » reste clair (via `--brand-archive`, constant) sur le fond `bg-cosmic` de ces écrans. La conversion satisfait la synchro-token demandée sans altérer ces surfaces hors périmètre.

---

## 1bis. Vérification en conditions réelles (Playwright ad-hoc)

Conformément au non-négociable de la branche (« vérification visuelle réelle sur chaque page avant de la considérer finie »), et une fois l'outillage rendu disponible :

- **Compte de test minté** via l'API admin service-role (`auth.admin.createUser`, `email_confirm`), `theme_preference` forcé à `'dark'` (Cosmic), session signée puis sérialisée en cookies SSR (format `@supabase/ssr` exact) et injectée dans le contexte navigateur.
- **`playwright-core` + Chromium installés temporairement**, les 8 pages visitées authentifiées à **440px (mobile) et 1280px (desktop)** en Cosmic.
- **Résultats** (14 relevés sur les 7 pages hébergées par l'AppShell × 2 viewports) : `status=200`, `.dark` présent sur `data-app-shell`, `background` du shell = `rgb(13,14,21)` (Cosmic `#0D0E15`), `foreground` = `rgb(250,251,242)`, **bordure calculée = `rgba(255,255,255,0.12)`** (le hairline Cosmic). Captures visuelles confirmant : hairline discret (plus de liseré clair), initiales d'avatar lisibles, inputs/cards/tabs corrects, CTA violets + halo, banner de consentement (forcé Cosmic) cohérent.
- **`/collections/[id]`** : **page publique ISR** (pas d'AppShell, pas de `.dark`, sans cookie) — elle rend dans son propre mode Archive par design (visible logged-out / crawlers). Vérifiée (200, mode clair correct) ; elle ne bascule pas — et ne doit pas — en Cosmic. Le sweep Cosmic porte donc sur les **7 pages hébergées par le shell** ; `/collections/[id]` appartient architecturalement à la surface publique (comme `/profile/[username]`).
- **Nettoyage** : compte de test supprimé (cascade profil + collection), `playwright-core` désinstallé, caches navigateur et session temporaire supprimés. `package.json`/lock inchangés.
- **Checks statiques** : `npm run typecheck` / `lint` / `test` (38) / `build` verts ; CSS compilée confirme `--border: 218 218 214`/`opacity:1` (`:root`) ⇄ `255 255 255`/`0.12` (`.dark`), `.border-border` → `rgb(var(--border)/var(--border-opacity,1))`, et `shadow-glow-violet` compilé.

---

## 2. Ce qui est propre (vérifié, aucun finding)

- **Contenu des 8 pages connectées** : `settings-client`, `analytics-dashboard`, `collection-private-client`, `notifications-client`, `saved-links-client`, `project-detail-client`, `home-feed-client`, `collection-grid`, `stat-list`, `app-header` — tous en `text-foreground` / `bg-foreground/[0.0x]` / `border-border` (post-correction §1.2). Aucun `text-text-dark`, `bg-white`, `bg-archive` ni hex en dur dans le contenu de page.
- **`components/ui/card.tsx`** : variante `below` mode-aware (`text-foreground`, `bg-foreground/[0.03]`) ; variante `overlay` en `text-archive` **sur un scrim `from-cosmic/80`** posé sur l'image → texte clair légitime, identique dans les deux modes (documenté « intentionally not mode-aware »).
- **`components/ui/badge.tsx`** variante `solid` : `text-archive` sur un aplat Topic saturé (`bg-badge-*`) — l'aplat ne bascule pas, texte clair légitime dans les deux modes.
- **`components/public/brand-lockup.tsx`** (rendu sur pages connectées via `app-sidebar` et `app-header`) : le « c » sérif et le wordmark sont en `currentColor` → héritent `text-foreground`, donc **déjà mode-aware**. Les accents violets, désormais en `rgb(var(--brand-violet) / …)` (cf. §1.4), sont visibles sur les deux fonds. Ce SVG est lisible en Cosmic.
- **`text-archive` sur aplats de marque** : `universe-orbital.tsx` (hub violet), `plan-badge.tsx` (puce colorée) — texte clair sur fill saturé, correct dans les deux modes.
- **Modales / cartes toujours-claires** (`modal.tsx`, `save-flow-modal.tsx`, `collection-modal.tsx`, `project-modal.tsx`, `add-collection-to-project.tsx`) : `bg-archive` + `text-text-dark` cohérents entre eux (surface claire figée, texte sombre figé) → lisibles quel que soit le mode de la page dessous. `bg-cosmic/40` sert de backdrop d'overlay (voulu sombre).

---

## 3. Décisions design remontées (non corrigées)

### 3.1 [À trancher visuellement — faible] Contraste de la variante `soft` des badges Topic en Cosmic

**Constat** : `badge.tsx` variante `soft` = `bg-badge-X/20` + `text-badge-X` (texte pleine teinte sur tuile 20 % de la même teinte). Plusieurs Topics ont une teinte **sombre** (`style #4A4550`, `books #8B6F47`, `photography #5B7088`). En Archive, le contraste tient ; en **Cosmic**, la tuile à 20 % composite sur `#0D0E15` (très sombre) et le texte sombre-teinté peut passer **sous le seuil de contraste**. Ce n'est pas une couleur figée mal posée (les deux valeurs sont des tokens) mais un effet de composition alpha propre au mode sombre.

**Recommandation** : trancher par capture réelle en Cosmic sur les Topics sombres. Correctif possible sans casser Archive : forcer `text-foreground` (ou un texte clair) sur la variante `soft` en `.dark`, ou remonter l'alpha du fond. **Décision palette — ne pas improviser ; à valider avec le designer** (cohérent avec le traitement des hex badge « provisoires » de l'audit token §1.5).

*(Le §2.2 hérité — littéraux SVG de marque — est désormais corrigé, voir §1.4. Il ne figure plus comme point ouvert.)*

---

## 4. Suite

- §1.1–§1.4 → corrigés et vérifiés sur cette branche (avatar, bordure mode-aware, ombres halo Cosmic, littéraux SVG en CSS-vars).
- §3.1 → seul point restant : capture Cosmic + décision palette designer pour les badges Topic sombres, variante `soft`. Non bloquant.
