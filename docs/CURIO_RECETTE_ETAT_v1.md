# CURIO — État du projet pour la recette (UAT)
**Version 4.0 — Août 2026 (post lot "recette Home")**

> Document complémentaire, pas une resynthèse. La source de vérité reste `CURIO_SPEC_PIVOT_v4_8.md` (produit), `CURIO_DATA_MODEL_v1_2_6.md` (DB) et `CURIO_DECISIONS_LOG_v5_3.md` (décisions + points ouverts §11, décisions détaillées §12-§18). Cette version est basée sur `git log`/`git branch` réels, pas sur la mémoire de conversation.
>
> Suivi par git depuis le 15 août (perdu une fois à un `git clean` quand il était untracked).

---

## 1. Ce qui est mergé sur `main` et déployé en prod

- Phases 1 à 4 : fondations, pages publiques, app connectée, Universe & Plans.
- Phase 5, les 6 chantiers : `theme-persistence`, `design-token-audit`, `dark-mode-audit`, `core-web-vitals`, `chrome-extension`, `rgpd-audit`.
- `fix/cve-2025-66478` : Next.js 15.1.6 → 15.1.11 (RCE critique CVSS 10.0, patchée avant toute exposition publique — Vercel avait bloqué le déploiement vulnérable de lui-même).
- `chore/extension-prod-domain` : vrai domaine câblé dans `extension/config.js`/`manifest.json`.
- `feat/link-subcategories` : catégorisation Topic + sous-catégorie.
- Chantier "Cohérence globale UI/UX" (4 branches, repéré en recette) :
  - `fix/ui-shell-header` : header double (cloche + "Good morning") fusionné en un seul header shell-owned, slot gauche contextuel (greeting sur Home, titre plat sur My Space).
  - `fix/ui-container-density` : primitive `<PageContainer>` (largeur/padding unique), gouttière desktop 48px→64px, rythme vertical resserré (gap-2xl→gap-xl), empty-states réconciliés.
  - `fix/ui-collection-shell` : `/collections/[id]` (page publique ISR) rend maintenant le shell complet pour un visiteur connecté, via wrapper client conditionné à la session — corps anonyme/SEO strictement inchangé.
  - `fix/ui-component-usage` : nouveau primitive `ButtonLink` (CTA navigants), 7 boutons primaires dupliqués migrés dessus.
- Lot "recette Home" (5 branches, repéré en testant Home) :
  - `fix/home-nav-destinations` : "Personnaliser" ouvre `/home/personalize` (placeholder) au lieu de "Mon Univers" ; menu utilisateur — nom → profil public, "Paramètres" → `/settings`.
  - `fix/connected-shell-explore-curators` : `/explore` et `/curators` rendaient le shell anonyme (marketing) à un utilisateur connecté, donnant l'illusion d'une déconnexion — corrigé avec le même pattern shell-session-gated que la page Collection.
  - `fix/home-feed-exclude-self` : les collections publiques du viewer n'apparaissent plus dans son propre "For You"/"Trending".
  - `fix/home-card-density` + `fix/collection-card-below-density` : cartes de collection resserrées (variante overlay 4/5, variante below 16/9 + panneau resserré — 5 pages concernées : landing, My Space, profil public, Explorer, Project).
  - `feat/collection-cover-fallback` : collections sans cover affichent désormais un lavis couleur + icône du Topic (au lieu d'un bloc vide) ; mosaïque auto-générée différée à un chantier séparé.
- Déployé sur Vercel : **https://curio-neon.vercel.app** (Site URL Supabase pointé dessus, Redirect URLs couvrant aussi `localhost:3000`/`3100` pour le dev).

## 2. Tout est mergé — recette possible sur l'ensemble construit à ce jour, sur une base visuelle cohérente

## 3. Écarts visuels connus — ne pas resignaler comme bugs

- Badges Topic variante `soft` : contraste possiblement faible en Cosmic sur les teintes sombres (style, books, photography). Décision design en attente (§3.1 de l'audit dark mode), pas un bug de code.
- ~~Bouton primaire réécrit à la main~~ — **corrigé** (chantier UI/UX, branche `fix/ui-component-usage`, nouveau primitive `ButtonLink`).

## 4. Manques fonctionnels connus — ne pas resignaler comme bugs

(Détail complet : `CURIO_DECISIONS_LOG_v5_3.md` §11)

- Like / Comment / Mention : jamais construits, onglets Notifications "Coming soon" — voulu.
- Tracking des clics sortants (`links.clicks_count`) : non implémenté, dashboard analytics affiche "—".
- Contenu éditorial (3-5 pièces V1) : pas encore rédigé.
- Billing / Curator Pro payant : "Coming soon" dans `/settings`, différé en V2.
- Extension Chrome : pas soumise au Chrome Web Store (volontairement différé, action manuelle CEO/PO plus tard). Un save via l'extension ne pose pas de Topic/sous-catégorie (catégorisable après coup sur `/saved`) — hors périmètre du chantier `link-subcategories`.
- Sous-catégories Links : seuls Travel et Food en sont équipés en V1 (Hébergement/Restaurant/Lieu à voir/Activité/Transport/Autre pour Travel ; Restaurant/Recette/Bar-Café/Produit/Autre pour Food). Les 8 autres Topics n'en ont pas — voulu, pas un oubli.
- Mosaïque auto-générée pour les collections sans cover mais avec des liens : différée à un chantier séparé. En attendant, une collection avec des liens mais sans cover personnalisée affiche le fallback Topic (couleur + icône), pas une mosaïque — voulu pour l'instant.

## 5. Parcours à prioriser pour la recette

1. Onboarding Découvreur
2. Save Flow (web + extension une fois `chore/extension-prod-domain` mergée)
3. **Nouveau** : catégorisation Topic/sous-catégorie au save (Travel/Food), suggestion héritée quand un autre utilisateur a déjà catégorisé le même lien, filtre par Topic/sous-catégorie sur `/saved`
4. Collection Flow / Project Flow
5. Universe / My Space
6. Onboarding Founding Curator
7. Settings, Analytics, Notifications
8. Dark mode sur les 8 pages connectées (audité, mais un audit n'est pas un test utilisateur)

## 6. Comptes / environnement

- URL de test : https://curio-neon.vercel.app (prod réelle, même base Supabase EU que le dev local — pas d'environnement séparé)
- Extension : chargement `chrome://extensions` → Load unpacked → dossier `extension/` du repo local
- Partage avec designer/coéquipier : leur donner le lien Vercel + zipper `extension/` pour eux (voir plus haut, pas publiée au Web Store)
