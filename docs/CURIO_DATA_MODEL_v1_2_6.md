# CURIO — Modèle de Données
**Version 1.2.6 — Août 2026**

> Ce document fait foi sur la structure de la base de données Supabase/PostgreSQL de Curio.
> Il complète CURIO_SPEC_PIVOT_v4.7.md (le quoi), CURIO_ADD_ITEM_FLOW_v3.1.md (le comment), CURIO_DECISIONS_LOG_v5.3.md (le pourquoi) et désormais GTM_LAUNCH_v1.md v6 (le modèle économique).
> Statut : **Validé, mis à jour** — anticipe les mécanismes de monétisation actés en Monétisation & GTM (roadmap GTM_LAUNCH_v1 v3 §3.3), non activés en V1 mais modélisés dès maintenant pour éviter une migration lourde sur base active.
> **Aucun code SQL/migration ne doit être généré avant validation complète de l'étape 4 (Revues & Décisions).**

**Changelog** :
- **v1.0 → v1.1** : résolution des incohérences spec/maquettes Notes et Take a screenshot → ajout de `user_links.custom_image_url`.
- **v1.1 → v1.2** : anticipation de la roadmap de monétisation (GTM_LAUNCH_v1 v3 §3.3) — ajout des tables `brands` et `analytics_events`, ajout de `links.is_sponsored`/`links.brand_id`, documentation des 3 principes produit non-négociables sur le contenu sponsorisé.
- **v1.2 (correctif)** : mise à jour des références de version obsolètes en en-tête (v4.1→v4.2, Decisions Log v2→v3) et des mentions résiduelles "8 Topics Core / 4 Extended" → "10 Topics Core / 3 Extended" (§1, §3), suite au passage à 10 Topics Core (Decisions Log v3 §5bis). Aucun changement de structure de table.
- **v1.2.2 (correctif)** : mise à jour des pointeurs de version obsolètes en en-tête (Spec v4.2→v4.3, Decisions Log v3→v4) et de la note `topics.badge_color` (§3), suite aux décisions actées en Revues & Décisions (App mobile, palette badges Topic, vert olive). Aucun changement de structure de table — ce document reste valide tel quel sur le fond, seuls les renvois et notes de statut étaient obsolètes.
- **v1.2.3 (correctif)** : mise à jour des pointeurs de version obsolètes en en-tête (Spec v4.3→v4.4, Decisions Log v4→v5, Add Item Flow v2→v3). Aucun changement de fond.
- **v1.2.4 (correctif — check-up pré-étape 4)** : (1) mise à jour des pointeurs de version obsolètes en en-tête (Spec v4.4→v4.5, Decisions Log v5→v5.1) ; (2) correction d'une référence interne cassée en §6 `collections` (renvoyait à "§7" — la table `sections` — au lieu de §8 `links`/§13 `collection_follows`, source réelle des compteurs). Aucun changement de structure de table, aucune décision produit modifiée.
- **v1.2.6 (rattrapage post-dev, chantiers SEO/collections-projects)** : deux colonnes ajoutées en cours de dev sur `collections`, jamais documentées ici. `slug` (chantier SEO, Phase 1) — text unique généré depuis `name` via `unaccent()` + collision suffix numérique, remplace l'usage de `id` dans les URLs publiques (`/collections/[slug]`), voir Decisions Log §12 pour le contexte. `links_count` (chantier collections-projects, Phase 3) — compteur dénormalisé, trigger sur `user_links`, referme la note laissée ouverte en v1.2 ("non ajoutés ici"). Note ajoutée sur `links.clicks_count` (§8) : colonne existante mais non alimentée à ce jour, voir Spec §18 nouveau point.

---

## 0. Périmètre

Ce modèle couvre les 13 entités identifiées en spec §16.2, la table de jointure `user_topics` (nécessité fonctionnelle), et désormais deux entités de monétisation modélisées en anticipation (`brands`, `analytics_events`) suite à la roadmap GTM v3.

**Reste explicitement hors périmètre** :
- Toute structure liée à l'idée d'incentive equity pour les 1000 premiers curateurs (non spécifiée à ce jour, cf. §23)
- La notion de `campaign` (regroupement de plusieurs Links sponsorisés sous une même opération marque) — non demandée à ce stade, `brands`/`analytics_events` suffisent pour la phase 3 de la roadmap GTM (placement contextuel sponsorisé) sans sur-spécifier

---

## 1. Vue d'ensemble des tables

| Table | Rôle |
|---|---|
| `users` | Compte utilisateur, profil public, préférences |
| `user_topics` | Jointure User↔Topic (choix onboarding) |
| `topics` | Liste des 10 Topics Core + 3 Extended |
| `projects` | Conteneur organisationnel privé |
| `collections` | Objet social central |
| `sections` | Sous-groupe interne à une Collection |
| `links` | Objet canonique (1 URL = 1 Link) |
| `user_links` | Relation personnelle User↔Link |
| `brands` | *(nouveau v1.2)* Compte annonceur, modélisation minimale |
| `analytics_events` | *(nouveau v1.2)* Journal d'événements (impressions/clics) par utilisateur × Link |
| `follows` | Abonnement User → User |
| `collection_follows` | Abonnement User → Collection |
| `invitation_tokens` | Gestion des invitations Founding Curator |
| `plans` | Abonnement commercial |
| `notifications` | Activité sociale (follow/like/comment/mention) |
| `editorial` | Contenu produit par l'équipe Curio |
| `consent_logs` | Journal des consentements RGPD |

**Note** : pas de table `project_follows` — un Project étant toujours privé, il ne peut structurellement pas être suivi (cf. §2 Decisions Log v2, tranché explicitement).

---

## 2. Table `users`

Étend `auth.users` (Supabase Auth — Google/Apple/Email).

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `references auth.users(id) on delete cascade` | |
| `username` | `text` | `unique not null`, minuscules/chiffres/underscore, 3-20 car. | Utilisé dans `/profile/[username]` |
| `display_name` | `text` | `not null` | |
| `avatar_url` | `text` | nullable | |
| `bio` | `text` | nullable, ~160 car. | |
| `location` | `text` | nullable | |
| `website_url` | `text` | nullable | |
| `universe_name` | `text` | nullable, 1-20 car. | Nommé à l'onboarding step 3 |
| `universe_color` | `enum` | `violet, beige, vert, bleu, rose` | Palette fixe à 5 choix |
| `language` | `text` | `default 'en'`, check `in ('en','fr')` | |
| `theme_preference` | `text` | `default 'light'`, check `in ('light','dark')` | |
| `is_founding_curator` | `boolean` | `default false` | Badge permanent, immuable, indépendant du plan actif |
| `onboarding_completed` | `boolean` | `default false` | |
| `created_at` | `timestamptz` | `default now()` | |
| `updated_at` | `timestamptz` | `default now()`, trigger | |

**Décisions actées** :
- Pas d'entité `Universe` séparée — `universe_name`/`universe_color` vivent directement sur `User`.
- Pas de soft-delete : purge RGPD complète via `DELETE` cascadant réel.
- Pas de champ `email` (dupliqué depuis `auth.users`).

---

## 3. Table `topics`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `text` | PK | Slug anglais stable (`travel`, `style`...) |
| `label_en` | `text` | `not null` | |
| `label_fr` | `text` | `not null` | |
| `icon` | `text` | `not null` | |
| `display_order` | `integer` | `not null`, `unique` | |
| `is_core` | `boolean` | `default true` | `true` = 10 Core, `false` = 3 Extended |
| `is_active` | `boolean` | `default true` | Permet d'activer un Extended sans migration |
| `badge_color` | `text` | nullable | Palette tranchée provisoirement (CEO/PO) — voir Design Tokens v1.2 §1.5. 7/10 valeurs en attente de confirmation designer, non bloquant. |

---

## 4. Table `user_topics`

*Ajoutée hors liste initiale — nécessaire pour stocker les choix de l'onboarding step 1 (§6.3 Spec).*

| Champ | Type | Contraintes |
|---|---|---|
| `user_id` | `uuid` | FK → `users(id) on delete cascade` |
| `topic_id` | `text` | FK → `topics(id)` |
| `created_at` | `timestamptz` | `default now()` |
| PK composite | `(user_id, topic_id)` | |

---

## 5. Table `projects`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `owner_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` | |
| `name` | `text` | `not null` | |
| `description` | `text` | nullable | |
| `color` | `text` | nullable | |
| `created_at` | `timestamptz` | `default now()` | |
| `updated_at` | `timestamptz` | `default now()`, trigger | |

**Décisions actées** :
- Deux tables séparées `projects`/`collections`, pas de fusion.
- Pas de `is_public` (toujours privé, structurellement).
- Pas de `topic_id` (porté par la Collection, pas le Project).
- **Jamais de Links directs dans un Project** — règle confirmée explicitement, non révisée.

---

## 6. Table `collections`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `owner_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` | |
| `project_id` | `uuid` | nullable, FK → `projects(id) on delete set null` | NULL = standalone |
| `topic_id` | `text` | `not null`, FK → `topics(id)` | 1 Collection = 1 Topic principal |
| `name` | `text` | `not null` | |
| `slug` | `text` | `not null`, `unique` | *(ajouté v1.2.6, chantier SEO)* Généré depuis `name` via `unaccent()` + collision suffix numérique (`name`, `name-2`…), trigger before insert/update. Stable : éditer `name` ne change pas un slug déjà attribué. Sert de clé d'URL publique (`/collections/[slug]`) à la place de `id`. |
| `description` | `text` | nullable | |
| `note` | `text` | nullable, max 500 car. | Privé, jamais public |
| `cover_image_url` | `text` | nullable | |
| `is_public` | `boolean` | `default false` | Indépendant du statut du Project parent |
| `links_count` | `integer` | `not null`, `default 0` | *(ajouté v1.2.6, chantier collections-projects)* Dénormalisé, trigger sur `user_links` (insert/delete). Referme la note "non ajouté ici" de la version précédente de ce document. |
| `created_at` | `timestamptz` | `default now()` | |
| `updated_at` | `timestamptz` | `default now()`, trigger | |

**Décisions actées** :
- `project_id on delete set null` : supprimer un Project ne supprime jamais ses Collections.
- `followers_count` : toujours non ajouté ici, géré via `collection_follows` (voir §13) — seul `links_count` a été matérialisé en colonne à ce jour.

---

## 7. Table `sections`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `collection_id` | `uuid` | `not null`, FK → `collections(id) on delete cascade` | Jamais standalone |
| `name` | `text` | `not null` | |
| `order` | `integer` | `not null`, `default 0` | |
| `created_at` | `timestamptz` | `default now()` | |

**Décisions actées** :
- Pas de champ `color` — généré côté front (hash du nom → palette fixe).
- Pas de table pour les templates de sections suggérées (config applicative statique).
- "Unsectioned"/"Unsorted" ne sont pas des lignes réelles — gérés par `section_id`/`collection_id = NULL` sur `user_links`.

---

## 8. Table `links`

Objet canonique — cœur du modèle économique.

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `url_normalized` | `text` | `not null`, `unique` | Clé de canonicalisation |
| `url_first_origin` | `text` | `not null` | URL brute du tout premier save |
| `title` | `text` | `not null`, max 100 car. | Figé au 1er save pour tous les utilisateurs suivants |
| `description` | `text` | nullable, max 300 car. | |
| `image_url` | `text` | nullable | Stocké Supabase Storage |
| `latitude` | `numeric` | nullable | |
| `longitude` | `numeric` | nullable | |
| `address` | `text` | nullable | Champ texte unique, non décomposé |
| `saves_count` | `integer` | `not null`, `default 0` | Dénormalisé, maj par trigger |
| `clicks_count` | `integer` | `not null`, `default 0` | Dénormalisé — **colonne présente mais non alimentée à ce jour** *(repéré v1.2.6, chantier /analytics)* : aucun mécanisme de capture de clic n'est construit. Le dashboard `/analytics` affiche honnêtement "—" plutôt qu'un faux 0. Voir Spec §18 nouveau point. |
| `forks_count` | `integer` | `not null`, `default 0` | **Colonne présente mais non implémentée** — mécanisme de "fork" d'un Link isolé non défini à ce jour |
| `status` | `text` | `default 'active'`, check `in ('active','unavailable')` | |
| `last_checked_at` | `timestamptz` | nullable | Job hebdo de vérification |
| `is_sponsored` | `boolean` | `not null`, `default false` | *(nouveau v1.2)* Marque un Link comme placement contextuel sponsorisé (phase 3 roadmap GTM) |
| `brand_id` | `uuid` | nullable, FK → `brands(id) on delete set null` | *(nouveau v1.2)* Annonceur rattaché — nullable pour tout Link organique |
| `created_at` | `timestamptz` | `default now()` | |

**Décisions actées** :
- Titre/description/image canoniques **figés après le 1er save** — non modifiables ensuite, même par le premier saveur a posteriori.
- Compteurs dénormalisés (via triggers sur `user_links`), pas calculés à la volée.
- Pas de `owner_id` — un Link canonique n'appartient à personne en propre.
- Pas de `TypeTag` — entité retirée du scope (absente de la spec v4.1).
- **`is_sponsored`/`brand_id` ajoutés en anticipation de la phase 3 de la roadmap GTM (GTM_LAUNCH_v1 v3 §3.3)** — non activés en V1, mais posés dès maintenant pour éviter une migration structurelle sur une base avec utilisateurs et Links actifs. `brand_id on delete set null` : si un annonceur est retiré, le Link ne disparaît pas — il redevient un Link organique non sponsorisé plutôt que d'être supprimé (cohérent avec le principe "un Link sponsorisé se comporte comme un favori normal").
- **`is_sponsored` est le champ qui déclenche l'affichage obligatoire du badge "Sponsorisé"** côté UI — cf. principes non-négociables §19.

---

## 9. Table `user_links`

Relation personnelle — la plus dense en volume et en usage.

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `user_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` | |
| `link_id` | `uuid` | `not null`, FK → `links(id) on delete cascade` | |
| `collection_id` | `uuid` | nullable, FK → `collections(id) on delete set null` | NULL = Unsorted |
| `section_id` | `uuid` | nullable, FK → `sections(id) on delete set null` | NULL = Unsectioned |
| `title_override` | `text` | nullable, max 100 car. | Personnalisation d'affichage perso, sans jamais toucher au titre canonique |
| `custom_image_url` | `text` | nullable | Image perso uploadée (Supabase Storage), surcharge `links.image_url` canonique pour cet utilisateur uniquement — voir "Add a custom image" §12.1 Spec / §4 Decisions Log |
| `note` | `text` | nullable, max 500 car. | Privé |
| `tags` | `text[]` | nullable | Entièrement libres, pas de table séparée |
| `topic_id` | `text` | nullable, FK → `topics(id)` | *(0015, chantier link-subcategories)* Topic de ce save, personnel. Stockable seul (les 8 Topics sans sous-catégorie, ou un save Unsorted où le Topic est obligatoire). Remplace l'ancien `category`. |
| `subcategory_id` | `uuid` | nullable, FK → `link_subcategories(id)` | *(0015)* Sous-catégorie optionnelle affinant le Topic, une seule par `user_link`. Cohérence `subcategory.topic_id === topic_id` validée applicativement au save (pas de trigger). |
| `url_origin` | `text` | `not null` | URL brute avec tracking propre à ce save |
| `saved_at` | `timestamptz` | `default now()` | |
| Contrainte | `unique(user_id, link_id, collection_id, section_id)` | | Empêche le doublon exact accidentel — autorise cependant le même Link dans plusieurs Collections différentes |

**Décisions actées** :
- **Titre canonique figé, mais `title_override` permet une personnalisation d'affichage par utilisateur** sans jamais fragiliser la fiabilité du Link canonique partagé (compteurs, SEO, données vendues aux marques).
- **Un même Link peut être dupliqué dans plusieurs Collections personnelles** — pas de contrainte `unique(user_id, link_id)` stricte.
- Visibilité **non stockée** ici — toujours déduite de `collections.is_public` (ou `false` si `collection_id IS NULL`).
- Trigger `BEFORE INSERT/UPDATE` requis pour garantir que `section_id` appartient bien à `collection_id` sur la même ligne (Postgres ne peut pas le vérifier nativement via FK simple).
- **`custom_image_url` ajouté suite à la décision actée en Parcours & UX (résolution §21)** : "Take a screenshot" est définitivement écarté au profit de "Add a custom image" (§12.1 Spec / §4 Decisions Log). Ce champ stocke l'upload personnel qui surcharge `links.image_url` uniquement pour l'affichage côté `UserLink` de cet utilisateur — le Link canonique et son image figée au 1er save ne sont jamais modifiés.
- **Aucune modification structurelle liée aux Links sponsorisés.** Un Link sponsorisé rejoint une Collection exactement comme un Link organique — via un `INSERT` normal dans `user_links`, déclenché par une action explicite de l'utilisateur. C'est la garantie structurelle du principe "jamais d'auto-insertion silencieuse" (§19) : il n'existe et n'existera aucun mécanisme d'écriture automatique dans cette table hors du flow de save standard.
- **Catégorisation par Topic + sous-catégorie (0015, Decisions Log §18).** L'ancien `category` (`text`, jamais branché à aucune UI) est remplacé par `topic_id` + `subcategory_id`. Deux niveaux : le Topic (niveau principal, réutilise les badges), et une sous-catégorie optionnelle issue de la table de référence `link_subcategories` (voir §9bis). Aucune donnée de catégorisation ne devient canonique sur `links` — la valeur *stockée* reste strictement personnelle par `user_link`. En revanche la *suggestion* de pré-remplissage du Save Flow est héritée **cross-user** du même Link canonique (Decisions Log §18.6) : best-effort, jamais imposée, seuls `topic_id`/`subcategory_id` traversent.

---

## 9bis. Table `link_subcategories` *(0015, chantier link-subcategories)*

Vocabulaire contrôlé, léger, des sous-catégories par Topic — une table de référence (pas un `CHECK` en dur, pour rester extensible sans migration de schéma). Lisible publiquement (RLS `select using (true)`, comme `topics`), aucune écriture client.

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `topic_id` | `text` | `not null`, FK → `topics(id)` | Le Topic auquel cette sous-catégorie appartient |
| `label` | `text` | `not null` | Libellé affiché (FR en V1) |
| `sort_order` | `integer` | `not null`, `default 0` | Ordre d'affichage ; "Autre" porte la valeur la plus haute (toujours en dernier) |
| Contrainte | `unique(topic_id, label)` | | Pas de doublon (Topic, libellé) ; permet le seed idempotent. Ce n'est PAS un `CHECK` sur les valeurs — le vocabulaire reste ouvert. |

**Seed V1 (§18.2)** : Travel (Hébergement / Restaurant / Lieu à voir / Activité / Transport / **Autre**) + Food (Restaurant / Recette / Bar-Café / Produit / **Autre**). Les 8 autres Topics n'ont aucune ligne en V1 — en équiper un plus tard = insérer des lignes, jamais une migration de schéma. **"Autre" systématique** : la valve d'échappement qui permet de rendre la sous-catégorie obligatoire sans jamais bloquer un save.

---

## 10. Table `brands`

*Nouvelle table v1.2 — anticipe la phase 4 de la roadmap GTM (comptes marque/pro payants) et sert de rattachement aux Links sponsorisés dès la phase 3.*

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `name` | `text` | `not null` | Nom de la marque/annonceur |
| `contact_name` | `text` | nullable | |
| `contact_email` | `text` | nullable | |
| `status` | `text` | `not null`, `default 'pending'`, check `in ('pending','active','inactive')` | Cycle de vie simple : en attente de qualification / actif / désactivé |
| `created_at` | `timestamptz` | `default now()` | |
| `updated_at` | `timestamptz` | `default now()`, trigger | |

**Décisions actées** :
- **Modélisation volontairement minimale.** Aucun champ de facturation, de rôle multi-utilisateur, de secteur d'activité ou de budget — le besoin commercial réel n'est pas encore connu (le pricing Business/Brand reste un point ouvert, §18.6 Spec). L'objectif de cette table est uniquement d'éviter une migration lourde sur une base avec utilisateurs actifs le jour où le placement sponsorisé (phase 3 GTM) s'active — pas de préfigurer un CRM annonceur complet.
- **Pas de FK vers `users`.** Une Brand n'est pas un compte utilisateur au sens `auth.users` — voir cependant le point d'attention soulevé en §22 concernant `plans`, qui suppose aujourd'hui qu'un payeur est toujours un `User`.
- **Pas de notion de `campaign`** à ce stade — un Link sponsorisé pointe directement vers une Brand ; si plusieurs opérations distinctes pour une même marque doivent un jour être distinguées (reporting séparé par campagne), une table `campaigns` intermédiaire pourra être insérée entre `brands` et `links` sans casser ce schéma.

---

## 11. Table `analytics_events`

*Nouvelle table v1.2 — journal d'événements bruts, permettant un comptage par utilisateur × Link/marque, pas seulement un total agrégé.*

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `user_id` | `uuid` | nullable, FK → `users(id) on delete set null` | Voir décision ci-dessous — `set null`, pas `cascade` |
| `link_id` | `uuid` | `not null`, FK → `links(id) on delete cascade` | Le Link exposé/cliqué |
| `brand_id` | `uuid` | nullable, FK → `brands(id) on delete set null` | Dénormalisé depuis `links.brand_id` pour accélérer les requêtes d'agrégation par marque sans jointure systématique |
| `event_type` | `text` | `not null`, check `in ('impression','click')` | `impression` = exposition contextuelle vue, `click` = clic effectif |
| `created_at` | `timestamptz` | `default now()` | |

**Décisions actées** :
- **Table d'événements bruts (append-only), pas de colonnes dénormalisées par utilisateur.** Contrairement au pattern utilisé pour `links.saves_count`/`clicks_count` (compteurs globaux dénormalisés, incrémentés par trigger), un comptage **par utilisateur × par Link/marque** ne peut pas raisonnablement être dénormalisé en colonnes fixes — la cardinalité (potentiellement des millions de couples user×link) l'interdit. La table log/événement est donc la seule extension cohérente du pattern existant : les compteurs globaux restent des colonnes sur `links`, le détail par utilisateur reste un journal agrégé à la demande (`GROUP BY user_id, link_id` ou `brand_id`), avec vue matérialisée à envisager si le volume devient un problème de performance.
- **`user_id on delete set null`, pas `cascade`.** Si un utilisateur supprime son compte, on ne fait pas disparaître l'historique d'exposition — l'événement redevient anonyme (comme pour `consent_logs`) mais reste comptabilisable dans les agrégats vendus aux marques (§4.3 Spec, phase 2 de la roadmap GTM : data de tendance agrégée).
- **`link_id on delete cascade`** : si le Link canonique est supprimé, les événements associés n'ont plus de sens à conserver isolément.
- **Champ `event_type` limité à `impression`/`click`** : le `click` ici est distinct de `links.clicks_count` — ce dernier reste le compteur global dénormalisé (tous utilisateurs confondus), tandis que `analytics_events` permet de savoir *qui* a cliqué *quel* Link sponsorisé *quand*, nécessaire pour le reporting par marque (phase 3-4 GTM).
- **Pas de champ `context`/`target` polymorphe** (ex. "où" l'impression a eu lieu — Home feed, Collection, Explore) à ce stade : non demandé explicitement dans la roadmap GTM v3 actuelle. Facilement ajoutable plus tard (`context_type`/`context_id` nullable) si le reporting marque en a besoin — signalé mais non ajouté pour ne pas sur-spécifier.

---

## 12. Table `follows`

| Champ | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `follower_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` |
| `followed_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` |
| `created_at` | `timestamptz` | `default now()` |
| Contrainte | `unique(follower_id, followed_id)` |
| Contrainte | `check(follower_id <> followed_id)` |

---

## 13. Table `collection_follows`

| Champ | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` |
| `collection_id` | `uuid` | `not null`, FK → `collections(id) on delete cascade` |
| `created_at` | `timestamptz` | `default now()` |
| Contrainte | `unique(user_id, collection_id)` |

**Décision actée** : pas de `project_follows` — un Project étant toujours privé, il ne peut structurellement jamais être suivi (tranché explicitement, Decisions Log v2 §8).

---

## 14. Table `invitation_tokens`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `token` | `text` | `not null`, `unique` | |
| `created_by` | `uuid` | nullable, FK → `users(id) on delete set null` | |
| `email` | `text` | nullable | Invitation nominative ou générique |
| `status` | `text` | `not null`, `default 'pending'`, check `in ('pending','used','expired','revoked')` | |
| `used_by` | `uuid` | nullable, FK → `users(id) on delete set null` | |
| `used_at` | `timestamptz` | nullable | |
| `expires_at` | `timestamptz` | nullable | Politique d'expiration à trancher en Monétisation & GTM |
| `created_at` | `timestamptz` | `default now()` | |

**Note pour le dev** : la consommation d'un token (`status = 'used'`) doit déclencher, dans la même transaction, `users.is_founding_curator = true` sur le compte concerné — couplage applicatif, pas une contrainte DB.

**Point en attente (hors ce document)** : une idée d'incentive equity pour les 1000 premiers curateurs (répartition au prorata invitations/collections-links/vues, seuils de déclenchement 10k abonnés / 10k collections / 100k vues) a été évoquée mais n'est ni spécifiée ni discutée en Monétisation & GTM. Elle n'impacte pas ce schéma à ce jour — les données brutes nécessaires (invitations via `created_by`, volumes via `collections`/`user_links`, vues via `analytics_events` désormais modélisée) sont déjà capturées.

---

## 15. Table `plans`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `user_id` | `uuid` | `not null`, `unique`, FK → `users(id) on delete cascade` | Relation 1-1, pas d'historique en V1 |
| `plan_type` | `text` | `not null`, check `in ('free','founding_curator','first_year_curator','pro','brand')` | |
| `status` | `text` | `not null`, `default 'active'`, check `in ('active','expired','cancelled')` | |
| `started_at` | `timestamptz` | `default now()` | |
| `ends_at` | `timestamptz` | nullable | |
| `payment_reference` | `text` | nullable | Référence Stripe |
| `created_at` | `timestamptz` | `default now()` | |
| `updated_at` | `timestamptz` | `default now()`, trigger | |

**Décision actée** : `users.is_founding_curator` (badge, immuable) et `plans.plan_type` (accès commercial actif) sont volontairement distincts — le badge social peut survivre à un changement de plan.

**⚠️ Point d'attention soulevé par l'ajout de `brands` (v1.2) — voir détail §22.**

---

## 16. Table `notifications`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `recipient_id` | `uuid` | `not null`, FK → `users(id) on delete cascade` | |
| `actor_id` | `uuid` | nullable, FK → `users(id) on delete set null` | |
| `type` | `text` | `not null`, check `in ('follow','like','comment','mention')` | |
| `target_type` | `text` | nullable, check `in ('user','collection','link')` | |
| `target_id` | `uuid` | nullable | Référence polymorphe, pas de FK réelle Postgres |
| `is_read` | `boolean` | `not null`, `default false` | |
| `created_at` | `timestamptz` | `default now()` | |

**Point en attente** : le type `comment` figure dans le check constraint mais aucun système de commentaires n'est décrit ailleurs dans la spec/flow/decisions log actuels — à clarifier si/quand cette feature est spécifiée.

**⚠️ Point d'attention soulevé par l'ajout de `analytics_events` (v1.2) — voir détail §22. Aucune modification apportée ici pour l'instant.**

---

## 17. Table `editorial`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `title` | `text` | `not null` | |
| `slug` | `text` | `not null`, `unique` | |
| `type` | `text` | `not null`, check `in ('guide','essay','interview','collection')` | |
| `body` | `text` | `not null` | Texte simple (Markdown/HTML), pas de blocks structurés en V1 |
| `cover_image_url` | `text` | nullable | |
| `topic_id` | `text` | nullable, FK → `topics(id)` | |
| `language` | `text` | `not null`, check `in ('en','fr')` | |
| `author_name` | `text` | nullable | Texte libre, pas de FK vers `users` |
| `status` | `text` | `not null`, `default 'draft'`, check `in ('draft','published')` | |
| `published_at` | `timestamptz` | nullable | |
| `created_at` | `timestamptz` | `default now()` | |
| `updated_at` | `timestamptz` | `default now()`, trigger | |

---

## 18. Table `consent_logs`

| Champ | Type | Contraintes | Note |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `user_id` | `uuid` | nullable, FK → `users(id) on delete set null` | **Volontairement `set null`, pas `cascade`** |
| `consent_type` | `text` | `not null`, check `in ('necessary','analytics','marketing')` | |
| `given` | `boolean` | `not null` | Un log par changement de choix |
| `policy_version` | `text` | `not null` | |
| `created_at` | `timestamptz` | `default now()` | |

**Décision actée — critique RGPD** : `on delete set null` plutôt que `cascade`. Un log de consentement doit pouvoir prouver, même après suppression d'un compte, qu'un consentement a bien été donné à une date précise sur une version de policy donnée. Cascader la suppression romprait cette preuve au moment précis où elle devient nécessaire (demande de suppression de compte).

*Note v1.2 : ce même raisonnement `set null` a été repris pour `analytics_events.user_id` — cohérence de pattern RGPD à travers le schéma.*

---

## 19. Principes produit non-négociables — contenu sponsorisé

*Actés en Monétisation & GTM (GTM_LAUNCH_v1 v3 §3.3). Ces principes ne sont pas tous des contraintes SQL strictes — certains sont des règles de comportement applicatif/UI — mais ils sont documentés ici pour que le contexte produit ne se perde pas au moment du dev.*

1. **Badge "Sponsorisé" toujours visible.** Un Link sponsorisé n'est jamais indiscernable d'un Link organique. `links.is_sponsored = true` doit systématiquement déclencher l'affichage d'un badge dans toute l'UI où ce Link apparaît (card, détail, feed) — **contrainte de rendu front, pas une contrainte DB**, mais `is_sponsored` est le champ qui la rend possible.
2. **Jamais d'auto-insertion silencieuse.** Un Link sponsorisé ne peut jamais s'ajouter automatiquement à une Collection personnelle. **Contrainte structurelle respectée par construction** : il n'existe aucun mécanisme d'écriture dans `user_links` en dehors du flow de save standard déclenché par une action explicite de l'utilisateur (cf. décision actée §9) — un Link sponsorisé "suggéré en contexte" reste une suggestion tant qu'il n'a pas été sauvé volontairement.
3. **Ratio maximum de contenu sponsorisé par Collection.** Principe acté en amont, **seuil chiffré non tranché**. Aucune contrainte SQL (`CHECK`, trigger) n'est posée à ce stade — voir point ouvert §23.

---

## 20. Entités hors périmètre — statut à date

| Entité | Statut |
|---|---|
| `campaigns` | Non modélisée — regroupement de Links sponsorisés sous une même opération marque, non demandé à ce stade (cf. §10) |
| Incentive equity 1000 curateurs | Idée non spécifiée, non discutée formellement en Monétisation & GTM — n'impacte pas ce schéma à ce jour |

*`Brand`/`Advertiser` et `AnalyticsEvent`, listées comme hors périmètre en v1.0/v1.1, sont désormais modélisées (§10, §11) suite à la roadmap GTM v3.*

---

## 21. Incohérences spec/maquettes — résolues

Ces deux points, repérés en lecture croisée spec/maquettes, ont été tranchés en conversation Parcours & UX.

1. **Notes** — **Confirmé : pas de feature Notes standalone en V1**, conforme à la Spec §13 / Decisions Log §3. Les maquettes montrant un onglet "Notes" actif et un encart "Add a note" en sidebar sont un résidu à corriger côté design, pas un signal produit. **Aucun impact sur le modèle** : `user_links.note` et `collections.note` couvrent déjà l'usage prévu.
2. **Take a screenshot** — **Confirmé : écarté définitivement**, remplacé par "Add a custom image" (Spec §12.1 / Decisions Log §4). La maquette montrant ce bouton est également un résidu à corriger côté design. **Impact réel sur le modèle** : ajout du champ `custom_image_url` sur `user_links` (§9).

Les deux points sont clos.

---

## 22. Impact des ajouts v1.2 sur `notifications` et `plans` — signalé, non tranché

Conformément à la demande : ces deux points sont **signalés mais aucune modification de table n'a été appliquée** sans validation explicite.

**Sur `notifications`** : aucune modification structurelle nécessaire *aujourd'hui*. Mais si les marques doivent un jour recevoir des alertes sur la performance de leur placement ("votre Link sponsorisé a été vu X fois cette semaine"), ça impliquerait soit un nouveau `type` dans le check constraint (ex. `sponsored_performance`), soit un canal de notification séparé pour les comptes `brands` (qui, rappel, n'ont pas de FK vers `users` — voir point suivant, ça se recoupe). Pas de décision à prendre maintenant, juste un fil à ne pas perdre.

**Sur `plans` — point plus structurant à surveiller** : `plans.user_id` est `not null` et référence `users(id)` — le modèle actuel suppose donc que **tout payeur est un `User`**. Or `brands` (§10) n'a volontairement **aucune FK vers `users`** : une marque n'est pas un compte curateur. Si la phase 4 de la roadmap GTM (comptes marque/pro payants) doit effectivement passer par la table `plans` existante (`plan_type = 'brand'`, déjà présent dans le check constraint depuis la v1.0), il faudra trancher explicitement l'une de ces deux options avant d'implémenter cette phase :
- **(a)** chaque `Brand` obtient un compte `User` compagnon (avec `auth.users` associé) pour pouvoir porter un `Plan` — mélange alors deux notions (compte-personne et compte-entreprise) dans la même table `users` ;
- **(b)** `plans` est adapté pour accepter soit un `user_id`, soit un `brand_id` (FK optionnelle supplémentaire + contrainte "l'un ou l'autre mais pas les deux") — plus propre conceptuellement, mais modifie une table déjà validée.

**Aucun changement n'est fait ici.** Ce point est à trancher en Monétisation & GTM au moment où la phase 4 (comptes marque payants) sera concrètement spécifiée — pas avant, pour éviter de sur-anticiper une structure de facturation encore hypothétique.

---

## 23. Point ouvert — à ne pas trancher ici

**Ratio maximum de contenu sponsorisé par Collection** (principe §19.3) : le seuil chiffré n'est pas fixé à ce stade. Aucune valeur par défaut n'est proposée dans ce document — ce point attend une décision CEO/PO explicite, probablement en Monétisation & GTM, avant qu'une contrainte (`CHECK` ou trigger applicatif) puisse être envisagée sur `user_links`/`collections`.

---

## 24. Prochaines étapes

1. ~~Résolution des deux incohérences maquettes (§21)~~ — **fait**, tranchées en Parcours & UX.
2. ~~Anticipation des entités de monétisation (§10, §11, §19)~~ — **fait**, cette révision v1.2.
3. Trancher le point d'attention `plans`/`brands` (§22) — au moment de la spécification de la phase 4 GTM, pas avant.
4. Chiffrer le ratio maximum de contenu sponsorisé (§23) — en Monétisation & GTM.
5. Validation de ce document en Revues & Décisions (cohérence globale, étape 4 de la séquence projet).
6. Génération des migrations SQL Supabase — uniquement après validation de l'étape 4.
