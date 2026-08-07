# CURIO — Phase 5 Roadmap : Polish & Extension
**Version 1.0 — Août 2026**

> Découpage verrouillé de la Phase 5 (« Polish & Extension », cf. `CURIO_SPEC_PIVOT_v4_8.md` §Phase 5).
> Ce document fait foi pour l'ordre des chantiers, leurs dépendances et leur périmètre.
> Le « pourquoi » derrière les décisions structurantes vit dans `CURIO_DECISIONS_LOG_v5_3.md` (§16 theme toggle, §17 transport+auth extension).

---

## 0. Périmètre Phase 5 (rappel spec v4.8)

- [ ] Extension Chrome refaite (3 actions V1 : resolve / save / collections)
- [ ] Design Tokens appliqués (comparaison screenshots systématique)
- [ ] Core Web Vitals (`next/image`, `next/font`, CLS)
- [ ] RGPD complet (purge delete account, audit conformité) — Axeptio reste pluggable, pas rebranché ce chantier (cf. Decisions Log §13)
- [ ] Theme toggle réel Light/Dark connecté + audit dark mode (levée du différé Decisions Log §16)

---

## 1. Ambiguïtés tranchées (ouverture Phase 5)

| # | Point | Décision |
|---|-------|----------|
| 1 | Transport extension | Option (a) : routes `/api/extension/{resolve,save,collections}` enveloppant `lib/links` et `lib/collections`. Voir Decisions Log §17. |
| 2 | Auth extension | Token dédié (flux de connexion depuis une session web authentifiée), **pas** de partage de cookie cross-origin. Voir Decisions Log §17. |
| 3 | Vérification visuelle | Playwright ad-hoc comme d'habitude, pas de nouveau harnais. Maquettes de référence dans `docs/mockups/`. |
| 4 | Distribution V1 | Build store-ready (icônes, manifest, lien Privacy Policy). Soumission au Chrome Web Store manuelle (CEO/PO, plus tard) — **hors périmètre** du chantier. |

---

## 2. Découpage en 6 branches (verrouillé)

Ordre de travail et dépendances. Une branche part de `main` à jour (HEAD `631bc81`, `chantier/universe-orbital` mergé) sauf dépendance explicite.

### 1. `phase5/theme-persistence`
- **Dépend de** : rien.
- **Périmètre** : boucle SSR read → apply → write de `users.theme_preference` + vrai toggle fonctionnel dans `/settings` (lève le « Coming soon » acté en Decisions Log §16). Persistance serveur (la colonne existe déjà, Data Model §2), application au render SSR (pas de flash), écriture au changement.
- **Non-négociables** : pas de flash de thème (CLS/FOUC), pas de cookie non essentiel, i18n EN/FR du libellé toggle.

### 2. `phase5/dark-mode-audit`
- **Dépend de** : #1 (le toggle doit exister pour exercer le mode sombre).
- **Périmètre** : audit `.dark` sur les 8 pages connectées listées en Decisions Log §16 — `/home`, `/my-space`, `/saved`, `/projects`, `/collections/[id]`, `/settings`, `/analytics`, `/notifications`. Vérifier bordures, cards, badges, images, contrastes en sombre ; corriger les classes `dark:` manquantes. Comparaison screenshots vs maquettes.
- **Non-négociables** : fidélité maquette prioritaire, vérification visuelle réelle (Playwright ad-hoc) sur chaque page avant de la considérer finie.

### 3. `phase5/design-token-audit`
- **Dépend de** : rien — **indépendant, en parallèle de #1-2**. **Démarré en premier.**
- **Périmètre** : audit de l'application des Design Tokens (`docs/CURIO_DESIGN_TOKENS_v1_3.md`) sur le code — couleurs, typographie (Instrument Serif / police corps), espacements, radius, badges Topic. Repérer les valeurs en dur qui devraient référencer un token, les écarts vs `tailwind.config.ts` / `app/globals.css`, les divergences vs maquettes.
- **Livrable** : rapport d'écarts + corrections là où c'est mécanique et sûr ; points nécessitant une décision design remontés, pas improvisés.

### 4. `phase5/core-web-vitals`
- **Dépend de** : #3 (touche les mêmes fichiers — tokens/rendu — on séquence pour éviter les conflits).
- **Périmètre** : `next/image` partout où pertinent, `next/font` (déjà `app/fonts.ts` — vérifier couverture), correction CLS, LCP, INP. Mesure avant/après.
- **Non-négociables** : SEO natif intact (`generateMetadata`, URLs stables), pas de régression visuelle.

### 5. `phase5/chrome-extension`
- **Dépend de** : décision transport/auth (actée, cf. §1 + Decisions Log §17) — démarrable dès maintenant en parallèle. **Le plus gros chantier.**
- **Périmètre** :
  - Routes `/api/extension/{resolve,save,collections}` (enveloppes minces au-dessus de `lib/links` / `lib/collections`).
  - Flux d'émission/échange de token dédié depuis une session web authentifiée.
  - Extension consommant ces routes (token en en-tête), 3 actions V1.
  - Build store-ready : icônes, manifest, lien Privacy Policy.
- **Hors périmètre** : soumission Chrome Web Store (manuelle, CEO/PO, plus tard).
- **Non-négociables** : opt-in strict analytics (aucun event PostHog sans consentement), aucun cookie non essentiel posé par l'extension, région Supabase EU inchangée.

### 6. `phase5/rgpd-audit`
- **Dépend de** : dernier — après les autres (audit de conformité sur l'ensemble livré).
- **Périmètre** : purge « delete account » (suppression réelle des données utilisateur, cascade), audit conformité RGPD complet (cookies posés, events analytics, région EU, consentement, `consent_logs`). Code minimal — surtout vérification + correctifs ciblés.
- **Non-négociables** : région Supabase EU Frankfurt, opt-in strict, aucune dépendance posant un cookie non essentiel par défaut.

---

## 3. Graphe de dépendances

```
#3 design-token-audit ──▶ #4 core-web-vitals
                                              ┐
#1 theme-persistence ──▶ #2 dark-mode-audit   ├──▶ #6 rgpd-audit
                                              │
#5 chrome-extension ──────────────────────────┘
```

- **Démarrables immédiatement** : #1, #3, #5 (aucune dépendance entre eux).
- **En cours (ce chantier)** : **#3 `phase5/design-token-audit`**.
- #6 `rgpd-audit` clôt la phase une fois #1→#5 livrés.
