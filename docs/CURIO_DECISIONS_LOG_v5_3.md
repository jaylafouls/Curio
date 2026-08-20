# CURIO — Journal des Décisions
**Version 5.3 — Août 2026**
> Changelog v3 : ajout §5bis — passage de 8 à 10 Topics Core (Beauty, Wellness). L'ancienne justification "8 Topics" en §5 est conservée mais marquée obsolète/remplacée pour traçabilité.
> Changelog v4 : ajout §5ter — décision App mobile V1 (web mobile + coque native légère avant ouverture publique, plutôt que React Native complet). Tranché en Revues & Décisions, calendrier assoupli par le CEO (marge jusqu'à juin 2027 si nécessaire, qualité prioritaire sur la date). Nettoyage §11 points 6-7 : statuts réels reflétés (recrutement tranché en GTM v3, pricing en attente de validation). Points 1-2-8-9 tranchés : palette des 10 badges Topic et vert olive validés provisoirement par le CEO/PO, hero orbital reclassé non-bloquant — voir Design Tokens v1.2.
> Changelog v5 : ajout §5quater — décision Algorithme & Personnalisation. Clarifie que "anti-algorithme" ne veut pas dire "zéro tri" : Following reste chronologique pur, For you/Trending/sponsorisé utilisent un ciblage par préférence explicite (pas par score d'engagement). Réconcilie le besoin CEO de ciblage intelligent (y compris sponsorisé) avec le principe déjà acté "jamais d'auto-insertion silencieuse" (Data Model §19) — pas de contradiction, juste une distinction jamais formalisée avant. Formulation "anti-algorithme" retirée du GTM (v3.2).
> Changelog v5.1 (correctif) : mise à jour des pointeurs de version obsolètes en en-tête (Spec v4.3→v4.4, Add Item Flow v2→v3). Aucun changement de fond.
> Changelog v5.2 : ajout §5quinquies — correction Curator Pro (prix tranché 9,90€/mois, "liens monétisés" retiré du Plan Pro). Décision CEO déjà actée dans GTM_LAUNCH_v1 §3.1 (v4) mais jamais propagée à la spec — corrigé ici (Spec v4.5→v4.6 §4.1). Repéré lors du checkup de cohérence pré-ouverture Dev & GSD (Étape 4).
> **Changelog v5.3 (rattrapage post-dev, Phases 1-4 en cours)** : de nombreuses décisions ont été prises pendant le développement (chantiers 4 à 15) sans jamais être repropagées dans les documents — repéré par le CEO/PO ("on n'a pas mis à jour les documents") après que GSD a commencé à signaler des incohérences spec/code en Phase 4. Rattrapage complet : ajout §12 (Landing en mode Light, pas Dark Cosmic), §13 (CMP first-party, Axeptio différé), §14 (Curator Pro payant entièrement reporté en V2), §15 (formule "For you"/"Trending" — résout §11 point 10), §16 (Theme toggle connecté différé Phase 5). §11 mis à jour (points résolus + deux nouveaux points ouverts : features Like/Comment jamais scopées, tracking des clics non implémenté). Corrections miroir dans `CURIO_SPEC_PIVOT_v4_7.md` (→ v4.8) et `CURIO_DATA_MODEL_v1_2_5.md` (→ v1.2.6).
> **Changelog v5.4 (ouverture Phase 5 — Polish & Extension)** : ajout §17 — décision Transport & Auth de l'extension Chrome, actée au lancement de la Phase 5. Tranche le transport (routes `/api/extension/*` enveloppant `lib/links`/`lib/collections`) et l'authentification (token dédié depuis une session web authentifiée, pas de cookie cross-origin). Découpage Phase 5 en 6 branches verrouillé dans `docs/CURIO_PHASE5_ROADMAP.md`.
> **Changelog v5.6 (branche `feat/smart-prefill`, « Add-to-Curio metadata pass »)** : ajout §18.7 — pré-remplissage additif *faible* du Save Flow par heuristique domaine → Topic (`topicFromDomain`) + candidats de tags depuis les métadonnées OG (`tagCandidatesFromMeta`), purement local, zéro IA, sous le signal fort de l'héritage cross-user 18.6. Ajout §18.8 + §11 point 14 — **piste V2 posée, non construite** : remplacer/enrichir cette heuristique par une catégorisation/suggestion de tags basée IA (LLM) quand le produit assumera coût, latence et transfert RGPD d'un appel externe.
> **Changelog v5.5 (chantier `link-subcategories`, Phase 5)** : ajout §18 — catégorisation d'un Link par Topic (obligatoire, y compris Unsorted) + sous-catégorie optionnelle. Table de référence `link_subcategories` (Travel + Food seuls équipés en V1, « Autre » en dernier), ancien `category` texte supprimé et réinterprété par `topic_id` + `subcategory_id` sur `user_links`, cohérence validée applicativement (« Model B », pas de trigger), catégorisation *stockée* personnelle (jamais canonique sur `links`) mais *suggestion* de pré-remplissage héritée **cross-user** du même Link canonique (§18.6, lecture service-role best-effort, jamais imposée). Migration `0015`, miroir Data Model §9/§9bis. Comble les ancres §18.2/§18.3/§18.5 déjà citées par la migration et le Data Model.

> Ce document capture le "pourquoi" derrière toutes les décisions produit.
> Il complète CURIO_SPEC_PIVOT_v4.8.md (le quoi) et CURIO_ADD_ITEM_FLOW_v3.1.md (le comment).
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

**Note v5.3** : Google Sign-In est configuré et fonctionnel (chantier Auth). Apple Sign-In reste codé mais désactivé — le compte développeur Apple (99$/an) n'a pas encore été créé, délibérément reporté sans bloquer le reste de l'auth. À activer une fois le compte créé, sans lien de dépendance avec la coque native (Apple Sign-In web ≠ App Store).

---

## 5quater. Algorithme & Personnalisation — Décision (v5)

**Contexte** : la spec (§1.1) et l'ancien pitch GTM affirmaient un positionnement "anti-algorithme" au sens littéral. Or plusieurs mécanismes déjà documentés supposent un calcul de tri/ciblage : Home "For you"/"Trending" (Spec §8.2), "Popular on Curio" (§8.3), "priorité recommandations" du Plan Pro (§4.1), et le placement sponsorisé contextuel (GTM v3 §3.3 point 3). Le CEO a confirmé vouloir un ciblage intelligent, y compris pour le sponsorisé. Décision actée pour lever l'ambiguïté avant la Phase 3 (App connectée).

**Principe retenu** : ce que Curio garantit n'est pas "zéro algorithme" — c'est qu'aucun algorithme ne s'interpose entre un curateur et les gens qui le suivent. Le tri et la personnalisation existent, mais toujours au service d'un goût explicitement choisi par l'utilisateur (Topics, curateurs suivis, historique de saves), jamais au service d'un score d'engagement à maximiser (temps passé, taux de clic).

**Application par surface** :
- **Home → "Following"** : chronologique pur, aucun tri. Garantie non négociable.
- **Home → "For you" / bouton "Personalize"** : personnalisation basée sur signaux explicites (Topics choisis, curateurs suivis, tags des saves passés). L'utilisateur peut ajuster ces signaux lui-même via "Personalize" (déjà visible sur la maquette Home, jamais spécifié fonctionnellement avant cette décision).
- **Home → "Trending" / Explore → "Popular on Curio"** : classement statistique (compteurs saves/clicks agrégés sur une fenêtre de temps), identique pour tous les utilisateurs — pas personnalisé, pas de boîte noire.
- **Placement sponsorisé contextuel** (GTM §3.3 point 3) : ciblage par Topics/intérêts déclarés de l'utilisateur, suggéré en contexte (recherche, complétion de Collection) — **aucune contradiction avec le principe "jamais d'auto-insertion silencieuse" (Data Model §19.2)**, qui protège uniquement contre l'ajout automatique sans action explicite. Le ciblage intelligent et l'ajout volontaire coexistent : l'algo peut suggérer, seul l'utilisateur ajoute.
- **Curator Pro "priorité recommandations"** (Spec §4.1) : boost de visibilité dans Explore/Curators pour les comptes Pro — mécanisme de placement séparé de la logique de goût, à traiter comme le sponsorisé (identifiable, pas un score d'engagement caché). **Note v5.3** : ce mécanisme est de fait inactif tant que Curator Pro payant reste différé en V2 (voir §14).

**Conséquence sur le pitch/positionnement** : la formulation absolue "pas d'algorithme entre vous et votre audience" est retirée du GTM (v3.2, §1.4) — remplacée par une version qui reste différenciante sans être trompeuse : la garantie porte sur "Following", pas sur l'absence totale de calcul ailleurs dans le produit.

**Ce qui reste ouvert** : ~~le détail technique du scoring "For you" (pondération Topics vs curateurs suivis vs recency) n'est pas spécifié ici — à traiter au moment du prompt GSD pour `/home`, en cohérence avec les principes ci-dessus, pas avant.~~ **Résolu, voir §15.**

---

## 5quinquies. Curator Pro — Correction (v5.2) : retrait des "liens monétisés" du plan payant

**Contexte** : le CEO a challengé, dans le fil Monétisation & GTM, la cohérence de faire payer un abonnement Pro alors que le modèle économique principal repose sur le volume de curateurs actifs générant du signal (§4.2/§4.3 de la spec, roadmap GTM §3.3 — affiliation automatique sur Links canoniques comme premier levier de revenu). Faire dépendre la monétisation par affiliation d'un abonnement payant allait à l'encontre de l'objectif de maximiser le volume de clics affiliés.

**Décision** :
- Curator Pro tranché à **9,90€/mois** (89€/an en option annuelle), bas de la fourchette précédemment ouverte (~9-12€), pour maximiser le nombre de comptes Pro plutôt que la marge par abonné — cohérent avec le principe déjà acté que les curateurs sont le moteur de la donnée, pas la source de revenu principale.
- **"Liens monétisés" retiré du contenu de Curator Pro.** La part de commission d'affiliation reversée au curateur sur ses propres Links devient disponible à **tout curateur actif** dès un seuil d'activité (nombre de clics minimum, Collection publique — seuil exact non tranché à ce stade), indépendamment du Plan souscrit.
- Curator Pro reste recentré sur : analytics avancées, badge Pro, priorité recommandations — des avantages "power user", sans toucher au moteur de revenu principal.

**Ce qui reste ouvert** : le seuil d'activité précis débloquant la monétisation des liens (nombre de clics, ancienneté du compte, volume de Collections publiques) n'est pas spécifié ici — à trancher par le CEO/PO avant implémentation de la logique de facturation/déblocage. **Note v5.3** : cette implémentation elle-même est désormais différée en V2, voir §14 — ce seuil ne bloque donc plus rien avant l'ouverture publique.

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
~~CMP français, RGPD-native. 3 catégories : nécessaires / analytics / marketing.~~ **Voir §13 — CMP effectivement livré en first-party, Axeptio reste le nom retenu pour une intégration externe future.**

**Supabase région EU (Frankfurt)**
Data residency RGPD. Non négociable pour le marché européen.

**Delete account = purge complète**
Obligation légale RGPD. Déjà prévu dans les maquettes Settings. **Livré et vérifié en conditions réelles au chantier Settings (Phase 4) : purge Storage + cascade DB + anonymisation `consent_logs.user_id` (SET NULL, pas de cascade destructive — le journal de preuve RGPD survit).**

---

## 10. Direction Visuelle

**Mode Light par défaut sur le web connecté**
Confirmé dans les maquettes Settings (Theme: Light). ~~Dark Cosmic = landing non connectée + app mobile.~~ **Voir §12 — la Landing non connectée est finalement livrée en Light (Archive), pas Dark Cosmic. Toggle réel dans Settings différé, voir §16.**

**Palette v2 définitive**
#0D0E15 (dark) / #FAFBF2 (light) / #785CFF (violet) / #CFC3FF (violet doux) / #D9C6A6 (beige) / #6A7B7A (vert olive, tranché — voir §11 point 2) / #E0DBB8 (brun clair) / #111111 (texte).

**Couleurs par Topic sur les badges**
Chaque Topic a sa couleur distinctive — palette complète des 10 badges tranchée provisoirement (CEO/PO), voir §11 point 1 et Design Tokens v1.2 §1.5.

**Typographie : Editorial Serif + Sans Serif moderne — TRANCHÉ**
Instrument Serif (titres) + Inter (UI, corps) — voir §11 point 3 et Design Tokens v1.2 §2.1. Ni Canela, ni Tempera, ni Editorial New — alternative libre retenue pour éviter le coût de licence.

**Fidélité maquettes = priorité absolue en dev**
Design Token File avant tout code. Comparaison screenshot maquette/rendu à chaque écran codé. GSD reçoit les tokens dans chaque prompt de dev.

---

## 12. Landing non connectée — Correction (v5.3) : Light (Archive), pas Dark (Cosmic)

**Contexte** : la spec (§8.1, §14.3) et ce document (§10, avant correction) affirmaient tous deux "Landing non connectée = Dark Cosmic". Au moment de coder la Landing réelle (chantier Pages publiques, Phase 2), deux maquettes se sont révélées contradictoires entre elles : le fichier dédié haute résolution `Curio_Accueil_non_log.jpeg` montre un rendu Light/Archive, tandis qu'une vignette dans une planche de synthèse multi-écrans montre du Dark — et le texte spec, lui, dit "dark" sans ambiguïté.

**Décision actée (CEO/PO)** : Light (Archive) retenu pour la Landing.

**Raison** : le conflit est purement visuel (choix de thème), pas fonctionnel — par la règle générale de ce document (§0), c'est donc la maquette qui fait foi, pas le texte spec. Entre les deux maquettes contradictoires, le fichier dédié haute résolution est jugé plus fiable qu'une vignette dans une planche de synthèse (plus susceptible d'être un brouillon non mis à jour). Ce choix est aussi cohérent avec l'intention produit : les deux modes nommés (Cosmic sombre "The Observatory" / Archive clair "The Archive", §14.4-14.6) semblent contextuels — Cosmic pour l'expérience app immersive (auth, onboarding, univers), Archive pour la vitrine éditoriale/marketing, en ligne avec les références visuelles du projet (Monocle, Kinfolk, Apartamento — esthétique papier claire, pas spatiale sombre, §14.7).

**Conséquence** : Welcome (écran 01 de l'Auth) reste en Cosmic dark — ce n'est pas la même page que la Landing marketing complète (§8.1), qui la remplace pour les visiteurs non authentifiés. `CURIO_SPEC_PIVOT_v4_7.md §8.1` et `§14.3` corrigés en conséquence (→ v4.8).

---

## 13. CMP Cookies — Correction (v5.3) : first-party livré, Axeptio différé

**Contexte** : la spec (§9, §15.3) nomme Axeptio comme CMP (cookie management platform) retenu. Au moment de construire le chantier Data & Cookies (Phase 1), aucun compte Axeptio n'existait — en créer un et configurer son dashboard externe aurait bloqué tout le chantier sur une dépendance non maîtrisée.

**Décision actée (CEO/PO, D006)** : bannière de consentement construite en first-party (dans le repo, on-brand, EN/FR), avec les 3 catégories exactes alignées sur `consent_logs.consent_type` (necessary/analytics/marketing), structurellement bloquante (aucun tracking avant décision explicite). Axeptio reste le nom retenu si une intégration externe est branchée plus tard — le point de bascule est documenté dans le code, pas un chantier fermé.

**Raison** : donne un contrôle total sur les 3 catégories, le rendu on-brand et le blocage structurel testable en code, plutôt que de dépendre d'un dashboard externe non configuré et invérifiable localement. Cohérent avec le principe déjà appliqué ailleurs (og:image dynamique plutôt qu'asset manquant, empty-states plutôt que données factices) : construire ce qui est correct maintenant, brancher le service externe réel plus tard si besoin.

**Conséquence** : `CURIO_SPEC_PIVOT_v4_7.md §15.3` corrigé pour refléter "CMP first-party (Axeptio pluggable)" plutôt que "Axeptio" tout court (→ v4.8).

---

## 14. Curator Pro payant — Décision (v5.3) : intégralement reporté en V2

**Contexte** : en préparant la Phase 4 (Universe & Plans), le CEO a demandé explicitement de retirer Curator Pro payant du périmètre — pas seulement le seuil d'activité laissé ouvert en §5quinquies, mais l'implémentation du paiement elle-même (Stripe : abonnement, webhooks, sandbox).

**Décision actée (CEO/PO)** : aucune intégration Stripe/paiement construite avant l'ouverture publique. Personne ne sera sur Curator Pro payant avant la fin de la beta de toute façon (tout utilisateur beta est Founding Curator ou Curateur 1ère année, tous deux gratuits avec le plan Pro complet inclus, §4.1) — construire le paiement maintenant n'aurait aucun bénéfice avant l'ouverture publique.

**Ce qui est construit en Phase 4** : uniquement le plumbing des plans gratuits — colonne `plan` sur `users`/`plans`, badges Founding/Pro affichés selon le plan résolu (chantier plans-badges). La section Billing dans `/settings` reste "Coming soon", sans même préparer de terrain Stripe côté schéma ou code.

**Conséquence** : `CURIO_SPEC_PIVOT_v4_7.md §4.1` annoté pour indiquer que Curator Pro payant est un livrable V2, pas Phase 4 (→ v4.8). Le point ouvert §11 point 11 (seuil d'activité) devient sans objet tant que Curator Pro payant n'existe pas.

---

## 15. Home — Formule "Following / For you / Trending" (v5.3) — résout §11 point 10

**Contexte** : §5quater avait acté le principe (Following chronologique, For you/Trending par préférence explicite, jamais par score d'engagement) mais laissait la formule exacte ouverte, à trancher "au moment du prompt GSD pour `/home`". C'est fait, au lancement du chantier `home-feed` (Phase 3).

**Décision actée (CEO/PO)** :
- **Following** : réel, chronologique pur — Collections publiques des curateurs suivis par l'utilisateur (`follows`), triées par date de publication/mise à jour.
- **For you** : Collections publiques dont le `topic_id` correspond à un des Topics choisis par l'utilisateur à l'onboarding (`user_topics`). Pas de pondération plus fine (curateurs suivis, tags, recency) à ce stade.
- **Trending** : Collections publiques triées par `followers_count` (via `collection_follows`) puis récence, non personnalisé — identique pour tous les utilisateurs.

**Raison** : reste fidèle au principe §5quater (jamais de score d'engagement caché) avec les signaux déjà disponibles en base (topics d'onboarding, follows, collection_follows) sans construire de nouvelle infrastructure de scoring. Le bouton "Personalize" (mentionné en §5quater comme visible sur la maquette mais jamais spécifié) reste hors scope Phase 3 — à spécifier séparément si le besoin se confirme après usage réel.

**Conséquence** : `CURIO_SPEC_PIVOT_v4_7.md §18 point 10` marqué résolu (→ v4.8).

---

## 16. Theme toggle (connecté) — Différé Phase 5 (v5.3)

**Contexte** : la spec (§8.14, §14.3) prévoit un vrai toggle Light/Dark dans `/settings` pour l'espace connecté, et la colonne `users.theme_preference` existe déjà en base (Data Model §2) — mais aucune page connectée n'a jamais été designée ni auditée en mode sombre (zéro classe `dark:` dans le code à ce jour).

**Décision actée (CEO/PO)** : la section Theme dans `/settings` (chantier Settings, Phase 4) reste "Coming soon" — pas de toggle fonctionnel livré tant qu'aucun audit dark mode complet n'a été fait sur les pages connectées.

**Raison** : un toggle "réel" mais non audité (bordures, cards, badges, images jamais vérifiés en sombre) produirait un dark mode à moitié cassé — contraire au principe de fidélité maquette (§10) et à l'exigence de vérification visuelle réelle avant de considérer un écran fini. Mieux vaut un état honnête ("bientôt disponible") qu'une fonctionnalité livrée mais dégradée.

**Conséquence** : le vrai toggle persisté est programmé pour la Phase 5 ("Design Tokens appliqués, comparaison screenshots systématique"), une fois l'audit dark mode fait sur `/home`, `/my-space`, `/saved`, `/projects`, `/collections/[id]`, `/settings`, `/analytics`, `/notifications`. La colonne `theme_preference` reste en base, prête, non exploitée par l'UI pour l'instant.

---

## 17. Extension Chrome — Transport & Auth (v5.4, ouverture Phase 5)

**Contexte** : la Phase 5 (§Spec Pivot v4.8 « Phase 5 — Polish & Extension ») prévoit une extension Chrome refaite avec 3 actions V1 : résoudre une URL en métadonnées (`resolve`), sauvegarder un Link (`save`), lister les Collections cibles de l'utilisateur (`collections`). Deux choix structurants devaient être tranchés avant d'écrire une ligne d'extension : par où passent les appels (transport), et comment l'extension s'authentifie (auth). Une extension s'exécute sur un origin `chrome-extension://…` distinct de l'app web — les décisions habituelles de session web ne s'y appliquent pas telles quelles.

**Décision actée (CEO/PO, ouverture Phase 5)** :

1. **Transport — option (a) : routes API dédiées.** Trois routes `/api/extension/{resolve,save,collections}` (App Router route handlers) enveloppent la logique métier déjà existante dans `lib/links` (résolution/normalisation d'URL, `og.ts`, création de Link) et `lib/collections` (liste des Collections de l'utilisateur, insertion dans une Collection). L'extension n'appelle jamais Supabase ni la logique métier en direct — elle passe exclusivement par ces routes.

2. **Auth — token dédié, pas de cookie cross-origin.** L'extension s'authentifie via un token dédié, obtenu par un flux de connexion depuis une session web déjà authentifiée (l'utilisateur se connecte sur l'app web, puis l'extension récupère/échange un token porté ensuite en en-tête sur les appels `/api/extension/*`). Aucun partage de cookie de session cross-origin entre `chrome-extension://` et le domaine web.

**Raison** :

- *Transport (a)* : réutilise `lib/links`/`lib/collections` sans dupliquer la logique métier ni la réimplémenter côté extension — une seule source de vérité pour la résolution d'URL, la normalisation et les règles d'insertion. Les routes forment une frontière explicite, versionnable et testable (Playwright ad-hoc + tests d'API) entre un client non fiable (l'extension) et le cœur applicatif, là où une extension tapant directement dans Supabase disperserait les règles RLS/métier sur un origin qu'on ne contrôle pas au runtime.
- *Auth par token dédié* : les cookies de session ne traversent pas proprement la frontière `chrome-extension://` → domaine web (SameSite, absence d'origin web fiable, risque CSRF sur des routes mutantes). Un token dédié rend l'authentification de l'extension explicite, révocable indépendamment de la session web, et découplée du cycle de vie du cookie web — cohérent avec le principe « frontière explicite pour un client non fiable » du choix transport.

**Conséquence** :

- Chantier `phase5/chrome-extension` : construit les 3 routes `/api/extension/*` (enveloppes minces au-dessus de `lib/links`/`lib/collections`), le flux d'émission/échange de token depuis une session web authentifiée, et l'extension consommant ces routes avec le token en en-tête.
- Les 3 routes doivent respecter les non-négociables projet : opt-in strict analytics (aucun event PostHog sans consentement), aucun cookie non essentiel posé par l'extension, région Supabase EU inchangée.
- Distribution V1 : build store-ready (icônes, manifest, lien Privacy Policy) livré par le chantier ; la soumission au Chrome Web Store est manuelle, effectuée par le CEO/PO plus tard — **hors périmètre** du chantier.
- Découpage complet de la Phase 5 en 6 branches : voir `docs/CURIO_PHASE5_ROADMAP.md`.

---

## 18. Catégorisation d'un Link — Topic + sous-catégorie (v5.4, chantier `link-subcategories`)

**Contexte** : le modèle de données portait sur `user_links` une colonne `category` (`text`, libre) jamais branchée à aucune UI ni à aucune règle. La spec (§8.11 `/saved` « Filtres + grille », §12 flow d'ajout) demande de classer un save par Topic, avec un affinage optionnel pour les Topics dont les usages sont hétérogènes (un save Travel peut être un hébergement, un restaurant, un lieu, une activité…). Il fallait trancher : (a) le niveau de catégorisation exposé, (b) où et comment il est stocké, (c) comment garantir sa cohérence, et (d) ce qui devient canonique (partagé entre utilisateurs) versus strictement personnel. Une extension et plusieurs surfaces (`/saved`, Save Flow web) consomment ces règles — elles devaient être écrites avant de coder.

**Décision actée (CEO/PO, ouverture du chantier)** :

**18.1 — Deux niveaux : Topic (principal) + sous-catégorie (optionnelle).** Le Topic réutilise les 10 badges existants (aucun nouveau vocabulaire visuel). La sous-catégorie affine le Topic pour les cas où l'usage est hétérogène ; une seule sous-catégorie par `user_link`.

**18.2 — Topic obligatoire ; sous-catégories seulement là où l'usage l'exige, jamais bloquantes.** Enregistrer un Link impose de choisir un Topic — y compris un save **Unsorted** (hors collection) : Unsorted décrit l'absence de collection, pas l'absence de Topic. En V1, **2 Topics sur 10** portent des sous-catégories — **Travel** (Hébergement / Restaurant / Lieu à voir / Activité / Transport / **Autre**) et **Food** (Restaurant / Recette / Bar-Café / Produit / **Autre**) — parce que leurs usages sont réellement hétérogènes. Les 8 autres Topics n'ont **aucune** ligne : leurs usages sont assez homogènes pour ne pas sur-découper (pas de sur-ingénierie). Chaque Topic sous-catégorisé porte un **« Autre »** trié en dernier : la valve d'échappement qui rend la sous-catégorie obligatoire *là où elle existe* sans jamais bloquer un save. Équiper un Topic supplémentaire plus tard = insérer des lignes, jamais une migration de schéma.

**18.3 — Table de référence structurée, pas de texte libre ; l'ancien `category` est supprimé, pas réutilisé.** Les sous-catégories vivent dans une table de référence dédiée `link_subcategories` (RLS lecture publique, comme `topics`), pas dans une colonne texte libre — le vocabulaire est fermé, versionnable et cohérent entre utilisateurs. La colonne `category` (`text`) est **supprimée** (`drop column if exists`) et réinterprétée par les deux colonnes FK `topic_id` + `subcategory_id` sur `user_links` : ajouter des sous-catégories est un `insert` de données, jamais une migration de schéma sur une base avec utilisateurs actifs.

**18.4 — Cohérence validée applicativement (« Model B »), pas par trigger.** `user_links` porte **les deux** clés `topic_id` et `subcategory_id` (nullable). La contrainte de cohérence — `subcategory.topic_id === topic_id` — est validée **dans l'application avant l'insert** (Save Flow web et routes), pas par un trigger DB. Le schéma reste simple et lisible ; la règle vit là où l'erreur peut être rendue à l'utilisateur (message localisé) plutôt que remontée d'une exception SQL opaque.

**18.5 — La catégorisation stockée est personnelle, jamais canonique.** Sur `links` (l'entité canonique partagée), seuls **titre / description / image** sont figés au niveau canonique. Le Topic et la sous-catégorie *stockés* pour un save vivent sur `user_links` — ils sont propres à chaque utilisateur et n'altèrent jamais le Link partagé. Deux utilisateurs peuvent classer le même Link canonique sous des Topics différents sans conflit ; le choix de l'un n'écrase jamais celui de l'autre.

**18.6 — La *suggestion* de catégorisation est héritée cross-user (pré-remplissage best-effort, jamais imposé).** Quand un utilisateur sauvegarde un Link que **quelqu'un d'autre** a déjà catégorisé, le Save Flow pré-remplit ses sélecteurs Topic/sous-catégorie avec la catégorisation la plus récente de **n'importe quel** utilisateur pour ce même Link canonique — pas seulement son propre historique. C'est une **suggestion** modifiable, pas une écriture : elle ne fige rien sur `links` (18.5 tient), l'utilisateur peut toujours la changer, et seuls les identifiants de référence `topic_id`/`subcategory_id` traversent — jamais l'identité de qui a classé le Link ni aucun contenu privé. Techniquement, la lecture passe par le client **service-role** (bypass RLS) : la RLS `user_links` étant « propriétaire ou collection publique », une lecture de session ne verrait que les saves d'autrui rangés dans une collection publique et manquerait les saves Unsorted/privés où vit l'essentiel de la catégorisation, biaisant la suggestion.

**18.7 — Pré-remplissage additif par heuristique domaine + mots-clés (v5.6, branche `feat/smart-prefill`, « Point 2 »).** Quand l'héritage cross-user (18.6) ne rend rien (Link jamais catégorisé par personne), le Save Flow tente deux **suggestions faibles**, purement heuristiques et sans IA : (a) `topicFromDomain(hostname)` — une table de règles domaine → Topic (ex. `booking.com` → Travel, `sephora.com` → Beauty), qui ne remplit le sélecteur Topic **que si l'héritage est vide** (18.6 reste le signal fort et prioritaire) et laisse le Topic « non touché » pour qu'un choix de Collection ultérieur puisse toujours l'écraser ; (b) `tagCandidatesFromMeta(title, description)` — tokenisation des métadonnées OG + retrait des stop-words EN/FR + dédup, plafonné à ~6, rendu sous forme de **chips non cochées** sous le champ tags, **jamais auto-appliqués** (l'utilisateur opte pour chaque chip individuellement). Helpers **purs** (`lib/links/prefill.ts`, aucune I/O, aucun secret), unit-testés comme `og`/`normalize`. Aucune sous-catégorie n'est jamais devinée. i18n « Suggested tags » / « Tags suggérés ».

*Raison* : capter un signal utile pour le tout premier saver d'un Link (que 18.6 ne couvre pas, faute d'antériorité) sans coût, sans latence, sans dépendance externe et sans donnée envoyée à un tiers (non-négociables projet). Le caractère **faible et modifiable** est délibéré : une mauvaise supposition de Topic est pire qu'aucune (l'utilisateur doit la remarquer et la corriger), d'où une table de règles restreinte à haute confiance et des tags jamais cochés par défaut.

**18.8 — Piste V2 (non construite) : remplacer/enrichir l'heuristique 18.7 par une vraie catégorisation/suggestion de tags basée IA (LLM).** Quand le produit sera prêt à assumer un appel externe, la table de règles domaine + l'extraction de mots-clés de 18.7 pourront être remplacées ou complétées par une catégorisation Topic/sous-catégorie et une suggestion de tags générées par un LLM (analyse du titre/description/contenu de la page). **Piste future, pas à construire maintenant.** Trois coûts à trancher avant de s'y engager : (1) **coût** de l'appel LLM par save ; (2) **latence** ajoutée dans le Save Flow (l'heuristique actuelle est synchrone et instantanée) ; (3) **RGPD** — envoyer le contenu d'une page tierce à un fournisseur LLM externe est un transfert de données à retrancher (choix du fournisseur, région, base légale, mention au consentement), là où 18.7 ne sort rien du périmètre EU. Tant que ces trois points ne sont pas tranchés, l'heuristique zéro-IA de 18.7 reste la solution en place. Voir §11 point 14.

**Raison** :

- *Table de référence plutôt que texte libre (18.3)* : un `category` libre jamais contraint dérive immanquablement (fautes, doublons, langues mêlées) et interdit tout filtre fiable. Une table de référence à lecture publique donne un vocabulaire fermé, traduisible et indexable — la même logique que `topics`.
- *Model B / validation applicative (18.4)* : un trigger de cohérence disperserait la règle métier dans la base, la rendrait invisible au code appelant et transformerait une erreur de saisie en exception SQL. Porter les deux FK sur `user_links` et valider `subcategory.topic_id === topic_id` avant l'insert garde une seule source de vérité côté application, testable et capable de rendre une erreur localisée.
- *« Autre » systématique (18.2)* : rendre la sous-catégorie obligatoire améliore la qualité du filtrage, mais un vocabulaire fermé finit toujours par ne pas couvrir un cas ; « Autre » (toujours en dernier) évite le double écueil « sous-catégorie obligatoire qui bloque » vs « sous-catégorie facultative qu'on saute systématiquement ».
- *Catégorisation personnelle (18.5)* : figer un Topic sur le Link canonique imposerait le classement d'un utilisateur à tous les autres — contraire au modèle « canonique partagé, filing personnel » (§2, §8). Garder Topic/sous-catégorie sur `user_links` préserve cette frontière.
- *Héritage cross-user de la suggestion (18.6)* : le Link est canonique et partagé (§2), donc la catégorie qu'un premier utilisateur lui a donnée est un signal collectif utile pour le suivant — la limiter à l'historique personnel raterait tout l'intérêt (un Link jamais sauvegardé par *moi* mais déjà classé par d'autres n'aurait aucune suggestion). Rester au niveau « suggestion best-effort » (jamais une écriture, toujours modifiable) capte ce signal sans violer 18.5 ni exposer de donnée personnelle — seuls des identifiants de vocabulaire fermé traversent.

**Conséquence** :

- Migration `0015_link_subcategories.sql` : table `link_subcategories` (RLS `select` public), `user_links` + `topic_id` + `subcategory_id` (FK, indexées), `drop column category if exists`, seed Travel (6) + Food (5) avec « Autre » en dernier. Re-runnable (garde `if exists`/`if not exists`, upsert sur `(topic_id, label)`).
- `docs/CURIO_DATA_MODEL_v1_2_6.md` : `user_links.topic_id`/`subcategory_id` documentés (§9), nouvelle table `link_subcategories` (§9bis).
- Surfaces : Save Flow web (Topic obligatoire + sous-catégorie conditionnelle + suggestion héritée **cross-user** du même Link canonique, cf. 18.6) ; `/saved` (filtre Topic + sous-catégorie). **Extension hors périmètre ce chantier** : un save par l'extension écrit `topic_id`/`subcategory_id` = NULL, catégorisable ensuite depuis `/saved` (conforme au périmètre « flow web » §12).
- Non-négociables projet respectés : région Supabase EU inchangée, aucun cookie non essentiel, i18n EN/FR sur toute nouvelle chaîne d'UI.

---

## 19. Recette Landing & parcours pré-connexion — Corrections (v5.4)

**Contexte** : recette de la landing page et du parcours pré-connexion (non connecté). Neuf retours instruits ; ce §19 consigne les trois qui portent une décision produit (6, 7, 9). Les autres retours étaient soit des fixes UI directs sans arbitrage (nav : Éditorial délinké, À propos déplacé au footer), soit des vérifications ayant conclu « comportement déjà correct » (5 Explorer liste bien toutes les collections publiques ; 8 les CTA d'auth convergent vers `/signup` par design, cf. Parcours UX §2 — tout inscrit est curateur, le parcours Founding Curator est le même signup + badge après token, sans entrée dédiée).

**Décisions actées (CEO/PO)** :

**19.1 — Répertoire `/curators` = Founding Curators uniquement, scope explicité dans le titre (retour 6).** Le répertoire filtre strictement `is_founding_curator = true` (`lib/public/data.ts` `getPublicCurators`) — comportement **confirmé correct**, cohérent avec GTM §1 (recrutement Founding Curators) et avec le traitement « suggestions best-effort / empty-state, pas de seeding » déjà acté. Rappel structurel : `users` n'a aucun flag de visibilité (RLS `users_select_public using(true)`), donc *toute* page `/profile/[username]` est publique ; un utilisateur au profil public mais non-Founding n'apparaît **pas** dans `/curators`, et c'est voulu. Pour lever l'ambiguïté « profil public ≠ présent dans l'annuaire », le **titre de page** et le **libellé de nav** passent de « Curateurs » à « Curateurs fondateurs » / « Founding Curators » (`Curators.metaTitle` + `Nav.curators`, EN/FR). Le titre éditorial du corps de page (« Rencontrez les esprits curieux » / « Meet the curious minds ») est **inchangé**.

**19.2 — Retrait des wordmarks de presse de la landing (retour 7, option a).** La landing affichait des wordmarks de presse (Monocle, Kinfolk, Sight Unseen, The New York Times, Apartamento, Vogue) sous le bandeau de preuve sociale, ce qui **laissait croire à un endorsement** de ces marques — faux et trompeur. Le bloc est **retiré sans remplacement**. La ligne « Rejoignez les 1 000 premiers curateurs » / « Join the first 1,000 curators » (`Landing.socialProof`) est **conservée** : GTM §1 acte ce cadrage comme CTA de recrutement Founding Curators, ce n'est pas une fausse affirmation. Une strip « dans l'esprit de… » (inspiration assumée, pas clients) reste une **piste de lancement (option b), volontairement différée** — à rouvrir plus tard, hors de ce chantier.

**19.3 — Distinction lexicale Curateur / Univers / Collection (retour 9).** Le vocabulaire public mélangeait « univers » et « collection ». Direction actée : **« Univers » = l'espace personnel d'un curateur** (usage réservé au hero-slogan et à la forme « l'univers de [curateur] » sur le profil) ; **« Collection »** pour toute carte issue de `getPublicCollections` (landing strip, Explorer). **Curateur = la personne** (identité/réputation) ; **Univers = son espace** ; **Collection = une unité dedans**. Au minimum, le titre « Explorez des univers inspirants » est reformulé avec « collections ». Le libellé exact (fr.json + en.json, toutes occurrences concernées) est **validé par le CEO/PO avant modification** des fichiers de traduction (branche `fix/curator-universe-wording`, en attente de validation du wording au moment de cette entrée).

**Raison** :

- *Titre « Curateurs fondateurs » (19.1)* : la donnée est autoritaire (le répertoire ne peut montrer que des Founding Curators tant que c'est le seul flag), et l'attente recette « les profils publics apparaissent sur Curateurs » venait d'un titre trop générique. Expliciter le scope dans le titre aligne l'attente sur le comportement sans changer la logique ni introduire de seeding.
- *Retrait presse (19.2)* : afficher des marques tierces sous une preuve sociale est une affirmation implicite d'usage/endorsement qu'aucune donnée ni aucun accord ne soutient — c'est le seul retour de ce lot qui touchait à l'honnêteté du produit, prioritaire sur l'esthétique du bandeau. Le CTA de recrutement, lui, est adossé à une stratégie actée (GTM §1) et reste légitime.
- *Lexique (19.3)* : le modèle produit distingue nettement personne / espace / unité ; utiliser « univers » tantôt comme slogan tantôt comme synonyme de « collection publique » brouille cette frontière côté public. Réserver « univers » à l'espace personnel et « collection » aux cartes restaure la cohérence avec le modèle, sans re-trancher le fond produit.

**Conséquence** :

- `fix/public-nav-simplify` : nav header simplifiée (Explorer · Curateurs fondateurs) ; Éditorial délinké header + footer (route `/editorial` conservée, cf. §11.5 toujours ouvert) ; À propos retiré du header (conservé au footer) ; `Curators.metaTitle` + `Nav.curators` → « Curateurs fondateurs » / « Founding Curators » (EN/FR). Note : ceci écarte sciemment l'ordre de nav décrit en spec §8.1 (« Explore · Curators · Editorial · About »), la spec restant la référence fonctionnelle mais ce point relevant du visuel/éditorial de la landing.
- `fix/landing-press-honesty` : retrait du bloc `PRESS` de `app/[locale]/page.tsx` ; `socialProof` conservé.
- `fix/curator-universe-wording` : à livrer après validation du wording (19.3) — au minimum le titre de la section « univers inspirants » de la landing.
- Non-négociables projet respectés : i18n EN/FR sur toute chaîne modifiée, aucun impact région Supabase / cookies, SEO (`generateMetadata`) inchangé côté structure.

---

## 11. Points encore ouverts

1. ~~Couleurs exactes badges par Topic~~ — **TRANCHÉ provisoirement (CEO/PO)** : voir Design Tokens v1.2 §1.5. 7/10 valeurs en attente de confirmation designer, non bloquant.
2. ~~Hex vert olive `#6A7B7A`~~ — **TRANCHÉ (CEO/PO)** : valeur documentée retenue comme canonique. Voir Design Tokens v1.2 §1.3.
3. ~~Police Editorial Serif exacte~~ — **TRANCHÉ (CEO/PO)** : Instrument Serif retenu. Voir Design Tokens v1.2 §2.1.
4. ~~App mobile V1 : React Native ou PWA ?~~ — **TRANCHÉ (v4, cf. §5ter)** : web mobile au lancement + coque native légère avant l'ouverture publique.
5. Contenu 3-5 pièces éditoriales V1 → à rédiger avant lancement. **Toujours ouvert.**
6. ~~Pricing Plan Brand/Business~~ — **Recommandation posée (GTM_LAUNCH_v1 v3 §3.2)** : programme pilote + grille à 3 niveaux. En attente de validation CEO/PO.
7. ~~Processus recrutement Founding Curators~~ — **TRANCHÉ (GTM_LAUNCH_v1 v3 §1)**. Rien à rouvrir ici.
8. **Composition hero orbital** — **Reclassé non-bloquant (CEO/PO)** : composition générée, pas un asset figé — on code à 10 points dès maintenant, ajustable après coup sans coût lourd.
9. ~~Risque de confusion badge Wellness / Design~~ — **RÉSOLU** : Wellness assigné à un bleu-sauge (`#93AFA8`), distinct de l'olive Design. Voir Design Tokens v1.2 §1.5.
10. ~~Détail technique du scoring "For you"~~ — **RÉSOLU (v5.3), voir §15.**
11. Seuil d'activité débloquant les "liens monétisés" (§5quinquies) — **Sans objet pour l'instant** (v5.3, voir §14) : Curator Pro payant lui-même est différé en V2, ce seuil ne bloque donc plus rien avant l'ouverture publique. À reprendre si/quand Curator Pro payant est relancé.
12. **[v5.3, nouveau]** Features Like / Comment / Mention — la spec (§8.13 Notifications) suppose ces trois types d'événements sociaux, mais aucune des trois fonctionnalités sources n'a jamais été scopée dans une phase du roadmap (§17). Le chantier Notifications (Phase 4) a livré les onglets correspondants en "Coming soon" plutôt que d'improviser leur construction. **À trancher** : ces features rejoignent-elles la Phase 4/5, ou sont-elles reportées en V1.1+ ? Pas de décision CEO/PO à ce jour.
13. **[v5.3, nouveau]** Tracking des clics (`links.clicks_count`) — la colonne existe en base et est listée comme "Dénormalisé" (Data Model §8) comme si elle était alimentée, mais aucun mécanisme ne l'incrémente à ce jour (repéré au chantier curator-analytics, Phase 4 — le dashboard affiche honnêtement "—" plutôt qu'un faux 0). Nécessite un point de capture d'événement (clic sortant sur un Link canonique) non encore construit. **À trancher** : quel chantier porte ce tracking, et avec quel mécanisme (redirect serveur, pixel, beacon) ?
14. **[v5.6, nouveau]** Catégorisation/suggestion de tags par IA (LLM) en remplacement/enrichissement de l'heuristique domaine + mots-clés (§18.7) — **piste V2 posée, pas à construire maintenant** (§18.8). À trancher avant tout engagement : coût par save, latence ajoutée au Save Flow, et surtout le transfert RGPD (envoi du contenu d'une page tierce à un fournisseur LLM externe — fournisseur, région, base légale, mention au consentement). Tant que ces points ne sont pas résolus, l'heuristique zéro-IA de §18.7 reste en place.
