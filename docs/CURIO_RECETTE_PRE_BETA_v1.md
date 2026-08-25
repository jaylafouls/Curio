# CURIO — Recette pré-bêta (QA / PM / Lead Design)

**Version 1.0 — 21 août 2026 — branche `feat/universe-nudge-and-stats`**

> Recette complète menée écran par écran, parcours par parcours, sur le code réel du repo (19 routes, shell connecté, save flow, onboarding), comparée aux 9 maquettes de `docs/mockups/`. Objectif : version montrable à de vrais utilisateurs en première bêta.
>
> **Méthode.** Lecture du code de chaque route + composant partagé ; comparaison visuelle à la maquette de référence correspondante ; vérification des états (vide / plein / erreur) ; parcours de bout en bout. Baseline technique vérifiée : `tsc --noEmit` **passe** (exit 0), i18n EN/FR à **parité stricte** (663/663 clés), aucun `console.log` résiduel, aucune route en 404 dans la nav.
>
> Ce document **complète** — il ne remplace pas — `CURIO_REVUE_PRODUIT_STRATEGIQUE_v1.md` (regard produit/stratégie) et `CURIO_RECETTE_ETAT_v1.md` (état des lots). Là où la revue stratégique pose des paris produit, ce document pose des **défauts d'implémentation constatés** et priorisés pour la bêta.

---

## Synthèse

Le produit est **techniquement sain et cohérent** : il compile, se build, les états vides sont partout designés (aucun faux seeding), le save flow et l'onboarding sont complets et fidèles aux maquettes, la discipline shell/session est propre. Aucun **P0 bloquant** n'a été trouvé — rien n'empêche l'usage normal ni ne casse la confiance de façon critique.

Les problèmes réels sont concentrés sur **trois familles** :
1. **Des affordances sociales manquantes alors que tout le back-end existe** — surtout le bouton **Follow absent de la page profil** et le bouton **Modifier le profil absent de My Space**, alors que le composant `ProfileIdentity` a été explicitement conçu avec un slot `actions` pour les deux (commentaire dans le code : *« callers pass null for now »*).
2. **Des données factices figées dans des composants réels** — `followers={0}` codé en dur sur toutes les `CuratorCard`, `topic="ideas"` codé en dur pour tous les curateurs.
3. **Des résidus de vocabulaire et de hiérarchie** — l'onglet « Boîte de réception » qui contredit « Non classé » sur la même page ; deux sections d'Explore qui affichent la même liste.

Le décompte : **0 P0 · 4 P1 · 7 P2 · 6 P3.**

---

## P0 — Critique

*Empêche l'utilisation normale ou provoque une perte de confiance.*

**Aucun P0 constaté.** L'application compile, se build, se navigue de bout en bout sans impasse bloquante, sans page cassée, sans action destructrice non confirmée. Les gardes de session (`redirect` si session expirée), les `notFound()` sur username inconnu, et les confirmations de suppression sont en place.

---

## P1 — Important

*L'application fonctionne mais l'expérience est fortement dégradée.*

### P1-1 — Pas de bouton « Suivre » sur la page profil publique

- **Problème.** `/profile/[username]` affiche l'identité, les stats (followers/following) et les collections publiques, mais **aucun moyen de suivre le curateur**. La maquette « Curator profile » (écran 08 de `Curio_toutes_les_pages_web`) montre un bouton **Follow** à côté du nom. Le composant `ProfileIdentity` a un slot `actions` prévu pour ça, non alimenté (`app/[locale]/profile/[username]/page.tsx`).
- **Pourquoi c'est un problème.** Le point d'entrée social le plus évident (le profil) n'autorise pas l'action sociale la plus évidente (suivre). On ne peut suivre un curateur que depuis l'onboarding ou depuis une de ses collections — jamais depuis sa page. C'est le pilier « Discovery/Connection » amputé de son geste central.
- **Solution proposée.** Alimenter le slot `actions` de `ProfileIdentity` sur la page profil avec un bouton Follow/Following client-side, calqué sur `CollectionFollowButton` (même pattern session-gated pour préserver le cache ISR). Les Server Actions `followCurator`/`unfollowCurator` **existent déjà** (`lib/onboarding/actions.ts`, avec garde self-follow + notification). Il faut ajouter une petite query d'état initial `getCuratorFollowState` (calquée sur `getCollectionFollowState`).
- **Impact utilisateur.** Débloque la boucle sociale de base. Effort faible (back-end déjà là), visibilité maximale.

### P1-2 — Pas de bouton « Modifier le profil » sur My Space

- **Problème.** La maquette `Curio_My_universe` montre un bouton **« Edit profile »** proéminent dans l'en-tête de My Space. Le code (`app/[locale]/my-space/page.tsx`) ne passe **rien** au slot `actions` de `ProfileIdentity`. L'utilisateur voit son identité mais n'a aucun point d'entrée pour l'éditer depuis sa propre page.
- **Pourquoi c'est un problème.** L'édition de profil existe bel et bien (section Profil réelle dans `/settings` : nom, bio, avatar, localisation, site). Mais elle est enterrée dans les réglages ; rien ne relie « voici mon profil » à « éditer mon profil ». Écart de fidélité maquette **et** impasse d'action.
- **Solution proposée.** Alimenter le slot `actions` sur My Space avec un `ButtonLink` « Modifier le profil » → `/settings` (ancre `#profile` optionnelle). Aucune nouvelle logique.
- **Impact utilisateur.** Rend l'édition de profil découvrable au bon endroit, aligne l'écran sur la maquette.

### P1-3 — Le curateur n'est pas cliquable depuis une collection publique

- **Problème.** Sur `/collections/[slug]` (surface la plus publique, indexée SEO), le nom et l'avatar du propriétaire sont affichés en texte brut — **pas de lien vers son profil** (`components/app/collection-detail-body.tsx` : `collection.owner` rendu sans `<Link>`). La maquette de collection montre l'auteur comme entité cliquable (« By Clara Martin »).
- **Pourquoi c'est un problème.** Un visiteur qui découvre une belle collection ne peut pas atteindre le curateur derrière — donc ne peut ni le suivre, ni voir ses autres collections. La chaîne de découverte « collection → curateur → ses autres collections » est rompue à sa première maille, précisément sur la page conçue pour l'acquisition.
- **Solution proposée.** Envelopper l'avatar + nom du propriétaire dans un `<Link href={/profile/${owner.username}}>`. Le body est server-rendered et reste cookie-free (un simple lien ne casse pas le cache ISR). `collection.owner` doit exposer le `username` (à vérifier/ajouter dans `CollectionDetail`).
- **Impact utilisateur.** Referme la boucle de découverte sociale sur la page d'acquisition la plus fréquentée.

### P1-4 — Nombre de followers factice (« 0 followers ») sur toutes les cartes curateur

- **Problème.** `CuratorCard` affiche « {n} followers ». Les deux seuls appelants — `/explore` (`explore-client.tsx`) et `/curators` (`curators-grid.tsx`) — passent **`followers={0}` en dur**. Chaque carte curateur affiche donc « 0 followers », toujours, quelle que soit la réalité. La maquette met en avant des compteurs réels (« 12.5k followers ») comme signal de confiance.
- **Pourquoi c'est un problème.** Afficher « 0 followers » sur un curateur qui en a est une **donnée fausse visible** — pire qu'une absence de donnée. Ça sape le signal de crédibilité que la carte est censée porter, et contredit la règle projet « fidélité = priorité absolue ».
- **Solution proposée.** Deux options : (a) faire remonter le vrai compteur de followers dans `getPublicCurators` (ajouter un count sur `follows`) et le passer à la carte ; (b) si on ne veut pas la requête maintenant, **retirer la ligne followers** de la carte plutôt qu'afficher un faux 0. Recommandé : (a), car le compteur est un signal de confiance central de la maquette et la donnée est trivialement calculable. (Prod vide aujourd'hui, mais le bug est structurel.)
- **Impact utilisateur.** Restaure la fidélité des données. Aujourd'hui invisible (0 curateur en prod), mais garanti faux dès le 1er curateur recruté.

---

## P2 — Amélioration

*L'application fonctionne correctement mais peut être améliorée.*

### P2-1 — Vocabulaire incohérent : « Boîte de réception » vs « Non classé » sur la même page

- **Problème.** Sur `/saved`, l'onglet par défaut est libellé **« Boîte de réception » / « Inbox »** (`Saved.tabInbox`), alors que **sur la même page** le badge des lignes et l'état vide disent **« Non classé » / « Unsorted »** (`unsortedBadge`, `emptyUnsortedTitle`). Le lexique produit officiel (spec §2) impose « Unsorted / Non trié » et ne connaît pas la métaphore courrier.
- **Pourquoi c'est un problème.** Deux mots pour un seul concept, à quelques pixels d'écart, sur le même écran. L'utilisateur se demande si « Boîte de réception » et « Non classé » sont deux choses différentes. Incohérence UI + entorse au lexique.
- **Solution proposée.** Renommer `tabInbox` en « Non classé » / « Unsorted » (EN + FR), aligné sur le reste. Aucune logique de scope à toucher (la valeur interne `inbox` reste).
- **Impact utilisateur.** Un seul vocabulaire, lecture immédiate, conformité au lexique.

### P2-2 — Explore : deux sections affichent la même liste de collections

- **Problème.** Dans `explore-client.tsx`, « New & noteworthy » (`filtered.slice(0,6)`) et « Explore by collections » (`filtered`) puisent dans **la même source `filtered`**. Les deux sections montrent donc les mêmes collections, la première étant un sous-ensemble de la seconde.
- **Pourquoi c'est un problème.** Redondance : « deux fonctionnalités qui font la même chose ». À l'échelle, l'utilisateur voit les mêmes cartes deux fois, ce qui gaspille la hiérarchie de la page et brouille la promesse de chaque section.
- **Solution proposée.** Différencier les sources : « New & noteworthy » = collections récentes (tri `created_at`), « Explore by collections » = tri par popularité/topic — ou, tant qu'il n'y a pas de signal distinct, fusionner en une seule section. Recommandé pour la bêta : fusionner (une section « Collections » claire) et rétablir la distinction quand un vrai signal « nouveau » existe.
- **Impact utilisateur.** Page plus lisible, chaque bloc porte une intention distincte.

### P2-3 — Topic curateur factice (`topic="ideas"`) sur toutes les cartes

- **Problème.** `CuratorCard` reçoit `topic` (couleur + badge de rôle). Les deux appelants passent **`topic="ideas"` en dur** (explore + curators). Tous les curateurs portent donc le badge « ideas ».
- **Pourquoi c'est un problème.** Même famille que P1-4 : donnée figée non représentative. Le badge de topic devient décoratif et trompeur si un curateur est en réalité « Travel » ou « Food ».
- **Solution proposée.** Tant qu'aucun topic primaire n'est attaché au profil curateur (noté dans le code comme déféré), **neutraliser** le badge (variante neutre, ou masquer la couleur topic) plutôt que forcer « ideas ». Rebrancher quand `users.primary_topic` existera.
- **Impact utilisateur.** Évite un signal de catégorie faux. Faible aujourd'hui (prod vide), structurel.

### P2-4 — Landing : CTA « Voir toutes les collections » stylé à la main au lieu du primitive

- **Problème.** Sur la landing (`app/[locale]/page.tsx`), le lien « universesCta » vers `/explore` et le lien « ctaExplore » du hero sont des `<Link>` restylés en dur (classes de bouton dupliquées), alors que le projet a des primitives `ButtonLink`/`Button` (`buttonClasses()`) précisément pour éviter la dérive.
- **Pourquoi c'est un problème.** Composants incohérents : ces CTA divergeront des vrais boutons au prochain ajustement de token. C'est exactement la dette que le chantier `fix/ui-component-usage` avait entrepris de résorber.
- **Solution proposée.** Migrer ces liens vers `ButtonLink variant="secondary"` (ou le variant approprié) pour partager `buttonClasses()`.
- **Impact utilisateur.** Cohérence visuelle des CTA, maintenance simplifiée. (Non bloquant, purement qualité.)

### P2-5 — Explore : le CTA d'état vide envoie vers `/signup` même pour un utilisateur connecté

- **Problème.** Les états vides d'Explore (`newEmptyTitle`, etc.) montrent un bouton « emptyCta » → `/signup`. Or `/explore` est aussi rendu **pour l'utilisateur connecté** (shell connecté session-gated). Un utilisateur déjà loggé voit donc un CTA « S'inscrire ».
- **Pourquoi c'est un problème.** Action inadaptée au contexte : proposer de s'inscrire à quelqu'un qui est déjà inscrit est un faux pas UX et une petite perte de confiance.
- **Solution proposée.** Rendre le CTA de l'état vide conditionnel à la session (comme le reste du shell) : « Créer une collection » / « Sauvegarder un lien » pour un connecté, « S'inscrire » pour l'anonyme. Alternative minimale : pointer vers une action neutre (`/saved` ou ouvrir le Save Flow).
- **Impact utilisateur.** CTA pertinent selon l'état de connexion.

### P2-6 — Recherche globale absente du header connecté (maquette §7.4)

- **Problème.** Toutes les maquettes connectées (Home, My Space) montrent une **barre de recherche** proéminente dans le header (« Search for anything… ⌘K »). Le header connecté réel ne l'a pas — `AppGreeting` documente explicitement l'omission (« routes to /search, which does not exist yet »).
- **Pourquoi c'est un problème.** Élément manquant très visible vs maquette, et surtout : la recherche plein-texte **existe déjà en base et est déjà branchée** sur `/saved` (`searchSavedLinks`, migration 0017). Le moteur est payé ; seul le point d'entrée global manque. À 6 liens invisible, à 3000 liens décisif.
- **Solution proposée.** *Périmètre bêta minimal :* ajouter dans le header un champ (ou un bouton ⌘K) qui route vers `/saved` avec le focus sur sa recherche existante — pas besoin d'une route `/search` neuve pour la bêta. *Cible pleine (post-bêta) :* vraie page `/search` cross-collections. Classé P2 (et non P1) car un chemin de recherche existe déjà sur `/saved` ; ce n'est pas une absence totale, c'est une absence dans le header.
- **Impact utilisateur.** Rapproche de la maquette et donne un accès direct à un moteur déjà construit.

### P2-7 — Notifications : onglets « Comments / Likes / Mentions » en « Bientôt » sans feature ni date

- **Problème.** `/notifications` affiche 5 onglets ; 3 (Comments/Likes/Mentions) sont grisés « Bientôt ». Aucune de ces features n'existe ni n'est scopée dans la roadmap.
- **Pourquoi c'est un problème.** Trois onglets morts « Bientôt » sans date sont une promesse non datée. Ça alourdit la barre d'onglets et laisse penser à des fonctions imminentes qui ne le sont pas.
- **Solution proposée.** Pour la bêta, **réduire à « Tout » + « Follows »** (les deux réellement alimentés) et retirer les 3 onglets coquilles. Les réintroduire quand Like/Comment/Mention seront scopés. (Alternative plus légère : les garder mais ce document recommande le retrait — c'est plus honnête pour une première bêta.)
- **Impact utilisateur.** Barre d'onglets honnête, sans promesse vide. *(À arbitrer avec le PO : décision produit, pas seulement technique — je l'implémente en retrait si validé, sinon je laisse en l'état.)*

---

## P3 — Idées *(proposées, non implémentées)*

### P3-1 — Follow direct depuis les cartes curateur (Explore/Curators)
Aujourd'hui la carte curateur mène à « Voir le profil ». Un bouton Follow directement sur la carte (une fois P1-1 en place, le composant client existera) raccourcirait la boucle sociale sur les pages de découverte.

### P3-2 — Remplacer `window.confirm` de suppression de projet par une Modal on-brand
`project-detail-client.tsx` utilise `window.confirm(t('deleteConfirm'))`. Fonctionnel mais hors charte (dialogue natif du navigateur). Une `<Modal>` de confirmation alignerait l'action destructive sur le design system.

### P3-3 — Recherche dans le sélecteur de collection du Save Flow *(déjà partiellement là)*
Le Save Flow filtre déjà les collections par nom (`filtered` sur `query`). À valider à l'échelle : au-delà de ~30 collections, ajouter un tri « récemment utilisées » en tête pour éviter le scroll.

### P3-4 — Divulgation progressive de la Section au save
La Section est proposée dès qu'une collection en a. La masquer tant qu'une collection est petite (<~10 liens) réduirait la charge cognitive du save (cf. revue stratégique §12).

### P3-5 — Raison publique distincte de la Note privée
Le pilier « Connection — understand why » n'a pas de traduction produit (Note privée par design). Un champ court, optionnel, **public** différencierait visuellement une collection Curio d'un board Pinterest (cf. revue stratégique §13-2). Décision produit — hors périmètre recette.

### P3-6 — Resurfacing / import
« The internet worth *keeping* » implique qu'on y revienne : digest « il y a un an », et import de bookmarks/CSV pour les Founding Curators. Gros chantiers produit, listés ici pour mémoire (cf. revue stratégique §11).

---

## Ce qui a été vérifié et qui va bien (ne pas re-signaler)

- **Onboarding** : 8 écrans fidèles, empty-state curateurs géré (CTA « Skip » quand vide → **pas d'impasse**), reprise de funnel, tracking consenti.
- **Save Flow** : 4 étapes complètes, dédup canonique + signal « X people saved », favicon, tags suggérés, catégorisation héritée, confirmation avec CTA de sortie. Aucune impasse.
- **États vides** : partout designés, **aucun faux seeding** (Explore, Curators, Home, My Space, Saved, collection, projet, editorial).
- **Session & sécurité** : gardes `redirect`/`notFound`, shell session-gated propre (ISR cookie-free préservé), suppression de compte avec ordre correct, pages privées `noindex`.
- **`/home/personalize`** : déjà un « coming soon » connecté honnête (l'ancien bug « saute vers My Space » est corrigé) — la revue stratégique le mentionnait comme résidu, c'est **résolu**.
- **i18n** : parité EN/FR stricte (663/663).
- **Baseline technique** : `tsc --noEmit` exit 0.

---

## Plan de correction (P0→P2, en slices/commits séparés)

| Slice | Commits | Contenu |
|-------|---------|---------|
| **A — Affordances profil** | 1 | P1-1 (Follow sur profil + `getCuratorFollowState`) · P1-2 (Modifier le profil sur My Space) |
| **B — Découverte sociale** | 1 | P1-3 (curateur cliquable depuis collection) |
| **C — Fidélité données curateur** | 1 | P1-4 (vrais followers) · P2-3 (topic curateur neutre) |
| **D — Vocabulaire & hiérarchie** | 1 | P2-1 (Non classé) · P2-2 (fusion sections Explore) |
| **E — CTA contextuels & cohérence** | 1 | P2-4 (ButtonLink landing) · P2-5 (CTA Explore selon session) |
| **F — Recherche header** | 1 | P2-6 (entrée recherche → /saved) |
| **G — Notifications honnêtes** | 1 | P2-7 (retrait onglets « Bientôt ») — *sous réserve validation PO* |

P3 : **proposés uniquement**, non implémentés.
</content>
</invoke>
