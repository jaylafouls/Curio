# CURIO — Phase 5 : Audit de conformité RGPD (`phase5/rgpd-audit`)
**Branche `phase5/rgpd-audit` — Août 2026 — clôt la Phase 5**

> Audit de conformité RGPD sur l'ensemble livré aux Phases 1→5 : **cookies posés**, **events analytics** (opt-in strict), **purge « delete account »** (suppression réelle + cascade), **région EU Frankfurt**, **consentement** et journal `consent_logs`.
> Cadrage : **code minimal — vérification + correctifs ciblés uniquement si un écart réel est trouvé**. Un écart réel a été trouvé (§3, delete-account) et corrigé ; tout le reste est **CONFORME** par construction et documenté preuve par preuve. Aucun code n'a été écrit pour justifier le chantier.

---

## 0. Verdict global

**Le socle RGPD est sain.** Un seul écart réel a été trouvé, sur un chemin critique (le flow `deleteAccount()` échouait en prod pour tout compte porteur de données applicatives) ; il est **corrigé et re-vérifié en conditions réelles** contre le projet EU. Les cinq autres axes sont conformes par construction :

| Axe | Verdict | Preuve |
|---|---|---|
| **Cookies** — aucun cookie non essentiel par défaut | **CONFORME** | Seuls les `sb-*` (session Supabase, essentiels) sont posés. La décision de consentement vit en `localStorage`, pas en cookie. Zéro tracker tiers. §1 |
| **Analytics opt-in strict** — aucun event/cookie avant consentement | **CONFORME** | Gate structurel dans le wrapper `lib/analytics/index.ts` ; `posthog-js` importé dynamiquement seulement au 1er grant ; `opt_out_capturing_by_default: true`. §2 |
| **Delete account** — purge réelle + cascade | **CORRIGÉ** | Écart réel : GoTrue hard-delete 500 sur tout compte avec liens sauvegardés → rien n'était supprimé. Fix B appliqué + re-vérifié (0 résidu, `extension_tokens` compris). §3 |
| **Région EU Frankfurt** | **CONFORME** | Projet joignable uniquement via le pooler `eu-central-1` ; PostHog pinné `eu.i.posthog.com` ; migrate script hard-pin `eu-central-1`. §4 |
| **Consentement + `consent_logs`** | **CONFORME** | CMP first-party opt-in strict (3 catégories) ; `consent_logs` écrit server-side via service-role, une ligne par catégorie ; `user_id` SET NULL à la suppression (preuve de consentement survit anonymisée). §5 |
| **Résidus documentés** (non bloquants) | **DOCUMENTÉ** | `marketing` déclaré-mais-non-consommé ; placeholders prod de l'extension ; lien Privacy Policy. §6 |

---

## 1. Cookies — [CONFORME] aucun cookie non essentiel posé par défaut

**Constat.** L'audit statique des dépendances et du code confirme qu'**aucun cookie non essentiel n'est posé par défaut** :

- **Seuls cookies posés : `sb-*`** (session d'authentification Supabase), strictement essentiels. Ils sont rafraîchis par le middleware SSR (`lib/supabase/middleware.ts:67-80`, `getAll`/`setAll`) — c'est le pattern SSR Supabase standard, cookie de session légitimement essentiel (exempté de consentement RGPD).
- **La décision de consentement n'est PAS un cookie.** Elle est persistée en `localStorage` (`lib/consent/store.ts:22` `STORAGE_KEY = 'curio.consent.v1'`, écrit ligne 76). Le commentaire du store le dit explicitement (ligne 19) : « the store itself sets no tracking cookie ». `localStorage` n'est pas transmis au serveur et ne relève pas du régime cookie tiers.
- **Zéro tracker tiers.** La seule dépendance analytics est `posthog-js` (aucun `gtag`/GA/`fbq`/Hotjar/Segment/Mixpanel ni en `package.json` ni dans le code). Et `posthog-js` lui-même ne pose rien avant opt-in (§2).

**Verdict : CONFORME.** Le non-négociable « aucune dépendance ne pose de cookie non essentiel par défaut » est respecté.

---

## 2. Analytics — [CONFORME] opt-in strict, gate structurel

**Constat.** La collecte analytics est bloquée **structurellement** — pas par convention au call-site — dans le wrapper `lib/analytics/index.ts`, seul point d'entrée que l'app utilise pour émettre un event :

- **Rien ne charge avant consentement.** `ensurePostHog()` (ligne 40) n'importe `posthog-js` dynamiquement (`import('posthog-js')`, ligne 47) qu'au **premier grant** `analytics`. Sans clé configurée, le module reste totalement inerte (`if (!key) return null`, ligne 43).
- **Double ceinture.** À l'init, `opt_out_capturing_by_default: true`, `autocapture: false`, `capture_pageview: false` (lignes 53-55) : même si le module était mal utilisé, PostHog ne capture ni ne pose de cookie avant `opt_in_capturing()`, qui n'est appelé que sur consentement (`syncFromConsent`, lignes 65-68).
- **Ré-évaluation à chaque emit.** `ready()` (ligne 32) re-vérifie `hasConsent('analytics')` à chaque `trackEvent`/`identifyUser` : un event tardif/en file no-ope si le consentement a été retiré entre-temps.
- **Retrait live.** Sur révocation, `opt_out_capturing()` + `reset()` (lignes 72-73) coupent la capture et effacent l'identité/`distinct_id`.

**Note sur `persistence: 'localStorage+cookie'` (ligne 56).** Cette option configure la persistance *de PostHog* pour inclure un cookie — mais **uniquement après** `opt_in_capturing()`, donc **après** consentement analytics explicite. En amont, `opt_out_capturing_by_default: true` garantit qu'aucun cookie PostHog n'est posé. Ce cookie relève alors de la catégorie `analytics` consentie : cohérent avec l'opt-in strict, pas un cookie pré-consentement.

**Preuve runtime (état actuel, honnête).** PostHog **n'est pas provisionné en dev** (`NEXT_PUBLIC_POSTHOG_KEY` absent, aucun compte PostHog — hors périmètre « code minimal » de ce chantier). Le wrapper est donc **totalement inerte** dans l'état actuel : `getPosthogKey()` renvoie `null`, `posthog-js` n'est jamais importé, **0 requête réseau PostHog**. Le gate est prouvé par analyse statique (structure ci-dessus) ; la preuve runtime sera à rejouer le jour où une vraie clé PostHog EU est câblée (activation analytics réelle, chantier ultérieur).

**Extension.** L'extension Chrome **ne pose aucun cookie et n'envoie aucune analytics** (`extension/popup.js:13`, `extension/README.md:20`). Elle stocke uniquement son bearer token dédié en `chrome.storage.local` (pas de cookie cross-origin, cf. Decisions Log §17).

**Verdict : CONFORME.** Aucun event ni cookie analytics avant consentement confirmé.

---

## 3. Delete account — [CORRIGÉ] écart réel : le flow échouait en prod

**C'est l'écart réel de ce chantier.** La re-vérification en conditions réelles (compte de test minté via service-role, données seedées sur **toutes** les tables, suppression réelle contre le projet EU) a révélé un **défaut de conformité RGPD sur le flow `deleteAccount()`** livré au chantier Settings (Phase 4).

### 3.1 Le symptôme

`deleteAccount()` (`lib/settings/actions.ts`) appelait `admin.auth.admin.deleteUser(userId)` en comptant sur la cascade FK pour purger tout le graphe. **Cet appel échoue en HTTP 500** (`"Database error deleting user"`, `error_code: unexpected_failure`) **dès que le compte porte des données applicatives**. En prod, un vrai compte à supprimer aurait renvoyé `{ ok: false, error: 'server' }` et **n'aurait rien supprimé** → non-conformité RGPD directe (droit à l'effacement non honoré).

### 3.2 La cascade DB est parfaite — le problème est dans GoTrue

Preuve établie au niveau SQL direct : `DELETE FROM auth.users` (et `DELETE FROM public.users`) **cascade proprement sur toutes les tables** — `extension_tokens` compris (la FK `on delete cascade` du chantier #5 se déclenche bien), et `consent_logs`/`analytics_events` survivent anonymisés (`user_id → NULL`). Tous les FK vers `public.users` sont corrects (CASCADE ou SET NULL), aucun RESTRICT/NO ACTION qui bloquerait.

### 3.3 Cause racine, isolée par bisection

Le 500 vient du **hard-delete interne de GoTrue** (le service auth hébergé), pas de la base. Bisection : les cas isolés (`collections` seule, `extension_tokens` seul, `notifications`, `projects`, `user_topics`, survivants SET NULL) passent tous **200 OK**. La combinaison **`collections` + `user_links`** déclenche le **500 de façon reproductible**.

Mécanisme : supprimer un `user_links` déclenche les triggers `AFTER DELETE` `bump_link_saves_count` (0004) et `bump_collection_links_count` (0010), qui font un `UPDATE public.collections SET links_count = …` / `UPDATE public.links SET saves_count = …` sur des lignes elles-mêmes **en cours de cascade-delete dans la même opération**. Postgres ordonne cette cascade de façon déterministe et la gère très bien ; le chemin interne de GoTrue s'y casse. **Autrement dit : le 500 se produit pour tout compte réel ayant sauvegardé au moins un lien dans une collection** — le cas nominal.

### 3.4 Le correctif appliqué (Fix B)

**Décision owner : Fix B.** Plutôt que dépendre du hard-delete fragile de GoTrue, `deleteAccount()` supprime désormais **d'abord la ligne `public.users`** via le client admin, ce qui fait passer **tout** le graphe applicatif par la cascade Postgres (déterministe, prouvée robuste sur le graphe complet), **puis** appelle `admin.auth.admin.deleteUser()` sur un compte auth devenu « nu » (toujours 200). Nouvel ordre :

1. Purge Storage (inchangé — non cascadé par FK).
2. **`admin.from('users').delete().eq('id', userId)`** — cascade applicative complète via Postgres + anonymisation `consent_logs`/`analytics_events`.
3. `admin.auth.admin.deleteUser(userId)` — supprime le compte auth nu (`auth.users` + `auth.identities`/sessions).
4. `signOut()` local (inchangé).

Ce choix est **structurellement robuste** : la suppression du graphe applicatif devient **indépendante** du hard-delete de GoTrue et reste correcte quelles que soient les tables/triggers ajoutés plus tard. L'ajout est minimal (une suppression admin avant le delete auth + doc-comment expliquant le pourquoi).

**Fichier** : `lib/settings/actions.ts` (`deleteAccount`).

### 3.5 Re-vérification en conditions réelles

Script `scripts/rgpd-delete-verify.mjs` — mint d'un vrai compte, seed sur **toutes** les tables (dont la combinaison `collections + user_links` qui déclenchait le 500, plus un `extension_tokens`), exécution du **chemin exact du server action** (`admin.from('users').delete()` → `admin.auth.admin.deleteUser()`, supabase-js uniquement, pas de SQL brut), assertions, auto-nettoyage. Résultat contre le projet EU (`leijjsyimganjpfhctbw`, `eu-central-1`) :

```
step 2: admin.from(users).delete()          PASS
step 3: admin.auth.admin.deleteUser() → 200 PASS
cascade child empty: users … user_topics … projects … collections …
  user_links … follows … coll_follows … notifications … plans …
  extension_tokens                          PASS (0 résidu partout)
consent_logs survives anonymised            PASS (total=1, user_id NULL)
analytics_events survives anonymised        PASS (total=1, user_id NULL)
RESULT: PASS — Fix B verified in real conditions
```

**Verdict : CORRIGÉ et vérifié.** La purge est réelle, la cascade couvre les tables ajoutées depuis la Phase 4 (`extension_tokens`), et la preuve de consentement survit anonymisée.

---

## 4. Région — [CONFORME] EU Frankfurt inchangée

**Constat.** La localisation des données est pinnée EU Frankfurt à tous les niveaux, confirmée en live :

- **Base de données.** Le projet (`ref` décodé du JWT anon — KNOWLEDGE règle #1, jamais tapé à la main) n'est joignable que via le pooler `aws-0-eu-central-1.pooler.supabase.com`. `inet_server_addr()` renvoie une IPv6 dans une plage AWS Frankfurt. Le script `scripts/db-migrate.mjs:56` hard-pin `const REGION = 'eu-central-1' // RGPD: Frankfurt only`.
- **Analytics.** `lib/analytics/config.ts:8` — `POSTHOG_HOST = 'https://eu.i.posthog.com'` (cloud EU PostHog), commenté « data must not leave the EU ».

**Verdict : CONFORME.** Aucune dérive de région ; le non-négociable EU Frankfurt tient.

---

## 5. Consentement + `consent_logs` — [CONFORME]

**Constat.**

- **CMP first-party, opt-in strict.** Bannière on-brand EN/FR (`components/consent/consent-banner.tsx`), pas le widget Axeptio hébergé (Decisions Log §13/D006 — aucun compte/client-id Axeptio, le widget serait inerte et invérifiable). Trois catégories `necessary | analytics | marketing` (`lib/consent/types.ts:10`), `necessary` toujours verrouillé ON, analytics/marketing **refusés tant qu'aucun choix explicite** (`store.ts` : défaut strict opt-in, seul `necessary` à true).
- **Journal server-side.** `consent_logs` écrit via une Server Action service-role (contourne la RLS deny-all-anonyme), **une ligne par catégorie** à chaque décision, avec `policy_version = CONSENT_POLICY_VERSION ('2026-07-29')` — constante source-de-vérité, bumpée le jour où le texte légal Privacy Policy réel atterrira.
- **Survie RGPD de la preuve.** `consent_logs.user_id` est **`on delete set null`** (`0002_tables.sql:244`) : la preuve de consentement **survit à la suppression du compte**, anonymisée — vérifié en §3.5. Idem `analytics_events.user_id` (`0002_tables.sql:148`).

**Verdict : CONFORME.** Opt-in strict respecté, journal de consentement complet et durable.

---

## 6. Résidus documentés (non bloquants)

Points relevés, **volontairement non modifiés** (décision produit ou hors périmètre dev) :

- **`marketing` déclaré-mais-non-consommé.** La bannière déclare `necessary/analytics/marketing`, mais **aucun outil marketing n'est câblé**. Conservé tel quel (décision owner) : cohérent avec l'opt-in strict — la catégorie est prête, pas encore branchée, même principe que l'Axeptio « pluggable » (Decisions Log §13). Le retirer serait un choix produit, pas une correction de conformité.
- **Placeholders prod de l'extension.** `extension/config.js` (`API_BASE`) et `extension/manifest.json` (`host_permissions`) restent sur le placeholder `https://curio.app` (inchangé depuis le chantier #5, « à compléter » au déploiement du domaine réel). Aucun impact RGPD (pas de collecte), à finaliser avec le domaine de prod.
- **Lien Privacy Policy de l'extension.** `initPrivacyLink()` (`extension/popup.js`) pointe vers `<API_BASE>/en/about`. À rediriger le jour où une route dédiée `/privacy` (texte légal) atterrira — cohérent avec le `policy_version` daté du §5.

---

## 7. Récapitulatif

| # | Axe | Verdict | Action |
|---|---|---|---|
| 1 | Cookies non essentiels | CONFORME | — (vérifié) |
| 2 | Analytics opt-in strict | CONFORME | — (vérifié, runtime inerte car PostHog non provisionné) |
| 3 | Delete account / droit à l'effacement | **CORRIGÉ** | Fix B dans `lib/settings/actions.ts` + re-vérif conditions réelles |
| 4 | Région EU Frankfurt | CONFORME | — (vérifié live) |
| 5 | Consentement + `consent_logs` | CONFORME | — (vérifié) |
| 6 | Résidus (marketing, extension) | DOCUMENTÉ | — (décision produit / hors scope) |

**Ce chantier clôt la Phase 5.** L'unique écart réel (delete-account) est corrigé et prouvé ; le reste est conforme par construction.
