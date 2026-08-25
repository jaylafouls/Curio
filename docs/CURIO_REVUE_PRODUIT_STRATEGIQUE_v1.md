# CURIO — Revue Produit Stratégique
**Regard extérieur — Head of Product / Lead Designer, premier jour**
Août 2026 — basé sur la spec v4.8, le data model v1.2.6, le code réel du repo (~22 500 lignes app/components/lib, 18 migrations) et un parcours live en session connectée.

> Exercice demandé : prendre du recul sur le produit dans son ensemble, challenger les décisions déjà prises, dire honnêtement ce qui ne va pas. Ce document ne corrige rien — il pose un diagnostic et une liste de paris à faire.

---

## 0. Verdict en une phrase

Curio a l'architecture de données et la discipline documentaire d'un produit à 3 ans d'existence, mais l'expérience réelle d'un produit à J1 — parce que l'énergie est allée à *modéliser* le futur (sponsoring, marques, analytics) avant de résoudre le présent (chercher un lien qu'on a déjà sauvegardé, comprendre pourquoi quelqu'un l'a sauvegardé). C'est un très bon squelette de bibliothèque sociale qui n'a pas encore de bibliothèque — et surtout, pas encore de social.

---

## 1. Ce qui est déjà solide (à ne pas casser)

Avant de démonter — trois choses vraiment bien faites, qui ne sont pas si courantes à ce stade :

- **Le modèle canonique (1 URL = 1 Link)** est la vraie idée forte du produit. Compteurs partagés, dédup cross-user, titre figé au premier save avec re-fetch conditionnel intelligent (`title_is_fallback`) : c'est plus rigoureux que ce que font Pinterest ou Are.na. C'est un actif technique rare — presque personne d'autre ne l'a construit proprement dès le départ.
- **La hiérarchie Link → Section → Collection → Project → Universe** est cohérente et sans zone grise (règles §3.2 de la spec très claires : Project toujours privé, jamais de Link direct dedans, etc.). Peu de produits de curation ont une taxonomie aussi propre sur le papier.
- **La discipline de gouvernance documentaire** (spec prime sur maquettes, versioning strict, décisions tracées) a évité l'essentiel des dérives classiques d'un MVP fait vite. Le code suit la doc de très près — j'ai vérifié en live, les écarts sont mineurs et déjà connus.

Ceci posé — le reste de ce document est volontairement sans complaisance.

---

## 2. Architecture générale

L'architecture technique (Next.js/Supabase/RLS, migrations incrémentales, triggers pour les compteurs dénormalisés) est saine et scalable pour un produit à cette taille. Le vrai problème n'est pas technique, il est **produit** : le modèle de données a anticipé la monétisation (tables `brands`, `analytics_events`, flags `is_sponsored`) avant que les mécaniques de rétention de base existent. La recherche full-text (migration 0017) est **construite en base et jamais branchée à une UI** — c'est le symptôme le plus clair de ce déséquilibre : du temps d'ingénierie a été dépensé sur un futur commercial hypothétique pendant qu'une fonctionnalité déjà prête et critique pour l'usage quotidien reste invisible.

Deuxième angle mort structurel : il n'existe **aucune relation entre deux Collections, ni entre deux Projects**. L'arbre est strict (Project ⊃ Collection ⊃ Section ⊃ Link), jamais un graphe. Or la mission affichée est "**map** human curiosity" — une carte implique des relations, pas seulement des dossiers. Are.na (cité comme référence) doit une bonne partie de sa valeur perçue au fait que ses "channels" se connectent entre eux. Ce n'est pas une erreur de l'avoir tranché en arbre pour V1 (plus simple, plus rapide à livrer) — mais je n'ai trouvé aucune trace d'une décision explicite là-dessus. C'est un choix par défaut, pas un choix assumé.

---

## 3. Navigation

Correcte pour un utilisateur avec 5 collections. Elle ne survivra pas à un utilisateur avec 50 collections et 3000 liens, pour deux raisons concrètes observées en live :

- **Pas de page "Mes Collections"** en tant que telle. La nav spec (§7.2) liste "📚 Collections" comme item de premier niveau — il n'existe pas dans le code (confirmé : aucune route `/collections` index). Aujourd'hui, la seule vue de toutes ses collections est une liste plate mélangeant Collections et Projects sur `/my-space`, sans recherche ni filtre.
- **Pas de recherche globale nulle part dans le header connecté** — je l'ai vérifié sur `/home` : header "Bon après-midi, [prénom]" + cloche, zéro champ de recherche, malgré la spec §7.4 qui la prévoit explicitement.

À 6 liens (l'état actuel du compte de test), rien de tout ça ne se voit. À 3000 liens, ce sont les deux frictions qui décident si quelqu'un reste ou part.

---

## 4. Compréhension des concepts (Universe, Curator, Project, Collection, Saved)

Le lexique écrit (spec §2) est propre. Le produit livré introduit des flottements que le lexique ne couvre pas :

- **"Universe" désigne au moins trois choses différentes.** Le concept abstrait ("l'ensemble des Projects/Collections/Links", §2), le nom de la page (`/my-space`, affichée "Mon univers" dans la nav), et un **attribut de profil** (`universe_name` — sur le compte de test, "Jay's Tour", affiché "Voir mon univers"). Un nouvel utilisateur qui nomme son "univers" à l'onboarding croit raisonnablement nommer un espace ou un lieu ; il nomme en réalité un simple label de profil, ni Collection ni Project. C'est exactement le genre de flou que le reste de la spec a pris soin d'éliminer partout ailleurs.
- **"Saved"/"Enregistrés" recouvre deux idées** (Unsorted + tous les liens sauvegardés, spec §8.11) et l'UI live introduit un terme non documenté pour la première : l'onglet s'appelle **"Boîte de réception"** ("Rien à classer... les liens que vous n'avez pas encore classés dans une collection apparaîtront ici" — c'est bien la vue Unsorted), alors que le lexique officiel (§2) impose le terme "Unsorted"/"Non trié" et ne connaît pas la métaphore mail. Résidu de synchronisation classique du projet (le pattern déjà identifié dans vos notes), pas grave en soi, mais un exemple concret que je peux citer avec la source exacte.
- **Le Topic existe en double** : un Topic obligatoire par Collection (1 Collection = 1 Topic, §5.3), et depuis la migration 0015, un Topic + sous-catégorie **par lien sauvegardé**, indépendant de celui de la Collection. J'ai vu ce sélecteur "Thème" en live, à l'étape "Save to", même en sauvegardant dans une Collection qui a déjà son propre Topic. Aucune règle documentée sur lequel des deux prévaut à l'affichage. Un utilisateur qui range un lien "Design" dans sa Collection "Voyage" — quel badge s'affiche ?

---

## 5. Parcours utilisateur & onboarding

Le parcours des 8 écrans est intégralement codé et fidèle à la spec. Le vrai risque n'est pas dans les écrans, il est dans ce qu'ils montrent : **l'étape "Curators" (2/3) suggère des curateurs selon les Topics choisis — et retourne une liste vide aujourd'hui**, faute de Founding Curator recruté. Le 101e utilisateur de Curio, si le recrutement (100 Founding Curators, cible nov. 2026) prend du retard ou reste concentré sur peu de Topics, arrive sur un onboarding qui promet "Follow curators you love" et livre une page vide. Ce n'est pas un bug — c'est un point de rupture produit qui n'a **aucune réponse produit**, seulement une réponse opérationnelle ("recruter plus vite"). Un vrai produit a un plan B pour le cold start qui ne dépend pas à 100% du calendrier de recrutement.

---

## 6. Découverte de contenu

`/explore` et `/curators` sont réels, branchés à de vraies requêtes, bien construits — vides aujourd'hui uniquement faute de contenu, pas de code. Mais c'est justement le problème à un cran au-dessus : le pilier "**Discovery**" (1 des 3 piliers produit, §1.5) dépend **entièrement** de l'existence de curateurs actifs, sans aucun filet — pas de contenu éditorial Curio en fallback (`/editorial` est un template vide), pas de "trending on the web" externe, rien. Sur un profil de curateur public que j'ai ouvert en live (Théo Design), **il n'y a même pas de bouton Follow sur la page profil elle-même** — seulement depuis une Collection individuelle. Le point d'entrée social le plus évident (le profil) ne permet pas l'action sociale la plus évidente (suivre).

---

## 7. Création de contenu

Le flow "Add to Curio" est le meilleur endroit du produit aujourd'hui. Fetch OG, dédup canonique, personnalisation (titre/description/tags), et une fonctionnalité que je n'ai trouvée **dans aucun document** : des puces "Pourquoi enregistrez-vous ceci ?" (Acheter plus tard / Inspiration / À partager / Pour un voyage / Cadeau / Comparer) à l'étape Customize. C'est une bonne idée, cohérente avec la thèse business du CEO sur le "signal d'intention réel" (GTM §3.3) — mais elle a été construite sans être spécifiée, ce qui contredit la règle "zéro code avant spec béton" que le projet applique scrupuleusement partout ailleurs. Pas un problème en soi (l'idée est bonne), mais un signal à corriger : soit on la documente rétroactivement pour la relier officiellement à la thèse data, soit elle reste un angle mort qui va dériver comme les autres résidus déjà identifiés.

Le flow complet demande, dans le pire cas, jusqu'à 8 décisions à l'utilisateur pour sauvegarder un lien : titre, description, image, tags, "pourquoi", note, collection, section, thème. C'est plus que Pinterest, plus que Are.na, à l'opposé de MyMind (zéro décision). Rien de tout ça n'est obligatoire individuellement — mais la *présence* de 8 champs sur un seul écran de sauvegarde crée une charge cognitive au moment où l'utilisateur en a le moins (souvent sur mobile, en 3 secondes, en pleine navigation).

---

## 8. Recherche

Il n'y en a pas. Aucune route `/search`, aucun champ de recherche dans aucun header, confirmé en code et en live. Le pire n'est pas l'absence — c'est que **l'index full-text existe déjà en base** (migration 0017, sur `user_links`) et n'est consommé par rien. C'est un backend payé et non exploité pendant que la friction qu'il devait résoudre reste entière. À traiter en premier, pas en dernier — c'est le rare cas où l'essentiel du travail est déjà fait.

---

## 9. Organisation de l'information & scalabilité (milliers de liens)

À l'échelle testée (6 liens, 5 collections), tout se lit d'un coup d'œil. Rien dans le produit actuel n'a été pensé pour 3000 liens :

- Pas de recherche (§8).
- Pas de tri/filtre sur la liste combinée Collections+Projects de My Space.
- Pas d'action groupée (déplacer 50 liens vers une nouvelle Collection en une fois).
- "Unsorted" n'a **aucune assistance au tri**, alors que la donnée pour le faire existe déjà : le Topic/sous-catégorie d'un Link est hérité cross-user du même Link canonique dès qu'il a déjà été catégorisé par quelqu'un d'autre (Decisions Log §18.6). L'ingrédient d'un tri quasi-automatique est déjà en base ; il n'y a aucune UI qui l'exploite pour vider intelligemment le Unsorted.
- Le module de sélection de Collection dans le flow de sauvegarde est une liste statique "Collections récentes" — pas de recherche dedans non plus. Passé une vingtaine de collections, retrouver la bonne devient un scroll.

Rien de ceci n'est visible aujourd'hui parce que personne n'a encore assez de contenu. C'est exactement pour ça qu'il faut le traiter maintenant, pendant que c'est un chantier tranquille et pas un incendie en beta.

---

## 10. Pages à faible valeur actuellement

- **`/editorial`** — template fonctionnel, contenu nul. En nav publique dès aujourd'hui, ça se voit immédiatement comme une promesse non tenue. Soit accélérer les 3-5 pièces (déjà identifiées comme point ouvert §5 de la spec), soit la retirer de la nav tant qu'elle est vide.
- **`/notifications`** — 3 onglets sur 5 (Comments/Likes/Mentions) sont des coquilles vides, jamais alimentées par aucun mécanisme (ni like ni comment n'existe nulle part dans le produit). Un onglet grisé "Bientôt" sur une fonctionnalité qui n'a même pas de date ni de scope dans la roadmap (spec §18 point 11, non tranché) n'est pas une promesse honnête. Je retirerais ces onglets jusqu'à ce que Like/Comment soit réellement scopé.
- **`/home/personalize`** — existe, contient des résidus "coming soon" non nettoyés.

---

## 11. Fonctionnalités manquantes qui comptent vraiment

- **Import.** Le profil ciblé pour les 100 Founding Curators est explicitement "des gens qui curatent déjà, manuellement, ailleurs" (GTM §1.1). Leur demander de tout re-sauvegarder à la main depuis zéro est la pire friction d'activation possible pour ce public précis. Aucun import (bookmarks, CSV, export Pinterest) n'existe ni n'est prévu.
- **Un mécanisme de resurfacing.** "The internet worth *keeping*" implique qu'on y revient. Rien dans le produit ne fait revivre un ancien save (pas de "il y a un an", pas de digest). Sans recherche ni resurfacing, un lien sauvegardé a de bonnes chances de ne plus jamais être revu par son propriétaire.
- **Un Follow depuis le profil public** (couvert en §6) — un manque presque trivial à corriger, mais très visible.

---

## 12. Fonctionnalités à simplifier ou couper

- **Section, en tant que choix par défaut au moment du save.** Utile à partir d'une certaine taille de Collection, mais présentée comme une décision disponible dès le premier lien. Je la masquerais derrière une divulgation progressive (elle n'apparaît que quand une Collection dépasse ~10-15 liens), pas dès la création.
- **Le Topic par lien, en doublon du Topic de Collection** (§4) — soit on documente une règle de priorité claire, soit on supprime le sélecteur redondant et on hérite silencieusement du Topic de la Collection choisie (le cas Unsorted restant le seul où le demander a du sens).
- **`forks_count`** — colonne présente, aucun mécanisme derrière depuis le début. Soit on construit un vrai Fork (voir §13), soit on retire la colonne : une donnée qui n'existe que dans le schéma et jamais dans le produit est une dette, pas un atout, même "anticipée".

---

## 13. Fonctionnalités signatures — ce qui ferait quitter un concurrent pour Curio

Trois idées, pas dix — celles qui exploitent un actif que Curio a et que personne d'autre n'a construit aussi proprement :

**1. Le signal canonique, mis au premier plan plutôt qu'en encart discret.**
Curio est la seule des plateformes citées à dédupliquer réellement les liens (1 URL = 1 objet partagé). "X people saved this" existe déjà dans la spec (§9.6) comme un encart secondaire. Ça devrait être l'expérience centrale : montrer *qui*, parmi les curateurs qu'on suit, a déjà sauvegardé ce lien, et pourquoi (si public). Pinterest ne peut pas faire ça (les pins ne sont pas canoniques). Are.na le pourrait en théorie mais ne le met pas en avant. C'est un moat structurel sous-exploité.

**2. Une raison publique, distincte de la Note privée.**
Aujourd'hui, le pilier "**Connection** — understand why something matters" (§1.5) n'a aucune traduction produit : la Note est privée par design, "définitivement" (spec §13). Résultat, une Collection publique de Curio est visuellement indiscernable d'un board Pinterest — image, titre, source, rien d'autre. Je proposerais un champ optionnel, public, distinct de la Note privée (qui reste privée, pas besoin de rouvrir ce débat) : une phrase courte qu'un curateur peut choisir de publier sur un Link précis. C'est exactement l'argument déjà utilisé dans le pitch de recrutement Founding Curator ("de vraies personnes derrière, pas un moodboard flou") — sauf qu'aujourd'hui rien dans le produit ne le prouve visuellement.

**3. Un vrai Fork, pas juste une copie silencieuse.**
"Save a copy" existe déjà (duplication complète, indépendante). Ajouter une traçabilité ("forké depuis [Collection] par [Curateur]") transforme une simple copie en mécanique communautaire visible — dans l'esprit Are.na/GitHub, cohérent avec les valeurs de la marque (Open, Human), et presque gratuit à construire puisque `forks_count` et "Save a copy" existent déjà comme briques.

---

## 14. Recommandations priorisées

### 🔴 Impact très fort

1. **Brancher la recherche globale à une UI.** Le backend (migration 0017) existe déjà. C'est le rapport effort/impact le plus favorable de tout ce document.
2. **Donner une réponse produit au cold start de la Discovery** — pas seulement opérationnelle (recruter plus de curateurs). Contenu éditorial Curio réel dès le lancement, ou fallback externe, pour que le pilier "Discovery" ne soit jamais une page vide.
3. **Mettre le signal canonique cross-user au centre de l'expérience** (qui, parmi mes curateurs suivis, a déjà sauvegardé ceci) — c'est le vrai moat structurel du produit, aujourd'hui traité comme un détail.
4. **Ajouter un champ "raison publique" distinct de la Note privée** — sans ça, la différenciation vs Pinterest reste une promesse marketing, pas une réalité visible à l'écran.
5. **Construire un import minimal** (bookmarks/CSV) — c'est la friction d'activation numéro un pour exactement le public ciblé par le recrutement Founding Curator.

### 🟠 Impact moyen

6. **Résoudre le doublon Topic Collection/Link** — une seule règle claire, affichée nulle part deux fois sans raison.
7. **Masquer Section derrière une divulgation progressive** plutôt que la proposer dès le premier lien.
8. **Transformer "Save a copy" + `forks_count` en vrai Fork traçable.**
9. **Ajouter un mécanisme de resurfacing** (digest, "il y a un an") pour tenir la promesse du "worth keeping".
10. **Nettoyer les résidus de vocabulaire trouvés en live** (Boîte de réception vs Unsorted, Universe à trois sens différents) — même traitement que les résidus déjà suivis par le projet.
11. **Retirer les onglets Comments/Likes/Mentions de Notifications** tant qu'aucune feature ne les alimente, plutôt que des coquilles "Bientôt" sans date.

### 🟢 Nice to have

12. Ajouter un Follow direct depuis le profil public (aujourd'hui uniquement possible depuis une Collection).
13. Une vraie page "Mes Collections" distincte de la liste mêlée Projects/Collections de My Space.
14. Pousser les utilisateurs à choisir un vrai username tôt (le compte de test tourne encore sur `user_bd7ac0e7` — pas idéal pour une identité de curateur).

---

## 15. Décisions déjà prises à challenger explicitement

- **"Notes jamais publiques, décision définitive" (spec §13).** Je ne remets pas en cause l'idée que Curio n'est pas un outil de prise de notes — c'est juste. Mais figer *toute* trace publique de "pourquoi" entre en tension directe avec le pilier Connection et avec l'argument de vente principal du produit face à Pinterest. Proposition : garder la Note privée strictement telle quelle, mais ouvrir un champ distinct, optionnel, explicitement public. Ce n'est pas rouvrir Notes — c'est reconnaître que "jamais rien de public sur le pourquoi" et "la différenciation, c'est le pourquoi" ne peuvent pas être vrais en même temps.
- **Séquencement : modéliser la monétisation avant de livrer la recherche.** Anticiper `brands`/`analytics_events` pour éviter une migration lourde plus tard est une bonne pratique technique — je ne conteste pas la modélisation. Je conteste que l'effort produit (page `/analytics`, dashboard) soit sorti avant que la fonctionnalité de rétention la plus basique (chercher ce qu'on a sauvegardé) existe en interface. L'ordre devrait suivre la vraie dépendance : rétention d'abord, monétisation ensuite — la donnée pour monétiser n'a de valeur que s'il y a des utilisateurs actifs à monétiser.
- **L'arbre strict Project > Collection > Section, sans aucune relation entre Collections.** Pas une erreur de conception — mais je n'ai trouvé aucune trace d'un choix explicite "on reste un arbre, pas un graphe". Pour un produit dont la mission est de "mapper" la curiosité humaine, ça mérite une décision assumée plutôt qu'un défaut hérité de la simplicité de mise en œuvre.
- **L'onboarding envoie systématiquement vers "Follow curators you love"** même quand la liste de suggestions est vide en prod aujourd'hui. Un onboarding ne devrait jamais avoir une étape structurellement susceptible d'être vide pour son tout premier segment d'utilisateurs réels après les Founding Curators.

---

## Ce qui ne figure pas dans ce document

Volontairement absent : les points ouverts déjà identifiés et déjà en cours de traitement dans vos propres docs (palette badges, police, app mobile V1, pricing Brand, ratio de contenu sponsorisé) — ils ont déjà un propriétaire et un processus. Ce document se concentre sur ce que la lecture spec + code + produit en live fait apparaître de nouveau, pas sur ce que vous savez déjà.
