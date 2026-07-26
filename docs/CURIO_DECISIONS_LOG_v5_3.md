# CURIO — Journal des Décisions
**Version 5.2 — Juillet 2026**
> Changelog v3 : ajout §5bis — passage de 8 à 10 Topics Core (Beauty, Wellness). L'ancienne justification "8 Topics" en §5 est conservée mais marquée obsolète/remplacée pour traçabilité.
> Changelog v4 : ajout §5ter — décision App mobile V1 (web mobile + coque native légère avant ouverture publique, plutôt que React Native complet). Tranché en Revues & Décisions, calendrier assoupli par le CEO (marge jusqu'à juin 2027 si nécessaire, qualité prioritaire sur la date). Nettoyage §11 points 6-7 : statuts réels reflétés (recrutement tranché en GTM v3, pricing en attente de validation). Points 1-2-8-9 tranchés : palette des 10 badges Topic et vert olive validés provisoirement par le CEO/PO, hero orbital reclassé non-bloquant — voir Design Tokens v1.2.
> Changelog v5 : ajout §5quater — décision Algorithme & Personnalisation. Clarifie que "anti-algorithme" ne veut pas dire "zéro tri" : Following reste chronologique pur, For you/Trending/sponsorisé utilisent un ciblage par préférence explicite (pas par score d'engagement). Réconcilie le besoin CEO de ciblage intelligent (y compris sponsorisé) avec le principe déjà acté "jamais d'auto-insertion silencieuse" (Data Model §19) — pas de contradiction, juste une distinction jamais formalisée avant. Formulation "anti-algorithme" retirée du GTM (v3.2).
> Changelog v5.1 (correctif) : mise à jour des pointeurs de version obsolètes en en-tête (Spec v4.3→v4.4, Add Item Flow v2→v3). Aucun changement de fond.
> Changelog v5.2 : ajout §5quinquies — correction Curator Pro (prix tranché 9,90€/mois, "liens monétisés" retiré du Plan Pro). Décision CEO déjà actée dans GTM_LAUNCH_v1 §3.1 (v4) mais jamais propagée à la spec — corrigé ici (Spec v4.5→v4.6 §4.1). Repéré lors du checkup de cohérence pré-ouverture Dev & GSD (Étape 4).

> Ce document capture le "pourquoi" derrière toutes les décisions produit.
> Il complète CURIO_SPEC_PIVOT_v4.7.md (le quoi) et CURIO_ADD_ITEM_FLOW_v3.1.md (le comment).
> **En cas de contradiction entre les maquettes et ce document : ce document fait foi.**

---

## 0. Règle générale — Spec vs Maquettes

**La spec prime toujours sur les maquettes.**

Les maquettes sont la référence pour :
- Le design visuel (couleurs, typographie, espacements, animations)
- Le positionnement des éléments sur l'écran
- L'ambiance et l'esthétique générale

La spec est la référence pour :
- Les fonctionnalités et leur comportement
- La structure des objets et leurs relations
- Les règles métier
- La terminologie officielle

En cas de contradiction entre une maquette et la spec, on code la spec. On adapte la maquette en conséquence si nécessaire.

---

## 1. Vision & Positionnement

**"A social library of human curiosity"**
Positionnement définitif. Pas un bookmark manager, pas Pinterest, pas un outil de productivité. La distinction principale vs Pinterest : liens concrets et actionnables (intention d'achat réelle) vs inspiration vague.

**Taglines définitives**
"The internet worth keeping." / "To map human curiosity." / "The human-curated internet."
Issues du brand book v2 du designer. Non négociables.

**Nom Curio définitif**
C = Curio/Curiosity/Collection. Orbite = univers vivant. Points = links/books/places/people/ideas.

---

## 2. Hiérarchie des objets — Décision fondamentale

**La hiérarchie est : Project → Collection → Section → Link**

**Project** = conteneur organisationnel PERSONNEL, toujours privé. Regroupe des Collections liées à un même thème de vie. Exemples : "Tour du monde 2027", "Rénovation appartement", "Inspiration pro 2026". Ne contient jamais de Links directement — uniquement des Collections.

Raison du choix Project privé uniquement : protège la vie privée naturellement (pas d'autocensure à la création), crée une vraie progression dans le parcours (d'abord s'organiser → puis contribuer socialement), distinction claire et immédiatement compréhensible pour l'utilisateur.

**Collection** = objet central, SOCIAL. Agrégat de Links autour d'un sujet. Peut être standalone (sans Project parent) ou dans un Project. Peut être rendue publique. C'est ce que les autres suivent et découvrent. Exemples : "Week-end à Milan", "Hôtels à Côme", "Préparation soldes été 2026".

Raison du choix Collection comme objet social : c'est l'unité de curation naturelle — assez précise pour être pertinente (contrairement à l'Univers entier), assez large pour contenir plusieurs liens (contrairement à un Link seul).

**Section** = sous-groupe INTERNE à une Collection. Optionnelle, nommée à la main. Exemples dans "Week-end à Milan" : "Restaurants", "Hôtels", "Shopping". 1 Link = 1 Section (modèle dossier). Templates suggérés selon le Topic à la création.

Raison du retour aux Sections (vs Categories auto des versions précédentes) : plus naturel pour l'utilisateur, cohérent avec l'historique du projet (Sections étaient déjà prévues en SPEC v6.0), plus simple en DB.

**Link sans Collection** = autorisé, atterrit dans "Unsorted". Zéro friction à l'ajout — on peut sauvegarder sans décider où classer.

**Un Project ne contient jamais de Links directs.**
Raison : si un Project peut contenir des Links directs ET des Collections, la distinction entre Project et Collection disparaît. La règle doit être absolue pour rester claire.

---

## 3. Notes — Décision définitive

**Les Notes ne seront jamais une feature standalone dans Curio.**

Raison : Curio n'est pas une app de prise de notes. Des outils existent déjà pour ça (Notion, Apple Notes, etc.). Ajouter des Notes standalone disperserait le produit et perdrait les utilisateurs. Ce n'est pas le but.

Uniquement deux champs commentaire simples, définitivement :
- **Note sur Link** : dans UserLink (privé, 500 chars). "Pourquoi j'ai sauvegardé ça ?" Jamais affiché publiquement.
- **Note sur Collection** : dans l'entité Collection (privé, 500 chars). Commentaire personnel du propriétaire. Jamais affiché publiquement.

Ces champs sont accessibles dans le flow Save link (étape Customize) et depuis la page de gestion d'une Collection. Pas d'entité Note en DB. Décision définitive — ne pas réouvrir ce sujet.

---

## 4. Image personnalisée sur un Link — V1

**"Add a custom image"** remplace "Take a screenshot" dans le panel extension et le FAB mobile.

Cas d'usage : le fetch OG ne récupère pas d'image (site mal configuré) ou l'image auto est inadaptée (ex. lien d'itinéraire sans image pertinente). L'utilisateur peut uploader une image depuis sa galerie ou prendre une photo directement.

Implémentation simple : upload vers Supabase Storage, stocké sur l'entité UserLink (image perso qui surcharge l'image canonique pour cet utilisateur uniquement). Pas de capture de page web — hors scope définitivement.

Extension V1 = 3 actions : **Save link / Add a custom image / Create collection**
"Write a note" = champ dans le flow Save link, pas une action séparée.

---

## 5. Topics

> ⚠️ **OBSOLÈTE / REMPLACÉE par la décision §5bis ci-dessous.** Conservée ici uniquement pour traçabilité historique — ne reflète plus la liste Topics Core actuelle.

**~~8 Topics Core pour la beta V1~~**
~~Travel · Style · Books · Food · Ideas · Culture · Design · Photography~~

Raison (historique) : réconciliation entre le brand book (6 Topics orbitaux : Travel/Style/Books/Food/Ideas/Culture) et les maquettes produit (Topics Design et Photography ajoutés dans les filtres app). 8 = bon équilibre pour avoir du contenu de qualité dès J1 avec 100 Founding Curators.

**La liste de la spec prime sur les maquettes d'onboarding.** *(reste valable)*
Les maquettes d'onboarding affichent Wellness et Business à la place de Food et Photography — c'est illustratif, pas prescriptif. On code avec les Topics Core officiels (liste actuelle : voir §5bis).

**~~4 Topics Extended pour V1.1~~**
~~Tech · Wellness · Business · Science~~ — liste mise à jour en §5bis (Wellness promu en Core).

---

## 5bis. Topics — Décision (v3) : passage de 8 à 10 Topics Core

**10 Topics Core pour la beta V1**
Travel · Style · Beauty · Wellness · Food · Books · Ideas · Culture · Design · Photography

**Raison** : Beauty et Wellness figurent parmi les 4 plus gros topics du marché influenceur actuel (avec Style et Travel, déjà couverts). Les laisser en Extended aurait créé un angle mort produit dès la Wave 1 de recrutement Founding Curator, qui se fait sur base réseau/organique **sans quota par Topic** — contrairement à l'hypothèse initiale d'une répartition contrôlée par Topic qui justifiait de pouvoir différer certains Topics en Extended.

**Impact DB : nul.** La table `topics` a été conçue avec `is_core` / `is_active` (pas d'enum figé) — ajout de deux lignes, pas de migration de schéma.

**3 Topics Extended pour V1.1 (mis à jour)**
Tech · Business · Science — activés selon contenu produit naturellement par les Founding Curators en beta.

**Points ouverts créés par cette décision, depuis résolus** (voir §11 points 1, 8, 9 et Design Tokens v1.2 §1.5 pour le détail) :
- ~~Composition visuelle du hero orbital probablement designée pour 8 points~~ — reclassé non-bloquant (§11 point 8) : composition générée, ajustable après coup.
- ~~Risque de confusion visuelle entre badges Wellness et Design~~ — résolu (§11 point 9) : Wellness assigné à un bleu-sauge distinct de l'olive Design.

---

## 5ter. App mobile — Décision (v4) : web mobile au lancement + coque native légère avant l'ouverture publique

**Décision** : pas de React Native complet pour le V1. Deux temps :
1. **Beta privée (novembre 2026, 100 Founding Curators)** : web mobile uniquement (Next.js responsive). Le flow de sauvegarde fonctionne entièrement (copier l'URL → ouvrir Curio → coller), à l'exception de l'intégration au menu de partage natif iOS (Add Item Flow §3.2 étape 8), reportée à l'étape suivante.
2. **Avant l'ouverture publique** (actuellement janvier 2027, marge acceptée jusqu'à juin 2027 si nécessaire) : la même codebase web est empaquetée dans une coque native légère (type Capacitor/Expo) pour obtenir une vraie présence App Store/Play Store et débloquer le partage natif iOS/Android — sans dupliquer l'équipe ni le code.

**Raison** : la fonctionnalité qui nécessite réellement du natif est étroite et précise — apparaître dans le menu de partage système iOS pour capturer un lien depuis n'importe quelle app ("save from anywhere"). Ce n'est pas "être sur mobile" en général (le web mobile couvre déjà très bien ce besoin), c'est spécifiquement ce geste-là. Une vraie app React Native complète, construite dès le V1, coûterait une compétence mobile dédiée en continu (pas seulement à la construction mais à la maintenance) sans bénéfice supplémentaire par rapport à la coque légère pour ce cas d'usage précis.

**Pourquoi différer même la coque légère après la beta fermée** : les 100 Founding Curators sont un public recruté à la main, motivé, capable d'absorber la friction du copier-coller pendant quelques semaines. Le vrai enjeu de rétention sur mobile se joue à l'ouverture publique, pas en beta fermée — c'est là que la coque native doit être prête, pas avant.

**Ce que ça change concrètement pour le dev** :
- `CURIO_SPEC_PIVOT_v4_2.md §16.1` (stack) et `§17` (roadmap) mis à jour en conséquence (v4.3).
- Add Item Flow §3.2 étape 8 (partage natif iOS) : à considérer comme un livrable de la phase "coque native", pas de la Phase 1-5 initiale — aucun changement du flow lui-même, juste un séquencement.
- Nouveau chantier à budgéter explicitement (pas caché dans "V1.1+" comme avant) : comptes développeur Apple/Google, configuration Capacitor/Expo, review Apple (délai variable, parfois plusieurs allers-retours si l'app est jugée "trop proche d'un simple site emballé" — le partage natif doit être mis en avant comme fonctionnalité native réelle pour passer la review plus sereinement).
- Estimation d'effort : ~2-3 semaines de travail technique + délai de review Apple imprévisible (quelques jours à quelques semaines).

**Décision CEO actée** : calendrier non figé sur ce point — la qualité du produit prime sur la date exacte de disponibilité de la coque native, tant que le principe (web mobile d'abord, coque native avant l'ouverture publique) est respecté.

---

## 5quater. Algorithme & Personnalisation — Décision (v5)

**Contexte** : la spec (§1.1) et l'ancien pitch GTM affirmaient un positionnement "anti-algorithme" au sens littéral. Or plusieurs mécanismes déjà documentés supposent un calcul de tri/ciblage : Home "For you"/"Trending" (Spec §8.2), "Popular on Curio" (§8.3), "priorité recommandations" du Plan Pro (§4.1), et le placement sponsorisé contextuel (GTM v3 §3.3 point 3). Le CEO a confirmé vouloir un ciblage intelligent, y compris pour le sponsorisé. Décision actée pour lever l'ambiguïté avant la Phase 3 (App connectée).

**Principe retenu** : ce que Curio garantit n'est pas "zéro algorithme" — c'est qu'aucun algorithme ne s'interpose entre un curateur et les gens qui le suivent. Le tri et la personnalisation existent, mais toujours au service d'un goût explicitement choisi par l'utilisateur (Topics, curateurs suivis, historique de saves), jamais au service d'un score d'engagement à maximiser (temps passé, taux de clic).

**Application par surface** :
- **Home → "Following"** : chronologique pur, aucun tri. Garantie non négociable.
- **Home → "For you" / bouton "Personalize"** : personnalisation basée sur signaux explicites (Topics choisis, curateurs suivis, tags des saves passés). L'utilisateur peut ajuster ces signaux lui-même via "Personalize" (déjà visible sur la maquette Home, jamais spécifié fonctionnellement avant cette décision).
- **Home → "Trending" / Explore → "Popular on Curio"** : classement statistique (compteurs saves/clicks agrégés sur une fenêtre de temps), identique pour tous les utilisateurs — pas personnalisé, pas de boîte noire.
- **Placement sponsorisé contextuel** (GTM §3.3 point 3) : ciblage par Topics/intérêts déclarés de l'utilisateur, suggéré en contexte (recherche, complétion de Collection) — **aucune contradiction avec le principe "jamais d'auto-insertion silencieuse" (Data Model §19.2)**, qui protège uniquement contre l'ajout automatique sans action explicite. Le ciblage intelligent et l'ajout volontaire coexistent : l'algo peut suggérer, seul l'utilisateur ajoute.
- **Curator Pro "priorité recommandations"** (Spec §4.1) : boost de visibilité dans Explore/Curators pour les comptes Pro — mécanisme de placement séparé de la logique de goût, à traiter comme le sponsorisé (identifiable, pas un score d'engagement caché).

**Conséquence sur le pitch/positionnement** : la formulation absolue "pas d'algorithme entre vous et votre audience" est retirée du GTM (v3.2, §1.4) — remplacée par une version qui reste différenciante sans être trompeuse : la garantie porte sur "Following", pas sur l'absence totale de calcul ailleurs dans le produit.

**Ce qui reste ouvert** : le détail technique du scoring "For you" (pondération Topics vs curateurs suivis vs recency) n'est pas spécifié ici — à traiter au moment du prompt GSD pour `/home`, en cohérence avec les principes ci-dessus, pas avant.

---

## 5quinquies. Curator Pro — Correction (v5.2) : retrait des "liens monétisés" du plan payant

**Contexte** : le CEO a challengé, dans le fil Monétisation & GTM, la cohérence de faire payer un abonnement Pro alors que le modèle économique principal repose sur le volume de curateurs actifs générant du signal (§4.2/§4.3 de la spec, roadmap GTM §3.3 — affiliation automatique sur Links canoniques comme premier levier de revenu). Faire dépendre la monétisation par affiliation d'un abonnement payant allait à l'encontre de l'objectif de maximiser le volume de clics affiliés.

**Décision** :
- Curator Pro tranché à **9,90€/mois** (89€/an en option annuelle), bas de la fourchette précédemment ouverte (~9-12€), pour maximiser le nombre de comptes Pro plutôt que la marge par abonné — cohérent avec le principe déjà acté que les curateurs sont le moteur de la donnée, pas la source de revenu principale.
- **"Liens monétisés" retiré du contenu de Curator Pro.** La part de commission d'affiliation reversée au curateur sur ses propres Links devient disponible à **tout curateur actif** dès un seuil d'activité (nombre de clics minimum, Collection publique — seuil exact non tranché à ce stade), indépendamment du Plan souscrit.
- Curator Pro reste recentré sur : analytics avancées, badge Pro, priorité recommandations — des avantages "power user", sans toucher au moteur de revenu principal.

**Ce qui reste ouvert** : le seuil d'activité précis débloquant la monétisation des liens (nombre de clics, ancienneté du compte, volume de Collections publiques) n'est pas spécifié ici — à trancher par le CEO/PO avant implémentation de la logique de facturation/déblocage (Phase 4, Universe & Plans).

---

## 6. Onboarding

**3 steps officiels**
Step 1 : Interests (10 Topics Core) → Step 2 : Curators → Step 3 : Name your universe + couleur

**L'utilisateur nomme son Universe et choisit une couleur**
Découvert dans les maquettes app mobile. Champ nom (10/20 chars) + palette 5 couleurs (violet/beige/vert/bleu/rose). Implication DB : champs `name` et `color` sur l'entité Universe (ou premier Project créé automatiquement).

**Auth : Apple / Google / Email**
Les trois options disponibles dès V1.

---

## 7. Navigation

**Sidebar gauche pour l'espace connecté (desktop)**
Items définitifs confirmés par les maquettes. Notes retiré de la sidebar V1 (Notes → V2).

**FAB mobile = 3 actions V1**
Save link / Write a note / Create collection. (Take a photo → V2)

**Header connecté**
"Good morning, [Prénom] ✦" — personnalisation immédiate, ton humain et chaleureux.

---

## 8. Modèle de données

**4 entités principales propres**
- `Project` (id, user_id, name, color, created_at)
- `Collection` (id, user_id, project_id nullable, topic_id, name, description, note, cover_image, is_public, created_at)
- `Section` (id, collection_id, name, order, created_at)
- `Link` (id canonique, url_normalized, url_origin_first, title, description, image_url, created_at)
- `UserLink` (id, user_id, link_id, collection_id nullable, section_id nullable, note, url_origin, saved_at)

**Link canonique**
1 URL normalisée = 1 Link en base. Compteurs partagés : saves_count, clicks_count, forks_count. URL d'origine conservée dans UserLink pour affiliation future.

**Follow : table unifiée**
Une seule table `Follow` avec target_id + target_type (`user` ou `collection`). Pas de ProjectFollow (Projects toujours privés, pas de follow possible). Pas de table Follow séparée pour les Projects.

**ConsentLog**
Table dédiée pour logger les consentements RGPD (user_id, consent_type, timestamp, version_policy). Obligatoire pour la conformité européenne.

---

## 9. SEO / Data / RGPD

**SEO natif dès le 1er écran codé**
generateMetadata(), JSON-LD, sitemap dynamique, robots.txt, Core Web Vitals, pages publiques sans login. C'est la clé de l'acquisition organique et coûte beaucoup plus cher à ajouter après coup.

**PostHog pour le tracking**
Open source, self-hostable, RGPD-friendly. Mode opt-in strict — aucun tracking avant consentement.

**Axeptio pour les cookies**
CMP français, RGPD-native. 3 catégories : nécessaires / analytics / marketing.

**Supabase région EU (Frankfurt)**
Data residency RGPD. Non négociable pour le marché européen.

**Delete account = purge complète**
Obligation légale RGPD. Déjà prévu dans les maquettes Settings.

---

## 10. Direction Visuelle

**Mode Light par défaut sur le web connecté**
Confirmé dans les maquettes Settings (Theme: Light). Dark Cosmic = landing non connectée + app mobile. Toggle dans Settings.

**Palette v2 définitive**
#0D0E15 (dark) / #FAFBF2 (light) / #785CFF (violet) / #CFC3FF (violet doux) / #D9C6A6 (beige) / #6A7B7A (vert olive, tranché — voir §11 point 2) / #E0DBB8 (brun clair) / #111111 (texte).

**Couleurs par Topic sur les badges**
Chaque Topic a sa couleur distinctive — palette complète des 10 badges tranchée provisoirement (CEO/PO), voir §11 point 1 et Design Tokens v1.2 §1.5.

**Typographie : Editorial Serif + Sans Serif moderne — TRANCHÉ**
Instrument Serif (titres) + Inter (UI, corps) — voir §11 point 3 et Design Tokens v1.2 §2.1. Ni Canela, ni Tempera, ni Editorial New — alternative libre retenue pour éviter le coût de licence.

**Fidélité maquettes = priorité absolue en dev**
Design Token File avant tout code. Comparaison screenshot maquette/rendu à chaque écran codé. GSD reçoit les tokens dans chaque prompt de dev.

---

## 11. Points encore ouverts

1. ~~Couleurs exactes badges par Topic~~ — **TRANCHÉ provisoirement (CEO/PO)** : voir Design Tokens v1.2 §1.5. 7/10 valeurs en attente de confirmation designer, non bloquant.
2. ~~Hex vert olive `#6A7B7A`~~ — **TRANCHÉ (CEO/PO)** : valeur documentée retenue comme canonique. Voir Design Tokens v1.2 §1.3.
3. ~~Police Editorial Serif exacte~~ — **TRANCHÉ (CEO/PO)** : Instrument Serif retenu. Voir Design Tokens v1.2 §2.1.
4. ~~App mobile V1 : React Native ou PWA ?~~ — **TRANCHÉ (v4, cf. §5ter)** : web mobile au lancement + coque native légère avant l'ouverture publique.
5. Contenu 3-5 pièces éditoriales V1 → à rédiger avant lancement
6. ~~Pricing Plan Brand/Business~~ — **Recommandation posée (GTM_LAUNCH_v1 v3 §3.2)** : programme pilote + grille à 3 niveaux. En attente de validation CEO/PO.
7. ~~Processus recrutement Founding Curators~~ — **TRANCHÉ (GTM_LAUNCH_v1 v3 §1)**. Rien à rouvrir ici.
8. **Composition hero orbital** — **Reclassé non-bloquant (CEO/PO)** : composition générée, pas un asset figé — on code à 10 points dès maintenant, ajustable après coup sans coût lourd.
9. ~~Risque de confusion badge Wellness / Design~~ — **RÉSOLU** : Wellness assigné à un bleu-sauge (`#93AFA8`), distinct de l'olive Design. Voir Design Tokens v1.2 §1.5.
10. **[v5]** Détail technique du scoring "For you" (pondération Topics vs curateurs suivis vs recency) — principe acté en §5quater, formule exacte à trancher au moment du prompt GSD `/home` (Phase 3) → CEO/PO + dev
11. **[v5.2]** Seuil d'activité débloquant les "liens monétisés" (§5quinquies) — principe acté, chiffre non tranché → CEO/PO avant Phase 4 (Universe & Plans)
