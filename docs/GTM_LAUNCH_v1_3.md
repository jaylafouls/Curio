# CURIO — GTM & Lancement
**Version 6 — Juillet 2026 — Monétisation & GTM**

> Ce document couvre les 3 derniers points ouverts de la spec v4.7 (§18.6, §18.7) : recrutement des Founding Curators, séquencement du lancement, pricing Plan Brand/Business.
> En cas de contradiction avec CURIO_SPEC_PIVOT_v4_7.md sur le modèle économique (§4) ou les Topics (§5, 10 Topics Core) : la spec prime sur les prix des plans déjà actés (Founding Curator, Curateur 1ère année), ce document tranche uniquement ce qui restait ouvert.
> **Changelog v2** : suppression des quotas de répartition par Topic pour la Wave 1 (décision CEO — recrutement réseau/organique, pas de ciblage a priori). Passage à 10 Topics Core pris en compte.
> **Changelog v3** : ajout §3.3 Roadmap de monétisation (séquence affiliation → data de tendance → placement sponsorisé → comptes marque payants), avec principe non-négociable anti-sursaturation du contenu sponsorisé. Lien explicite établi avec la piste equity curateurs (Data Model §14).
> **Changelog v4** : correction §3.1 — "liens monétisés" (part de commission d'affiliation reversée au curateur) retiré du Plan Curator Pro et rendu disponible à tous les curateurs actifs dès un seuil d'activité, pour ne pas freiner le volume de clics affiliés qui alimente §3.3. Curator Pro recentré sur analytics avancées / badge / priorité recommandations.
> **Changelog v5 (checkup Étape 4)** : bump version header (oublié en v4). Pointeurs spec mis à jour v4.2→v4.5. Formulation "anti-algorithme" retirée de §1.4 (pitch + canal d'outreach), remplacée conformément à Decisions Log §5quater.
> **Changelog v6 (relecture globale finale, avant Dev & GSD)** : (1) Le point non résolu signalé en v5 (Spec §4.1 Curator Pro contredisant la correction v4) **est en réalité déjà corrigé** dans `CURIO_SPEC_PIVOT_v4_7.md` §4.1 (9,90€/mois, "liens monétisés" retiré) — la révision Meta/Support avait finalement abouti, juste après l'écriture du changelog v5 qui ne le savait pas encore. (2) Toutes les occurrences "Data Model §12" corrigées en "§14" (invitation_tokens/equity — le numéro de section avait bougé). (3) §3.3 corrigé : `Brand` et `AnalyticsEvent` étaient décrits comme "à anticiper/non modélisés" alors qu'ils sont modélisés depuis Data Model v1.2 (§10-11) — reformulé en "déjà en place". (4) Point ouvert 7 marqué résolu en conséquence. Pointeurs spec mis à jour v4.5→v4.7.

---

## 1. Recrutement des ~100 Founding Curators

### 1.1 Profil cible — critères de sélection

Pas des influenceurs généralistes. Des personnes qui **curatent déjà, manuellement, ailleurs** (Instagram Guides, Substack, threads "mes adresses à..."), avec une expertise reconnaissable sur un Topic et une audience engagée mais pas massive (3K-15K). Trois critères de filtrage, dans l'ordre :

1. **Comportement de curation existant** — ils publient déjà des formats liste/guide, pas juste du contenu au fil de l'eau
2. **Point de vue identifiable** — un style, une zone géo, une niche claire (pas une couverture généraliste)
3. **Alignement valeurs marque** (spec §1.4/§1.7) — Curious/Cultured/Intelligent/Human, pas Loud/Trend-driven ; ce filtre écarte explicitement les profils "engagement bait"

### 1.2 Répartition par Topic — Wave 1 : pas de quotas

**Décision (v2, remplace la version précédente)** : pas de répartition ciblée par Topic pour la Wave 1. Le recrutement se fait sur base réseau/organique (amis, amis d'amis), sans logique de quota — objectif de cette phase : observer quels Topics émergent naturellement parmi les 10 Topics Core (Travel, Style, Beauty, Wellness, Food, Books, Ideas, Culture, Design, Photography) avant de structurer quoi que ce soit.

Raison du changement : imposer des quotas par Topic dès la Wave 1 aurait forcé un ciblage artificiel sur un réseau qui n'a pas été sourcé pour ça. Le signal réel (quels Topics sont le plus utilisés, lesquels restent vides) est plus utile à ce stade que le respect d'une répartition théorique.

**Suite prévue (Wave 2)** : une fois la Wave 1 lancée et les premières semaines d'usage observées (cf. §1.5), on revient sur une répartition ciblée pour compléter les Topics sous-représentés — probablement en priorisant le recrutement qualifié sur les Topics identifiés comme peu utilisés spontanément, plutôt qu'en rajoutant du volume là où c'est déjà dense. Pas de chiffre à figer maintenant ; à documenter dans une v3 de ce document une fois les données de Wave 1 disponibles.

### 1.3 Canal de captation

**Recommandation : landing page dédiée (pas un simple Typeform seul), hébergée sur Vercel dès fin juillet.**

Justification : un Typeform seul ne transmet aucun signal de marque ; or le filtre de sélection repose largement sur l'alignement esthétique/éditorial (§1.1 critère 3), donc la page de candidature doit déjà porter la DA (palette, typo, ton) pour que les candidats s'auto-sélectionnent. Structure minimale : one-pager avec la vision (§1.1-1.3 spec), les avantages Founding Curator, formulaire embarqué (Typeform ou natif) — nom, lien(s) vers contenu existant, Topic principal, une phrase sur leur curation actuelle.

Cette page est indépendante du produit (pas de dépendance à Phase 1-5), donc publiable dès la clôture de la Phase 0.

### 1.4 Pitch

Trois piliers, dans cet ordre :

1. **Reconnaissance** — "Vous faites déjà ça, dispersé. On construit l'endroit dédié."
2. **Statut réel** — badge Founding Curator permanent + Plan Pro gratuit à vie (vs. 1 an pour les curateurs du lancement public) — avantage matériel et durable, pas symbolique
3. **Positionnement éditorial vs Pinterest** — "Pas un moodboard flou : des links concrets, actionnables, avec de vraies personnes derrière. Ici, votre fil Following reste chronologique — aucun algorithme ne décide qui voit vos découvertes."

Canal d'outreach : DM/email personnalisé, jamais de message groupé — cohérent avec le volume (100) et avec l'exigence éditoriale/curatoriale du produit (cf. Decisions Log §5quater : la garantie porte sur le fil Following, pas sur l'absence totale de tri ailleurs dans le produit).

### 1.5 Calendrier — aligné sur la Roadmap §17

| Période | Dev (rappel roadmap) | Recrutement |
|---|---|---|
| Fin juillet | Clôture Phase 0 | Landing page live, sourcing shortlist démarre |
| Août | Phase 1 — Fondations (auth + invitation_tokens) | Premiers contacts, ~20 confirmations (cercle proche) ; dès l'auth testable en interne fin août, envoi des premiers tokens réels |
| Septembre | Phase 2-3 — Pages publiques, app connectée | Envoi progressif des tokens restants au fil des confirmations ; les curateurs confirmés commencent à peupler leurs Collections en environnement fermé |
| Octobre | Phase 4-5 — Universe & Plans, Polish | Objectif de seuil de qualité (§2.2) atteint avant fin octobre |
| Novembre | Beta privée ouvre | Écran Onboarding "Curators" déjà peuplé de vrais profils dès J1 |

Le recrutement démarre en parallèle de la Phase 1, pas après — c'est un prérequis structurel déjà identifié (l'écran Onboarding "Curators", Parcours UX §04, dépend entièrement de ce contenu).

---

## 2. Séquencement du lancement

### 2.1 Paliers

| Palier | Période | Accès | Déclencheur de passage au palier suivant |
|---|---|---|---|
| **0 — Beta fermée** | Nov 2026 | Uniquement les 100 Founding Curators (token nominatif, `email` renseigné dans `invitation_tokens`) | Seuil de qualité de contenu atteint (§2.2) + aucun bug P0 sur les flows core (Save, Collection, Follow) |
| **1 — Beta étendue** | Déc 2026 | Founding Curators + leur réseau, via tokens qu'ils génèrent eux-mêmes (`created_by` = le Founding Curator) | Volume et rétention stables (pas de seuil chiffré arbitraire — décision qualitative CEO/PO en revue de fin de Palier 0) |
| **2 — Ouverture publique** | Janv 2027 | Signup libre, sans token. Plan "Curateur 1ère année" s'applique aux nouveaux curateurs actifs à ce moment | Fin de la fenêtre beta prévue au planning cadre |

### 2.2 Seuil de qualité — gate du Palier 0 → 1

**Recommandation concrète** : ne pas ouvrir le Palier 1 tant que moins de 60 des 100 Founding Curators n'ont pas au moins 1 Collection publique avec 5+ Links. En dessous de ce seuil, l'écran Onboarding "Curators" reste trop pauvre pour convaincre les premiers Découvreurs externes — le risque produit (beta perçue comme vide) prime sur le respect strict du calendrier.

### 2.3 Rôle de `invitation_tokens` dans le séquencement

Le champ `created_by` (FK nullable vers `users`) permet déjà structurellement la cascade : au Palier 1, chaque Founding Curator reçoit un quota de tokens (recommandation : 5) à distribuer dans son propre réseau. Ça transforme la table technique déjà actée en mécanique de croissance maîtrisée, sans dev supplémentaire.

**Politique d'expiration** (champ `expires_at`, laissé ouvert dans Data Model §14) :
- Tokens Founding Curator (Palier 0) : pas d'expiration — volume faible (100), valeur haute, pas d'urgence à créer
- Tokens de cascade (Palier 1) : expiration à 14 jours — crée une urgence légère et évite le stockage/revente informelle de tokens

L'idée d'equity/incentive pour les 1000 premiers curateurs (mentionnée en Data Model §14 comme point en attente) reste hors scope de ce document — elle touche à la structure capitalistique, pas au GTM produit. À traiter séparément si elle est confirmée comme piste sérieuse.

---

## 3. Pricing

### 3.1 Curator Pro — tranché à 9,90€/mois

**Recommandation : bas de la fourchette (9,90€/mois plutôt que 12€), avec option annuelle à 89€/an (~25% de remise).**

Justification CEO/PO : le modèle économique principal n'est pas l'abonnement (spec §4.2-4.3) — c'est le placement contextuel et la data agrégée, qui dépendent du **volume** de curateurs actifs générant du signal (saves, tags, clics). Un prix bas maximise le nombre de comptes Pro actifs, donc le volume de données exploitables, plutôt que d'extraire une marge plus haute sur un nombre plus restreint d'abonnés. Les curateurs eux-mêmes ne sont pas la source de revenu principale, ils sont le moteur de la donnée qui alimente la vraie source de revenu (les marques). Un prix proche de 9,90€ reste aussi cohérent avec des outils créateurs comparables (Substack, Beehiiv paliers d'entrée) sans se positionner comme un outil pro cher.

**Correction (v4)** : le Plan Gratuit inclut déjà toutes les actions qui génèrent de la donnée (sauvegarder, créer Projects/Collections/Sections, suivre — spec §4.1), donc Curator Pro n'est jamais un frein au volume. En revanche, "liens monétisés" (part de commission d'affiliation reversée au curateur — lié à §3.3 point 1) a été retiré du contenu du Plan Pro : le mettre derrière un paywall allait à l'encontre de l'incitation recherchée, qui est de maximiser le nombre de curateurs actifs générant des clics affiliés, pas seulement ceux qui payent l'abonnement. Ce point de monétisation devient disponible à tout curateur actif dès un seuil d'activité (à définir précisément — ex. Collection publique + volume de clics minimum), indépendamment du Plan. Curator Pro reste donc recentré sur : analytics avancées, badge Pro, priorité recommandations — des avantages pour les power users, sans toucher au moteur de revenu principal.

### 3.2 Plan Brand/Business — structure proposée

Pas de rate card publique figée au lancement — recommandation : **programme pilote "Founding Brand Partner"** pendant la beta (Palier 0-1), avant de fixer une grille tarifaire publique à l'ouverture publique (Palier 2 / Q1-Q2 2027). Raison : aucune donnée réelle de performance (volume de saves/clics par Topic, taux de conversion du placement) n'existe encore — fixer un prix ferme maintenant serait une estimation sans base.

Structure à 3 niveaux pour la grille publique (Palier 2), à valider avec les vrais chiffres de la beta :

| Palier | Cible | Contenu | Prix indicatif |
|---|---|---|---|
| **Insights** | Marques souhaitant juste la donnée agrégée | Dashboard tendances par Topic (volumes de saves, tags associés, profils agrégés anonymisés) | ~490€/mois |
| **Placement contextuel** | Marques voulant du placement sponsorisé | Links sponsorisés ciblés par Topic/tags, facturation au CPM ou forfait mensuel minimum | À partir de ~2 000€/mois selon reach/Topic ciblé |
| **Enterprise** | Grands comptes | Data + placement + accompagnement dédié | Sur devis (>5 000€/mois) |

Pendant la beta : 3-5 marques pilotes recrutées en direct (pas de landing publique pour ce volet), tarif plat réduit (~1 500€/mois) en échange d'un accès prioritaire aux premiers résultats et d'un rôle de co-construction du produit Brand — même logique de validation que les Founding Curators, appliquée côté marques.

### 3.3 Roadmap de monétisation — séquence au-delà du Plan Brand/Business de base

Vision CEO (à date, encore en construction) : le vrai potentiel de Curio n'est pas l'abonnement Pro ni un simple encart pub, c'est le **signal d'intention réel** capté par un save (quelqu'un qui sauvegarde un hôtel dans une Collection "Voyage 2027" est en train de construire une décision d'achat, pas juste de s'inspirer — contrairement à Pinterest ou Instagram). C'est ce signal, structuré et canonique (1 URL = 1 objet partagé), qui est l'actif monétisable central. Séquence recommandée, du plus simple/rapide au plus dépendant du volume :

1. **Affiliation automatique sur les Links canoniques** — via un réseau d'affiliation existant (type Awin, Rakuten Advertising) sur les URLs déjà sauvegardées. Revenu passif, ne dépend d'aucune vente ni équipe commerciale, démarre dès qu'il y a du volume de clics. À activer en premier, avant toute démarche commerciale.
2. **Data de tendance agrégée, vendue comme produit de veille** — pas juste "combien de saves" mais un signal d'anticipation ("cet hôtel gagne en popularité chez les curateurs Travel ce mois-ci"). C'est le vrai différenciant vs. toute autre plateforme, parce qu'il s'appuie sur la structure canonique unique à Curio. Vient enrichir le Plan "Insights" déjà proposé en §3.2.
3. **Placement contextuel sponsorisé** — les "Links-pub" (concept CEO) : une pub se comporte comme un favori normal, peut être suggérée en contexte (recherche, complétion de Collection) et ajoutée directement par l'utilisateur. Nécessite un volume/densité suffisant par Topic pour un ciblage pertinent — se déploie après les points 1 et 2, pas avant.
4. **Comptes marque/pro payants** — déjà couvert en §3.2, en dernier dans la séquence, une fois qu'il y a une vraie audience à toucher.

**Principe produit non-négociable (décision CEO actée)** : un Link sponsorisé porte toujours un badge/tag "Sponsorisé" visible — jamais indiscernable d'un Link organique, pour rester conforme aux obligations de transparence publicitaire et préserver la confiance qui différencie Curio d'un feed algorithmique. Un Link sponsorisé ne peut **jamais s'insérer automatiquement et silencieusement** dans une Collection d'un utilisateur — toujours via une action explicite du curateur (ajout volontaire depuis une suggestion, jamais une insertion invisible). Un ratio maximum de contenu sponsorisé par Collection reste à définir précisément (pas de chiffre figé ici), mais le principe de plafonnement est acté dès maintenant pour éviter une sursaturation type feed Instagram.

**Lien avec l'equity curateurs (Data Model §14)** : la piste d'incentive equity pour les 1000 premiers curateurs (répartition au prorata invitations/collections-links/vues) dépend directement de la performance réelle de l'affiliation et du sponsoring — un partage de revenu curateurs n'a de sens qu'une fois qu'il y a un revenu réel à partager. Cette piste reste documentée mais non spécifiée (implication cap table/juridique, hors du rôle GTM produit), à traiter formellement une fois les points 1-3 ci-dessus validés en usage réel.

**Impact Data Model — déjà anticipé** (mécanismes non activés en V1, mais structure déjà en place) :
- Entité `Brand` — déjà modélisée, Data Model §10
- Entité `AnalyticsEvent` — déjà modélisée, Data Model §11 (impressions/clics par utilisateur × Link)
- Flag `is_sponsored` sur `links` — déjà en place
- Rien à ajouter côté schéma pour activer cette roadmap le moment venu — seul le ratio de saturation (§23 du Data Model) et la relation `plans`/`brands` (§22 du Data Model) restent à trancher, au moment de spécifier concrètement la phase 4.

---

## 4. Points ouverts résiduels (hors ce document)

1. Écran de célébration du badge Founding Curator (silencieux, décision déjà actée en Parcours UX §2) — rien à rouvrir ici
2. Idée d'equity/incentive pour les 1000 premiers curateurs — reste non spécifiée (implication cap table/juridique), désormais explicitement liée à la performance réelle de la roadmap monétisation §3.3 avant d'être formalisée
3. Rate card définitive Plan Brand/Business — à fixer après retours du programme pilote, avant Palier 2
4. Contenu éditorial 3-5 pièces V1 (spec §18.5) — hors scope GTM, à traiter en Spec Produit ou Éditorial
5. Répartition Wave 2 par Topic — à documenter (v4 de ce document) une fois les données d'usage réel de la Wave 1 disponibles (cf. §1.2)
6. Ratio maximum de contenu sponsorisé par Collection (§3.3) — principe acté, seuil chiffré non tranché
7. ~~Modélisation `Brand`/`Advertiser`, `AnalyticsEvent` et flag `is_sponsored`~~ — **FAIT** (Data Model §10-11, v1.2). Rien à porter, déjà en place.
8. Seuil d'activité précis débloquant les "liens monétisés" pour un curateur (§3.1 v4) — principe acté, chiffre non tranché
