# CURIO — Phase 5 : Audit Core Web Vitals (LCP / CLS / INP)
**Branche `phase5/core-web-vitals` — Août 2026**

> Chantier #4 de la Phase 5 (cf. `CURIO_PHASE5_ROADMAP.md` §2.4). Dépend de #3 `design-token-audit` (mergé). Périmètre spec : `next/image` là où pertinent, couverture `next/font`, correction CLS/LCP/INP, mesure avant/après.
> Non-négociables : SEO natif intact (`generateMetadata`, URLs stables), aucune régression visuelle (comparaison screenshot), vérification en conditions réelles (session authentifiée + Playwright 440px/desktop, EN/FR) avant commit.

---

## 0. Verdict global

Le socle perf est déjà **sain sur trois points structurants**, et le vrai gain se concentre sur **un seul levier** : `next/image` pour les images hébergées chez nous.

- **CLS** : maîtrisé sur les images par construction — **toutes** sont enfermées dans des conteneurs à géométrie fixe (`aspect-[3/1]`, `aspect-[4/3]`, `aspect-[3/4]`, `aspect-[3/2]`, `size-16`, `size-8/12/24`) avec `object-cover`, donc pas de reflow au chargement, même avec un `<img>` brut. Les polices sont `display: swap` avec une pile de repli système → pas de FOIT, léger FOUT possible sans shift de layout. **Mais la mesure runtime a révélé un CLS non nul (0,0365 mobile / 0,0147 desktop) d'une cause distincte** : sur la page collection publique, le bouton follow client-side (`CollectionFollowButton`) monte après hydratation et son wrapper ne réservait aucune hauteur, poussant l'`<article>` vers le bas. Corrigé par `min-h-9` sur le wrapper (`collections/[id]/page.tsx:82`) → CLS = 0 mesuré (cf. §4). L'audit initial l'avait manqué en supposant « CLS ≈ 0 par construction » ; la mesure a tranché.
- **`next/font`** : **couverture complète, aucun travail nécessaire.** Inter + Instrument Serif via `next/font/google` (`app/fonts.ts`), variables attachées à `<html>` (`app/[locale]/layout.tsx`), `body { font-family: var(--font-inter), … }` (`app/globals.css:52`), `display: swap`, zéro requête runtime. Les seuls littéraux `fontFamily: 'serif'/'sans-serif'` sont dans `lib/seo/og-image.tsx` — edge `ImageResponse` (Satori) qui **ne peut pas** lire les CSS-vars `next/font` ; littéral correct par nature.
- **LCP / INP** : le levier principal est l'optimisation d'image (poids, format AVIF/WebP, `priority` sur l'image LCP, lazy sur le reste). C'est ce que `next/image` apporte.

**Le point structurant du chantier — deux classes de sources d'image, tranché par le code existant :**

| Source | Origine | `next/image` ? |
|--------|---------|----------------|
| `avatar_url` | Supabase Storage `/avatars/` (validé `lib/settings/actions.ts:73`) | ✅ oui — hôte allow-listé |
| `cover_image_url` (collections) | Supabase Storage `/collection-covers/` (validé `cleanCoverUrl`, `lib/collections/actions.ts:68`) | ✅ oui |
| `cover_image_url` (editorial) | Supabase Storage | ✅ oui |
| `link.image` / `og.image` (vignettes de lien) | **Hôtes OG arbitraires** (n'importe quel domaine, cf. `analytics-dashboard.tsx:17`) | ❌ **non** — `next/image` rejette au runtime tout hôte hors `remotePatterns` ; on ne peut pas allow-lister l'internet entier |

**Décision (non improvisée, dictée par le code) :** migrer vers `next/image` **uniquement** les images hébergées Supabase (avatars, covers collection, covers editorial). **Garder `<img>` brut** pour les vignettes de lien issues d'hôtes OG arbitraires — c'est un choix délibéré déjà documenté dans `analytics-dashboard.tsx:17-19`, pas une dette. Une bascule aveugle casserait 100 % des vignettes externes.

---

## 1. Inventaire des `<img>` bruts (11 sites)

| # | Fichier:ligne | Source | Surface | Action |
|---|---------------|--------|---------|--------|
| 1 | `components/ui/avatar.tsx:71` | Supabase `/avatars/` | Partout (sidebar, cartes, notifs) | → `next/image` |
| 2 | `components/ui/card.tsx:65` | Supabase `/collection-covers/` | Carte collection (overlay) | → `next/image` |
| 3 | `components/ui/card.tsx:108` | Supabase `/collection-covers/` | Carte collection (below) | → `next/image` |
| 4 | `app/[locale]/editorial/page.tsx:70` | Supabase editorial cover | Page éditoriale publique | → `next/image` |
| 5 | `components/app/collection-detail-body.tsx:103` | Supabase cover | **Page ISR collection publique (LCP)** | → `next/image` + `priority` |
| 6 | `components/app/collection-detail-body.tsx:37` | **OG arbitraire** (`link.image`) | Vignettes de lien | garder `<img>` |
| 7 | `components/app/saved-link-row.tsx:37` | **OG arbitraire** | Vignettes /saved | garder `<img>` |
| 8 | `components/app/analytics-dashboard.tsx:92` | **OG arbitraire** | Vignettes top-links | garder `<img>` |
| 9 | `components/app/collection-modal.tsx:274` | à vérifier (aperçu upload ou OG) | Modale collection | à trancher §3 |
| 10 | `components/app/save-flow/save-flow-modal.tsx:405` | à vérifier (aperçu OG du lien en cours de save) | Modale save | à trancher §3 |
| 11 | `components/ui/avatar.tsx` (cf. #1) | — | — | — |

**5 sites Supabase → `next/image`** ; **3 sites OG arbitraires → gardés** ; **2 sites (modales) à qualifier** avant de trancher (§3).

---

## 2. Ce qui est déjà propre (aucun travail)

- **`next/font`** : couverture totale (cf. §0). Verif only.
- **CLS structurel** : conteneurs `aspect-*` / `size-*` sur toutes les images. `next/image` avec `fill` + conteneur `aspect` préserve exactement ce comportement (aucun changement de layout attendu).
- **SEO** : `generateMetadata` par page + `metadataBase` racine ; `next/image` n'affecte pas les métadonnées. URLs inchangées.
- **`next.config.ts`** : `remotePatterns` déjà scopé au bucket Supabase public — prêt pour les avatars et covers, rien à ajouter pour ce périmètre.

---

## 3. Modales — tranché (qualifié depuis le code)

- **`collection-modal.tsx:274`** : aperçu de cover Supabase, mais **preview client `size-16` (64px), non-LCP, non-SEO** — le commentaire existant l'acte (« Preview only — a plain img is fine »). Gain `next/image` négligeable, `fill` en modale ajoute de la complexité. **Décision : garder `<img>`.**
- **`save-flow-modal.tsx:405`** : `previewImage` = l'image OG du lien en cours de résolution → **hôte arbitraire → `next/image` rejetterait au runtime**. **Décision : garder `<img>`.**

Aucun code à changer sur les modales. Le seul travail de migration est **T1** (les 5 sites cover/avatar Supabase).

---

## 4. Mesure avant/après — résultats réels

**Protocole exécuté** : compte de test minté via admin API + collection publique avec cover JPEG réel (18 655 B) uploadé dans `collection-covers`, mesure en `next build && next start` (port 3210), Playwright 440px + desktop, EN + FR. Passe avant/après en une session par `git stash` (avant = `<img>` brut) / pop (après = `next/image`). URLs image chauffées avant le « après » (optimisation on-demand froide). Fixtures cascade-delete + tooling désinstallé en fin de passe (0 orphelin vérifié en base).

**Levier image (T1) — gain confirmé en conditions réelles :**

| Viewport | Avant (`<img>` brut) | Après (`next/image`) | Δ |
|----------|----------------------|----------------------|---|
| mobile-440 | 18 655 B `image/jpeg` | **2 784 B `image/webp`** | **−85 %** |
| desktop | 18 655 B `image/jpeg` | **5 360 B `image/webp`** | **−71 %** |

Le `<img>` brut servait les mêmes 18,6 Ko à mobile et desktop ; `next/image` produit du WebP + resize par viewport (candidat mobile plus petit que desktop). LCP local en baisse (232→128–152 ms mobile), mais le ms local est bruité — le levier réel est le poids/format transféré ci-dessus.

**CLS — corrigé (T1-bis) :**

| | Avant | Après T1 (image seule) | Après T1-bis (`min-h-9`) |
|-|-------|------------------------|--------------------------|
| mobile-440 | 0,0365 | 0,0365 (inchangé) | **0** |
| desktop | 0,0147 | 0,0147 (inchangé) | **0** |

`next/image` seul n'a **pas** touché le CLS — le shift ne venait pas de l'image (le conteneur `aspect-[3/1]` réservait déjà sa boîte) mais du bouton follow client montant après hydratation. La réservation `min-h-9` (36px = hauteur `Button size="small"`) sur son wrapper (`collections/[id]/page.tsx:82`) l'a ramené à 0, prouvé par re-mesure.

**INP** : inchangé — aucun JS ajouté (T1 remplace des balises, T1-bis ajoute une classe CSS).

**SEO** : `generateMetadata` et URLs stables inchangés — aucun impact.

**Re-mesure de corroboration (2026-08-08)** : après reprise post-interruption, passe indépendante re-jouée (port 3100, cover photo réelle 57 923 B distincte de la passe initiale) → même conclusion, magnitudes cohérentes avec un original plus lourd : mobile-440 57 923 B jpeg → **13 392 B webp (−77 %)**, desktop 57 923 B jpeg → **28 796 B webp (−50 %)**. Le levier (WebP + resize par viewport vs original unique servi partout) est reconfirmé. Fixture cascade-delete, 0 orphelin re-vérifié. Le §4 initial reste la mesure de référence.

---

## 5. Découpage en tâches

- **T1** ✅ — Migré les 5 sites cover/avatar Supabase vers `next/image` (`avatar.tsx`, `card.tsx` ×2, `editorial/page.tsx`, `collection-detail-body.tsx` cover). `fill` + conteneur `aspect`/`size` existant, `sizes` correct, `priority` sur le cover LCP de la page ISR, lazy ailleurs. Gain mesuré −85 %/−71 % (§4).
- **T1-bis** ✅ — Corrigé le CLS révélé par la mesure : `min-h-9` sur le wrapper du bouton follow (`collections/[id]/page.tsx:82`) pour réserver sa hauteur avant montage client. CLS 0,0365/0,0147 → 0 (§4).
- **T2** ✅ — Modales : tranché (§3) → garder `<img>` sur les deux. Aucun code, décision documentée.
- **T3** ✅ — Couverture `next/font` vérifiée (§0) : complète, zéro modif.
- **T4** ✅ — Mesure avant/après exécutée en conditions réelles (§4). Résultats consignés.
- **T5** ✅ — Vérification runtime réelle : Playwright 440px/desktop EN/FR sur la page cover ISR ; poids/format/CLS relevés, pas de régression fonctionnelle. Tooling éphémère supprimé, `playwright-core` désinstallé, fixtures Supabase cascade-delete (0 orphelin).
- **T6** — Commit sur la branche (feu vert utilisateur ; PR manuelle).
