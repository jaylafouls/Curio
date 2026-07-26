# CURIO — Flow "Save a Link" & Structure des objets
**Version 3.1 — Juillet 2026**

> Ce document détaille le flow d'ajout d'un Link et la structure des objets (Project/Collection/Section/Link).
> En cas de contradiction avec les maquettes : **la spec prime**.
> **Changelog v3** : ajout des Sections suggérées pour Beauty et Wellness (§4.6) — trou resté ouvert depuis le passage de 8 à 10 Topics Core (Decisions Log §5bis), jamais répercuté dans ce document jusqu'à présent. Les 10 Topics Core ont maintenant tous une couverture complète.
> **Changelog v3.1 (relecture globale finale, avant Dev & GSD)** : §2.2 étape 2 — correction d'une auto-incohérence trouvée par le fil Parcours & UX (v1.3) : "4 choix visibles : Save link / Write a note / Create collection / View my space →" contredisait §2.1 (3 actions + 1 lien de navigation, "Add a custom image" pas "Write a note"). Corrigé en conséquence. Correction miroir appliquée dans `CURIO_SPEC_PIVOT_v4_7.md §12.2` (même résidu, même origine).

---

## 1. Hiérarchie des objets — Définitive

### 1.1 Structure complète
```
Project "Tour du monde 2027" [toujours privé]
├── Collection "Sri Lanka" [peut être rendue publique]
│   ├── Section "Hôtels"
│   │   └── Links
│   ├── Section "Restaurants"
│   │   └── Links
│   └── Section "Plages"
│       └── Links
└── Collection "Malaisie" [peut être rendue publique]
    └── Section "Hôtels"
        └── Links

Collection "Week-end à Milan" [standalone, peut être publique]
├── Section "Restaurants" → Links
├── Section "Hôtels" → Links
└── Section "Shopping" → Links

Links non classés → vue "Unsorted" dans My Space [toujours privés]
```

### 1.2 Règles absolues

| Règle | Détail |
|---|---|
| Un Link peut exister sans Collection | → vue "Unsorted", privé |
| Une Collection peut exister sans Project | Standalone — cas le plus courant |
| Un Project contient uniquement des Collections | **Jamais de Links directs dans un Project** |
| Une Collection peut contenir des Sections | Optionnelles, libres, nommées à la main |
| Une Section contient des Links | Unité de rangement finale |
| 1 Link = 1 Section max | Modèle dossier (pas tag) — drag & drop pour déplacer |
| Project = toujours privé | Jamais visible publiquement |
| Collection = peut être publique | Vitrine sociale |
| Note sur Link = toujours privée | Dans UserLink, jamais affichée publiquement |
| Note sur Collection = toujours privée | Du propriétaire sur sa propre collection |

### 1.3 Dimension sociale vs personnelle

| Objet | Dimension | Visible publiquement ? |
|---|---|---|
| Project | Personnelle/Organisationnelle | ❌ Jamais |
| Collection | Sociale | ✅ Si rendue publique |
| Section | Interne à la Collection | ✅ Si Collection publique |
| Link | Unité de base | ✅ Si Collection publique |
| Note sur Link | Personnelle | ❌ Jamais |
| Note sur Collection | Personnelle | ❌ Jamais |
| Links Unsorted | Personnelle | ❌ Jamais |

---

## 2. Flow "Save a Link" — Extension Chrome

### 2.1 Panel Curio — 3 actions + 1 lien de navigation
Quand on clique l'icône Curio dans le navigateur :
1. **Save link** ← action principale
2. **Add a custom image** ← uploader une image perso ou prendre une photo si le fetch OG échoue ou si l'image auto est inadaptée
3. **Create collection** ← crée une nouvelle Collection
+ View my space → (lien de navigation, pas une action de sauvegarde)

> "Write a note" n'est PAS une action séparée du panel — c'est le champ "note" disponible dans le flow Save link à l'étape Customize
> Take a screenshot de page web → hors scope définitivement

### 2.2 Étapes détaillées

**Étape 1 — Sur un site web**
L'utilisateur navigue. Quand quelque chose l'inspire, il clique l'icône Curio.

**Étape 2 — Panel s'ouvre**
3 choix visibles + 1 lien de navigation : Save link / Add a custom image / Create collection / View my space →

**Étape 3 — Fetch des détails**
- URL récupérée automatiquement depuis la page active
- Vérification : URL normalisée existe déjà en base ?
  - OUI → métadonnées récupérées depuis la base (pas de re-fetch OG) + encart "X people saved this [+ prénoms des follows si pertinent]"
  - NON → fetch OG (titre, description, image)
- "Edit preview" disponible si la preview est incorrecte

**Étape 4 — Customize**
- Titre (pré-rempli depuis OG, éditable, 100 chars)
- Description (pré-remplie depuis OG, éditable, 300 chars)
- Tags libres (suggestions auto, entièrement libres)
- Note perso (optionnelle, privée, 500 chars — "Why are you saving this?")
- Save to : sélection Collection + Section optionnelle, ou "Unsorted"

**Étape 5 — Modal "Save to"**
- Recherche de Collection
- Liste des Collections récentes
- Possibilité de sélectionner une Section à l'intérieur d'une Collection
- "+ Create new collection"
- Option "Save to Unsorted" (sans Collection)

**Étape 6 — Saved!**
- Confirmation "Saved to [nom de la Collection]"
- CTA "View in collection"
- CTA "Continue exploring"

**Étape 7 — (Optionnel) Vue détail du Link**
- Titre + source
- Tags
- "Saved to [Collection] > [Section]"
- "Saved on [date]"
- Note perso (si saisie, visible uniquement par l'utilisateur)
- Avatars des personnes qui ont aussi sauvegardé ce Link (signal canonique)

---

## 3. Flow "Save a Link" — App Mobile

### 3.1 FAB Bottom Sheet — 3 actions V1
Tap bouton + (FAB violet) depuis n'importe quel écran :
1. **Save link** ← action principale
2. **Add a custom image** ← uploader depuis la galerie ou prendre une photo directement
3. **Create collection** ← crée une nouvelle Collection

> "Write a note" = champ dans le flow Save link, pas une action séparée du FAB
> Take a screenshot de page web → hors scope définitivement

### 3.2 Étapes détaillées

**Étape 1** — Tap + (FAB) depuis n'importe quel écran

**Étape 2** — Bottom sheet "Add to Curio" → tap "Save link"

**Étape 3** — Coller l'URL
- Preview auto (titre + description + image) + "Edit preview"
- Signal canonique si URL existante
- CTA "Next"

**Étape 4** — Customize
- Titre (éditable, 100 chars)
- Description (éditable, 300 chars)
- Tags libres + Add tag
- Note perso (optionnelle, 500 chars)
- "Add to" : Select a collection + section, ou Unsorted

**Étape 5** — Modal "Add to"
- Liste des Collections récentes (Projects + standalone)
- Sélection Section optionnelle
- "+ Create new collection"

**Étape 6** — Saved!
- "Saved to [nom]" + checkmark violet
- CTA "View in collection"
- CTA "Continue exploring"

**Étape 7** — Link visible dans la Collection (onglet Links, en tête de liste)

**Étape 8** — (Optionnel) Share sheet iOS
- Icône Curio dans le share sheet natif iOS pour sauvegarder depuis le navigateur

---

## 4. Structure d'une Collection — Définitive

### 4.1 Header (vue publique)
- Cover image (upload ou auto depuis 1er Link de la Collection)
- Badge Topic coloré (ex. TRAVEL, DESIGN, FOOD...)
- Titre + description
- Note perso du propriétaire (privée, non affichée publiquement)
- Owner : avatar + nom
- Stats : Links / Followers / "Updated X days ago"
- Tags libres (pills)
- Actions : **Follow / Save a copy / Share**

### 4.2 Onglets
- **Links** (défaut)
- **About**

### 4.3 Vue Links
- Toggle grille / liste
- Filtre par Section ("All links ∨" → sélection d'une Section)
- Tri "Newest ∨" + Filters
- Chaque Link : image miniature + titre + source + badge Section + date + menu ···
- Toggle Liste/Carte si ≥1 Link avec coordonnées GPS

### 4.4 Sections (sidebar droite)
- Liste des Sections avec compteur de Links
- Générées depuis les noms de sections créées manuellement
- Chaque Section avec couleur dot
- Ex. Restaurants (12) · Hôtels (8) · Shopping (5)

### 4.5 Sidebar droite complète
- About this collection (description longue)
- Stats : Links / Sections / Followers
- Sections (liste avec compteurs)
- Followers (avatars + count)

### 4.6 Templates de Sections suggérées à la création
Suggestions selon le Topic — librement modifiables/supprimables :

| Topic | Sections suggérées |
|---|---|
| Travel | Hôtels · Restaurants · Lieux à voir · Itinéraire |
| Food | À tester · Recettes · Adresses · Ingrédients |
| Style | À shopper · Inspirations · Marques favorites |
| Beauty | Routine · Produits testés · Marques favorites · Coiffeurs/instituts |
| Wellness | Routine · Exercices · Recettes santé · Adresses |
| Design | Lieux · Objets · Références |
| Books | À lire · En cours · Lus · Citations |
| Photography | Photographes · Lieux · Équipement |
| Ideas | Articles · Outils · Ressources |
| Culture | Films · Séries · Musique · Expositions |

**Couverture** : les 10 Topics Core ont désormais tous des Sections suggérées (Beauty et Wellness ajoutés — manquaient depuis le passage de 8 à 10 Topics, Decisions Log §5bis, jamais répercuté ici avant cette correction).

---

## 5. Structure d'un Project — Définitive

### 5.1 Header (vue connectée uniquement)
- Titre + description
- Stats : Collections / Links total
- Tags libres (organisationnels)
- Actions : Edit / Add collection / Delete

### 5.2 Contenu
- Grille des Collections du Project
- Chaque Collection : cover, titre, nb links, badge Topic, statut public/privé
- CTA "Add a collection to this project"

### 5.3 Règles strictes
- **Pas de Links directs dans un Project**
- **Toujours privé** — pas de toggle public
- **Visible uniquement dans My Space** (utilisateur connecté, son propre espace)
- Les Collections à l'intérieur peuvent être rendues publiques individuellement

---

## 6. Notes — Périmètre définitif

Les Notes ne seront **jamais** une feature standalone dans Curio. Ce n'est pas le but du produit — des apps de prise de notes existent déjà pour ça.

Uniquement deux champs commentaire simples, en V1 et définitivement :

1. **Note sur un Link** (dans UserLink)
   - 500 chars, optionnel, privé
   - Accessible dans le flow Save link à l'étape Customize
   - Affiché dans la vue perso du Link uniquement, jamais publiquement
   - Exemple : "Inspiration pour le projet X", "À acheter en janvier"

2. **Note sur une Collection** (dans Collection)
   - 500 chars, optionnel, privé
   - Accessible depuis la page de gestion de la Collection
   - Jamais affichée publiquement, même si la Collection est publique

**Pas de Notes standalone — ni en V1, ni en V2, ni jamais. Décision définitive.**

---

## 7. Récapitulatif des décisions actées

| Sujet | Décision | Raison |
|---|---|---|
| Hiérarchie | Project → Collection → Section → Link | Structure claire et flexible |
| Links dans un Project | ❌ Interdit — jamais de Links directs | Project = organisationnel, pas de contenu |
| Links sans Collection | ✅ Autorisé → Unsorted | Zéro friction à l'ajout |
| Project visibilité | Toujours privé | Espace perso, pas social |
| Note dans le flow | ✅ Champ optionnel 500 chars dans UserLink | Simple, pas de friction |
| Notes standalone | ❌ Jamais | Hors scope définitif — pas le but du produit |
| Add a custom image | ✅ V1 | Utile quand fetch OG échoue ou image inadaptée |
| Take a screenshot de page | ❌ Jamais | Hors scope définitif |
| Tags | Entièrement libres | Liberté maximale |
| Visibilité Link | Héritée de la Collection | Cohérence |
| Canonique | 1 URL normalisée = 1 Link | Compteurs partagés = base monétisation |
| Signal canonique | Visible à l'ajout | Validation sociale du choix |
| Spec vs maquettes | La spec prime | Référence fonctionnelle unique |
