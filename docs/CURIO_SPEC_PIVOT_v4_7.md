# CURIO — Spécification Produit
**Version 4.7 — Juillet 2026 — Document de référence unique**
> Changelog v4.2 : passage de 8 à 10 Topics Core (ajout Beauty, Wellness). Voir CURIO_DECISIONS_LOG_v3.md §5bis pour la justification complète.
> Changelog v4.3 : décision App mobile V1 tranchée (§16.1, §17, §18 point 4) — web mobile au lancement de la beta + coque native légère (Capacitor/Expo) avant l'ouverture publique, plutôt que React Native complet. Voir CURIO_DECISIONS_LOG_v4.md §5ter pour la justification complète. Nettoyage §18 points 6-7 : statuts réels reflétés (recrutement Founding Curator tranché en GTM v3, pricing Brand en attente de validation CEO/PO plutôt que "à traiter"). Palette des 10 badges Topic et vert olive tranchés provisoirement (§14.2, §18 points 1-2, 9) — voir CURIO_DESIGN_TOKENS_v1_2.md §1.3/§1.5. Hero orbital reclassé non-bloquant (§18 point 8).
> Changelog v4.4 : ajout §18 point 10 — clarification de la logique de tri/personnalisation Home (§8.2), suite à la décision Algorithme & Personnalisation actée en Decisions Log v5 §5quater. Le positionnement "anti-algorithme" ne signifie pas absence de tout tri — voir Decisions Log §5quater pour le détail par surface (Following/For you/Trending/sponsorisé).
> Changelog v4.5 (correctif de cohérence, Revues & Décisions) : §8.3 — liste des onglets Topics `/explore` complétée (Beauty, Wellness, Culture manquants, résidu de l'ancienne liste à 8 Topics). §16.2 et §17 (Roadmap Phase 0) — pointeurs vers `CURIO_DATA_MODEL_v1.md` et `CURIO_DESIGN_TOKENS_v1.md` mis à jour vers les versions réelles (`CURIO_DATA_MODEL_v1_2_3.md`, validé ; `CURIO_DESIGN_TOKENS_v1_2.md`) et cases Phase 0 recochées en conséquence. Aucun changement de fond, aucune décision produit modifiée.
> Changelog v4.6 (correctif de cohérence, checkup Étape 4) : §4.1 — Curator Pro tranché à **9,90€/mois** (fourchette "~9-12€" non tranchée retirée) + option annuelle 89€/an. "Liens monétisés" retiré du contenu du Plan Curator Pro et remplacé par une ligne dédiée : disponible à tout curateur actif dès un seuil d'activité (à définir), indépendamment du Plan souscrit — pour ne pas freiner le volume de clics affiliés (cf. GTM_LAUNCH_v1 §3.1 v4, décision CEO déjà actée mais jamais propagée ici). Voir CURIO_DECISIONS_LOG §5quinquies pour la justification.
> Changelog v4.7 (relecture globale finale, avant Dev & GSD) : §12.2 — correction d'une auto-incohérence du document trouvée par le fil Parcours & UX (v1.3) : le panel/bottom sheet mobile était encore décrit comme "Save link / Write a note / Create collection", contredisant §12.1 et sa propre règle ("Write a note = champ, pas une action séparée"). Corrigé en "Save link / Add a custom image / Create collection", cohérent avec §12.1. Correction miroir appliquée dans `CURIO_ADD_ITEM_FLOW_v3.md §2.2` (même résidu, même origine).

> Ce document fait foi sur toutes les décisions produit et fonctionnelles.
> En cas de contradiction avec les maquettes : **la spec prime**.
> Les maquettes sont la référence pour le design et le positionnement visuel uniquement.

---

## 1. Vision

### 1.1 Constat
"The internet became infinite. But discovery became passive. Algorithms decide what we see. Endless feeds replaced meaningful exploration. Curio brings back something human: Taste."

Les inspirations digitales sont fragmentées partout. On collectionne chaque jour. Mais ça ne devient jamais un univers.

### 1.2 Proposition de valeur
**Curio is: A social library of human curiosity.**

Pas un bookmark manager. Pas Pinterest pour les links. Pas un outil de productivité.

Curio permet de sauvegarder des links concrets et actionnables, de les organiser librement (avec autant ou aussi peu de structure qu'on veut), et de découvrir le monde à travers les univers des gens qui ont du goût.

### 1.3 Taglines & Mission
- **Tagline** : "The internet worth keeping."
- **Mission** : "To map human curiosity."
- **Signature** : "The human-curated internet."
- **Sous-titre** : "Collect links, ideas and places that inspire you. Discover the universes of curious minds."
- **Extension/App** : "Capture. Organize. Get inspired."

### 1.4 Ce que Curio EST vs N'EST PAS
| Curio EST | Curio N'EST PAS |
|---|---|
| Curious | Geeky |
| Cultured | Elitist |
| Open | Corporate |
| Intelligent | Trend-driven |
| Contemporary | Loud |
| Human | |

### 1.5 Trois piliers produit
- **Discovery** — Explore the worlds of other people
- **Collection** — Save what matters
- **Connection** — Understand why something matters

### 1.6 Positionnement

| Attribut | Valeur |
|---|---|
| Type | Web app responsive + app mobile iOS/Android |
| Approche technique | Nouvelle DB, nouvelle codebase, extension Chrome refaite |
| Cible MVP | Beta privée ~100 Founding Curators, puis ouverture publique |
| Planning | Specs fin juillet 2026 → dev août-octobre → beta nov 2026-jan 2027 |
| Déploiement | Vercel |
| Langue | Anglais par défaut + français V1 (next-intl, détection auto navigateur + toggle manuel) |
| Auth | Google OAuth + Apple + Email |
| Références éditoriales | Monocle, Kinfolk, Sight Unseen, Apartamento, Vogue, NYT |

### 1.7 Valeurs (brand book)
- **Human first** : les personnes avant les algorithmes
- **Curiosity driven** : explorer, apprendre, rester ouvert
- **Thoughtfully curated** : qualité sur quantité
- **Built to last** : une plateforme qui grandit avec toi

---

## 2. Lexique — Terminologie définitive

| Terme | Définition | Dimension |
|---|---|---|
| **Link** | Un lien sauvegardé, enrichi (titre, description, image, tags, note perso) | Unité de base |
| **Section** | Sous-groupe nommé à l'intérieur d'une Collection (ex. "Restaurants", "Hôtels") | Organisation interne |
| **Collection** | Agrégat de Links organisé autour d'un sujet — **objet central et social** | Sociale/Publique |
| **Project** | Conteneur organisationnel qui regroupe plusieurs Collections liées — **toujours privé** | Personnelle/Privée |
| **Universe** | L'ensemble des Projects, Collections et Links d'un utilisateur | Personnelle |
| **Unsorted** | Vue des Links sauvegardés sans Collection | Personnelle |
| **Topic** | Centre d'intérêt éditorial (liste fixe, voir §5) | Système |
| **Tag** | Label entièrement libre sur un Link | Libre |
| **Note** | Commentaire personnel sur un Link ou une Collection (privé, pas social) | Personnelle |
| **Curator** | Utilisateur qui crée et partage des Collections publiques | Social |
| **Founding Curator** | Invité beta privée, badge permanent, Plan Pro à vie | — |
| **My Space** | Espace personnel connecté (profil + univers + stats + activité) | Personnelle |

---

## 3. Hiérarchie des objets — Définitive

### 3.1 Structure
```
Project "Tour du monde 2027" [toujours privé]
├── Collection "Sri Lanka" [peut être rendue publique]
│   ├── Section "Hôtels"
│   ├── Section "Restaurants"
│   └── Section "Plages"
└── Collection "Malaisie" [peut être rendue publique]
    └── Section "Hôtels"

Collection "Week-end à Milan" [standalone, peut être publique]
├── Section "Restaurants"
├── Section "Hôtels"
└── Section "Shopping"

Links non classés → vue "Unsorted" dans My Space
```

### 3.2 Règles fondamentales

| Règle | Détail |
|---|---|
| Un Link peut exister sans Collection | Atterrit dans la vue "Unsorted" |
| Une Collection peut exister sans Project | Standalone — cas le plus courant |
| Un Project contient uniquement des Collections | Jamais de Links directs dans un Project |
| Une Collection peut contenir des Sections | Optionnelles, libres, nommées à la main |
| Une Section contient des Links | L'unité de rangement finale |
| Project = toujours privé | Jamais visible publiquement, jamais sur le profil public |
| Collection = peut être publique | Vitrine sociale, visible sur le profil public |
| Section = toujours dans une Collection | Jamais standalone |
| Note = toujours privée | Sur un Link ou une Collection, jamais affichée publiquement |

### 3.3 Ce que voit le monde extérieur
Sur le profil public d'un curateur : ses **Collections publiques** avec leurs Sections et Links.
Jamais ses Projects, jamais ses Links non classés, jamais ses Notes.

### 3.4 Ce que voit l'utilisateur dans My Space
Tout : Projects (et leurs Collections), Collections standalone, Links non classés (Unsorted).

---

## 4. Modèle économique

### 4.1 Plans

| Plan | Cible | Prix | Inclus |
|---|---|---|---|
| **Gratuit** | Tous | 0€ | Sauvegarder links, créer Projects/Collections/Sections, suivre, analytics de base |
| **Founding Curator** | ~100 premiers invités | Gratuit à vie | Plan Pro complet + badge permanent |
| **Curateur (1ère année)** | Lancement public | Gratuit 1 an | Plan Pro complet pendant 1 an |
| **Curator Pro** | Curateurs actifs | 9,90€/mois (89€/an) | Analytics avancées, badge Pro, priorité recommandations |
| **Brand/Business** | Annonceurs | À définir | Données agrégées, placement contextuel sponsorisé |

**Monétisation des liens (tous plans)** — la part de commission d'affiliation reversée à un curateur sur ses Links canoniques n'est **pas** un avantage Curator Pro : elle se débloque pour tout curateur actif dès un seuil d'activité (nombre de clics minimum, Collection publique — seuil exact non tranché), indépendamment du Plan souscrit. Objectif : ne jamais faire dépendre le volume de clics affiliés — moteur de revenu principal (§4.2) — d'un abonnement payant.

### 4.2 Monétisation principale
Placement produit contextuel (links sponsorisés selon Topics/tags des utilisateurs) + accès aux données agrégées pour les marques. Différenciation vs Pinterest : intention d'achat réelle vs inspiration vague.

### 4.3 Data comme actif
Chaque link canonique génère des signaux : saves, clicks, tags associés, profil des sauvegardeurs. C'est la data vendue aux marques. Les compteurs canoniques sont la base de cette valeur.

---

## 5. Topics — Liste définitive

### 5.1 Beta V1 — 10 Topics Core
Affichés partout : landing orbitale, navigation, onboarding, filtres.

| ID | EN (DB) | FR (UI) | Icône |
|---|---|---|---|
| travel | Travel | Voyages | 🌍 |
| style | Style | Style | 👗 |
| beauty | Beauty | Beauté | 💄 |
| wellness | Wellness | Bien-être | 🧘 |
| food | Food | Food | 🍽️ |
| books | Books | Livres | 📚 |
| ideas | Ideas | Idées | 💡 |
| culture | Culture | Culture | 🎬 |
| design | Design | Design | 🏛️ |
| photography | Photography | Photo | 📷 |

**Topics Core V1 (liste officielle)** : Travel · Style · Beauty · Wellness · Food · Books · Ideas · Culture · Design · Photography

### 5.2 V1.1+ — Topics Extended
Tech · Business · Science — activés selon contenu produit naturellement par les Founding Curators.

### 5.3 Règles Topics
- Stockés en anglais en DB, traduits dans l'UI via next-intl
- 1 Collection = 1 Topic principal
- Links héritent le Topic de la Collection
- Tags = entièrement libres (pas de taxonomie système)
- **La spec prime sur les maquettes d'onboarding** : si les maquettes montrent des Topics différents, c'est la liste ci-dessus qui fait foi

---

## 6. Onboarding — Séquence officielle

### 6.1 Règle générale
La spec prime sur les maquettes d'onboarding pour le contenu fonctionnel. Les maquettes sont la référence pour le design et le positionnement visuel.

### 6.2 Founding Curator (token d'invitation)
Même flow que le Découvreur + badge Founding Curator appliqué automatiquement à la fin.

### 6.3 Découvreur — Séquence (3 steps)

| # | Écran | Contenu fonctionnel |
|---|---|---|
| 01 | Welcome | Logo C orbital dark, tagline, "Build your universe" + "Explore" |
| 02 | Sign up / Log in | Apple / Google / Email + "Log in" |
| 03 | Interests (Step 1/3) | "What are you curious about?" — 10 Topics Core — sélection libre — CTA "Continue" |
| 04 | Curators (Step 2/3) | "Follow curators you love" — suggestions selon Topics choisis — CTA "Continue" |
| 05 | Universe (Step 3/3) | "Create your first universe" — champ nom (10/20 chars) + palette couleurs (5) — CTA "Create my universe" |
| 06 | Universe ready | "Your space is ready!" — animation C orbital — CTA "Start exploring" |
| 07 | You're all set | 3 rappels (Save / Organize / Discover) — CTA "Let's go" |
| 08 | Home | Feed "For you" + "Following" + "Trending" |

---

## 7. Navigation

### 7.1 Non connecté — Header horizontal
```
[C · curio]   Explore · Curators · Editorial · About   [Log in] [Sign up →]
```
Pas de "Home" dans le header public — la landing page EST la home.

### 7.2 Connecté — Sidebar gauche (desktop)
```
[C · curio]
──────────────
🏠 Home
🔍 Explore
👤 Curators
📚 Collections
🔖 Saved
❤️ Likes
🕐 History
──────────────
MY SPACE
🌌 My Universe
📁 Projects
⚙️ Settings
↪️ Log out
──────────────
[Curio for iOS · Download the app]
[Avatar · Prénom · View profile]
```

### 7.3 Mobile — Bottom nav
```
🏠 Home   🔍 Explore   ➕ (FAB)   📚 Collections   👤 My Space
```
FAB → bottom sheet "Add to Curio" : **Save link / Add a custom image / Create collection**
- "Write a note" = champ dans le flow Save link, pas une action séparée du FAB
- Take a screenshot de page web → hors scope définitivement

### 7.4 Header connecté
"Good morning, [Prénom] ✦ · Discover something inspiring today." + Search bar + cloche + avatar

---

## 8. Pages — Spécification complète

### 8.1 `/` Landing (non connecté)
- Hero dark Cosmic : "The internet worth keeping." + sous-titre + CTA "Build your universe" + "Explore"
- Visualisation orbitale animée : You au centre, 10 Topics Core en orbites *(⚠️ composition visuelle probablement designée pour 8 points — validation designer requise, voir points ouverts §18)*
- Social proof : "Join the first 1,000 curators." + avatars
- Logos presse : Monocle · Kinfolk · Sight Unseen · NYT · Apartamento · Vogue
- Section "Explore inspiring universes." + cards Collections
- 4 valeurs : Collect anything / Organize beautifully / Discover through people / Keep what matters

### 8.2 `/home` (connecté)
- "Good morning, [Prénom] ✦"
- Filtres Topics horizontaux (All · 10 Topics) + "Personalize"
- "Picked for you" : cards Collections avec badge Topic coloré
- "From your curators" : activité récente des follows
- "Continue exploring" : tags suggestifs
- Sidebar droite : My Universe miniature + stats + Curators you follow + CTA "Create a collection"
- **Empty state** : "Follow curators to see their discoveries here" → CTA /curators
- **Logique de tri/personnalisation "For you"/"Trending"/"Personalize"** : voir Decisions Log §5quater — Following reste chronologique pur, For you se base sur préférences explicites (Topics/curateurs/tags), Trending reste statistique non-personnalisé. Scoring exact "For you" à trancher au moment du prompt GSD (§18 point 10).

### 8.3 `/explore`
- Onglets Topics : All · Travel · Style · Beauty · Wellness · Food · Books · Ideas · Culture · Design · Photography
- "New & noteworthy" + "Explore by collections" + "Popular on Curio"

### 8.4 `/curators`
- "Meet the curious minds"
- Filtres : Topics + Expertise (Local Expert / Writer / Creator / Academic / Entrepreneur) + Top Locations
- Grille curateurs + "Rising curators" + Curator Spotlight + "Join as a curator" CTA

### 8.5 `/editorial`
- Contenu produit par Curio : guides, essais, interviews, collections curatées
- V1 : 3-5 pièces statiques de qualité. V1.1 : CMS éditorial

### 8.6 `/about`
- Mission + valeurs (Human first / Curiosity driven / Thoughtfully curated / Built to last)
- Timeline 2022→Today + équipe + stats globales + CTA "Start your universe"

### 8.7 `/collections/[id]` — Page Collection
- Cover image + badge Topic coloré + titre + description
- Owner (avatar + nom) + stats : Links / Followers / "Updated X days ago"
- Tags libres (pills)
- Onglets : **Links · About**
- Vue Links : toggle grille/liste + filtre par Section + tri Newest + Filters
- Chaque link : image + titre + source + Section badge + date + menu ···
- Toggle Liste/Carte si ≥1 link géolocalisé
- Sidebar droite : About + Stats (Links/Sections/Followers) + Sections (liste avec compteurs) + Followers (avatars)
- Actions : **Follow / Save a copy / Share**
- **Empty state** : "This collection is empty. Add your first link." → CTA Save

### 8.8 `/projects/[id]` — Page Project (connecté uniquement)
- Toujours privé — jamais accessible à un visiteur non authentifié
- Header : titre + description + stats (Collections / Links total)
- Grille des Collections du Project
- Actions : Edit / Add collection / Delete
- **Pas de Links directs** — uniquement des Collections

### 8.9 `/my-space`
- Avatar orbital + nom + badge + bio + localisation + site + date inscription
- Topics actifs (pills) + Add
- "Your latest collections" avec badges Topics colorés
- "Curators you follow"
- Section "Your universe is unique. Keep exploring, keep collecting, keep building."
- Sidebar droite : stats (Saved links / Collections / Likes / Curators followed) + Top category + Recent activity + Your collections

### 8.10 `/profile/[username]` — Profil public
- Nom + badge + bio + localisation + site + stats (Collections / Followers / Following)
- Actions : Follow · ···
- Onglets : **Collections · Activity**
- **Visible** : Collections publiques uniquement
- **Non visible** : Projects (toujours privés), Links non classés, Notes

### 8.11 `/saved` (Unsorted + Saved)
- Links non classés (Unsorted) + tous les links sauvegardés
- Onglets : All · Links · Collections sauvegardées (via "Save a copy") · Articles · Videos
- Filtres + grille
- Note : l'onglet "Collections" affiche les Collections copiées via "Save a copy" depuis le profil d'autres curateurs

### 8.12 `/search`
- Onglets résultats : All · Collections · Links · Curators
- Recherche full-text sur titres, descriptions, tags

### 8.13 `/notifications`
- Onglets : All · Comments · Follows · Likes · Mentions

### 8.14 `/settings`
- Account : Profile · Preferences · Notifications · Privacy · Connected apps · Language · Theme (Light/Dark) · Billing
- CTA "Delete account" → purge complète RGPD

---

## 9. Links — Modèle canonique

### 9.1 Principe
1 URL normalisée = 1 Link en base. Métadonnées figées au 1er save (stockées Curio). Compteurs partagés : saves, clicks, forks. URL d'origine conservée par relation UserLink (pour affiliation/monétisation).

### 9.2 Champs

| Champ | Type | Obligatoire | Note |
|---|---|---|---|
| URL (normalisée) | text | oui | Clé de canonicalisation |
| URL d'origine | text | oui | Conservée dans UserLink |
| Titre | text (100 chars) | oui | Auto-rempli OG, éditable |
| Description | text (300 chars) | non | Auto-rempli OG, éditable |
| Image preview | image (Supabase Storage) | non | Auto-fetch OG, stockée chez Curio |
| Tags | text libres | non | Entièrement libres |
| latitude/longitude/adresse | geo | non | Optionnel, auto si dispo |

### 9.3 Champs de la relation UserLink (personnels, privés)

| Champ | Type | Note |
|---|---|---|
| collection_id | référence nullable | null = Unsorted |
| section_id | référence nullable | null = pas de section |
| note | text (500 chars) | Commentaire perso, privé |
| saved_at | timestamp | |
| url_origin | text | URL avec tracking/affiliation |

### 9.4 Normalisation URL
Suppression automatique : UTM params, fbclid, gclid, ref, tags affiliation, www, https normalisation, trailing slash. L'URL d'origine (avec tracking) est conservée dans UserLink pour le partage de revenus futur.

### 9.5 Liens morts
Job hebdomadaire de vérification → badge "Link unavailable" discret si 404/timeout. Données et compteurs conservés. Notification optionnelle au curateur.

### 9.6 Signal canonique
À l'ajout d'un link déjà en base : encart "X people saved this" + mention des personnes suivies si pertinent. Matérialise la valeur sociale du canonique.

### 9.7 Note sur un Link
Champ `note` dans UserLink (privé, 500 chars). Accessible depuis l'extension et le FAB. Exemples d'usage : "Inspiration pour le projet X", "À acheter en janvier", "Recommandé par Clara". Jamais affiché publiquement.

---

## 10. Collections

### 10.1 Définition
Agrégat de Links organisé autour d'un sujet. Peut contenir des Sections pour organiser les Links en sous-groupes. Objet central de la dimension sociale.

### 10.2 Sections
- Optionnelles, créées à la main, nommées librement
- Templates suggérés à la création selon le Topic :
  - Travel → Hôtels / Restaurants / Lieux à voir / Itinéraire
  - Food → À tester / Recettes / Adresses / Ingrédients
  - Style → À shopper / Inspirations / Marques
  - Design → Lieux / Objets / Références
  - Autres → À découvrir / Favoris / Archive
- 1 Link = 1 Section (modèle dossier, pas tag)
- Drag & drop pour réorganiser links et sections
- Links sans section = dans une zone "Unsectioned" en bas de la Collection

### 10.3 Note sur une Collection
Champ `note` sur l'entité Collection (privé, 500 chars). Commentaire personnel du propriétaire sur sa propre collection. Jamais affiché publiquement.

### 10.4 Actions sociales
- **Follow** : abonnement aux mises à jour ("you'll see updates")
- **Save a copy** : copie indépendante dans son propre univers
- **Share** : lien public partageable

### 10.5 Visibilité
- Privée par défaut, rendue publique en 1 toggle
- Si dans un Project : peut être rendue publique indépendamment du Project

---

## 11. Projects

### 11.1 Définition
Conteneur organisationnel personnel. Regroupe des Collections liées à un même thème ou projet de vie. Toujours privé — jamais visible publiquement.

### 11.2 Règles
- Contient uniquement des Collections (jamais de Links directs)
- Toujours privé — pas de toggle public
- Visible uniquement dans My Space (connecté)
- Les Collections à l'intérieur peuvent être rendues publiques individuellement

### 11.3 Exemples d'usage
- "Tour du monde 2027" → Collections "Sri Lanka", "Malaisie", "Kenya"
- "Rénovation appartement" → Collections "Cuisine", "Salon", "Chambre"
- "Inspiration pro 2026" → Collections "Design systems", "Typographies", "Couleurs"

---

## 12. Flow "Save a Link"

### 12.1 Extension Chrome — 3 actions V1
Panel Curio — 3 actions + 1 lien de navigation :
- **Save link** ← action principale
- **Add a custom image** ← uploader une image perso ou prendre une photo (si fetch OG échoue ou image inadaptée)
- **Create collection** ← créer une nouvelle Collection
- View my space → (lien de navigation, pas une action)

> Write a note = champ disponible dans le flow Save link (étape Customize), pas une action séparée du panel
> Take a screenshot de page web → hors scope définitivement

**Étapes :**
1. Sur un site → clic icône Curio
2. Panel s'ouvre → "Save link"
3. Fetch OG auto (ou récupération depuis base si canonique existant) + signal "X people saved this" si pertinent
4. Customize : Titre + Description + Tags libres + Note perso (optionnelle)
5. Save to : sélection Collection (+ Section optionnelle) ou "Unsorted"
6. Saved! → "View in collection" ou "Continue exploring"

### 12.2 App Mobile — FAB
Bottom sheet "Add to Curio" : **Save link / Add a custom image / Create collection**

**Étapes :**
1. Tap + (FAB) → "Save link"
2. Coller URL → preview auto
3. Customize : Titre + Description + Tags + Note perso
4. Add to : Collection (+ Section) ou Unsorted
5. Saved!

### 12.3 Règles du flow
- Note perso = optionnelle, privée, 500 chars, dans UserLink
- Tags = entièrement libres
- Visibilité = héritée de la Collection choisie
- Si Unsorted → Link privé par défaut

---

## 13. Notes — Périmètre définitif

Les Notes ne seront **jamais** une feature standalone dans Curio. Curio n'est pas une app de prise de notes — des outils existent déjà pour ça et ce n'est pas le but du produit.

En V1 et définitivement : uniquement deux champs commentaire simples :
- **Note sur un Link** (dans UserLink, 500 chars, privé) — "Pourquoi j'ai sauvegardé ça ?"
- **Note sur une Collection** (dans Collection, 500 chars, privé) — commentaire perso du propriétaire

Jamais affichés publiquement. Jamais d'entité Note standalone. Décision définitive.

---

## 14. Direction Visuelle

### 14.1 Palette finale (brand book v2)
| Rôle | Hex |
|---|---|
| Fond dark (Cosmic) | `#0D0E15` |
| Fond light (Archive) | `#FAFBF2` |
| Accent violet | `#785CFF` |
| Accent violet doux | `#CFC3FF` |
| Beige/champagne | `#D9C6A6` |
| Vert olive | `#6A7B7A` *(tranché CEO/PO — voir §18 point 2 et Design Tokens v1.2 §1.3)* |
| Brun clair | `#E0DBB8` |
| Texte dark | `#111111` |

### 14.2 Couleurs par Topic (badges) — TRANCHÉ provisoirement (CEO/PO)
Palette complète des 10 badges assignée pour débloquer le dev — voir `CURIO_DESIGN_TOKENS_v1_2.md §1.5` pour les valeurs hex et le détail par Topic. Travel/Design/Food confirmés par mesure directe ; les 7 autres sont provisoires, en attente de confirmation designer, mais utilisables en dev sans bloquer.

### 14.3 Mode par défaut
- Web connecté : **Light (Archive)** par défaut — toggle dans Settings
- Landing non connectée : Dark (Cosmic)
- App mobile : Dark (Cosmic)

### 14.4 Deux modes UI
- **Cosmic** (dark `#0D0E15`) : découverte, émotion, wonder, nuit → "Explore"
- **Archive** (light `#FAFBF2`) : connaissance, mémoire, clarté → "Collect"

### 14.5 Typographie — TRANCHÉ
- **Editorial Serif** : **Instrument Serif** (titres, grandes phrases éditoriales) — voir §18 point 3 et Design Tokens v1.2 §2.1
- **Sans Serif moderne** : **Inter** (interfaces, corps, labels)

### 14.6 Logo — The Curiosity Orbit
C = Curio/Curiosity/Collection. Orbite = univers vivant. Points = links/books/places/people/ideas.
Dark "The Observatory" / Light "The Archive".

### 14.7 Philosophie visuelle
Grandes images éditoriales, espace blanc généreux, typographie forte, animations orbitales subtiles, constellation de points. Références : Monocle, Kinfolk, Apartamento.

---

## 15. Contraintes Techniques Transverses

### 15.1 SEO — Natif dès le 1er écran codé
- `generateMetadata()` Next.js sur chaque page publique (title, description, og:image, og:title, canonical)
- JSON-LD structured data : Person (profils), CollectionPage (Collections publiques), Article/Product (Links)
- URLs propres et stables : `/curators/clara-martin`, `/collections/tokyo-by-locals`
- Sitemap dynamique auto-généré depuis DB (profils publics + Collections publiques)
- `robots.txt` : indexer public, bloquer /my-space /projects /settings et toutes les pages connectées
- Pages publiques accessibles et crawlables sans login
- `next/image` (lazy loading, WebP/AVIF), `next/font` (pas de FOUT), CLS = 0
- ISR (Incremental Static Regeneration) pour les pages publiques à fort trafic

### 15.2 Collecte de Data — PostHog
Outil : PostHog (open source, self-hostable, RGPD-friendly)

Events obligatoires :
- `link_saved` (link_id, user_id, collection_id, section_id, topic, tags, is_canonical)
- `link_clicked` (link_id, user_id, source_collection_id, is_canonical)
- `collection_followed` (collection_id, follower_id, topic)
- `curator_followed` (curator_id, follower_id, via_topic)
- `search_query` (query, results_count, topic_filter)
- `topic_selected` (topic, context)
- `onboarding_step_completed` (step, duration)
- `first_save` (user_id, days_since_signup)
- `first_collection_created` (user_id, days_since_signup)

Propriétés utilisateur : topics, type (curator/discoverer), plan, langue, localisation, dates clés.

### 15.3 RGPD & Cookies — Axeptio
- CMP : Axeptio (français, RGPD-native)
- Strictement nécessaires (auth, session) : sans consentement
- Analytics (PostHog) : consentement requis
- Marketing/placement produit : consentement requis
- Privacy Policy + CGU en ligne dès le lancement
- "Delete account" = purge complète de toutes les données personnelles en DB
- Supabase région EU (Frankfurt) pour data residency RGPD
- PostHog en mode opt-in strict (aucun tracking avant consentement)
- ConsentLog : table dédiée pour logger les consentements (user_id, consent_type, timestamp, version_policy)

---

## 16. Architecture Technique

### 16.1 Stack
- **Frontend** : Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Hébergement** : Vercel
- **i18n** : next-intl (EN par défaut + FR V1)
- **Analytics** : PostHog
- **Cookies/RGPD** : Axeptio
- **Dev** : GSD (@opengsd/gsd-pi@latest v1.0.2), Claude Sonnet 5
- **Extension** : Chrome Extension MV3 (refaite)
- **App mobile** : Web mobile responsive (Next.js) pour la beta privée, puis coque native légère (Capacitor/Expo) avant l'ouverture publique — décision actée, voir §17 et Decisions Log §5ter

### 16.2 Entités DB — Liste complète
> Modèle détaillé : `CURIO_DATA_MODEL_v1_2_3.md` — Validé

| Entité | Rôle |
|---|---|
| User | Compte utilisateur |
| Topic | 10 Topics Core fixes (extensibles) |
| Project | Conteneur organisationnel privé |
| Collection | Objet social central (dans Project ou standalone) |
| Section | Sous-groupe dans une Collection |
| Link | Link canonique (1 URL = 1 objet) |
| UserLink | Relation user↔link (note, section, collection, url_origin) |
| Follow | user→user (table unique) |
| InvitationToken | Tokens Founding Curator |
| Plan | Plans freemium |
| Notification | Activité sociale |
| Editorial | Contenu Curio |
| ConsentLog | Log des consentements RGPD |

---

## 17. Roadmap

### Phase 0 — Specs (fin juillet 2026)
- [x] Spec produit v4.5
- [x] Flow save a link v3.0
- [x] Decisions log v5.1
- [x] Modèle de données complet (CURIO_DATA_MODEL_v1_2_3.md)
- [x] Design Token File (CURIO_DESIGN_TOKENS_v1_2.md)

### Phase 1 — Fondations (août)
- [ ] Setup Next.js 15 + TypeScript + Tailwind + Supabase + next-intl + PostHog + Axeptio
- [ ] Auth (Google/Apple/Email + token invitation Founding Curator)
- [ ] DB : toutes les entités core
- [ ] Onboarding 3 steps (Interests → Curators → Universe)
- [ ] SEO fondations (metadata, sitemap, robots.txt)

### Phase 2 — Pages publiques (août-septembre)
- [ ] Landing `/` (hero orbital animé dark Cosmic)
- [ ] `/explore`, `/curators`, `/editorial` (statique V1), `/about`
- [ ] Sign in / Sign up

### Phase 3 — App connectée (septembre)
- [ ] `/home` (feed personnalisé + empty states)
- [ ] `/collections/[id]` (Links + Sections + vue liste/carte)
- [ ] `/projects/[id]` (grille de Collections)
- [ ] `/saved` (Unsorted + tous les links)
- [ ] `/my-space`, `/profile/[username]`
- [ ] Save Flow (extension 3 actions + FAB mobile)

### Phase 4 — Universe & Plans (octobre)
- [ ] My Universe orbital view
- [ ] Plans freemium + badges (Founding/Pro)
- [ ] Analytics curateurs (saves/clicks/forks)
- [ ] Notifications

### Phase 5 — Polish & Extension (octobre)
- [ ] Extension Chrome refaite (3 actions V1)
- [ ] Design Tokens appliqués (comparaison screenshots systématique)
- [ ] Core Web Vitals (next/image, next/font, CLS)
- [ ] RGPD complet (Axeptio + purge delete account)

### Beta (novembre 2026 - janvier 2027)
- [ ] Recrutement ~100 Founding Curators (hors app, par invitation)
- [ ] Beta privée → ouverture progressive (web mobile, sans partage natif iOS — voir Decisions Log §5ter)

### Phase 6 — Coque native mobile (avant ouverture publique — cible janvier 2027, marge acceptée jusqu'à juin 2027)
- [ ] Comptes développeur Apple / Google Play
- [ ] Empaquetage Capacitor/Expo de l'app web existante
- [ ] Intégration partage natif iOS/Android (Add Item Flow §3.2 étape 8)
- [ ] Soumission et validation stores (délai variable, non garanti)
- [ ] Objectif : prêt avant l'ouverture publique — date non figée, la qualité prime sur le calendrier (décision CEO)

### V1.1+
- Image personnalisée sur Link depuis mobile (photo directe, si non livré en V1)
- Take a screenshot de page web → hors scope définitivement
- Topics Extended (Tech/Wellness/Business/Science)
- Universe Map sur profils visités
- Vue carte géographique globale (My Universe)
- Editorial CMS
- Export données RGPD (portabilité)
- Score expertise par Topic
- Partage revenus curateurs

---

## 18. Points ouverts résiduels

1. ~~Couleurs exactes badges par Topic~~ — **TRANCHÉ provisoirement (CEO/PO)** : voir `CURIO_DESIGN_TOKENS_v1_2.md §1.5`. 7 valeurs sur 10 en attente de confirmation designer, non bloquant pour le dev.
2. ~~Hex vert olive `#6A7B7A`~~ — **TRANCHÉ (CEO/PO)** : valeur documentée retenue comme canonique. Voir `CURIO_DESIGN_TOKENS_v1_2.md §1.3`.
3. ~~Police Editorial Serif exacte (Canela ? Tempera ? Editorial New ?)~~ — **TRANCHÉ (CEO/PO)** : Instrument Serif retenu (ni Canela, ni Tempera, ni Editorial New — alternative libre choisie pour éviter le coût de licence). Voir `CURIO_DESIGN_TOKENS_v1_2.md §2.1`.
4. ~~App mobile V1 : React Native ou PWA ?~~ — **TRANCHÉ (v4.3)** : web mobile au lancement + coque native légère (Capacitor/Expo) avant l'ouverture publique. Voir §16.1, §17 Phase 6, et Decisions Log §5ter pour la justification complète.
5. Contenu 3-5 pièces éditoriales V1 → à rédiger avant lancement
6. ~~Pricing Plan Brand/Business~~ — **Recommandation posée (GTM_LAUNCH_v1 v3 §3.2)** : programme pilote "Founding Brand Partner" en beta + grille à 3 niveaux (Insights/Placement/Enterprise) pour l'ouverture publique. En attente de validation CEO/PO, pas "à traiter depuis zéro".
7. ~~Processus recrutement Founding Curators~~ — **TRANCHÉ (GTM_LAUNCH_v1 v3 §1)** : critères de sélection, séquencement Wave 1 sans quota, canal (landing page dédiée), pitch, calendrier. Rien à rouvrir ici.
8. **Composition visuelle du hero orbital (§8.1, §14.6)** — **Reclassé non-bloquant (CEO/PO)** : le hero orbital est une composition générée (points disposés algorithmiquement), pas un asset figé — on code une disposition symétrique à 10 points dès maintenant et on l'ajuste visuellement si le designer a un avis, moins coûteux à corriger après coup qu'une palette de badges déjà codée en dur. Ne bloque plus le début de la Phase 2.
9. ~~Risque de confusion badge Wellness / Design~~ — **RÉSOLU** : la palette tranchée en `CURIO_DESIGN_TOKENS_v1_2.md §1.5` assigne à Wellness un bleu-sauge (`#93AFA8`), suffisamment distinct de l'olive de Design (`#6A7B7A`).
10. **[v5]** Détail technique du scoring "For you" (§8.2) — principe acté en Decisions Log §5quater (personnalisation par préférence explicite, jamais par score d'engagement), pondération exacte à trancher au moment du prompt GSD Phase 3 → CEO/PO + dev, non bloquant pour le début de Phase 1-2.
