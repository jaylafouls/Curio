# CURIO — Design Token File
**Version 1.2 — Juillet 2026**
> Changelog v1.1 : ajout couleurs badge Beauty et Wellness (passage à 10 Topics Core, cf. Decisions Log v3 §5bis).
> Changelog v1.2 : couleurs des 10 badges Topic tranchées provisoirement par le CEO/PO (§1.5) — palette complète assignée pour débloquer le dev, à confirmer par le designer. Vert olive tranché : `#6A7B7A` retenu comme valeur canonique (§1.3). Points ouverts 1 et 2 reclassés "provisoire, en confirmation designer" plutôt que "bloquant".

> Source : brand book v2 (`Curio_identite_.jpeg`), maquettes finales (site web, app mobile, funnel, tuto save a link), spec §14 (`CURIO_SPEC_PIVOT_v4_7.md`).
> Méthode : lecture directe des hex affichés dans le brand book (panel "Logo System") + pixel-sampling ciblé sur les maquettes pour vérification croisée et extraction des valeurs non documentées.
> Règle projet : **ce fichier prime sur les maquettes pour les valeurs exactes**. Les maquettes restent la référence d'ambiance, pas garanties pixel-perfect (compression JPEG, anti-aliasing).

---

## 1. Couleurs

### 1.1 Palette de marque — CONFIRMÉE

Ces 8 valeurs sont écrites en toutes lettres dans le brand book (panel "Logo System") et dans la spec §14.1 — les deux sources concordent, et le pixel-sampling direct sur les maquettes (fond dark, bouton violet, titres) confirme ces valeurs à la tolérance JPEG près.

| Token | Hex | Usage |
|---|---|---|
| `color.cosmic` (fond dark) | `#0D0E15` | Landing non connectée, app mobile, mode dark |
| `color.archive` (fond light) | `#FAFBF2` | Web connecté (défaut), mode light |
| `color.accent.violet` | `#785CFF` | CTA primaires, liens actifs, accents |
| `color.accent.violetSoft` | `#CFC3FF` | Hover, backgrounds accent doux, orbite |
| `color.beige` | `#D9C6A6` | Accent secondaire, badges — sampling croisé sur le cercle "Travel" du brand book : `#DEB895` (écart mineur, cohérent avec variation d'éclairage/gradient sur l'image) |
| `color.olive` | `#6A7B7A` | Accent secondaire, badge Design — **TRANCHÉ v1.2, voir §1.3** : valeur documentée retenue comme canonique |
| `color.brownLight` | `#E0DBB8` | Accent secondaire |
| `color.text.dark` | `#111111` | Texte sur fond clair (sampling titres : `#0C0D12`, cohérent) |

### 1.3 Vert olive — TRANCHÉ (CEO/PO) : `#6A7B7A` retenu comme valeur canonique

J'ai isolé et moyenné (sur 427 pixels, échantillon large et fiable) le cercle vert du graphique orbital "Curio Universe" dans le brand book :

**Couleur réellement affichée sur la maquette : `#838B71`** (vert kaki/sauge, dominante jaune-vert)
**Valeur documentée dans la spec §14.1 : `#6A7B7A`** (vert-gris/teal, dominante bleu-vert)

Ce ne sont pas la même famille de teinte — `#6A7B7A` est un gris-vert froid proche du teal, alors que ce qui est réellement dessiné est un kaki chaud. Ce n'est pas juste une histoire d'arrondi JPEG, c'est un écart de teinte (hue) constaté, pas seulement de luminosité.

**Décision actée (CEO/PO)** : on retient `#6A7B7A` comme valeur canonique. Raison : c'est une valeur écrite explicitement dans le panel "Logo System" du brand book, donc plus probablement la valeur de référence voulue par le designer, alors que `#838B71` provient d'un pixel-sampling sur un élément décoratif (cercle du graphique orbital) potentiellement affecté par un dégradé ou un éclairage propre à cette illustration précise. **Ce point reste à faire confirmer par le designer** — s'il indique explicitement que `#838B71` est la valeur voulue, la palette badges (§1.5) devra être ajustée en conséquence pour `color.olive`/Design.

### 1.4 Neutres — extraits par pixel-sampling (non documentés dans la spec)

| Token | Hex | Usage |
|---|---|---|
| `color.border.light` | `#DADAD6` | Bordures inputs, cards, dividers en mode light |
| `color.button.primary.light` | `#0B0E14` | Bouton CTA noir/dark sur pages light (quasi identique à `color.cosmic` — cohérence de marque probablement volontaire) |
| `color.button.text.onDark` | `#FAFBF2` | Texte des boutons sur fond violet/dark |

### 1.5 Couleurs badges par Topic — TRANCHÉ provisoirement (CEO/PO), en confirmation designer

**Décision actée** : plutôt que de laisser les 10 badges bloqués en attendant un export designer, le CEO/PO a validé une palette complète, construite pour répartir les 10 Topics sur des familles de teintes distinctes (éviter tout cluster de verts ou de beiges proches), cohérente avec l'univers de marque (teintes sourdes, non saturées — références Monocle/Kinfolk/Apartamento). Les 3 valeurs déjà mesurées de façon fiable (Travel, Design, Food) sont conservées telles quelles ; les 7 autres sont des propositions raisonnées, pas des mesures.

| Topic | Token | Hex | Statut |
|---|---|---|---|
| Travel | `color.badge.travel` | `#D9C6A6` (beige/champagne) | Fiable — mesuré (large échantillon) |
| Design | `color.badge.design` | `#6A7B7A` (vert-gris olive) | Fiable — mesuré, cf. §1.3 |
| Food | `color.badge.food` | `#C1694F` (terracotta/corail) | Fiable — cohérent avec badge card échantillonné |
| Books | `color.badge.books` | `#8B6F47` (marron) | Provisoire — direction "marron" déjà observée, valeur affinée pour se distinguer du beige Travel |
| Culture | `color.badge.culture` | `#C98A4B` (orange/tan) | Provisoire — direction déjà observée |
| Ideas | `color.badge.ideas` | `#D4A63A` (moutarde/or) | Provisoire — écarté du rose observé pour éviter la collision avec Beauty, cohérent avec la métaphore "idée/ampoule" |
| Style | `color.badge.style` | `#4A4550` (anthracite/prune) | Provisoire — délibérément écarté du vert (évite tout cluster), ton plus sophistiqué cohérent avec le Topic |
| Photography | `color.badge.photography` | `#5B7088` (bleu ardoise) | Provisoire — couleur froide, évoque l'optique/l'objectif |
| Beauty | `color.badge.beauty` | `#D9AFAE` (rose poudré) | Provisoire — corrige la collision avec Travel de l'assignation précédente (même beige) |
| Wellness | `color.badge.wellness` | `#93AFA8` (bleu-sauge doux) | Provisoire — **résout la confusion avec Design** (ex-point ouvert 9) : suffisamment distinct de l'olive |

**Raison de ne pas attendre le designer pour ces 7 valeurs** : bloquer tout le dev des cards/badges sur un export Figma qui peut prendre du temps coûte plus cher que de coder avec une palette raisonnée et de l'ajuster ensuite — changer 7 valeurs hex dans le design system, une fois les tokens en place, est un correctif mineur, pas une refonte.

**Toujours en attente designer** : confirmation ou correction de ces 7 valeurs. Un export Figma reste la meilleure façon de les valider avec précision — recommandation maintenue (voir §9 point 7). En attendant, ces valeurs sont utilisables en dev sans bloquer.

---

## 2. Typographie

### 2.1 Familles — TRANCHÉ (CEO/PO, remplace les points ouverts 3 et 4)

| Token | Valeur | Source |
|---|---|---|
| `font.serif` (titres) | **Instrument Serif** | Google Fonts, SIL OFL (libre, usage commercial OK) |
| `font.sans` (UI, corps) | **Inter** | Google Fonts, SIL OFL (libre, usage commercial OK) |

Les deux s'intègrent nativement via `next/font/google` — zéro fichier à héberger, zéro souci de licence, chargement optimisé (`font-display: swap`) out of the box. Ça débloque totalement le point bloquant identifié précédemment (police serif payante = self-hosting + coût de licence).

**⚠️ Contrainte technique importante à respecter en dev — Instrument Serif est un display font à graisse unique** :
- Une seule graisse disponible : **400 (Regular)**, + italique. Pas de 600/700/Bold dans la famille.
- → La hiérarchie H1/H2/H3 doit se faire **uniquement par la taille**, jamais en s'appuyant sur un `font-weight` différent pour ce token. Si un besoin de titre "gras" apparaît, il faudra soit jouer sur la taille/couleur, soit re-basculer temporairement sur `font.sans` en gras pour ce cas précis — pas forcer un poids inexistant.
- Conçue pour du display à partir de ~24px : à ne jamais utiliser en dessous (les traits fins deviennent illisibles à petite taille) — cohérent avec son usage prévu ici (`text.display`, `text.h1`, `text.h2` uniquement, jamais `text.body`/`text.meta`).
- Son italique est réputé pour son rendu particulièrement soigné/calligraphique — c'est un vrai plus pour le pattern "mot accentué en italique violet" déjà identifié dans les maquettes (`worth **keeping**`, `curious minds`).

Intégration `next/font` :
```ts
import { Instrument_Serif } from 'next/font/google'
import { Inter } from 'next/font/google'

const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal','italic'] })
const inter = Inter({ subsets: ['latin'] }) // variable, tous poids disponibles
```

### 2.2 Échelle typographique — estimée par proportion sur les maquettes desktop (1288px de large)

| Token | Taille estimée | Usage observé |
|---|---|---|
| `text.display` | ~56-60px | Headline landing "The internet worth keeping." |
| `text.h1` | ~40-44px | Titres de page |
| `text.h2` | ~28-32px | Titres de section |
| `text.h3` | ~20-22px | Titres de card, noms de collection — ⚠️ légèrement sous le seuil confortable d'Instrument Serif (~24px) : à tester en dev, remonter à 24px si la lisibilité est limite |
| `text.body` | ~15-16px | Paragraphes, descriptions |
| `text.bodySmall` | ~13-14px | Labels, sous-titres |
| `text.meta` | ~12px | Stats, dates, badges |
| `text.eyebrow` | ~11-12px, uppercase, letter-spacing large | "ABOUT CURIO", labels de section |

*Estimations proportionnelles, pas du pixel-perfect — à valider par mesure directe si un fichier Figma devient disponible.*

### 2.3 Pattern récurrent
Titres serif avec un mot accentué en *italique violet* ("worth **keeping**", "curious minds") — à systématiser en composant réutilisable.

---

## 3. Spacing (grille 8px)

| Token | Valeur |
|---|---|
| `space.xs` | 4px |
| `space.sm` | 8px |
| `space.md` | 16px |
| `space.lg` | 24px |
| `space.xl` | 32px |
| `space.2xl` | 48px |
| `space.3xl` | 64px |
| `space.4xl` | 96px |

Usage observé : gap entre cards ~24-32px · padding interne card ~24px · marge horizontale page desktop ~80-96px · gap sidebar/contenu ~48-64px.

---

## 4. Border Radius

| Token | Valeur | Usage observé |
|---|---|---|
| `radius.sm` | 8px | Inputs, petits éléments |
| `radius.md` | 12px | Cards secondaires, chips rectangulaires |
| `radius.lg` | 16-20px | Cards principales (collections, curateurs) |
| `radius.xl` | 24px | Grandes images cover, hero |
| `radius.full` | 9999px (pill) | Boutons CTA, badges Topic, search bar, filtres, avatars |

Pattern dominant : boutons/badges en pill complet, cards en radius généreux — cohérent avec l'esthétique éditoriale douce du brand book.

---

## 5. Ombres

Esthétique très plate, quasi sans ombre portée visible sur les maquettes — la hiérarchie visuelle vient du contraste fond/carte et de bordures fines, pas de drop shadows marqués.

| Token | Valeur estimée | Usage |
|---|---|---|
| `shadow.none` | none | Défaut sur la majorité des cards (juste bordure) |
| `shadow.sm` | `0 1px 2px rgba(17,17,17,0.04)` | Cards au hover |
| `shadow.md` | `0 4px 12px rgba(17,17,17,0.06)` | Modals, dropdowns, bottom sheets |
| `shadow.glow.violet` | `0 0 24px rgba(120,92,255,0.35)` | Halo bouton CTA violet en mode dark, halo orbital |

**À valider en dev** par comparaison screenshot directe — aucune ombre n'est assez marquée dans les JPEG pour un sampling fiable.

---

## 6. Breakpoints

Non documentés explicitement dans la spec ni mesurables depuis des mockups statiques desktop/mobile fixes. Proposition standard Tailwind, à valider :

| Token | Valeur | Usage |
|---|---|---|
| `breakpoint.sm` | 640px | Mobile large |
| `breakpoint.md` | 768px | Tablette |
| `breakpoint.lg` | 1024px | Desktop — bascule sidebar/nav |
| `breakpoint.xl` | 1280px | Desktop large (largeur de référence des maquettes) |

**⚠️ Ouvert** : aucune maquette de breakpoint intermédiaire (tablette) n'a été fournie — seulement desktop (~1288px) et mobile (~375-430px natif). À combler avant le dev responsive des pages publiques.

---

## 7. Animation

| Token | Comportement | Usage |
|---|---|---|
| `motion.orbital` | Rotation lente et continue, quasi imperceptible | Points/dots autour du cercle "You", logo C orbital |
| `motion.fadeIn` | Fade + léger slide-up (~200-300ms, ease-out) | Apparition des cards au scroll/chargement |
| `motion.transition` | Douce, pas de bounce/spring agressif | Hover states, changements d'onglet |
| `motion.duration.fast` | ~150ms | Micro-interactions |
| `motion.duration.base` | ~250ms | Transitions standard |
| `motion.duration.slow` | ~20-40s (loop) | Rotation orbitale continue |

**Recommandation CEO/PO inchangée** : rester conservateur en V1 (pas de parallax/3D) — risque de dette technique et de régression Core Web Vitals plus élevé que le gain perçu pour une beta privée.

---

## 8. Modes UI — Cosmic vs Archive

| | Cosmic (dark) | Archive (light) |
|---|---|---|
| Fond | `#0D0E15` | `#FAFBF2` |
| Texte primaire | `#FAFBF2` | `#111111` |
| Bouton primaire | `#785CFF` | `#0B0E14` |
| **Bordure / divider** | `rgba(255,255,255,0.12)` (hairline blanc translucide) | `#DADAD6` (§1.4) |
| **Ombre** | Halo violet `shadow.glow.violet` (§5) — l'ombre noire est invisible sur `#0D0E15` | `shadow.sm`/`shadow.md` (§5) |
| Usage | Landing non connectée, app mobile | Web connecté (défaut) |

### 8.1 Bordure Cosmic — tranché (levée du gap `border.dark`)

Le brand book / §1.4 ne définissaient qu'une bordure **light** (`color.border.light = #DADAD6`), explicitement étiquetée « en mode light ». Il n'existait aucun token de bordure Cosmic — un manque réel, puisque `#DADAD6` posé tel quel sur le fond `#0D0E15` donne un liseré gris clair trop lumineux.

**Décision (owner)** : la bordure devient **mode-aware** via une CSS-var `--border` (comme `--background`/`--foreground`). Archive conserve `#DADAD6` ; Cosmic utilise un **hairline blanc translucide `rgba(255,255,255,0.12)`** — assez présent pour délimiter sans agresser sur le fond sombre. Implémentation : `--border` (canaux R G B) + `--border-opacity` dans `app/globals.css`, exposés en utilitaire Tailwind `border-border` / `divide-border` / `bg-border`. Les surfaces connectées (les 8 pages sous `.dark`) utilisent `border-border` ; l'ancien `border-border-light` figé reste réservé aux **feuilles toujours-Archive** (modales/sheets `bg-archive`), qui réépinglent d'ailleurs `--border` à la valeur Archive pour rester cohérentes même sous `.dark`.

### 8.2 Ombres en Cosmic — halo violet (§5)

Les ombres `shadow.sm`/`shadow.md` sont calibrées `rgba(17,17,17,…)` (noir sur clair) et **disparaissent** sur `#0D0E15`. Conformément à §5 (« halo bouton CTA violet en mode dark, halo orbital »), les surfaces connectées qui portaient une ombre au repos ou au hover reçoivent le **`shadow.glow.violet`** en Cosmic uniquement (`dark:shadow-glow-violet` / `dark:hover:shadow-glow-violet`) : plat en Archive, halo violet en Cosmic. Les feuilles toujours-Archive gardent leur `shadow-md` (ombre normale d'une feuille claire projetée sur le scrim cosmique).

---

## 9. Points ouverts — récapitulatif

1. ~~Couleurs exactes des 10 badges Topic~~ — **TRANCHÉ provisoirement (CEO/PO, v1.2, voir §1.5)** : palette complète des 10 badges assignée, dev débloqué. 3 valeurs fiables (Travel/Design/Food), 7 provisoires en attente de confirmation designer (correction mineure possible, pas bloquante).
2. ~~Vert olive~~ — **TRANCHÉ (CEO/PO, v1.2, voir §1.3)** : `#6A7B7A` retenu comme valeur canonique.
3. ~~Police Editorial Serif exacte~~ — **TRANCHÉ** : Instrument Serif (voir §2.1). Point clos.
4. ~~Police Sans Serif exacte~~ — **TRANCHÉ** : Inter (voir §2.1). Point clos.
5. **Ombres et radius fins** — estimés, à valider par comparaison screenshot systématique en dev.
6. **Breakpoint tablette** — aucune maquette fournie à ce jour.
7. **Fichier source (Figma)** — recommandation forte et répétée : un accès Figma permettrait de confirmer avec précision les 7 valeurs de badges provisoires (§1.5) et le vert olive (§1.3), sans plus bloquer le dev en attendant.

---

## 10. Utilisation en dev (GSD)

- Traduire en `tailwind.config.ts` (tokens couleurs/radius/spacing/shadow) + variables CSS dark/light
- Injecter dans chaque prompt GSD de la Phase Dev
- Revalider à chaque écran codé par comparaison screenshot maquette ↔ rendu (règle déjà actée, Decisions Log §10)
