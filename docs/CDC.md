**SOCIAL MIND AI**

**Cahier des Charges**

*Plateforme SaaS d\'Automatisation SMMA propulsée par l\'IA*

  -----------------------------------------------------------------------
  
  ---------------------------- ------------------------------------------
  **Réalisé par**              **Safae Bellamine

  

  
  -----------------------------------------------------------------------

Spécification des Exigences Logicielles

**TABLE DES MATIÈRES**

  -------------------------------------------------------------------------
  **1.**    **Présentation du Projet**                             **3**
  --------- ------------------------------------------------------ --------
  **2.**    **Énoncé du Problème**                                 **3**

  2.1       Pour les Agences SMMA                                  3

  2.2       Pour les Créateurs Individuels                         4

  **3.**    **Utilisateurs Cibles et Rôles**                       **4**

  3.1       Utilisateur Standard (Créateur Individuel)             4

  3.2       Utilisateur Professionnel (Agence SMMA)                5

  3.3       Administrateur                                         5

  **4.**    **Exigences Fonctionnelles**                           **5**

  4.1       Système d\'Authentification                            5

  4.2       Tableau de Bord Utilisateur Standard                   6

  4.3       Tableau de Bord Utilisateur Professionnel              6

  4.4       Système d\'Abonnement et de Facturation                6

  **5.**    **CONTRAINTES DU PROJET**                              **7**

  5.1       Budget                                                 7

  5.2       Délais                                                 7

  5.3       Contraintes Légales et Réglementaires                  8

  **6.**    **Agents IA**                                          **8**

  6.1       Utilisateur Standard --- 6 Outils IA Simplifiés        8

  6.1.1     Planificateur Intelligent de Publications              8

  6.1.2     Générateur de Légendes et de Contenu IA                9

  6.1.3     Suggéreur de Hashtags et de Tendances                  9

  6.1.4     Répondeur Automatique aux Commentaires                 9

  6.1.5     Résumé de Performance Hebdomadaire                     10

  6.1.6     Calendrier de Contenu IA                               10

  6.2       Utilisateur Professionnel --- 7 Agents IA              10

  6.2.1     Agent Chef de Compte                                   10

  6.2.2     Agent Gestionnaire de Réseaux Sociaux                  11

  6.2.3     Agent Stratège de Contenu                              11

  6.2.4     Créateur de Contenu IA                                 12

  6.2.5     Analytics IA                                           12

  6.2.6     IA d\'Optimisation Publicitaire                        13

  6.2.7     IA de Veille Concurrentielle                           13

  **7.**    **Modèle Commercial SaaS et Plans d\'Abonnement**      **14**

  7.1       Vue d\'Ensemble des Plans                              14

  7.2       Facturation Client --- Stripe Connect                  14

  **8.**    **Architecture Système**                               **15**

  8.1       Vue d\'Ensemble de l\'Architecture                     15

  8.2       Frontend                                               15

  8.3       Backend                                                15

  8.4       Moteur IA                                              16

  8.5       Base de Données                                        16

  **9.**    **Stack Technologique Complète**                       **16**

  **10.**   **Spécifications du Panneau d\'Administration**        **17**

  10.1      Gestion des Utilisateurs                               17

  10.2      Gestion des Abonnements                                17

  10.3      Surveillance des Agents IA                             18

  10.4      Analytics de la Plateforme                             18

  10.5      Modération du Contenu                                  18

  10.6      Configuration Système                                  18

  **11.**   **Exigences Non Fonctionnelles**                       **19**

  11.1      Performance                                            19

  11.2      Sécurité                                               19

  11.3      Évolutivité                                            19

  11.4      Conformité                                             19

  **12.**   **Périmètre MVP et Livrables**                         **20**

  12.1      Phase 1 --- MVP (Soutenance de Fin d\'Études)          20

  12.2      Phase 2 --- Développement Post-Soutenance              20

  **13.**   **Glossaire**                                          **21**
  -------------------------------------------------------------------------

# 1. Présentation du Projet

  -----------------------------------------------------------------------
  **Attribut**           **Détail**
  ---------------------- ------------------------------------------------
  Nom du projet          Social Mind AI

  

  Version                1.0 --- Mai 2026

  Statut                 En cours de développement
  -----------------------------------------------------------------------

Social Mind AI est une application web SaaS intelligente par abonnement
qui réplique et automatise l\'ensemble du flux de travail d\'une Agence
de Marketing sur les Réseaux Sociaux (SMMA) grâce à l\'intelligence
artificielle. La plateforme remplace les rôles humains traditionnels ---
chef de compte, stratège, créateur de contenu, analyste, spécialiste en
publicité et analyste concurrentiel --- par des agents IA spécialisés
capables d\'exécuter de manière indépendante des tâches marketing
complexes.

La plateforme dessert deux types d\'utilisateurs fondamentalement
distincts : les créateurs individuels et les marques personnelles
souhaitant automatiser leurs activités quotidiennes sur les réseaux
sociaux sans connaissances techniques, et les utilisateurs
professionnels --- agences SMMA et professionnels du marketing digital
--- qui ont besoin d\'un système d\'exploitation d\'agence complet
propulsé par l\'IA, avec des analyses approfondies, une gestion
multi-clients et des fonctionnalités de facturation.

  -----------------------------------------------------------------------
  Opportunité de marché : Le marché mondial de la gestion des réseaux
  sociaux devrait dépasser 41 milliards de dollars d\'ici 2030. Les
  plateformes actuelles (Buffer, Hootsuite, Sprout Social) gèrent des
  fonctions individuelles, mais aucune ne réunit tous les rôles SMMA sous
  une seule plateforme pilotée par l\'IA. Social Mind AI comble cette
  lacune avec une architecture multi-agents offrant une capacité
  d\'agence complète à une fraction du coût traditionnel.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 2. Énoncé du Problème

## 2.1 Pour les Agences SMMA

Les agences SMMA traditionnelles reposent sur plusieurs employés pour
gérer leur flux de prestation de services complet, entraînant des
inefficacités opérationnelles significatives :

-   Coûts opérationnels élevés : une équipe SMMA complète coûte entre 10
    000 et 30 000 dollars par mois en salaires

-   Prise de décision lente : les processus manuels retardent la
    création de stratégies, la production de contenu et les ajustements
    de campagnes

-   Évolutivité limitée : l\'ajout de nouveaux clients nécessite un
    recrutement proportionnel

-   Qualité inconsistante : les résultats dépendent des performances
    individuelles et de la disponibilité de chaque employé

-   Manque de données en temps réel : les analyses et rapports manuels
    sont chronophages et souvent en retard

## 2.2 Pour les Créateurs Individuels

Les créateurs individuels et les propriétaires de marques personnelles
font face à leurs propres défis :

-   Pas de temps pour gérer les réseaux sociaux de manière cohérente en
    parallèle de leur activité principale

-   Impossibilité de se payer des services SMMA professionnels
    (généralement 1 500 à 5 000 dollars par mois minimum)

-   Manque d\'expertise pour créer des stratégies de publication
    efficaces, de recherche de hashtags et de tactiques d\'engagement

-   Plannings de publication inconsistants entraînant des pénalités
    algorithmiques et une réduction de la portée

# 3. Utilisateurs Cibles et Rôles

## 3.1 Utilisateur Standard (Créateur Individuel)

Les utilisateurs standard sont des créateurs de contenu individuels,
influenceurs, freelances, propriétaires de petites entreprises, ou toute
personne gérant sa propre marque personnelle. Leur objectif principal
est d\'automatiser les tâches quotidiennes sur les réseaux sociaux sans
expertise en marketing digital.

  -----------------------------------------------------------------------
  Profil Utilisateur Standard Personas : créateur Instagram, influenceur
  TikTok, freelance, coach, propriétaire d\'entreprise locale. Niveau
  technique : non-technique. Objectif : développer sa présence sur les
  réseaux sociaux avec un effort minimal. Budget : abonnement bas à moyen
  de gamme.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Les utilisateurs standard ont accès à des outils IA simplifiés et
orientés grand public, conçus autour de six cas d\'usage principaux :

-   Planification intelligente des publications (l\'IA sélectionne
    automatiquement les meilleurs horaires de publication)

-   Génération de légendes et de contenu par IA (saisissez un sujet,
    recevez des légendes prêtes à publier)

-   Suggestions de hashtags et de tendances (tags pertinents pour votre
    niche)

-   Répondeur automatique aux commentaires (l\'IA répond aux abonnés
    dans la voix de marque de l\'utilisateur)

-   Résumé de performance hebdomadaire simplifié (portée, meilleure
    publication, croissance des abonnés)

-   Calendrier de contenu IA (plan de publication hebdomadaire avec
    idées de sujets et rappels)

Les utilisateurs standard n\'ont PAS accès à : les flux d\'intégration
clients, les rapports de stratégie marketing, les tableaux de bord de
veille concurrentielle, la gestion de campagnes publicitaires, les
analyses approfondies, ni les fonctionnalités de facturation client.

## 3.2 Utilisateur Professionnel (Agence SMMA / Professionnel du Marketing)

Les utilisateurs professionnels sont des propriétaires d\'agences SMMA,
consultants en marketing digital ou professionnels du marketing gérant
plusieurs comptes clients. Ils ont l\'expertise pour interpréter des
analyses approfondies et mener des campagnes professionnelles.

  -----------------------------------------------------------------------
  Profil Utilisateur Professionnel Personas : propriétaire d\'agence
  SMMA, marketeur digital freelance, consultant en marketing, community
  manager. Niveau technique : intermédiaire à avancé. Objectif : fournir
  des services d\'agence complets à grande échelle grâce à l\'IA. Budget
  : abonnement niveau professionnel.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Les utilisateurs professionnels ont accès aux 7 agents IA dans leur
configuration professionnelle complète, ainsi qu\'aux fonctionnalités
suivantes :

-   Gestion multi-clients (espaces de travail séparés par client)

-   Tableaux de bord d\'analyse approfondis avec rapports PDF
    exportables

-   Gestion de campagnes publicitaires via les API Meta Ads et Google
    Ads

-   Veille concurrentielle sur jusqu\'à 10 concurrents par client

-   CRM clients avec suivi de projet et gestion des jalons

-   Facturation et émission de factures clients via l\'intégration
    Stripe Connect

## 3.3 Administrateur

Le rôle Administrateur est réservé à l\'opérateur de la plateforme
(l\'équipe de développement ou le fondateur). Les administrateurs
n\'utilisent pas les fonctionnalités marketing de la plateforme. Ils
gèrent la plateforme elle-même selon six domaines opérationnels :
gestion des utilisateurs, gestion des abonnements, surveillance des
agents IA, analyses de la plateforme, modération de contenu et
configuration système. Le panneau d\'administration n\'est lié depuis
aucun endroit de l\'interface publique et nécessite une authentification
à deux facteurs.

# 4. Exigences Fonctionnelles

## 4.1 Système d\'Authentification

-   Inscription par e-mail/mot de passe avec vérification par e-mail

-   Création de compte basée sur les rôles : Utilisateur Standard ou
    Professionnel (sélectionné à l\'inscription)

-   Connexion OAuth via Google et Facebook

-   Authentification par jeton JWT (Laravel Sanctum)

-   Réinitialisation du mot de passe par lien e-mail

-   Authentification à deux facteurs pour les comptes Admin
    (obligatoire)

-   Gestion de session avec expiration de jeton configurable

-   Protection des routes basée sur les rôles --- chaque tableau de bord
    n\'est accessible que par son rôle désigné

-   Validation de l\'abonnement sur chaque route protégée --- un plan
    expiré redirige vers la page de mise à niveau

## 4.2 Tableau de Bord Utilisateur Standard

-   Interface conviviale et grand public avec un langage simple (sans
    jargon marketing)

-   Connexion de jusqu\'à 2 comptes de réseaux sociaux (Instagram,
    TikTok, Facebook)

-   Accès en un clic à tous les 6 outils IA simplifiés

-   Carte de résumé de performance hebdomadaire sur la page d\'accueil

-   Calendrier de contenu IA avec vue des prochaines publications

-   Centre de notifications pour les rappels de publication et
    suggestions IA

-   Paramètres du compte : profil, comptes connectés, gestion de
    l\'abonnement

## 4.3 Tableau de Bord Utilisateur Professionnel

-   Tableau de bord professionnel avec sélecteur de client (basculer
    entre les comptes clients)

-   7 cartes d\'agents IA avec indicateurs de statut en temps réel

-   Flux d\'activité en direct montrant les actions récentes de tous les
    agents pour tous les clients

-   Aperçu analytique agrégé : portée totale, taux d\'engagement, ROI
    publicitaire, publications planifiées

-   Panneaux d\'accès rapide : stratégies récentes, calendrier de
    contenu, approbations en attente

-   Module CRM clients : ajouter/modifier/archiver des clients avec
    informations de contact et détails de contrat

-   Section facturation client : création de factures, gestion des
    retainers, suivi de l\'état des paiements

-   Gestion multi-plateforme : connexion des comptes sociaux par espace
    de travail client

## 4.4 Système d\'Abonnement et de Facturation

La plateforme utilise Stripe pour le traitement des abonnements à la
plateforme (paiements des utilisateurs à Social Mind AI) et Stripe
Connect pour la facturation professionnelle-à-client (collecte des
paiements des clients par les agences SMMA).

-   Sélection de plan à l\'inscription avec activation de l\'essai
    gratuit

-   Stripe Checkout pour le traitement sécurisé des paiements

-   Gestion des webhooks pour les événements du cycle de vie des
    abonnements (renouvellement, annulation, échec de paiement)

-   Accès aux fonctionnalités automatiquement limité selon le plan actif

-   Génération de PDF de factures et livraison par e-mail pour les
    abonnements à la plateforme

-   Système de codes promotionnels et de remises

-   Rétrogradation de plan progressive avec conservation des données
    pendant 30 jours

# 5. CONTRAINTES DU PROJET

## 5.1 Budget

  -----------------------------------------------------------------------
  **Poste de Dépense**         **Montant Estimé**    **Pourcentage**
  ---------------------------- --------------------- --------------------
  Développement Frontend       12 000 MAD            20 %
  (React, Three.js, UI/UX)                           

  Développement Backend        15 000 MAD            25 %
  (Laravel, API, base de                             
  données)                                           

  Moteur IA & APIs (OpenAI,    18 000 MAD            30 %
  LangChain, modèles ML)                             

  Infrastructure & Hébergement 6 000 MAD             10 %
  (AWS, Redis, CI/CD)                                

  Tests, Recette & Débogage    4 800 MAD             8 %

  Documentation & Formation    4 200 MAD             7 %
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  Budget global alloué : 60 000 MAD TTC Note : Les coûts d\'API (OpenAI
  GPT-4o, Whisper) sont estimés sur la base d\'une utilisation en phase
  de développement et de tests. En production, ces coûts seront couverts
  par les revenus d\'abonnement. Des ressources cloud gratuites (GitHub
  Student Pack, AWS Free Tier) seront utilisées au maximum pour réduire
  les dépenses.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## 5.2 Délais

  -------------------------------------------------------------------------
  **Phase**   **Description**          **Période**        **Durée**
  ----------- ------------------------ ------------------ -----------------
  Phase 1     Analyse des besoins &    Mai 2026           4 semaines
              conception architecture                     

  Phase 2     Développement Backend &  Juin 2026          5 semaines
              base de données                             

  Phase 3     Développement Frontend & Juillet. 2026      6 semaines
              intégration UI                              

  Phase 4     Intégration des agents   Juillet. -- Août   7 semaines
              IA (MVP : 3 agents)      2026               

  Phase 5     Tests, correction de     Septembre 2026     4 semaines
              bugs & recette                              

  Phase 6     Déploiement &            Septembre 2026     4 semaines
              présentation finale                         
  -------------------------------------------------------------------------

  -----------------------------------------------------------------------
  Date de mise en production cible (MVP) : Mai 2026 La Phase 1 (MVP ---
  Soutenance de Fin d\'Études) comprend : le système d\'authentification,
  2 plans d\'abonnement avec Stripe, le tableau de bord utilisateur
  standard complet (6 outils IA), et 3 agents IA professionnels
  pleinement opérationnels (Agent Chef de Compte, Analytics IA, Créateur
  de Contenu IA) ainsi que le panneau d\'administration.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## 5.3 Contraintes Légales et Réglementaires

  -----------------------------------------------------------------------------
  **Réglementation**   **Domaine**        **Obligations**
  -------------------- ------------------ -------------------------------------
  RGPD (UE 2016/679)   Protection des     Droit à l\'effacement, export des
                       données            données, consentement explicite,
                       personnelles       politique de confidentialité

  Loi 09-08 (Maroc)    Protection des     Déclaration à la CNDP, droits
                       données au Maroc   d\'accès et de rectification des
                                          utilisateurs marocains

  CGU des APIs         Collecte &         Respect des limites de débit,
  Sociales             utilisation des    interdiction de revente de données,
                       données            conformité Meta/TikTok/LinkedIn/X

  PCI DSS (via Stripe) Sécurité des       Aucune donnée de carte stockée,
                       paiements          traitement via Stripe Checkout,
                                          conformité PCI niveau 1

  Droit d\'auteur & IA Contenu généré par Propriété du contenu généré clarifiée
                       IA                 dans les CGU, pas d\'utilisation
                                          d\'œuvres protégées pour
                                          l\'entraînement

  CCPA (Californie,    Confidentialité    Droit d\'opt-out applicable si des
  USA)                 des consommateurs  utilisateurs américains sont présents
                                          sur la plateforme
  -----------------------------------------------------------------------------

  -----------------------------------------------------------------------
  Toutes les données personnelles sont stockées sur des serveurs
  conformes RGPD (AWS EU-West / OVH Europe). Les journaux d\'audit des
  prompts IA sont conservés 30 jours maximum puis supprimés
  automatiquement. Une politique de confidentialité complète et des
  conditions générales d\'utilisation seront rédigées et accessibles
  depuis l\'interface publique avant le lancement.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 6. Agents IA

Social Mind AI implémente deux niveaux distincts d\'agents IA. Les
utilisateurs standard reçoivent six outils simplifiés orientés grand
public dérivés des capacités des agents sous-jacents. Les utilisateurs
professionnels reçoivent les sept agents IA professionnels dans leur
configuration complète.

## 6.1 Utilisateur Standard --- 6 Outils IA Simplifiés

### 6.1.1 Planificateur Intelligent de Publications

Remplace l\'Agent Gestionnaire de Réseaux Sociaux pour un usage
personnel. L\'IA analyse les données de performance historiques de
l\'utilisateur, identifie les habitudes d\'activité de son audience et
planifie automatiquement le nouveau contenu aux moments optimaux.

-   Connexion à Instagram, TikTok et Facebook via les API officielles

-   Analyse des 90 derniers jours de données d\'engagement pour
    déterminer les meilleures fenêtres de publication

-   L\'utilisateur peut mettre en file d\'attente du contenu pour la
    semaine ; l\'IA le distribue aux créneaux optimaux

-   Envoi de rappels push/e-mail pour les publications planifiées

-   Affichage d\'une vue calendrier simple des publications à venir

### 6.1.2 Générateur de Légendes et de Contenu IA

Version simplifiée de l\'agent Créateur de Contenu IA. L\'utilisateur
sélectionne une plateforme et saisit un sujet ou un mot-clé. L\'IA
génère trois variantes de légendes avec le ton, l\'appel à l\'action et
le nombre de caractères appropriés pour la plateforme sélectionnée.

-   Compatible avec Instagram, TikTok, Facebook, LinkedIn et Twitter/X

-   Adapté à chaque plateforme : ajuste le ton, la longueur et le
    formatage selon la plateforme

-   Génère trois variantes de légendes par demande

-   Option : suggestions d\'un concept d\'image basique pour accompagner
    la légende

-   Entraînement à la voix de marque : l\'utilisateur peut saisir 3
    publications types pour définir son ton

### 6.1.3 Suggéreur de Hashtags et de Tendances

Version allégée de l\'agent Stratège de Contenu. Étant donné un sujet ou
une niche, l\'IA suggère un ensemble de hashtags optimisés pour la
portée, en mélangeant des tags à fort volume avec des tags spécifiques à
la niche.

-   Génère 15 à 30 hashtags par demande, catégorisés par volume (haut /
    moyen / niche)

-   Affiche les sujets tendance dans la niche de l\'utilisateur, mis à
    jour quotidiennement

-   Suggère des angles de contenu basés sur ce qui performe actuellement
    dans la niche

-   Sauvegarde des ensembles de hashtags favoris pour réutilisation

### 6.1.4 Répondeur Automatique aux Commentaires

Version simplifiée du module d\'engagement de l\'agent Gestionnaire de
Réseaux Sociaux. L\'IA surveille les commentaires sur les publications
liées de l\'utilisateur et génère des réponses contextuellement
appropriées dans la voix de marque de l\'utilisateur.

-   Surveille tous les commentaires sur les comptes liés en temps réel

-   L\'IA classe les commentaires : positif, question, négatif, spam

-   Génère et publie optionnellement des réponses automatiques pour les
    commentaires positifs et les questions

-   Filtre et masque automatiquement le spam

-   Signale les commentaires négatifs pour que l\'utilisateur les
    examine avant toute réponse

-   Maintien de l\'humain dans la boucle : l\'utilisateur peut approuver
    ou modifier toute réponse générée par l\'IA

### 6.1.5 Résumé de Performance Hebdomadaire Simplifié

Résultat orienté grand public de l\'agent Analytics IA. Au lieu de
métriques brutes et de tableaux de bord, l\'utilisateur reçoit chaque
lundi matin un résumé hebdomadaire en langage simple expliquant les
performances de son contenu.

-   Livré par e-mail et notification in-app chaque lundi

-   Rapporte trois métriques principales en langage simple : portée,
    meilleure publication, évolution des abonnés

-   Fournit une recommandation actionnable pour la semaine à venir

-   Affiche un graphique de tendance simple sur 4 semaines pour la
    portée et l\'engagement

-   Sans jargon technique --- rédigé pour un public général

### 6.1.6 Calendrier de Contenu IA

Version simplifiée du module de planification de l\'agent Stratège de
Contenu. Chaque semaine, l\'IA génère un plan de publication
personnalisé spécifiant quoi publier, sur quelle plateforme et quel
jour.

-   Génère un plan de contenu sur 7 jours chaque dimanche pour la
    semaine à venir

-   Spécifie : type de publication (Reel, carrousel, Story, statique),
    plateforme, idée de sujet et jour

-   L\'utilisateur peut accepter, modifier ou régénérer la suggestion de
    chaque jour individuellement

-   S\'intègre directement au Planificateur Intelligent pour mettre en
    file d\'attente automatiquement les publications approuvées

-   Maintient une fréquence de publication cohérente pour soutenir la
    croissance algorithmique

## 6.2 Utilisateur Professionnel --- 7 Agents IA Professionnels

### 6.2.1 Agent Chef de Compte

  -----------------------------------------------------------------------
  **Objectif**       Remplace le chef de compte SMMA humain. Traite les
                     enregistrements de réunions clients, extrait les
                     informations marketing clés via le TAL et génère
                     automatiquement des stratégies marketing complètes
                     sur 30 jours.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  Le client télécharge un enregistrement Zoom/Teams
  IA**               (MP4, MP3, WAV, M4A, MOV --- max 200 Mo) → Whisper
                     transcrit l\'audio en texte → GPT-4o avec prompt
                     structuré extrait niche, audience, objectifs,
                     concurrents, KPIs en JSON → LangChain chaîne vers la
                     génération de stratégie → Sorties : JSON profil
                     client, document d\'intégration, PDF stratégie
                     marketing 30 jours.

  **Technologies     OpenAI Whisper (speech-to-text), GPT-4o (extraction
  IA**               TAL et génération de stratégie), LangChain
                     (orchestration de pipeline), spaCy (extraction
                     d\'entités).

  **Données /        Customer Support Twitter Dataset (Kaggle) pour les
  Kaggle**           patterns de communication ; ingénierie de prompt
                     personnalisée pour la génération de stratégie.
  -----------------------------------------------------------------------

### 6.2.2 Agent Gestionnaire de Réseaux Sociaux

  -----------------------------------------------------------------------
  **Objectif**       Remplace le gestionnaire de réseaux sociaux humain.
                     Gère la planification du contenu sur plusieurs
                     comptes clients et plateformes, surveille les
                     métriques d\'engagement en temps réel et génère des
                     réponses IA aux commentaires.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  Le professionnel connecte les comptes sociaux des
  IA**               clients via OAuth → L\'agent récupère l\'historique
                     d\'engagement → Un modèle de série temporelle prédit
                     les horaires de publication optimaux → Le contenu
                     est planifié via les API des plateformes → L\'agent
                     surveille les commentaires entrants et classe le
                     sentiment → L\'IA génère des réponses pour
                     approbation → Les métriques d\'engagement sont
                     enregistrées en base de données toutes les heures.

  **Technologies     API Meta Graph, API LinkedIn, API TikTok, API
  IA**               Twitter/X (planification et publication), Hugging
                     Face DistilBERT (classification de sentiment),
                     GPT-4o (génération de réponses), Prophet (prédiction
                     de série temporelle pour les horaires de
                     publication).

  **Données /        Social Media Sentiments Analysis Dataset (Kaggle) ;
  Kaggle**           Instagram Engagement Dataset (Kaggle).
  -----------------------------------------------------------------------

### 6.2.3 Agent Stratège de Contenu

  -----------------------------------------------------------------------
  **Objectif**       Remplace le stratège de contenu humain. Analyse la
                     niche client, l\'audience, le contenu des
                     concurrents et les tendances actuelles pour générer
                     des calendriers de contenu hebdomadaires, des
                     stratégies de publication et des recommandations de
                     hashtags.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  L\'agent intègre le profil client (depuis l\'Agent
  IA**               Chef de Compte) + données des publications des
                     concurrents → BERTopic regroupe les thèmes de
                     contenu → Le modèle de détection de tendances
                     identifie les sujets émergents → Le système de
                     recommandation croise niche + audience → Sorties :
                     piliers de contenu, calendrier hebdomadaire avec
                     types et sujets de publications, ensembles de
                     hashtags, recommandation de fréquence de
                     publication.

  **Technologies     BERTopic (modélisation de sujets), LDA (Allocation
  IA**               de Dirichlet Latente), TF-IDF (scoring de pertinence
                     des hashtags), Scikit-learn (clustering), GPT-4o
                     (génération de stratégie narrative).

  **Données /        All the News Dataset (Kaggle) ; Twitter Hashtag
  Kaggle**           Dataset (Kaggle) ; Social Media Influencer Dataset
                     (Kaggle).
  -----------------------------------------------------------------------

### 6.2.4 Créateur de Contenu IA

  -----------------------------------------------------------------------
  **Objectif**       Remplace le créateur de contenu et le graphiste
                     humains. Génère des légendes adaptées à chaque
                     plateforme, des concepts d\'images, des visuels
                     créatifs et des scripts vidéo à la demande pour
                     n\'importe quel client.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  L\'utilisateur professionnel sélectionne le client,
  IA**               la plateforme, le sujet et le ton → GPT-4o génère
                     une légende avec hashtags et CTA → Stable Diffusion
                     (via Hugging Face diffusers) ou l\'API DALL-E 3
                     génère le visuel → Le script vidéo est généré via
                     GPT-4o → Toutes les sorties sont stockées par espace
                     de travail client pour approbation avant
                     publication.

  **Technologies     GPT-4o (génération de légendes et de scripts),
  IA**               Stable Diffusion / DALL-E 3 (génération d\'images),
                     bibliothèque Hugging Face diffusers, API RunwayML
                     (génération vidéo optionnelle).

  **Données /        Modèles génératifs pré-entraînés --- aucun
  Kaggle**           entraînement personnalisé requis. Les tests de
                     qualité des légendes utilisent le corpus CC-News.
  -----------------------------------------------------------------------

### 6.2.5 Analytics IA

  -----------------------------------------------------------------------
  **Objectif**       Remplace l\'analyste de données humain. Collecte les
                     données de performance de toutes les plateformes
                     sociales liées par client, prédit les performances
                     futures, identifie les meilleurs types de contenu et
                     génère des rapports PDF exportables.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  Appels API vers Meta, TikTok, LinkedIn, Twitter
  IA**               récupèrent les métriques (likes, commentaires,
                     partages, portée, impressions) toutes les 6 heures →
                     Données stockées dans des tables MySQL de séries
                     temporelles → Le modèle Prophet prévoit la
                     trajectoire de croissance sur les 30 prochains jours
                     → XGBoost prédit le score d\'engagement pour le
                     nouveau contenu → Rapports PDF hebdomadaires et
                     mensuels générés automatiquement par client.

  **Technologies     API Meta Graph, API TikTok, API LinkedIn (collecte
  IA**               de données), Prophet (prévision de séries
                     temporelles), XGBoost et Random Forest (prédiction
                     d\'engagement), Matplotlib / ReportLab (génération
                     de rapports PDF).

  **Données /        Instagram Reach Analysis Dataset (Kaggle) ; Social
  Kaggle**           Media Analytics Dataset (Kaggle) ; YouTube
                     Statistics Dataset (Kaggle).
  -----------------------------------------------------------------------

### 6.2.6 IA d\'Optimisation Publicitaire

  -----------------------------------------------------------------------
  **Objectif**       Remplace le spécialiste en publicité humain. Gère
                     les campagnes publicitaires Meta et Google pour les
                     clients, optimise l\'allocation budgétaire en
                     fonction des performances en temps réel et
                     recommande les meilleurs segments d\'audience et
                     créatifs.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  Le professionnel connecte les comptes Meta Ads et
  IA**               Google Ads du client → L\'agent récupère
                     quotidiennement les métriques de campagne (CTR, CPC,
                     ROAS, conversions) → Un modèle ML prédictif évalue
                     les segments d\'audience → Un algorithme
                     d\'optimisation linéaire réalloue le budget entre
                     les ensembles de publicités → L\'agent signale les
                     publicités sous-performantes et suggère des
                     remplacements → Un rapport de ROI est généré
                     hebdomadairement par client.

  **Technologies     API Meta Ads, API Google Ads (données de campagne),
  IA**               Scikit-learn (classification prédictive), SciPy
                     optimize (allocation budgétaire), Q-Learning
                     optionnel (apprentissage par renforcement pour la
                     stratégie d\'enchères), XGBoost (prédiction du CTR).

  **Données /        Digital Advertising CTR Prediction Dataset (Kaggle)
  Kaggle**           ; Facebook Ad Campaign Performance Dataset (Kaggle)
                     ; Google Ads Performance Dataset (Kaggle).
  -----------------------------------------------------------------------

### 6.2.7 IA de Veille Concurrentielle

  -----------------------------------------------------------------------
  **Objectif**       Remplace l\'analyste concurrentiel humain. Surveille
                     jusqu\'à 10 comptes concurrents par client sur les
                     plateformes, suit leur stratégie de contenu et leurs
                     publications virales, et génère des recommandations
                     de contre-stratégie.
  ------------------ ----------------------------------------------------
  **Accès**          Professionnel uniquement

  **Flux de travail  Le professionnel saisit les identifiants des
  IA**               concurrents → Playwright/Scrapy scrape les données
                     de profil public (légendes, engagement, hashtags,
                     fréquence de publication) selon un planning
                     quotidien → VADER effectue une analyse de sentiment
                     sur les légendes des concurrents → Le clustering
                     K-Means regroupe le contenu concurrent par sujet et
                     format → La détection de tendances identifie leurs
                     patterns de contenu viral → GPT-4o génère des
                     suggestions de stratégie de différenciation.

  **Technologies     Playwright et Scrapy (scraping web), VADER et
  IA**               TextBlob (analyse de sentiment), K-Means / DBSCAN
                     (clustering de contenu), NLTK (traitement de texte),
                     GPT-4o (recommandations stratégiques).

  **Données /        Twitter Scrape Dataset (Kaggle) ; Social Media Brand
  Kaggle**           Dataset (Kaggle).
  -----------------------------------------------------------------------

# 7. Modèle Commercial SaaS et Plans d\'Abonnement

## 7.1 Vue d\'Ensemble des Plans

  --------------------------------------------------------------------------
  **Plan**         **Cible**       **Prix**     **Fonctionnalités Clés**
  ---------------- --------------- ------------ ----------------------------
  Essai Gratuit    Les deux        Gratuit / 1  Accès limité à tous les
                                   mois         outils, utilisation
                                                plafonnée

  Standard Basique Standard        9,99 \$/mois Planificateur (30
                                                publications), génération de
                                                légendes (50/mois), résumé
                                                hebdomadaire

  Standard Pro     Standard        19,99        Tous les outils Standard
                                   \$/mois      illimités, 2 comptes sociaux

  Professionnel    Professionnel   99 \$/mois   5 comptes clients, 7 agents,
  Standard                                      analytics, facturation
                                                client

  Professionnel    Professionnel   249 \$/mois  Clients illimités, 7 agents,
  Premium                                       optimisation pub, rapports
                                                en marque blanche
  --------------------------------------------------------------------------

## 7.2 Facturation Client --- Stripe Connect

Les abonnés au plan Professionnel peuvent collecter des paiements
directement auprès de leurs propres clients via Social Mind AI en
utilisant Stripe Connect. Cela maintient l\'ensemble du flux de travail
d\'agence --- stratégie, contenu, planification, reporting et
facturation --- au sein d\'une seule plateforme.

-   Le professionnel connecte son compte Stripe via le flux OAuth Stripe
    Connect

-   Création de facture client : description du service, montant,
    devise, date d\'échéance

-   Le système génère une facture PDF professionnelle avec lien de
    paiement

-   Le client paie via Stripe Checkout (carte, virement bancaire)

-   Statut de paiement suivi en temps réel : en attente, payé, en retard

-   Automatisation du retainer mensuel : facture récurrente envoyée
    automatiquement à la date de facturation

-   Tableau de bord des revenus : MRR total de tous les clients,
    factures impayées

-   Social Mind AI ne prélève aucune commission sur les transactions de
    facturation client

# 8. Architecture Système

## 8.1 Vue d\'Ensemble de l\'Architecture

La plateforme est construite selon une architecture à trois niveaux avec
une séparation claire entre la couche de présentation, la couche logique
métier et la couche de traitement IA.

  -----------------------------------------------------------------------
  Flux Architectural : Frontend React → Backend Laravel PHP (Passerelle
  API) → Moteur IA Python FastAPI → Base de données MySQL Toutes les
  communications entre couches utilisent des API REST avec des charges
  JSON. Laravel agit comme passerelle API principale, authentifiant
  toutes les requêtes avant de les proxyfier vers le moteur Python.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## 8.2 Frontend

-   Framework : React 18 avec outil de build Vite

-   Cartes 3D des Agents : Three.js via React Three Fiber et Drei

-   Graphiques et Analytics : Recharts

-   Style : Tailwind CSS avec la bibliothèque de composants shadcn/ui

-   Routage : React Router v6 avec routes protégées basées sur les rôles

-   Client HTTP : Axios avec React Query pour la gestion de l\'état
    serveur et le cache

-   Animations : Framer Motion pour les transitions de page et
    micro-interactions

-   Téléchargement de fichiers : React Dropzone pour les enregistrements
    de réunions et fichiers médias

-   Temps réel : Laravel Echo avec Pusher ou Soketi pour le flux
    d\'activité WebSocket des agents

## 8.3 Backend

-   Framework : Laravel 11 (PHP 8.3)

-   Authentification : Laravel Sanctum avec jetons JWT

-   ORM Base de données : Eloquent avec MySQL

-   File d\'attente : Laravel Queues avec Redis pour les tâches de
    traitement IA asynchrones

-   Planification : Laravel Task Scheduler pour la surveillance
    périodique des agents

-   Paiement : SDK PHP Stripe pour la facturation des abonnements et
    Stripe Connect

-   Stockage de fichiers : AWS S3 ou Cloudinary pour les fichiers de
    réunions téléchargés et médias générés

-   E-mail : Laravel Mail avec le driver Mailgun ou SendGrid

-   Limitation de débit API : middleware Laravel Throttle par plan
    d\'abonnement

## 8.4 Moteur IA

-   Framework : Python FastAPI (serveur API REST asynchrone et haute
    performance)

-   Speech-to-text : OpenAI Whisper (modèle local, base ou large-v2)

-   LLM : GPT-4o via SDK Python OpenAI ; API Claude comme fallback

-   Orchestration de Pipeline : LangChain pour les workflows
    multi-étapes des agents

-   TAL : spaCy, NLTK, TextBlob, VADER, Hugging Face Transformers

-   Modélisation de Sujets : BERTopic, LDA Scikit-learn

-   Modèles ML : Scikit-learn, XGBoost, Prophet (séries temporelles)

-   Génération d\'Images : Hugging Face diffusers (Stable Diffusion) ou
    API DALL-E 3

-   Scraping Web : Playwright, Scrapy, BeautifulSoup

-   Dépendance : ffmpeg requis sur le serveur pour l'extraction audio
    des fichiers vidéo

## 8.6 APIs et Services Externes --- Intégrations Réseaux Sociaux

Le Moteur IA de Social Mind AI s'appuie sur un ensemble d'APIs
officielles fournies par Meta Platforms afin d'automatiser l'intégralité
du flux de travail d'une agence SMMA. Ces APIs constituent la couche
d'intégration entre la plateforme et les réseaux sociaux des clients.
Elles permettent notamment : l'automatisation des publications, la
récupération des statistiques, la gestion des commentaires et messages,
l'automatisation des réponses par agents IA, la récupération des
insights et analytics, la gestion des campagnes publicitaires, l'analyse
des performances marketing et la communication automatisée avec les
clients. Toutes les interactions sont conformes aux Conditions Générales
d'Utilisation de Meta et transitent par une application déclarative
enregistrée sur le portail Meta for Developers.

### 8.6.1 Meta Graph API (Facebook & Instagram)

**Rôle et description :** La Meta Graph API (v22.0 en 2026) constitue la
passerelle principale d'accès programmatique à l'ensemble des données et
fonctionnalités de Facebook et Instagram. Elle permet à Social Mind AI
d'interagir directement avec les comptes professionnels des clients via
des requêtes HTTP authentifiées par token OAuth 2.0.

-   Automatisation des publications sur les Pages Facebook et comptes
    Instagram Business (posts, Reels, Stories, carrousels) via
    l'endpoint /media et /media_publish

-   Récupération des statistiques d'engagement (likes, commentaires,
    partages, portée, impressions) via l'endpoint /insights pour
    alimenter les modèles ML de l'Agent Analytics IA

-   Gestion des commentaires : lecture, modération automatisée et
    réponses générées par GPT-4o via l'Agent Gestionnaire de Réseaux
    Sociaux

-   Récupération des insights audiences (démographie, localisation,
    tranches d'âge) pour calibrer les stratégies de contenu et les
    recommandations de l'Agent Stratège

### 8.6.2 Instagram Graph API --- Bots & Agents IA

**Rôle et description :** L'Instagram Graph API est la couche
d'intégration dédiée à l'automatisation des activités Instagram pour les
comptes Business et Creator. Elle permet aux agents IA de Social Mind AI
d'agir en tant que gestionnaires autonomes, publiant du contenu,
interagissant avec la communauté et analysant les performances sans
intervention humaine.

-   Planification et publication automatisée de posts, Reels et Stories
    aux créneaux optimaux déterminés par le modèle Prophet de l'Agent
    Gestionnaire de Réseaux Sociaux

-   Automatisation des réponses aux DM via Webhooks Instagram ---
    limitée à 200 DM/heure depuis la révision API 2026 (en baisse de 96%
    par rapport aux limites antérieures)

-   Classification du sentiment des commentaires (positif / négatif /
    question / spam) via DistilBERT et génération de réponses
    contextuelles adaptées à la voix de marque du client

-   Analyse des performances marketing : taux d'engagement, portée
    organique, croissance des abonnés et scoring des meilleures heures
    de publication par niche

### 8.6.3 Messenger API (Facebook)

**Rôle et description :** La Messenger API permet à Social Mind AI de
déployer des agents conversationnels IA directement sur les Pages
Facebook Business des clients. Ces agents gèrent automatiquement la
relation client via des workflows configurés à base de Webhooks, de NLP
et de réponses générées par LLM.

-   Déploiement de chatbots IA pour le support client automatisé :
    réponses aux FAQ, suivi de commandes, prise de rendez-vous --- avec
    maintien de l'humain dans la boucle pour les cas complexes

-   Génération automatisée de leads via des flux de conversation IA :
    qualification du prospect, collecte d'informations, redirection vers
    un commercial humain si nécessaire

-   Communication automatisée avec les clients : notifications de
    campagnes, confirmations, rappels et relances marketing
    personnalisées. Chaque conversation est synchronisée avec le CRM
    clients de Social Mind AI

### 8.6.4 WhatsApp Business API --- Restrictions et Cadre d'Utilisation 2026

**Rôle et description :** La WhatsApp Business Platform API permet aux
entreprises d'automatiser les communications avec leurs clients via
WhatsApp. Elle offre des fonctionnalités de messagerie structurée, de
notifications transactionnelles et de workflows de support client à
grande échelle.

**⚠️ Restriction majeure de 2026 --- Impact direct sur Social Mind AI
:**

Depuis le 15 janvier 2026, Meta a officiellement interdit le déploiement
de chatbots IA généralistes sur la WhatsApp Business Platform API. Cette
décision résulte de la génération excessive de trafic par des assistants
conversationnels ouverts (de type GPT) sans valeur commerciale directe
pour Meta.

-   **Interdit (depuis janv. 2026) :** Assistants IA généralistes en
    conversation libre --- agents de type ChatGPT déployés sur WhatsApp,
    bots à réponses ouvertes non structurées

-   **Autorisé :** Bots structurés à usage spécifique : support client
    défini, suivi de commandes, réservations, notifications
    transactionnelles, campagnes marketing ciblées avec messages
    pré-approuvés (templates HSM)

*Adaptation architecturale dans Social Mind AI : la plateforme utilise
WhatsApp Business API exclusivement pour des workflows structurés à
finalité commerciale définie (confirmation de rendez-vous, notification
de campagne, relance client). Les agents conversationnels ouverts
restent déployés uniquement via Messenger API et Instagram DM API,
conformes aux CGU en vigueur.*

### 8.6.5 Meta Marketing API --- Automatisation Publicitaire IA

**Rôle et description :** La Meta Marketing API est une extension
spécialisée de la Graph API dédiée à la gestion programmatique des
campagnes publicitaires Facebook et Instagram. Elle alimente directement
l'Agent IA d'Optimisation Publicitaire de Social Mind AI, permettant une
gestion entièrement automatisée du cycle de vie des campagnes --- de la
création à l'analyse des résultats.

-   Création et gestion automatisées des campagnes, Ad Sets et créatifs
    publicitaires (Ad Creatives) générés par le Créateur de Contenu IA
    et soumis via l'API

-   Optimisation dynamique du budget : l'agent IA réalloue les budgets
    entre Ad Sets en fonction des métriques temps réel (CTR, CPC, ROAS)
    via un algorithme d'optimisation linéaire SciPy

-   Analyse des performances marketing : génération de rapports ROI
    hebdomadaires par client avec recommandations IA pour l'optimisation
    des audiences et créatifs

-   Ciblage d'audience prédictif : le modèle XGBoost identifie les
    segments à fort potentiel de conversion, configurés automatiquement
    comme Lookalike Audiences via l'API. Suspension automatisée des
    publicités sous-performantes avec soumission de nouveaux créatifs IA
    en remplacement

## 8.5 Base de Données

-   Base de données principale : MySQL 8.0

-   Cache et courtier de file d\'attente : Redis

-   Tables clés : users, subscriptions, client_profiles, agent_statuses,
    agent_logs, agent_usage_stats, content_calendar, scheduled_posts,
    invoices, social_accounts

# 9. Stack Technologique Complète

  -------------------------------------------------------------------------
  **Couche**       **Technologie**       **Rôle**
  ---------------- --------------------- ----------------------------------
  Frontend         React 18 + Vite       Framework UI principal

  Frontend         Three.js / React      Tableau de bord 3D des agents
                   Three Fiber           

  Frontend         Recharts              Graphiques d\'analytics

  Frontend         Tailwind CSS +        Style et composants
                   shadcn/ui             

  Frontend         Framer Motion         Animations

  Frontend         React Query + Axios   Gestion de l\'état API

  Backend          Laravel 11 (PHP 8.3)  Passerelle API et logique métier

  Backend          Laravel Sanctum       Authentification JWT

  Backend          Laravel Queues +      Traitement asynchrone des tâches
                   Redis                 IA

  Backend          SDK PHP Stripe        Paiements et facturation

  Moteur IA        Python FastAPI        Serveur du micro-service IA

  Moteur IA        OpenAI Whisper        Transcription speech-to-text

  Moteur IA        API GPT-4o            LLM pour génération et extraction

  Moteur IA        LangChain             Orchestration des pipelines
                                         d\'agents

  Moteur IA        Scikit-learn +        Modèles ML
                   XGBoost               

  Moteur IA        Prophet               Prévision de séries temporelles

  Moteur IA        BERTopic              Modélisation de sujets

  Moteur IA        Stable Diffusion /    Génération d\'images
                   DALL-E 3              

  Moteur IA        Playwright + Scrapy   Scraping des données concurrentes

  Base de Données  MySQL 8.0             Stockage principal de données

  Base de Données  Redis                 Cache et courtier de file
                                         d\'attente

  Infrastructure   Docker                Conteneurisation

  Infrastructure   AWS S3 / Cloudinary   Stockage des fichiers médias

  Infrastructure   GitHub Actions        Pipeline CI/CD
  -------------------------------------------------------------------------

# 10. Spécifications du Panneau d\'Administration

Le panneau d\'administration est une route React séparée (/admin/\*)
accessible uniquement aux utilisateurs ayant le rôle admin. Il n\'est
pas lié depuis l\'interface orientée utilisateur et nécessite une
authentification à deux facteurs.

## 10.1 Gestion des Utilisateurs

-   Affichage de tous les comptes enregistrés avec recherche, filtre
    (par rôle, plan, statut) et tri

-   Affichage du profil utilisateur individuel : date d\'inscription,
    plan, statistiques d\'utilisation, historique de connexion

-   Modification manuelle du rôle utilisateur (standard / professionnel
    / admin)

-   Suspension ou bannissement permanent des comptes pour violations des
    conditions d\'utilisation

-   Déclenchement de l\'e-mail de réinitialisation de mot de passe pour
    n\'importe quel utilisateur

-   Suppression du compte et de toutes les données associées (conformité
    RGPD droit à l\'effacement)

## 10.2 Gestion des Abonnements

-   Affichage de tous les abonnements actifs, en essai, annulés et en
    retard de paiement

-   Modification manuelle du plan d\'un utilisateur (mise à
    niveau/rétrogradation sans paiement Stripe)

-   Application de codes promotionnels et remises manuellement sur
    n\'importe quel compte

-   Émission de remboursements via l\'API Stripe directement depuis le
    tableau de bord

-   Création, modification et archivage des plans tarifaires et de leurs
    configurations de fonctionnalités

-   Affichage du MRR, du taux de désabonnement, du taux de conversion
    essai-payant et des revenus par plan

## 10.3 Surveillance des Agents IA

-   Tableau de bord de statut en direct montrant les 7 agents : en ligne
    / inactif / erreur / désactivé

-   Métriques par agent : appels API du jour, latence moyenne (ms),
    utilisation mémoire, profondeur de file d\'attente

-   Suivi des coûts en temps réel : dépenses API OpenAI/Anthropic par
    agent par jour et par mois

-   Journal d\'erreurs avec filtrage par niveau (info / avertissement /
    erreur) et par agent

-   Activation/désactivation instantanée de n\'importe quel agent sans
    redéploiement

-   Définition des limites de débit d\'utilisation API par plan
    d\'abonnement

-   Contrôle de version du modèle IA : basculer entre le modèle Whisper
    (base/large) ou le modèle GPT par agent

-   Intervalle de vérification de santé : chaque agent envoie une
    requête à /health toutes les 60 secondes

## 10.4 Analytics de la Plateforme

-   Total des utilisateurs enregistrés et taux de croissance semaine sur
    semaine

-   Répartition utilisateurs standard vs professionnels avec tendance
    dans le temps

-   Taux de conversion des plans : essai gratuit vers payant, basique
    vers pro, standard vers premium

-   Revenu Mensuel Récurrent (MRR) et Revenu Annuel Récurrent (RAR)

-   Utilisateurs Actifs Quotidiens (UAQ) et Utilisateurs Actifs Mensuels
    (UAM)

-   Carte thermique d\'utilisation des fonctionnalités : quels outils
    sont les plus utilisés

-   Taux de désabonnement et analyse des raisons d\'annulation

## 10.5 Modération du Contenu

-   File de révision pour le contenu généré par IA signalé par les
    utilisateurs

-   Tableau de bord des rapports d\'abus avec options d\'action
    (avertissement, suspension, bannissement)

-   Liste de mots-clés bloqués pour empêcher l\'IA de générer du contenu
    nuisible ou inapproprié

-   Journal d\'audit de toutes les entrées et sorties de prompts IA
    (conservé 30 jours)

-   Gestion des demandes de suppression de données RGPD avec suivi de
    traitement sur 30 jours

-   Révision des données concurrentes scrapées pour assurer la
    conformité avec les conditions d\'utilisation des plateformes

## 10.6 Configuration Système

-   Gestion des clés API : OpenAI, Anthropic, Stripe, Meta, TikTok,
    LinkedIn, Twitter, Google Ads

-   Drapeaux de fonctionnalités globaux : activer ou désactiver
    instantanément n\'importe quelle fonctionnalité pour tous les
    utilisateurs

-   Basculement du mode maintenance : affiche une page de maintenance à
    tous les utilisateurs lors des déploiements

-   Éditeur de modèles d\'e-mail : personnalisation des e-mails de
    bienvenue, paiement, abonnement et notification

-   Paramètres de quota d\'utilisation IA par plan (max tokens, max
    appels, max taille de fichier téléchargé)

-   Rotation des identifiants API des réseaux sociaux et surveillance du
    statut

# 11. Exigences Non Fonctionnelles

## 11.1 Performance

-   Temps de réponse API pour les requêtes standard : inférieur à 300 ms
    (95e percentile)

-   Traitement par agent IA (ex : génération de stratégie) : inférieur à
    30 secondes avec indicateur de progression

-   Transcription Whisper : traitée de manière asynchrone via Laravel
    Queue --- utilisateur notifié à la fin

-   Chargement de la page du tableau de bord : inférieur à 2 secondes
    sur une connexion haut débit standard

## 11.2 Sécurité

-   Tous les endpoints API protégés par l\'authentification par jeton
    Laravel Sanctum

-   Contrôle d\'accès basé sur les rôles appliqué au niveau des routes
    et des requêtes de base de données

-   Clés API stockées en variables d\'environnement, jamais dans le code
    ni la base de données

-   Communication interne Python-vers-Laravel sécurisée via un en-tête
    de secret partagé

-   Fichiers téléchargés soumis à une analyse antivirus avant traitement
    (ClamAV ou équivalent)

-   HTTPS appliqué dans tous les environnements

-   Panneau admin : 2FA obligatoire, expiration de session après 30
    minutes d\'inactivité

## 11.3 Évolutivité

-   Moteur IA Python et backend Laravel indépendamment évolutifs
    horizontalement

-   Tâches IA longues traitées de manière asynchrone via des workers de
    file d\'attente (nombre de workers évolutif)

-   Requêtes de base de données optimisées avec des index sur
    agent_name, date, user_id et created_at

-   Cache Redis pour les données fréquemment accédées (plan utilisateur,
    statuts des agents, drapeaux de fonctionnalités)

## 11.4 Conformité

-   RGPD : droit à l\'effacement implémenté dans le panneau admin ;
    politiques de conservation des données définies par type

-   RGPD : export des données utilisateur disponible sur demande

-   Conformité API des réseaux sociaux : toute collecte de données
    respecte les conditions d\'utilisation et limites de débit des
    plateformes

-   Conformité PCI Stripe : aucune donnée de carte brute traitée ni
    stockée par la plateforme

# 11.5 Scénarios Fonctionnels --- Marketplace SMMA Intelligente

## 11.5.1 Création du Profil Professionnel Agence SMMA

**Description du scénario :** Lors de l'inscription d'une agence SMMA
sur Social Mind AI en tant qu'utilisateur de type "Business / SMMA
Agency", la plateforme déclenche automatiquement une popup de bienvenue
proposant la création d'un profil professionnel structuré. Ce profil a
pour objectif d'augmenter la visibilité de l'agence au sein de la
marketplace IA de Social Mind AI et de lui permettre d'acquérir de
nouveaux prospects et clients directement via la plateforme, sans
recourir à des canaux d'acquisition externes.

**Composantes du profil professionnel agence :**

-   **Cover image & Logo (Profile image) :** image de couverture et logo
    de l'agence, hébergés sur AWS S3 / Cloudinary, redimensionnés
    automatiquement pour différents supports et résolutions

-   **Description de l'entreprise :** présentation structurée de
    l'agence, sa mission, ses valeurs, son année de création et son
    positionnement marché

-   **CEO / Fondateur :** informations sur le ou les fondateurs (nom,
    biographie professionnelle, liens réseaux sociaux)

-   **Effectifs :** taille de l'équipe, compétences clés et pôles
    d'expertise (création de contenu, media buying, community
    management, etc.)

-   **Activités et services :** catalogue structuré des services
    proposés (gestion réseaux sociaux, publicité digitale, création de
    contenu, community management, etc.) avec tarifs indicatifs et
    niches spécialisées

-   **Réseaux sociaux :** liens vers les comptes Instagram, LinkedIn,
    TikTok, Facebook et site web de l'agence, vérifiés automatiquement
    par la plateforme

-   **Portfolio :** galerie de réalisations clients (visuels, campagnes,
    résultats chiffrés) classées par niche sectorielle pour faciliter
    l'identification par les entreprises prospectrices

-   **Témoignages clients :** avis vérifiés et notés (système 5 étoiles)
    laissés exclusivement par des entreprises ayant travaillé avec
    l'agence via Social Mind AI, garantissant leur authenticité

-   **Vidéo de présentation de la marque :** brand video hébergée sur la
    plateforme, présentant l'équipe, la culture d'agence et les
    résultats obtenus pour les clients

-   **Études de cas marketing :** analyses détaillées de campagnes
    réussies (problématique client, stratégie déployée, résultats
    mesurables en KPIs) servant de preuve sociale et d'argument
    commercial fort

## 11.5.2 Mise en Relation Intelligente Business -- Agences SMMA (IA Matching)

**Description du scénario :** Lorsqu'une petite entreprise ou une
startup crée un compte Business sur Social Mind AI, la plateforme
l'invite à sélectionner sa niche ou son domaine d'activité (cosmétique,
fitness, restauration, immobilier, mode, technologie, etc.). Sur la base
de cette information et de l'analyse IA du profil business, le système
de recommandation génère automatiquement une liste d'agences SMMA
présentes sur la plateforme, classées selon leur pertinence sectorielle
et leurs performances historiques vérifiées.

**Critères de sélection des agences recommandées :**

-   Expérience avrée dans le domaine d'activité de l'entreprise (niches
    similaires déjà gérées, démontrées via portfolio et études de cas)

-   Note de réputation globale : moyenne pondérée des témoignages
    clients vérifiés (note /5, volume d'avis, récence)

-   Performances marketing mesurables et vérifiées : ROAS moyen généré
    pour les clients, taux de croissance des abonnés, taux d'engagement
    obtenu dans la niche cible

-   Adéquation budgétaire et proximité géographique optionnelle selon le
    profil déclaré de l'entreprise

-   Indice d'activité récente sur la plateforme : fréquence de
    connexion, réactivité aux demandes de contact, utilisation des
    agents IA --- garantissant que l'agence recommandée est active et
    disponible

**Exemple illustratif :** Une startup spécialisée dans les produits
cosmétiques naturels s'inscrit sur Social Mind AI et sélectionne la
niche "Cosmétique & Beauté". L'algorithme de recommandation IA analyse
la base de données des agences enregistrées, identifie celles ayant géré
des campagnes pour des marques cosmétiques avec des résultats probants,
et génère un classement personnalisé des 10 agences les plus
compatibles. L'entreprise consulte les profils détaillés, études de cas
et témoignages, puis initie un contact direct via la messagerie intégrée
de la plateforme.

## 11.5.3 Architecture Technique du Système de Recommandation IA

Le système de mise en relation repose sur une architecture de
recommandation IA multicritères, intégrée au Moteur IA Python FastAPI de
Social Mind AI. Il combine des techniques de filtrage collaboratif, de
filtrage basé sur le contenu et de machine learning supervisé pour
produire des recommandations personnalisées et objectivables.

-   **Indexation des profils agences :** chaque profil est indexé dans
    MySQL avec les attributs niches servies (JSON), note moyenne, nombre
    de clients traités, KPIs marketing (ROAS, engagement), zone
    géographique et plage tarifaire

-   **Analyse IA de la niche :** à l'inscription, GPT-4o analyse la
    description de l'entreprise, le secteur sélectionné et les objectifs
    marketing déclarés pour générer un vecteur de caractéristiques
    représentant le profil business (embedding NLP)

-   **Algorithme de scoring multicritères :** un modèle Random Forest
    Classifier (Scikit-learn) entraîné sur les historiques de
    collaborations réussies attribue un score de compatibilité via la
    similarité cosinus entre les vecteurs profil-entreprise et
    profil-agence

-   **Apprentissage continu :** le système enregistre les interactions
    utilisateurs (clics, demandes de contact, collaborations finalisées)
    et réentraîne périodiquement le modèle pour améliorer sa précision
    au fil du temps (machine learning incrémental)

-   **Endpoint API dédié :** GET
    /api/v1/marketplace/recommend?business_id={id} retourne un tableau
    JSON des 10 meilleures agences classées par score de compatibilité
    décroissant, avec indicateurs de performance et lien profil

## 11.5.4 Avantage Concurrentiel --- Marketplace SaaS Intelligente alimentée par IA

Cette fonctionnalité positionne Social Mind AI non plus comme un simple
outil SaaS d'automatisation marketing, mais comme une marketplace
intelligente à double valeur ajoutée : d'un côté, les agences SMMA
disposent d'une vitrine professionnelle et d'un canal d'acquisition
client intégré ; de l'autre, les entreprises et startups accèdent
instantanément aux meilleures expertises marketing disponibles pour leur
secteur, sans processus de recherche manuel.

-   Buffer, Hootsuite et Sprout Social ne proposent aucune
    fonctionnalité de mise en relation entre agences et entreprises
    clientes : Social Mind AI est la première plateforme SMMA à intégrer
    nativement cette dimension marketplace alimentée par IA

-   Les recommandations sont générées exclusivement par IA (et non par
    parrainage ou publicité payée), garantissant l'objectivité et la
    pertinence des suggestions pour l'utilisateur

-   Le modèle économique génère une nouvelle source de revenus :
    commission sur les mises en relation aboutissant à une collaboration
    contractualisée --- modèle SaaS + commission marketplace comparable
    à Fiverr Business ou Clutch.co, mais entièrement piloté par IA

-   L'effet réseau (network effect) renforce la valeur de la plateforme
    : plus le nombre d'agences et d'entreprises inscrites augmente, plus
    la précision des recommandations IA s'améliore, créant un avantage
    concurrentiel durable et structurellement difficile à reproduire

# 12. Périmètre MVP et Livrables

## 12.1 Phase 1 --- MVP (Soutenance de Fin d\'Études)

Les composants suivants doivent être pleinement fonctionnels pour la
soutenance du projet de fin d\'études :

-   Système d\'authentification avec les trois rôles (Utilisateur
    Standard, Professionnel, Admin)

-   Système d\'abonnement avec au moins deux plans et intégration Stripe

-   Tableau de bord utilisateur standard avec les 6 outils IA simplifiés
    complets

-   Tableau de bord utilisateur professionnel avec au minimum 3 agents
    IA pleinement opérationnels : Agent Chef de Compte (pipeline complet
    : téléchargement, transcription, extraction, génération de
    stratégie), Analytics IA (collecte de données, prédiction,
    génération de rapports) et Créateur de Contenu IA (génération de
    légendes et d\'images)

-   Panneau d\'administration avec les modules Gestion des Utilisateurs,
    Gestion des Abonnements et Surveillance des Agents

-   Les 4 agents professionnels restants (Gestionnaire Réseaux Sociaux,
    Stratège de Contenu, Optimiseur Pub, Veille Concurrentielle)
    implémentés comme structure fonctionnelle avec au moins un endpoint
    opérationnel chacun

## 12.2 Phase 2 --- Développement Post-Soutenance

-   Les 7 agents professionnels pleinement opérationnels

-   Facturation et facturation client Stripe Connect

-   Génération de rapports PDF en marque blanche

-   Interface mobile responsive et application mobile native (React
    Native)

-   Génération de contenu vidéo via RunwayML ou l\'API Pika

-   Support multilingue

-   Plan Entreprise avec configuration personnalisée des agents

# 13. Glossaire

  -----------------------------------------------------------------------
  **Terme**        **Définition**
  ---------------- ------------------------------------------------------
  SMMA             Social Media Marketing Agency --- une entreprise
                   fournissant des services de marketing sur les réseaux
                   sociaux à des clients

  SaaS             Software as a Service --- logiciel fourni par
                   abonnement sur Internet

  Agent IA         Module IA autonome qui exécute un ensemble spécifique
                   de tâches sans intervention humaine

  LLM              Large Language Model --- modèle IA entraîné sur des
                   données textuelles capable de générer et comprendre le
                   langage naturel

  TAL / NLP        Traitement Automatique du Langage / Natural Language
                   Processing --- techniques IA pour comprendre et
                   générer le langage humain

  MRR              Monthly Recurring Revenue --- revenu mensuel récurrent
                   généré par les abonnements

  UAQ / DAU        Utilisateurs Actifs Quotidiens --- nombre
                   d\'utilisateurs uniques qui interagissent avec la
                   plateforme chaque jour

  ROAS             Return on Ad Spend --- revenu généré par dollar
                   dépensé en publicité

  CTR              Click-Through Rate --- pourcentage de personnes qui
                   cliquent sur une publicité après l\'avoir vue

  BERTopic         Bibliothèque de modélisation de sujets utilisant des
                   embeddings BERT pour regrouper des documents en thèmes

  Prophet          Bibliothèque open-source de prévision de séries
                   temporelles développée par Meta

  Whisper          Modèle open-source de reconnaissance vocale développé
                   par OpenAI

  LangChain        Framework pour construire des applications propulsées
                   par des modèles de langage via des chaînes composables

  FastAPI          Framework web Python haute performance pour construire
                   des API REST

  Stripe Connect   Produit Stripe permettant aux plateformes d\'acheminer
                   des paiements entre entreprises et leurs clients

  JWT              JSON Web Token --- méthode compacte et autonome pour
                   transmettre de manière sécurisée des informations
                   d\'authentification

  Webhook          Callback HTTP déclenché automatiquement lorsqu\'un
                   événement spécifique se produit dans un service tiers

  RGPD             Règlement Général sur la Protection des Données ---
                   loi européenne sur la confidentialité des données
                   régissant la collecte et l\'utilisation des données
                   personnelles

  CI/CD            Intégration Continue / Déploiement Continu ---
                   processus automatisés pour tester et déployer les
                   changements de code

  CNDP             Commission Nationale de Contrôle de la Protection des
                   Données à Caractère Personnel (Maroc)
  -----------------------------------------------------------------------
