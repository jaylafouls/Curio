# CURIO — Parcours UX écran par écran
**Version 1.4 — Juillet 2026**

> Détail fonctionnel : `CURIO_SPEC_PIVOT_v4_7.md` (source de vérité) + `CURIO_ADD_ITEM_FLOW_v3_1.md`.
> Rendu visuel : maquettes finales (`Curio_funnel_appli.jpeg`, etc.).
> Règle rappelée : la spec prime sur les maquettes pour le fonctionnel — les incohérences repérées sont signalées mais ne changent jamais le comportement documenté.
>
> **Changelog v1.1** : correction des mentions résiduelles "8 Topics Core" → "10 Topics Core" (écran 03, récapitulatifs), suite au passage à 10 Topics Core acté en Decisions Log v3 §5bis (ajout Beauty et Wellness). Mise à jour de la référence spec en en-tête (v4.1 → v4.2). Aucun changement de fonctionnel ou de structure d'écran — correction de synchronisation documentaire uniquement, remontée en Revues & Décisions (étape 4).
> **Changelog v1.2 (correctif)** : mise à jour des pointeurs de version obsolètes en en-tête (Spec v4.2→v4.4, Add Item Flow v2→v3). Aucun changement de fond.
> **Changelog v1.3 (check-up Étape 4 — Revue globale)** : (1) §5.1 — ré-application de la décision "cover image optionnelle à la création" (actée en conversation, perdue lors du merge vers v1.2, jamais reflétée dans le fichier uploadé) ; (2) §2, point 1 — chiffre de volume Founding Curator mis à jour (~100 → ~600 en comptant la cascade Palier 1, cf. `GTM_LAUNCH_v1_1.md` §2.3), la décision elle-même ne change pas ; (3) pointeurs de version en-tête mis à jour (Spec v4.4→v4.5, inchangé pour Add Item Flow v3) ; (4) point trouvé hors périmètre de ce document, signalé ci-dessous à l'époque — **corrigé depuis, voir Changelog v1.4**.
> **Changelog v1.4 (relecture globale finale, avant Dev & GSD)** : le point signalé en v1.3 (auto-incohérence Spec §12.2 / Add Item Flow §2.2 sur les 3 actions du panel) a été corrigé dans `CURIO_SPEC_PIVOT_v4_7.md` et `CURIO_ADD_ITEM_FLOW_v3_1.md`. Pointeurs de version mis à jour en conséquence (Spec v4.5→v4.7, Add Item Flow v3→v3.1). Aucun changement de fond dans ce document — son contenu était déjà correct, rédigé à partir des sections saines de la spec.

---

## 1. Onboarding Découvreur

Séquence à 8 écrans (spec §6.3), déroulée sur `Curio_funnel_appli.jpeg`. Correspondance 1:1 entre le nombre d'écrans spec et le nombre d'écrans maquette — pas de dérive de structure ici.

### 01 — Welcome
**Fonctionnel (spec)** : écran d'accroche, mode Cosmic (dark). Logo C orbital, tagline, deux CTA : "Build your universe" (action principale) et "Explore" (parcours découverte sans compte).
**Visuel (maquette)** : fond dark `#0D0E15`, logo C avec petits points en orbite, headline serif "The internet worth **keeping**." (mot accentué en italique violet — pattern déjà identifié au Design Token File), paragraphe descriptif, bouton violet plein "Build your universe" + bouton outline "Explore".
**Cohérence** : ✅ conforme à la spec, rien à signaler.

### 02 — Sign up / Log in
**Fonctionnel (spec)** : Auth via Apple / Google / Email (§1.6). Lien "Log in" pour les comptes existants.
**Visuel** : "Welcome to Curio." + sous-titre "Join a universe of human curiosity.", 3 boutons Continue with Apple/Google/email, lien "Log in" en bas.
**Cohérence** : ✅ conforme.

### 03 — Interests (Step 1/3)
**Fonctionnel (spec §5.1, §6.3)** : "What are you curious about?" — sélection libre parmi les **10 Topics Core officiels** : Travel, Style, Beauty, Wellness, Food, Books, Ideas, Culture, Design, Photography. CTA "Continue".
**Visuel** : la maquette affiche un mix incluant Wellness et Business à la place de deux Topics Core.
**Cohérence** : ⚠️ **Incohérence déjà documentée et déjà tranchée** — Decisions Log §5bis le dit explicitement : la spec prime sur les maquettes d'onboarding, qui restent illustratives et pas prescriptives. On code avec les 10 Topics Core officiels actuels (Travel, Style, Beauty, Wellness, Food, Books, Ideas, Culture, Design, Photography) — la liste passée de 8 à 10 (ajout de Beauty et Wellness, Decisions Log v3 §5bis) rend d'ailleurs le rapprochement avec "Wellness" sur la maquette presque correct, mais par coïncidence : ce n'est toujours pas la maquette qui fait foi, c'est la liste officielle ci-dessus.

### 04 — Curators (Step 2/3)
**Fonctionnel (spec §6.3)** : "Follow curators you love" — suggestions générées selon les Topics choisis à l'étape précédente. CTA "Continue".
**Visuel** : liste de curateurs suggérés avec avatar, nom, spécialité (ex. "Clara Martin — Travel Curator"), bouton "+" pour suivre.
**Cohérence** : ✅ conforme. Point d'implémentation à noter pour le dev (pas une incohérence, une dépendance) : la qualité de cet écran dépend entièrement du recrutement Founding Curator déjà identifié comme prérequis structurel (cf. mémoire projet — "Beta ouvre vide sans profils curateurs pré-remplis").

### 05 — Universe (Step 3/3)
**Fonctionnel (spec §6.3, §6, Data Model §2)** : "Create your first universe" — champ `universe_name` (1-20 caractères, compteur affiché) + sélection `universe_color` parmi une palette fixe à 5 choix (violet/beige/vert/bleu/rose, cf. `users.universe_color` enum). CTA "Create my universe".
**Visuel** : champ texte "My Universe" avec compteur "10/20", 5 pastilles de couleur (violet sélectionné par défaut), bouton "Create".
**Cohérence** : ✅ conforme, correspondance exacte avec le modèle de données validé (`users.universe_name`, `users.universe_color`).

### 06 — Universe ready
**Fonctionnel (spec §6.3)** : écran de confirmation — "Your space is ready!", animation du logo C orbital. CTA "Start exploring".
**Visuel** : titre "My Universe", grand logo C animé, message de confirmation, bouton "Start exploring".
**Cohérence** : ✅ conforme.

### 07 — You're all set
**Fonctionnel (spec §6.3)** : 3 rappels pédagogiques sur les piliers produit — Save / Organize / Discover (cf. les 3 piliers spec §1.5 : Discovery/Collection/Connection, reformulés ici en verbes d'action). CTA "Let's go".
**Visuel** : titre "You're all set!", 3 blocs avec icône + texte court ("Save anything — from anywhere", "Organize beautifully — in collections", "Discover through people — explore new perspectives"), bouton "Let's go".
**Cohérence** : ✅ conforme.

### 08 — Home (accueil personnalisé)
**Fonctionnel (spec §6.3, §8.2)** : Feed avec onglets "For you" / "Following" / "Trending". Header "Good morning, [Prénom] ✦".
**Visuel** : header personnalisé, barre de recherche, section "Picked for you" avec cards Collections.
**Cohérence** : ✅ conforme dans l'ensemble. Le détail complet de cet écran (empty states, sidebar droite, etc.) est déjà couvert par la spec §8.2 — pas besoin de le redocumenter ici, ce chantier se concentre sur le chemin d'onboarding jusqu'à l'arrivée sur Home, pas sur le detail de Home lui-même.

---

## Récapitulatif des incohérences relevées sur ce parcours

| Écran | Incohérence | Statut |
|---|---|---|
| 03 — Interests | Maquette montre Wellness/Business au lieu de 2 Topics Core | Déjà tranchée (Decisions Log §5bis) — coder les 10 Topics Core, pas la maquette |

Aucune nouvelle incohérence à faire remonter sur ce parcours.

---

## 2. Onboarding Founding Curator

**Fonctionnel (spec §6.2)** : *"Même flow que le Découvreur + badge Founding Curator appliqué automatiquement à la fin."* Pas d'écrans dédiés supplémentaires dans la spec ni dans les maquettes fournies — ce parcours est un cas particulier du parcours Découvreur (§1 ci-dessus), pas un flow séparé.

Deux différences fonctionnelles précises à documenter, sans impact visuel/écran :

### Point d'entrée — via token d'invitation
L'utilisateur arrive sur l'écran **01 Welcome** via un lien contenant un `invitation_tokens.token` (au lieu d'un accès direct/organique). Le token est vérifié en base (`status = 'pending'`) avant de laisser entrer dans le flow. **Aucune maquette dédiée** pour un écran d'erreur (token expiré/déjà utilisé/révoqué) — point à combler avant dev (voir "points ouverts" en fin de section).

### Écrans 01 → 08 — identiques au parcours Découvreur
Tous les écrans (Welcome, Sign up/Log in, Interests, Curators, Universe, Universe ready, You're all set, Home) sont **strictement identiques** visuellement et fonctionnellement à ceux du §1. Aucune divergence à documenter écran par écran.

### Différence invisible à l'écran — consommation du token
Au moment de la création de compte (écran 02, à la soumission), en une seule transaction (Data Model §12) :
- `invitation_tokens.status` passe de `pending` à `used`, avec `used_by` = le nouvel utilisateur et `used_at` = maintenant
- `users.is_founding_curator` passe à `true` de façon immuable

Ce badge (`is_founding_curator`) est ensuite visible dès l'écran **08 Home** (et partout ailleurs — profil, sidebar) sous forme d'un badge permanent à côté du prénom, cohérent avec le pattern visuel déjà observé sur les maquettes ("Alex ✳" sur My Space, Curators). **Pas d'écran de célébration spécifique du badge** dans les maquettes fournies (ex. pas de "Welcome, Founding Curator!" dédié) — à confirmer si voulu ou si le badge silencieux suffit.

### Cohérence
✅ Rien à signaler comme incohérence spec/maquette : la spec dit explicitement "même flow", donc l'absence d'écrans dédiés dans les maquettes n'est pas un manque, c'est cohérent avec la décision produit elle-même.

### Décisions actées (CEO/PO)
1. **Token invalide/expiré/révoqué** — pas d'écran d'erreur dédié. La personne atterrit sur l'écran 01 Welcome standard avec un message court ("This invitation link is no longer valid, but you can still join Curio") et poursuit en parcours Découvreur classique (perd le badge, garde l'accès). Raison : volume raisonnable concerné (~100 tokens Founding Curator nominatifs Palier 0, + jusqu'à ~500 tokens de cascade Palier 1 à 5/curateur, soit ~600 au total d'après GTM_LAUNCH v1.1 — reste un cas marginal rapporté au volume total d'inscriptions attendu), et le vrai risque produit est de perdre quelqu'un sur un lien cassé plutôt que de sur-expliquer l'erreur.
2. **Célébration du badge** — silencieuse, pas d'écran dédié. Le badge apparaît simplement à côté du prénom dès l'écran Home (comme n'importe quel badge ailleurs sur la plateforme : profil, sidebar, Curators). Raison : un écran dédié coûte du dev/design/traduction pour un cas à faible volume ; la reconnaissance sociale est déjà assurée par la visibilité du badge partout ailleurs.

---

---

## 3. Save Flow — Extension Chrome

**Fonctionnel (spec §12.1, Add Item Flow §2)** : panel à **3 actions** + 1 lien de navigation — Save link / Add a custom image / Create collection / View my space →. "Write a note" n'est **pas** une action séparée : c'est un champ optionnel dans l'étape Customize du flow Save link.

Maquette de référence : `Curio_Tuto_save_a_link_web.jpeg`, 9 écrans.

### 1 — You're on a website
**Fonctionnel** : navigation normale, rien de spécifique à Curio.
**Visuel** : capture d'un site e-commerce quelconque, icône extension Curio visible dans la barre du navigateur.
**Cohérence** : ✅ conforme.

### 2 — Click the Curio extension → le panel s'ouvre
**Fonctionnel (spec §12.1)** : panel à 3 actions + navigation : Save link / Add a custom image / Create collection / View my space →.
**Visuel** : le panel affiché montre **Save link / Take a screenshot / Write a note / Create collection**.
**Cohérence** : ⚠️ **Incohérence sur cet écran précis — mais déjà tranchée deux fois, rien de nouveau à décider.**
- "Take a screenshot" → résidu déjà tranché (remplacé par "Add a custom image", décision actée plus tôt dans cette conversation).
- "Write a note" comme action séparée → également un résidu : Add Item Flow §2.1 le dit explicitement noir sur blanc — *"Write a note n'est PAS une action séparée du panel — c'est le champ 'note' disponible dans le flow Save link à l'étape Customize"*. C'est la même catégorie d'erreur que les deux précédentes (maquette pas repassée après la dernière version de la spec), donc même traitement : on corrige la maquette, le panel codé doit avoir exactement 3 actions.
**Action pour le designer** : corriger ce panel spécifique à "Save link / Add a custom image / Create collection" (+ le lien "View my space →" sous forme de simple lien, pas un 4e bouton d'action).

### 3 — Curio fetches the details
**Fonctionnel (spec §12.1 étape 3)** : fetch OG automatique (titre, description, image) OU récupération depuis la base si le Link canonique existe déjà + encart social "X people saved this" si pertinent.
**Visuel** : preview auto-remplie (titre, description, image, domaine source), lien "Edit preview".
**Cohérence** : ✅ conforme sur cet écran (le signal "X people saved this" n'est pas visible sur cet exemple précis, probablement parce que l'URL de démo n'a jamais été sauvegardée avant — comportement normal, pas une incohérence).

### 4 — Customize
**Fonctionnel (spec §12.1 étape 4)** : Titre (100 car.) + Description (300 car.) + Tags libres + Note perso optionnelle (500 car., privée) — champ "note" bien présent ici, conformément à la règle de l'écran 2.
**Visuel** : formulaire avec titre, description, champ tags, section "Save to".
**Cohérence** : ✅ conforme dans la structure. Point à vérifier en dev : s'assurer que le champ note (optionnel, 500 car.) est bien présent visuellement sur cet écran précis même si non visible sur la capture fournie — cohérence avec l'écran 2 corrigé.

### 5 — Choose a collection or project
**Fonctionnel (spec §12.1 étape 5, Add Item Flow §2.2 étape 5)** : recherche de Collection, liste des Collections récentes, sélection optionnelle d'une Section, "+ Create new collection", option "Save to Unsorted".
**Visuel** : modal "Save to" avec liste de Collections récentes et bouton "Create new collection".
**Cohérence** : ✅ conforme.

### 6 — Saved!
**Fonctionnel (spec §12.1 étape 6)** : confirmation "Saved to [Collection]" + CTA "View in collection" / "Continue exploring".
**Visuel** : écran de confirmation avec animation, "Saved to [nom]".
**Cohérence** : ✅ conforme.

### 7 — Find it in your project/collection
**Fonctionnel** : le Link sauvegardé apparaît en tête de la vue Links de la Collection (Add Item Flow §2.2, cohérent avec le comportement décrit pour mobile "en tête de liste").
**Visuel** : vue Collection avec le nouveau Link en première position.
**Cohérence** : ✅ conforme.

### 8 — (Optional) Open the link
**Fonctionnel** : action de consultation standard, incrémente `links.clicks_count` (Data Model §8).
**Visuel** : vue détail du Link avec titre, tags, actions (edit/menu).
**Cohérence** : ✅ conforme.

### 9 — All set
**Fonctionnel** : écran de clôture du tutoriel, pas une étape du flow réel de sauvegarde en tant que tel — plutôt un écran pédagogique de fin de tuto.
**Visuel** : message "Your universe grows one link at a time." + CTA "Explore more".
**Cohérence** : ✅ conforme (à noter : cet écran 9 est propre au tutoriel/onboarding de la fonctionnalité, pas une étape systématique du flow de sauvegarde répétée à chaque save — la vraie fin de flow "métier" est l'écran 6 "Saved!").

---

## Récapitulatif des incohérences relevées sur ce parcours

| Écran | Incohérence | Statut |
|---|---|---|
| 2 — Panel Curio | "Take a screenshot" présent | Déjà tranchée — corriger en "Add a custom image" |
| 2 — Panel Curio | "Write a note" affiché comme action séparée | Déjà tranchée (Add Item Flow §2.1) — retirer, le champ note vit dans Customize (écran 4) |

Aucune nouvelle décision à prendre ici — uniquement deux corrections de maquette à faire passer au designer, cohérentes avec ce qu'on a déjà tranché.

---

---

## 4. Save Flow — App Mobile

**Fonctionnel (spec §12.2, Add Item Flow §3)** : bottom sheet "Add to Curio" déclenché par le FAB (bouton + violet, centre de la bottom nav), à **3 actions** : Save link / Add a custom image / Create collection. "Write a note" n'est pas une action séparée (même règle que l'extension).

Maquette de référence : `Curio_Tuto_save_a_link_appli.jpeg`, 8 écrans.

### 1 — From anywhere
**Fonctionnel** : le FAB est accessible depuis n'importe quel écran de l'app (spec §7.3).
**Visuel** : bottom nav avec FAB violet central.
**Cohérence** : ✅ conforme.

### 2 — Choose an action
**Fonctionnel (Add Item Flow §3.1)** : bottom sheet à 3 actions — Save link / Add a custom image / Create collection.
**Visuel** : bottom sheet montrant **Save link / Take a photo / Write a note / Create collection**.
**Cohérence** : ⚠️ deux points, de nature différente.
- **"Write a note"** en action séparée : même résidu que sur l'extension Chrome, même correction — à retirer, c'est un champ de l'étape Customize.
- **"Take a photo"** : ici c'est plus nuancé que "Take a screenshot" sur l'extension — la capture photo directe fait bien partie du périmètre V1 de "Add a custom image" (*"uploader depuis la galerie ou prendre une photo directement"*, Add Item Flow §3.1). Ce n'est donc pas une fonctionnalité hors scope à supprimer, mais un **libellé/découpage à corriger** : il ne doit pas y avoir de bouton "Take a photo" séparé, mais un bouton unique "Add a custom image" qui propose ensuite le choix galerie/photo. Distinction utile pour le designer : sur l'extension c'était "à supprimer", ici c'est "à fusionner/relabelliser".

### 3 — Add the link
**Fonctionnel (spec §12.2 étape 2, Add Item Flow §3.2 étape 3)** : coller l'URL, preview auto (titre + description + image), "Edit preview" disponible, signal canonique si URL existante.
**Visuel** : champ URL + preview auto-remplie.
**Cohérence** : ✅ conforme.

### 4 — Customize
**Fonctionnel (spec §12.2 étape 3)** : Titre (100 car.) + Description (300 car.) + Tags libres + Note perso optionnelle (500 car.).
**Visuel** : formulaire titre/description/tags.
**Cohérence** : ✅ conforme dans la structure — même point de vigilance qu'en écran 4 web : s'assurer que le champ note est bien intégré ici visuellement, cohérent avec la correction de l'écran 2.

### 5 — Add to a project (collection)
**Fonctionnel (spec §12.2 étape 4, Add Item Flow §3.2 étape 5)** : liste des Collections récentes (Projects + standalone), sélection Section optionnelle, "+ Create new collection".
**Visuel** : liste "Add to" avec Collections récentes.
**Cohérence** : ✅ conforme.

### 6 — Saved!
**Fonctionnel (spec §12.2 étape 5)** : confirmation "Saved to [nom]" + checkmark violet, CTA "View in collection" / "Continue exploring".
**Visuel** : écran de confirmation.
**Cohérence** : ✅ conforme.

### 7 — In your project
**Fonctionnel (Add Item Flow §3.2 étape 7)** : Link visible dans la Collection (onglet Links, en tête de liste).
**Visuel** : vue Collection avec le Link ajouté.
**Cohérence** : ✅ conforme.

### 8 — From the browser (optional)
**Fonctionnel (Add Item Flow §3.2 étape 8)** : icône Curio dans le share sheet natif iOS pour sauvegarder depuis le navigateur mobile, sans passer par l'app directement.
**Visuel** : share sheet iOS avec icône Curio.
**Cohérence** : ✅ conforme.

---

## Récapitulatif des incohérences relevées sur ce parcours

| Écran | Incohérence | Statut |
|---|---|---|
| 2 — Bottom sheet | "Write a note" affiché comme action séparée | Même correction que l'extension — retirer, champ dans Customize |
| 2 — Bottom sheet | "Take a photo" comme action séparée | Pas hors scope (la capture photo est prévue), mais à fusionner sous un bouton unique "Add a custom image" |

Comme tu l'as dit, pas besoin de repasser sur les maquettes toi-même — ces deux corrections sont pour le designer, la spec ne bouge pas.

---

---

## 5. Collection Flow (création, ajout Section, publication)

**Note de lecture actée avec le CEO/PO** : la maquette `Curio_Page_Project.jpeg` doit être lue comme une page **Collection** (§8.7 spec), pas Project — badge "PROJECT"→"COLLECTION", "Categories"→"Sections", onglet "Notes"→à retirer (résidu déjà connu). Le détail ci-dessous documente donc la vraie page Collection avec ces corrections mentales appliquées.

### 5.1 Création d'une Collection
**Fonctionnel (spec §10.1, Data Model §6)** : champs requis — `name` (obligatoire), `topic_id` (obligatoire, 1 Collection = 1 Topic principal) ; champs optionnels — `description`, `cover_image_url` (upload ou auto depuis le 1er Link ajouté), `note` (privée, jamais publique), `is_public` (défaut `false`).
**Décision actée (CEO/PO)** — pas de maquette dédiée, donc on tranche nous-mêmes plutôt que de renvoyer au designer :

Un seul écran, pas de wizard multi-étapes (cohérent avec la philosophie "zéro friction" déjà actée ailleurs) :
1. **Nom** (texte, obligatoire)
2. **Topic** (sélection unique parmi les 10 Topics Core, obligatoire) — le choix déclenche l'affichage des Sections suggérées en dessous (chips modifiables/supprimables + "+ Add section")
3. **Description** (optionnel)
4. **Cover image** (optionnel) — encart discret "Add a cover image", skippable en un clic. Même mécanisme d'upload que "Add a custom image" sur les Links (Supabase Storage, rien de nouveau à construire). Si l'utilisateur ne fait rien : auto-génération depuis le 1er Link ajouté (comportement de secours, pas le comportement poussé par défaut) — évite qu'une Collection démarre avec une image qui n'a rien à voir avec le sujet, sans ajouter de friction pour ceux qui veulent aller vite
5. **Toggle "Make this collection public"** (désactivé par défaut, cohérent avec `is_public` défaut `false`)
6. CTA "Create collection"

### 5.2 Vue Collection — Header
**Fonctionnel (spec §10, §8.7)** : cover image, badge Topic coloré, titre, description, note perso du propriétaire (privée, jamais affichée publiquement même si Collection publique), owner (avatar + nom), stats (Links/Followers/Updated), tags libres, actions Follow/Save a copy/Share.
**Visuel (maquette corrigée)** : cover image "Japandi Interior", titre + description, avatar "Alex · Creator", stats "48 Links / Followers 6 / Updated 2 days ago", tags pills (Interior Design/Japandi/Minimal/Home).
**Cohérence** : ✅ conforme une fois la relecture Collection appliquée — correspondance quasi exacte avec la spec §10/§8.7.

### 5.3 Onglets
**Fonctionnel (spec §8.7)** : **Links** (par défaut) / **About**.
**Visuel** : la maquette montre trois onglets — "Links 48 / About / Notes 3".
**Cohérence** : ⚠️ résidu déjà connu — retirer l'onglet "Notes", il n'en existe que deux (Links/About).

### 5.4 Ajout d'une Section
**Fonctionnel (spec §10.2, Add Item Flow §4.6, Data Model §7)** : Sections optionnelles, créées à la main, nommées librement. À la création de la Collection, des templates de Sections sont **suggérés selon le Topic** choisi (ex. Topic Design → "Lieux / Objets / Références" ; Topic Travel → "Hôtels / Restaurants / Lieux à voir / Itinéraire") — librement modifiables/supprimables, pas une table en base (config applicative statique côté front, `sections.color` généré par hash du nom).
**Visuel** : la sidebar droite de la maquette montre une liste "Categories" (à lire "Sections") avec compteurs : Design (20), Interior (12), Objects (7), Tips (5), Inspiration (4), chacune avec un point de couleur.
**Cohérence** : ✅ structure conforme (liste + compteurs + couleur par section) une fois "Categories" relu "Sections". Un point à vérifier en dev : les noms affichés ici (Design, Interior, Objects, Tips, Inspiration) sont des exemples libres cohérents avec "nommées à la main", pas les templates suggérés par défaut du Topic "Design" listés en Add Item Flow §4.6 (Lieux/Objets/Références) — ce n'est pas une incohérence, juste le signe que l'utilisateur de la démo a renommé/ajouté ses propres Sections après création, ce qui est le comportement normal attendu.

### 5.5 Publication (rendre une Collection publique)
**Fonctionnel (spec §10.5)** : privée par défaut, rendue publique via un toggle simple (1 clic). Indépendante du statut du Project parent si applicable (`collections.is_public`, Data Model §6 — indépendant de `project_id`).
**Visuel** : aucun toggle public/privé visible sur cette maquette précise.
**Décision actée (CEO/PO)** : pas de nouvel écran séparé — **réutilisation de la même modale en mode "Edit collection"** (accessible depuis le menu ··· sur la page Collection), champs pré-remplis, toggle inclus. Un seul composant sert création + édition, plus simple à spécifier pour le dev, cohérent avec le "1 toggle" déjà annoncé en spec §10.5.

---

## Récapitulatif des incohérences et trous relevés sur ce parcours

| Point | Type | Statut |
|---|---|---|
| Badge "PROJECT" / breadcrumb "Back to Projects" | Incohérence (mislabel) | Tranchée avec toi — lire "Collection", corriger le libellé |
| "Categories" au lieu de "Sections" | Incohérence terminologique | Tranchée — corriger côté designer (correction visuelle simple), cohérent avec Decisions Log §2 |
| Onglet "Notes 3" | Résidu déjà connu | À retirer côté designer (correction visuelle simple) |
| Modale de création de Collection | Trou (non maquetté) | Tranchée entre nous (voir 5.1) |
| Toggle publication (privé↔public) | Trou (non maquetté) | Tranchée entre nous — fusionnée avec la modale d'édition (voir 5.5) |

---

---

## 6. Project Flow (création, ajout Collection)

**Point de départ différent des parcours précédents** : contrairement au Collection Flow (où on avait une vraie maquette à relire), **il n'existe aucune maquette pour la vraie page Project** dans les fichiers fournis — `Curio_Page_Project.jpeg` a été requalifiée en page Collection au chantier précédent. Ce parcours est donc documenté **entièrement depuis la spec** (§11, §8.8, Data Model §5), avec des décisions prises entre nous là où la spec ne descend pas au niveau de l'écran.

### 6.1 Création d'un Project
**Fonctionnel (spec §11, Data Model §5)** : champs — `name` (obligatoire), `description` (optionnel), `color` (optionnel, champ texte libre en base, pas d'enum contrairement à `universe_color`). Pas de `topic_id` (porté par les Collections, pas le Project), pas de `is_public` (toujours privé, structurellement).

**Décision actée (CEO/PO)** : modale minimale, cohérente avec celle de Collection pour l'homogénéité produit :
1. **Nom** (obligatoire) — ex. "Tour du monde 2027"
2. **Description** (optionnel)
3. **Couleur** (optionnel) — même sélecteur à 5 pastilles que l'écran Universe de l'onboarding (violet/beige/vert/bleu/rose), pour cohérence visuelle plutôt que d'inventer une palette différente pour cet usage mineur
4. CTA "Create project"

Pas de toggle public ici — il n'existe pas pour un Project, ne pas en afficher un serait source de confusion.

### 6.2 Vue Project — `/projects/[id]`
**Fonctionnel (spec §8.8, §11.1)** : toujours privé (jamais accessible à un visiteur non connecté), header avec titre + description + stats (nombre de Collections / total de Links agrégé depuis les Collections enfants), grille des Collections du Project (cover, titre, nb links, badge Topic, statut public/privé affiché), actions Edit / Add collection / Delete. **Aucun Link direct affiché** — c'est la différence structurelle avec la page Collection.

**Décision actée (CEO/PO)** — layout, faute de maquette : reprendre la structure de la page Collection (§5.2) en la simplifiant :
- Pas de cover image pleine largeur en header (un Project n'a pas de `cover_image_url` en base) — un simple bandeau titre + description + stats + actions suffit
- Le corps de page est une **grille de cards Collections** (même composant visuel que "Your latest collections" déjà vu sur My Space), pas une liste de Links
- Chaque card Collection affiche un badge discret public/privé (le Project est privé, mais chaque Collection à l'intérieur peut ne pas l'être — il faut que ce soit lisible en un coup d'œil)
- Pas de sidebar droite Sections/Followers (ces notions n'existent pas au niveau Project) — à la place, une sidebar simple avec juste les stats globales (Collections / Links total)

### 6.3 Ajout d'une Collection à un Project
**Fonctionnel (spec §11.3, Data Model §6)** : `collections.project_id` est nullable et modifiable — une Collection standalone peut donc être rattachée à un Project après coup, pas seulement créée directement dedans.

**Décision actée (CEO/PO)** : le bouton "Add a collection" (déjà nommé dans la spec §8.8) ouvre un choix à 2 options plutôt qu'une seule action :
1. **"Create new collection"** → ouvre la modale de création de Collection (§5.1), avec `project_id` pré-rempli silencieusement
2. **"Add an existing collection"** → liste des Collections standalone de l'utilisateur (celles avec `project_id IS NULL`), sélection simple pour les rattacher

Cette deuxième option n'est explicitement décrite nulle part dans la spec écrite, mais elle découle directement de la structure de données validée (`project_id` nullable et modifiable) — sans elle, un utilisateur qui a commencé une Collection standalone n'aurait aucun moyen de l'organiser dans un Project après coup, ce qui casserait le cas d'usage "d'abord s'organiser → puis contribuer socialement" que la spec elle-même met en avant comme raison d'être du Project (Decisions Log §2).

---

## Récapitulatif des décisions actées sur ce parcours

| Point | Type | Statut |
|---|---|---|
| Page Project entière | Aucune maquette | Layout décidé entre nous (§6.2), inspiré de la structure Collection |
| Modale création Project | Aucune maquette | Tranchée entre nous (§6.1) |
| Rattachement d'une Collection existante | Non décrit en spec | Déduit du modèle de données, tranché entre nous (§6.3) |

---

---

## 7. Universe / My Space

**Fonctionnel (spec §8.9, §7.2)** : page personnelle connectée, accessible via l'item sidebar "🌌 My Universe" (le nom affiché dans la nav) qui pointe vers la route `/my-space` (le nom de la page en spec) — pas une incohérence, juste deux noms pour la même chose à deux niveaux différents (label de nav vs nom de route), cohérent avec le reste de la spec.

Maquette de référence : `Curio_My_universe.jpeg` — malgré son nom de fichier, c'est bien la page **My Space** décrite en §8.9 (pas une vue orbitale plein écran), je le précise pour éviter la confusion qu'on a eue avec la page Project/Collection.

### 7.1 Header profil
**Fonctionnel (spec §8.9)** : avatar, nom, badge, bio, localisation, site, date d'inscription, Topics actifs (pills) + Add.
**Visuel** : avatar circulaire, "Alex ✳" (le ✳ étant le badge visuel), bio "Explorer of ideas and beautiful things...", localisation "Paris, France", site "curio.app/alex", date "Joined Curio in March 2024", pills Topics (Travel/Design/Books/Food/Photography) + bouton "Add", CTA "Edit profile".
**Cohérence** : ✅ conforme.

### 7.2 Stats — sidebar droite
**Fonctionnel (spec §8.9)** : stats (Saved links / Collections / Likes / Curators followed), Top category, Recent activity, Your collections.
**Visuel** : "Your universe in numbers" — 432 Saved links / 28 Collections / 126 Likes / 37 Curators followed, encart "Top category this month — Travel, 152 links saved", "Recent activity" (liste d'actions horodatées), "Your collections" (grille de mini-cards).
**Cohérence** : ✅ conforme, correspondance exacte avec la spec.

### 7.3 Your latest collections
**Fonctionnel (spec §8.9)** : mise en avant des dernières Collections créées/actives.
**Visuel** : grille de 4 cards avec badge Topic coloré, titre, nb de links, avatars des followers.
**Cohérence** : ✅ conforme.

### 7.4 Curators you follow
**Fonctionnel (spec §8.9)** : liste des curateurs suivis.
**Visuel** : avatars + noms + spécialité + bouton "Following".
**Cohérence** : ✅ conforme.

### 7.5 Bandeau "Your universe is unique"
**Fonctionnel** : pas explicitement détaillé en spec au niveau contenu exact, mais cohérent avec le ton de marque (§1.7 "Human first", tagline "Build your universe").
**Visuel** : message "Your universe is unique. Keep exploring, keep collecting, keep building.", petite visualisation orbitale décorative avec le point "You" au centre, CTA "Explore more".
**Cohérence** : ✅ conforme dans l'esprit — c'est une bannière éditoriale de fin de page, pas une fonctionnalité interactive.

### ⚠️ Point de cadrage important — portée de la "vue orbitale"
La petite visualisation orbitale visible ici (§7.5) est **statique et décorative**, pas une carte interactive de l'univers de l'utilisateur. Or la roadmap (spec §17, Phase 4 — octobre) liste **"My Universe orbital view"** comme un livrable à part entière, et le §V1.1+ liste séparément *"Universe Map sur profils visités"* et *"Vue carte géographique globale (My Universe)"* comme fonctionnalités différées après V1.

**Décision actée (CEO/PO)** : pour ce chantier de parcours V1, on documente uniquement ce qui est visible ici — la bannière décorative statique de My Space. La vraie vue orbitale interactive (naviguer dans ses Projects/Collections/Links comme une carte, cliquable) est un chantier séparé, à traiter le moment venu (Phase 4 du roadmap, pas avant), pas à inclure dans ce document de parcours V1 pour éviter de confondre scope livré et scope futur.

---

## Récapitulatif du parcours Universe / My Space

| Point | Type | Statut |
|---|---|---|
| "My Universe" (nav) vs "/my-space" (route) | Différence de niveau, pas une incohérence | Rien à corriger |
| Vue orbitale interactive vs bannière décorative | Point de cadrage scope | Clarifié — la vraie vue orbitale = Phase 4, hors scope de ce document |

---

# Fin du chantier Parcours UX v1

Les 7 parcours prévus sont documentés : Onboarding Découvreur, Onboarding Founding Curator, Save Flow Extension Chrome, Save Flow App Mobile, Collection Flow, Project Flow, Universe/My Space.

## Récapitulatif global de toutes les incohérences/décisions actées dans ce document

| # | Parcours | Point | Résolution |
|---|---|---|---|
| 1 | Onboarding Découvreur | Topics Wellness/Business dans la maquette (écran 3) | Déjà tranché avant ce document (Decisions Log §5bis) — coder les 10 Topics Core |
| 2 | Founding Curator | Écran d'erreur token invalide | Tranché entre nous — pas d'écran dédié, fallback Découvreur avec message |
| 3 | Founding Curator | Célébration du badge | Tranché entre nous — silencieux, pas d'écran dédié |
| 4 | Save Flow Extension | "Take a screenshot" dans le panel | Déjà tranché avant ce document — corriger en "Add a custom image" |
| 5 | Save Flow Extension | "Write a note" comme action séparée | Déjà tranché avant ce document (Add Item Flow §2.1) — retirer |
| 6 | Save Flow Mobile | "Write a note" comme action séparée | Même correction que #5 |
| 7 | Save Flow Mobile | "Take a photo" comme action séparée | Fusionner sous "Add a custom image" |
| 8 | Collection Flow | Badge "PROJECT" sur une page Collection | Tranché avec toi — relabelliser |
| 9 | Collection Flow | "Categories" au lieu de "Sections" | Terminologie déjà tranchée (Decisions Log §2) |
| 10 | Collection Flow | Onglet "Notes" | Déjà tranché avant ce document — retirer |
| 11 | Collection Flow | Modale création Collection non maquettée | Tranché entre nous |
| 12 | Collection Flow | Toggle publication non maquetté | Tranché entre nous — fusionné avec l'édition |
| 13 | Project Flow | Aucune maquette pour la page entière | Layout tranché entre nous |
| 14 | Project Flow | Rattachement Collection existante non décrit | Déduit du modèle de données, tranché entre nous |
| 15 | Universe/My Space | Portée de la vue orbitale | Cadrage clarifié — Phase 4, hors scope V1 |
| 16 | Transversal (hors doc) | Spec §12.2 / Add Item Flow §2.2 se contredisent elles-mêmes sur les 3 actions du panel | Trouvé au check-up v1.3 — **corrigé** (v4.7/v3.1) lors de la relecture globale finale |

Points #4, #5, #7, #9, #10 nécessitent une **correction côté designer** (maquettes à mettre à jour). Point #16 nécessite une **correction dans les documents spec/flow eux-mêmes** (Spec Produit). Tous les autres sont des décisions produit actées entre nous, sans action designer requise.
