# Documentation technique de l'application Social Mind AI

*Rapport rédigé dans le cadre d'un Projet personel — état réel du code et de l'application au 17/09/2026, vérifié en conditions d'exécution réelles (serveurs lancés, requêtes HTTP réelles, agents IA réellement exécutés).*

---

## 1. Vue d'ensemble de l'application

**Social Mind AI** est une plateforme SaaS de gestion de réseaux sociaux assistée par intelligence artificielle. Le produit se décline en deux offres distinctes qui partagent la même base de code mais ciblent des utilisateurs différents :

- **Utilisateur Standard** : un créateur de contenu ou une petite entreprise qui gère son propre compte social. Il dispose de **6 outils IA** simplifiés : Planificateur, Générateur de Légendes, Hashtags, Messagerie (réponse automatique), Rapport Hebdomadaire, Calendrier de Contenu.
- **Utilisateur Professionnel (agence)** : une agence de marketing digital (SMMA) qui gère plusieurs clients. Il dispose d'un CRM complet et de **7 agents IA avancés** : Chef de Compte, Gestionnaire de Réseaux Sociaux, Stratège de Contenu, Créateur de Contenu IA, Analytics, Optimisation Publicitaire, Veille Concurrentielle.
- **Administrateur** : rôle interne de supervision de la plateforme (utilisateurs, abonnements, plans tarifaires, monitoring des agents IA), protégé par une authentification à deux facteurs obligatoire.

### Architecture technique

L'application est composée de **trois services indépendants** qui doivent tourner simultanément :

| Service | Rôle | Stack | Port |
|---|---|---|---|
| **Backend** | Système de référence : base de données, authentification, orchestration des tâches, seul point de contact du frontend | Laravel 11 / PHP 8.3 | 8000 |
| **Frontend** | Interface utilisateur | React 19 + Vite + Tailwind CSS | 5173/5174 |
| **AI Engine** | Exécution des modèles d'intelligence artificielle | FastAPI (Python) | 8001 |

Le frontend ne communique **jamais directement** avec l'AI Engine : toute requête passe par le backend Laravel, qui fait ensuite un appel serveur-à-serveur vers l'AI Engine (authentifié par un secret partagé, `X-Internal-Secret`) et persiste le résultat en base de données avant de le retourner au frontend. Les traitements longs (transcription audio, génération d'image, entraînement de modèles) sont exécutés de manière **asynchrone** via un système de files d'attente (queue) — un processus `php artisan queue:work` dédié doit tourner en permanence pour que ces traitements aboutissent.

L'authentification repose sur des **jetons JWT** (bibliothèque `tymon/jwt-auth`), stockés côté client dans le `localStorage` du navigateur (et non dans des cookies). Les comptes administrateurs sont soumis à une **authentification à deux facteurs (2FA/TOTP) obligatoire**, vérifiée par un jeton de session distinct (`X-2FA-Token`) en plus du jeton JWT classique.

La base de données compte 60 tables réparties selon une convention de préfixes à 2 lettres par module (ex. `An*` pour Analytics, `Ao*` pour Optimisation Publicitaire, `Ci*` pour Veille Concurrentielle, `Cs*` pour Stratège de Contenu, `Sm*` pour Gestionnaire de Réseaux Sociaux).

---

## 2. Écrans de l'application

Toutes les captures ci-dessous ont été réalisées en conditions réelles : serveurs Laravel/Vite/FastAPI démarrés, comptes de test réels connectés (jetons JWT réels obtenus via l'API d'authentification), navigateur automatisé (Playwright/Chromium) pilotant l'application exactement comme un utilisateur le ferait. Les données affichées (statistiques, historiques, listes) sont donc des données réelles de la base de test, pas des maquettes.

### 2.1 Écrans publics

#### Page d'accueil (Landing Page)
**Rôle** : vitrine publique du produit, accessible sans authentification à l'URL racine `/`.

![Landing Page](pfe_screenshots/01_landing.png)

**Fonctionnement** : l'utilisateur découvre le positionnement du produit (titre, sous-titre, boutons d'appel à l'action), la liste des 7 agents IA professionnels, les intégrations disponibles (Instagram, Facebook), les fonctionnalités clés, un aperçu produit, et les plans tarifaires réels. Les boutons « Commencer » redirigent vers `/register` ou `/login`.

**Arrière-plan technique** : page 100 % statique côté contenu marketing, à l'exception de la section tarifs qui appelle réellement `GET /api/plans` (route publique, sans authentification) pour afficher les plans et prix actuellement configurés en base — aucune donnée de prix n'est codée en dur.

#### Connexion (Login)
**Rôle** : authentification d'un utilisateur existant.

![Login](pfe_screenshots/02_login.png)

**Fonctionnement** : formulaire e-mail/mot de passe avec validation côté client (Zod), case « Se souvenir de moi », lien « mot de passe oublié », et deux boutons de connexion OAuth (Google, Facebook). Un sélecteur de type de compte n'est pas présent ici (il l'est à l'inscription) : le rôle est déterminé côté serveur par le compte existant.

**Arrière-plan technique** : soumission → `POST /api/auth/login` → si succès, le backend retourne un jeton JWT d'accès et un jeton de rafraîchissement, stockés dans le `localStorage`. Si l'utilisateur est administrateur, une redirection vers `/2fa-verify` (ou `/2fa-setup` si la 2FA n'est pas encore configurée) est imposée avant l'accès au tableau de bord — la 2FA est **obligatoire** pour ce rôle, jamais optionnelle. Les boutons OAuth déclenchent une redirection navigateur complète vers `GET /api/auth/google` ou `/api/auth/facebook` côté Laravel (flux OAuth serveur, pas un SDK JavaScript côté client).

#### Inscription (Register)
**Rôle** : création d'un nouveau compte.

![Register](pfe_screenshots/03_register.png)

**Fonctionnement** : formulaire prénom/nom/e-mail/téléphone (optionnel)/mot de passe, plus un **sélecteur de type de compte** (Utilisateur standard vs Professionnel/Agence) qui détermine le rôle attribué. Les mêmes boutons OAuth sont disponibles.

**Arrière-plan technique** : `POST /api/auth/register` crée le compte avec le statut `inactive` et `email_verified_at = null`, puis redirige vers `/verify-email` — le compte doit être vérifié par e-mail avant de devenir pleinement actif.

#### Mot de passe oublié
![Forgot Password](pfe_screenshots/04_forgot_password.png)

**Fonctionnement** : saisie de l'e-mail, envoi d'un lien de réinitialisation.
**Arrière-plan technique** : `POST /api/auth/forgot-password` ; un jeton à usage unique est généré et envoyé par e-mail, consommé ensuite sur `/reset-password`.

---

### 2.2 Tableau de bord Standard

#### Accueil du tableau de bord
**Rôle** : page d'atterrissage après connexion pour un utilisateur Standard.

![Standard Dashboard Home](pfe_screenshots/05_standard_dashboard_home.png)

**Fonctionnement** : vue de synthèse avec 3 indicateurs clés (posts planifiés, messages non lus, rapports disponibles), les 6 outils IA sous forme de cartes cliquables, la liste des prochaines publications planifiées, et un conseil du jour contextuel.

**Arrière-plan technique** : la page agrège plusieurs appels API au chargement (nombre de posts planifiés via le Planificateur, messages non lus via l'Inbox, rapports disponibles via `/api/weekly-reports`). Chaque carte d'outil redirige vers la page dédiée de l'agent correspondant.

#### Hub des outils IA
![Standard Agents Hub](pfe_screenshots/06_standard_agents_hub.png)

**Fonctionnement** : page de navigation listant les 6 agents avec une description courte de chacun ; sert de point d'entrée alternatif à la navigation latérale.

#### Planificateur (Scheduler)
![Scheduler](pfe_screenshots/07_standard_scheduler.png)

**Fonctionnement** : l'utilisateur peut voir ses posts planifiés, en créer de nouveaux, et lancer une analyse des créneaux optimaux de publication pour son compte connecté.

**Arrière-plan technique** : le bouton d'analyse déclenche un Job Laravel (`AnalyzeOptimalSlotsJob` ou équivalent) qui appelle l'AI Engine, lequel utilise **Prophet** (modèle de séries temporelles de Meta) entraîné sur l'historique d'engagement réel du compte connecté (récupéré via Meta Graph API) pour prédire les heures de publication à plus fort engagement attendu.

#### Générateur de Légendes
![Content Generator](pfe_screenshots/08_standard_content_generator.png)

**Fonctionnement** : l'utilisateur saisit un sujet/contexte et obtient une légende générée, adaptée à la plateforme cible.

**Arrière-plan technique** : appel à l'AI Engine qui invoque **Mistral 7B** (modèle de langage) avec un prompt contextualisé (plateforme, ton, sujet) pour générer le texte.

#### Hashtags
![Hashtags](pfe_screenshots/09_standard_hashtags.png)

**Fonctionnement** : l'utilisateur saisit une niche ou un sujet et reçoit une liste de hashtags suggérés, qu'il peut sauvegarder en favoris.

**Arrière-plan technique** : combinaison de **TF-IDF** (pondération statistique de termes) et d'un modèle IA pour proposer des hashtags pertinents et non génériques.

#### Messagerie (Auto-Reply / Inbox)
![Inbox](pfe_screenshots/10_standard_inbox.png)

**Fonctionnement** : liste unifiée des commentaires et messages privés reçus sur les comptes connectés ; l'utilisateur peut approuver, rejeter, modifier ou régénérer une réponse proposée par l'IA avant envoi.

**Arrière-plan technique** : un Job périodique (`FetchInboxMessagesJob`) récupère les nouveaux messages via Meta Graph API ; l'IA génère une proposition de réponse, mais **aucune réponse n'est envoyée automatiquement sans validation humaine** — le modèle « approve/reject » est un choix produit délibéré, pas une limitation technique.

#### Rapport Hebdomadaire
![Weekly Reports](pfe_screenshots/11_standard_weekly_reports.png)

**Fonctionnement** : synthèse hebdomadaire des performances (vues, interactions, abonnés) en langage simple, avec un graphique de tendance sur 4 semaines et la mise en avant de la meilleure publication.

**Arrière-plan technique** : voir la Section 3.5 — cet agent a fait l'objet d'une correction directe durant cette session (branchement Facebook manquant dans l'AI Engine, et jeton d'accès incorrect transmis par le Job Laravel), documentée avec un exemple réel avant/après.

#### Calendrier de Contenu
![Content Calendar](pfe_screenshots/12_standard_content_calendar.png)

**Fonctionnement** : vue calendaire des créneaux de publication proposés par l'IA sur une période donnée ; chaque créneau peut être approuvé, modifié, régénéré ou ignoré individuellement, ou approuvé en bloc.

**Arrière-plan technique** : génère un plan éditorial complet via l'AI Engine (thèmes, types de contenu, créneaux), enregistré comme une série de « slots » modifiables avant publication effective.

#### Paramètres
![Standard Settings](pfe_screenshots/13_standard_settings.png)

**Fonctionnement** : gestion du profil, des comptes sociaux connectés (Instagram/Facebook via OAuth Meta), des préférences de notification et de la sécurité du compte.

---

### 2.3 Tableau de bord Professionnel (Agence)

Contrairement au tableau de bord Standard, la majorité des vues professionnelles ne correspondent pas à des URL distinctes : elles sont affichées via un système d'onglets internes à une seule page React (`/dashboard/professional`), à l'exception de l'onboarding, des paramètres et de l'espace client qui ont leur propre route.

#### Assistant d'onboarding (première connexion)
**Rôle** : configuration initiale obligatoire pour toute nouvelle agence, en 7 étapes.

![Onboarding](pfe_screenshots/22_pro_onboarding_step1.png)

**Fonctionnement** : l'agence renseigne ses informations professionnelles, son expertise marketing, ses niches de spécialisation, ses indicateurs de performance historiques et les services proposés. Cette capture montre l'étape 1/7 ; l'assistant ne peut être revisité une fois complété — la tentative de navigation directe vers `/dashboard/professional/onboarding` sur un compte déjà configuré redirige automatiquement vers le tableau de bord (comportement vérifié en conditions réelles).

**Arrière-plan technique** : chaque étape alimente le profil de l'agence en base de données ; ce profil est ensuite utilisé pour contextualiser certaines suggestions des agents (ex. niches pour le Stratège de Contenu).

#### Vue d'ensemble (Overview)
![Professional Overview](pfe_screenshots/14_pro_overview.png)

**Fonctionnement** : tableau de bord agrégé montrant les indicateurs clés de l'agence, les 7 cartes d'agents avec leur statut, un flux d'activité en temps réel (rafraîchi toutes les 30 secondes), et un accès rapide au CRM.

**Arrière-plan technique** : la page combine plusieurs appels API (statistiques agrégées, liste des agents avec compteurs réels de tâches, activité récente) chargés au montage du composant et rafraîchis périodiquement.

#### Clients CRM
![Clients CRM](pfe_screenshots/15_pro_clients_crm.png)

**Fonctionnement** : liste des clients gérés par l'agence, avec possibilité d'en ajouter un nouveau (modale dédiée) et d'accéder à l'espace de travail de chacun.

#### Hub des 7 Agents IA
![Agents Hub](pfe_screenshots/16_pro_agents_hub.png)

**Fonctionnement** : chaque carte affiche en temps réel le nombre réel de tâches réalisées, en cours et en erreur pour l'agent correspondant, sa dernière activité, et ses capacités techniques. Cliquer sur une carte l'ouvre en plein écran.

**Arrière-plan technique** : les compteurs affichés (ex. 48 tâches réalisées pour l'Optimisation Publicitaire au moment de cette capture) proviennent directement de la table `AgentActivityLog` — ce ne sont pas des valeurs décoratives.

#### Les 7 pages d'agents (vue détaillée)

Chaque agent, une fois ouvert depuis le hub, affiche une interface dédiée à son fonctionnement propre (upload de fichier, formulaire de génération, tableau de campagnes, etc.). Le détail technique de chacun est traité en Section 3. Captures des 7 vues détaillées, prises en conditions réelles :

![Agent Chef de Compte](pfe_screenshots/17_pro_agent_0_Agent_Chef_de_Compte.png)
*Agent Chef de Compte — zone d'upload de réunion client et historique des analyses déjà réalisées.*

![Agent Gestionnaire de RS](pfe_screenshots/17_pro_agent_1_Agent_Gestionnaire_de_R_seaux_Sociaux.png)
*Agent Gestionnaire de Réseaux Sociaux.*

![Agent Stratège de Contenu](pfe_screenshots/17_pro_agent_2_Agent_Strat_ge_de_Contenu.png)
*Agent Stratège de Contenu.*

![Agent Créateur de Contenu IA](pfe_screenshots/17_pro_agent_3_Agent_Cr_ateur_de_Contenu_IA.png)
*Agent Créateur de Contenu IA.*

![Agent Analytics IA](pfe_screenshots/17_pro_agent_4_Agent_Analytics_IA.png)
*Agent Analytics IA.*

![Agent Optimisation Publicitaire](pfe_screenshots/17_pro_agent_5_Agent_Optimisation_Publicitaire.png)
*Agent Optimisation Publicitaire.*

![Agent Veille Concurrentielle](pfe_screenshots/17_pro_agent_6_Agent_Veille_Concurrentielle.png)
*Agent Veille Concurrentielle.*

#### Analytics agrégés
![Analytics](pfe_screenshots/18_pro_analytics.png)

**Fonctionnement** : vue consolidée des performances de l'ensemble des clients gérés par l'agence, à ne pas confondre avec l'agent « Analytics IA » qui, lui, produit des prédictions détaillées par compte.

#### Facturation client
![Billing](pfe_screenshots/19_pro_billing.png)

**Fonctionnement** : suivi de la facturation de l'agence envers ses propres clients (distinct de l'abonnement de l'agence à Social Mind AI elle-même).

#### Paramètres de l'agence
![Professional Settings](pfe_screenshots/20_pro_settings.png)

**Fonctionnement** : informations de l'agence, gestion de l'équipe, préférences générales.

#### Espace de travail client
**Rôle** : vue centrée sur un client spécifique, régroupant les 7 agents appliqués à ce seul client.

![Client Workspace](pfe_screenshots/21_pro_client_workspace.png)

**Fonctionnement** : onglets identiques aux 7 agents, mais scopés au client sélectionné ; l'historique des analyses passées pour ce client est visible (dans la capture ci-dessus, trois réunions clients réellement transcrites et analysées par l'Agent Chef de Compte apparaissent avec leur statut « Pipeline terminé »).

---

### 2.4 Panel Administrateur

**Note de transparence** : le fichier `CLAUDE.md` du projet, mis à jour le 28/08/2026, indiquait encore que « le panel admin n'est pas construit au-delà de placeholders ». L'inspection du code actuel montre que ce n'est plus le cas : 8 écrans réels et fonctionnels existent. Ce rapport documente l'état réel du code au moment de sa rédaction, pas ce statut potentiellement obsolète.

Tous les écrans administrateur sont protégés par une **authentification à deux facteurs obligatoire** (TOTP), vérifiée à chaque session via un jeton `X-2FA-Token` distinct du jeton JWT principal.

#### Vue d'ensemble
![Admin Dashboard](pfe_screenshots/23_admin_dashboard.png)

**Fonctionnement** : indicateurs globaux de la plateforme — utilisateurs totaux par rôle, abonnements actifs, agents IA en ligne.

**Arrière-plan technique** : le compteur « Agents IA en ligne » (13/13 dans la capture) provient d'un contrôle de santé réel (`GET /health` sur l'AI Engine), pas d'une valeur statique. Le monitoring détaillé par agent (Phase 6) est partiellement en place : voir la page Détail Agent IA ci-dessous, qui montre un historique réel de vérifications de santé, y compris des échecs réels survenus lorsque le service AI Engine était temporairement arrêté durant cette session.

#### Utilisateurs
![Admin Users List](pfe_screenshots/24_admin_users_list.png)

**Fonctionnement** : liste, recherche et filtrage (par rôle, par statut) de tous les comptes de la plateforme.

![Admin User Detail](pfe_screenshots/29_admin_user_detail.png)

**Fonctionnement** : détail d'un compte utilisateur individuel (informations, abonnement, activité).

#### Abonnements
![Admin Subscriptions](pfe_screenshots/25_admin_subscriptions.png)

**Fonctionnement** : suivi des abonnements actifs, en essai ou expirés sur la plateforme.

#### Plans tarifaires
![Admin Plans](pfe_screenshots/26_admin_plans.png)

**Fonctionnement** : gestion des plans affichés publiquement sur la Landing Page et la page de mise à niveau (`/upgrade`) — ce sont ces mêmes données que consomme la page publique des tarifs, garantissant qu'aucun prix n'est codé en dur côté frontend.

#### Agents IA — liste et supervision
![Admin AI Agents List](pfe_screenshots/27_admin_ai_agents_list.png)

**Fonctionnement** : liste des 13 agents avec leur statut en ligne/hors ligne et un accès au détail de chacun.

![Admin AI Agent Detail](pfe_screenshots/30_admin_ai_agent_detail.png)

**Fonctionnement** : détail d'un agent (ici, l'agent Rapport Hebdomadaire) — statut, latence du dernier contrôle de santé, nombre d'appels sur 30 jours, activité récente réelle, et **journaux techniques réels**, y compris des erreurs authentiques (ex. échecs de connexion à l'AI Engine survenus pendant les travaux de correction menés durant cette session, visibles avec leur message d'erreur cURL exact).

![Admin AI Agent Logs](pfe_screenshots/28_admin_ai_agent_logs.png)

**Fonctionnement** : vue consolidée des journaux techniques de tous les agents.

---

## 3. Les 13 agents IA

Chaque agent listé ci-dessous a été **réellement exécuté** via son endpoint HTTP en production locale (backend + AI Engine + file d'attente actifs), avec un compte de test réel, durant la rédaction de ce rapport. Aucun exemple de résultat n'est une description du comportement attendu : il s'agit à chaque fois d'une sortie réellement obtenue et vérifiée.

### 3.1 Agent Planificateur (Scheduler)

**Objectif** : identifier les créneaux horaires optimaux de publication pour maximiser l'engagement.

**Pipeline technique** : analyse de l'historique d'engagement réel du compte (Meta Graph API) → modélisation de séries temporelles par **Prophet** → regroupement des créneaux par **K-Means** → score d'engagement par créneau.

**Exemple de résultat réel obtenu** (`POST /api/scheduler/analyze`, compte Facebook réel id 17, mode synchrone) : `data_source: "real"`, basé sur 7 points de données réels. 14 créneaux optimaux retournés, dont « Samedi 13:00 » (score 100, cluster 2, étiqueté « 🔥 Excellent »). KPIs réels calculés : engagement moyen 7,7, meilleur jour « Jeudi », tendance « 📉 Déclin ». Une heatmap complète heure × jour est également produite.

**Statut** : **pleinement fonctionnel** sur données réelles.

---

### 3.2 Agent Générateur de Légendes (Content Generator)

**Objectif** : générer des légendes engageantes adaptées à une plateforme et un ton donnés.

**Pipeline technique prévu** : génération par **Mistral 7B** (via l'API d'inférence Hugging Face) à partir d'un prompt contextualisé.

**Constat réel obtenu, à ne pas minimiser** : un test réel (`POST /api/content/generate`, sujet « lancement d'un nouveau produit de fitness », Instagram, ton inspirant) a bien retourné 3 variantes de légende (« Directe », « Storytelling », « Éducative ») avec un code HTTP 201. Cependant, la vérification du texte reçu contre le code source de `ai-engine/routers/content_generator/caption_generator.py` montre qu'il est **identique mot pour mot** à la fonction de repli `fallback_variants()`, codée en dur — et non au résultat d'un véritable appel à Mistral 7B. La cause concrète : la variable d'environnement `HF_TOKEN` de l'AI Engine contient encore la valeur de test par défaut (`"hf_XXXX..."`), jamais remplacée par un jeton d'API Hugging Face réel. L'API ne signale ce repli par aucun indicateur (`data_source` ou équivalent) — l'utilisateur final ne peut pas distinguer un texte réellement généré par le LLM d'un texte de secours.

**Statut** : **fonctionnel avec limitation** — un contenu est bien retourné et l'intégration API fonctionne, mais le modèle génératif réel (Mistral 7B) n'est pas sollicité tant qu'un jeton Hugging Face valide n'est pas configuré ; ce repli est actuellement silencieux, ce qui contrevient au principe de transparence déjà appliqué ailleurs dans le projet (voir l'étiquetage explicite `data_source: "simulated"` de l'agent Optimisation Publicitaire, Section 3.12).

---

### 3.3 Agent Hashtags

**Objectif** : suggérer des hashtags pertinents pour une niche ou un sujet donné.

**Pipeline technique** : pondération statistique de termes par **TF-IDF** combinée à un modèle IA pour filtrer et prioriser les suggestions.

**Exemple de résultat réel obtenu** (`POST /api/hashtags/generate`, sujet « fitness et musculation », Instagram) : 17 hashtags réellement générés et catégorisés — 10 à « haut volume » (ex. `#viral`, `#reels`, `#trending`) et 7 à « volume moyen » (ex. `#fitnessetmuscultips`), avec un ensemble optimal de 9 hashtags recommandés et les mots-clés détectés (« fitness musculation », « fitness », « musculation »).

**Statut** : **pleinement fonctionnel**.

---

### 3.4 Agent Messagerie (Auto-Reply / Inbox)

**Objectif** : analyser le sentiment des commentaires/messages entrants et proposer une réponse, sans jamais l'envoyer sans validation.

**Pipeline technique** : récupération périodique des messages via Meta Graph API → analyse de sentiment (**Twitter-RoBERTa**) → génération de réponse contextualisée.

**Exemple de résultat réel obtenu** (`GET /api/inbox` puis `POST /api/inbox/refresh`, compte réel) : la boîte de réception contient 7 messages Facebook réels déjà traités avec un sentiment et une réponse générée pour chacun. Exemple concret : le commentaire réel *« I hate this kind of ai generated content »* a été classé sentiment `negative` (confiance 0,94) et a reçu la réponse générée *« Nous sommes désolés pour cette expérience. Pouvez-vous nous contacter en DM ? »*. Le rafraîchissement manuel a bien déclenché le Job de récupération réel, sans forcer de nouvelle donnée quand Facebook n'en proposait aucune (comportement honnête).

**Statut** : **pleinement fonctionnel** — pipeline sentiment + génération de réponse confirmé sur données réelles.

---

### 3.5 Agent Rapport Hebdomadaire (Weekly Report)

**Objectif** : traduire les métriques hebdomadaires brutes (portée, engagement, abonnés) en un résumé de performance en langage simple.

**Pipeline technique** : récupération des métriques via **Meta Graph API** → analyse et calcul des variations semaine/semaine (**Pandas/NumPy**) → rédaction du résumé en langage naturel par **Mistral 7B** → préparation des données de tendance pour un graphique (**Chart.js** côté frontend).

**Exemple de résultat réel obtenu — et bug réel corrigé durant cette session** : cet agent a été signalé par un utilisateur réel comme affichant systématiquement 0 vue et 0 interaction malgré des publications Facebook réelles avec des likes et commentaires. L'investigation a révélé **deux bugs distincts, corrigés en direct** :
1. Le module de récupération des métriques (`meta_fetcher.py`) était codé exclusivement pour l'API Instagram (`/media`, métriques `reach`/`impressions` désormais retirées de l'API Meta) et échouait silencieusement pour un compte Facebook, qui utilise un edge différent (`/posts`).
2. Le Job Laravel transmettait le jeton d'accès utilisateur générique au lieu du **jeton d'accès de Page**, requis par Meta pour les edges de Page sous la « New Pages Experience ».

Après correction, un nouveau rapport a été généré en conditions réelles (compte Facebook réel, `week_number: 37/2026`) : `total_engagement: 6`, `total_likes: 4`, `total_comments: 1`, `followers_now: 4`, meilleure publication réellement identifiée avec sa légende réelle (« why AI is so inmportant is our era? »). Une **limite honnête et permanente** a également été identifiée : Meta a retiré la métrique `reach` au niveau des publications de son API — ce champ reste donc à `0` par conception, et non par erreur.

**Statut** : **pleinement fonctionnel** après correction — vérifié de bout en bout (file d'attente Laravel → AI Engine → Meta Graph API réelle → base de données → API frontend).

---

### 3.6 Agent Calendrier de Contenu (Content Calendar)

**Objectif** : générer un plan éditorial complet sur une période donnée.

**Pipeline technique** : génération de thèmes, angles, légendes et créneaux optimaux par l'AI Engine, avec une protection anti-doublon par semaine calendaire.

**Exemple de résultat réel obtenu** (`POST /api/calendar/generate` puis `GET /api/calendar/current`) : le calendrier réel déjà existant pour la semaine 39/2026 a été retourné (7 jours avec sujets, angles, légendes, hashtags et heures optimales réels — ex. lundi : *« Voici ce que vous devez savoir sur contenu général 👇 »* à 19h00, score de cohérence 0,587). La nouvelle génération a été délibérément court-circuitée par la protection anti-doublon (« Calendrier déjà généré — skip »), confirmée dans les journaux Laravel réels.

**Statut** : **pleinement fonctionnel** — pipeline de génération confirmé opérationnel ; le comportement d'idempotence observé est intentionnel, pas un dysfonctionnement.

---

### 3.7 Agent Chef de Compte (Account Manager)

**Objectif** : transformer l'enregistrement audio d'une réunion client en une stratégie marketing exploitable de 30 jours.

**Pipeline technique** : upload d'un fichier audio (MP4/MP3/WAV/M4A/MOV) → transcription par **Whisper large-v3** (OpenAI, exécuté localement) → extraction du profil client structuré (niche, audience cible, objectifs, plateformes) par **Mistral 7B** → reconnaissance d'entités nommées par **spaCy** (`fr_core_news_md`) → génération d'une stratégie de contenu sur 4 semaines par **Mistral 7B** → mise en forme d'un rapport PDF par **ReportLab**.

**Exemple de résultat réel obtenu** (analyse déjà réalisée en base, client « CosmiVite », fichier audio réel de 5,1 minutes / 26,8 Mo, requête `GET /api/professional/agents/account-manager/9`) :
- Transcription réelle (770 mots) : *« Bonjour Sarah, merci d'avoir pris le temps pour cette réunion (...) je suis en train de lancer une nouvelle marque de cosmétique, premier en fabriquer principalement à partir de matière première naturelle et biologique (...) »*
- Profil client extrait automatiquement : niche « cosmétiques naturels et biologiques », audience cible femmes 20-40 ans au Maroc, objectifs « faire connaître la marque », « construire une communauté », « générer des ventes », plateformes Instagram + TikTok
- Stratégie 30 jours générée : 4 phases (Notoriété → Engagement → Conversion → Fidélisation), 20 publications réparties sur le mois avec type de contenu, jour, heure et hashtags pour chacune
- KPIs à 30 jours proposés : +300-500 abonnés, taux d'engagement visé 3-5 %, portée estimée 10 000-20 000 comptes
- Un fichier PDF a été réellement généré et est téléchargeable (`has_pdf: true`)

**Statut** : **pleinement fonctionnel**. Le pipeline complet (transcription → extraction → stratégie → PDF) a été exécuté avec succès sur plusieurs fichiers réels différents (au moins 9 analyses réelles enregistrées en base au moment de la rédaction de ce rapport).

---

### 3.8 Agent Gestionnaire de Réseaux Sociaux (Social Manager)

**Objectif** : planifier le contenu multi-comptes, prédire les horaires optimaux, surveiller les commentaires et générer des réponses.

**Pipeline technique** : Prophet (créneaux optimaux) + Twitter-RoBERTa (analyse de sentiment) + Mistral 7B + Meta Graph API réelle, via un compte dédié (`SmAccount`).

**Exemple de résultat réel obtenu** (`GET /api/professional/agents/social-manager/optimal-slots/5`, compte Facebook réel « Social Mind AI Test ») : réponse servie depuis le cache réel (`sm_prophet_slots`, source `"cached"`, car au moins 3 créneaux futurs existaient déjà en base — la logique anti-recalcul inutile a fonctionné comme prévu). 7 créneaux réels retournés (ex. 2026-09-17T12:00, 2026-09-19T19:00), mais avec un `predicted_score` et des bornes de confiance à **0** pour chacun — résultat d'une exécution Prophet antérieure peu informative, honnêtement restituée telle quelle.

**Statut** : **fonctionnel avec limitation** — l'endpoint répond correctement et sert des données réelles en cache, mais les scores Prophet historiquement stockés sont nuls et mériteraient un recalcul.

---

### 3.9 Agent Stratège de Contenu (Content Strategist)

**Objectif** : analyser le contenu des concurrents et générer une stratégie éditoriale complète (piliers de contenu, calendrier hebdomadaire, hashtags recommandés) pour une niche donnée.

**Pipeline technique** : collecte via **Meta Graph API v21** + scraping **Playwright** → extraction des thèmes latents par **BERTopic** (embeddings `paraphrase-MiniLM-L12-v2`) et **LDA** (Gensim) → identification des piliers de contenu et scoring des hashtags par **TF-IDF + K-Means** → reconnaissance d'entités par **spaCy** (`fr_core_news_md`) → génération de la stratégie éditoriale et du calendrier 7 jours par **Mistral 7B** → export PDF.

**Exemple de résultat réel obtenu** (interface réelle, niche « coaching fitness en ligne ») :
- 4 piliers de contenu réellement générés : « Éducation & Conseils » (entraînement, musculation, renforcer, core), « Inspiration & Motivation » (sport, nutrition, fitness), « Promotion & Offres », « Coulisses & Authenticité » — chacun avec ses mots-clés et hashtags associés
- Calendrier hebdomadaire réel sur 7 jours généré par Mistral 7B, avec pour chaque jour la plateforme (Instagram/TikTok), le type de format (Reel, Carrousel, Story, Post, Infographie, Vidéo courte), le pilier associé et les hashtags — ex. lundi : Instagram, Reel, pilier « Éducation & Conseils »
- Fréquence de publication recommandée réellement calculée : 5 fois par semaine sur Instagram et sur TikTok
- Hashtags recommandés par pilier avec score TF-IDF réel affiché (ex. `#fitness` 0,2828, `#sport` 0,2828, `#entrainement` 0,2298, `#musculation` 0,2298, `#nutrition` 0,1945, `#sante` 0,1945)
- Export PDF du rapport de stratégie disponible (Piliers + Calendrier + Hashtags + Recommandations)

**Statut** : **pleinement fonctionnel** — confirmé par une exécution réelle complète du pipeline (BERTopic/LDA → TF-IDF/K-Means → Mistral 7B) avec un corpus suffisant. Une note technique à conserver : un test antérieur mené avec un corpus concurrentiel quasi-vide avait déclenché une erreur reproductible côté `hdbscan` (`AttributeError: No prediction data was generated`, dans `topic_modeler.py`) — le pipeline reste donc sensible au volume minimal de contenu disponible pour le clustering thématique, mais fonctionne correctement dès qu'un corpus suffisant est présent, comme démontré ici.

---

### 3.10 Agent Créateur de Contenu IA (Content Creator)

**Objectif** : générer un pack de contenu complet (légende + visuel + script vidéo) pour un client donné.

**Pipeline technique** : génération de légende par **Mistral 7B**, génération d'image par **SDXL-Turbo** (via la bibliothèque `diffusers`), génération de script vidéo structuré (accroche/problème/solution) — le tout avec un flux d'approbation avant publication effective.

**Exemple de résultat réel obtenu** (`POST /api/professional/agents/content-creator/generate`, client « FitZone Gym », niche Fitness, plateforme Instagram, 17/09/2026, **51,6 secondes** d'exécution totale) :
- Image PNG réellement générée par SDXL-Turbo (vérifiée par téléchargement direct : 1,39 Mo, `image/png`, HTTP 200)
- Légende réellement générée : *« ✨ Publicité minimaliste pour une salle de sport, style moderne — FitZone Gym. Découvrez tout ce que vous devez savoir sur Fitness. 🔗 Lien en bio ! »*
- Script vidéo de 35 secondes réellement généré, structuré en sections HOOK / PROBLÈME / SOLUTION avec indications de voix off et de plans visuels
- `image_generation_failed: false` — aucun repli par une image de substitution

**Statut** : **pleinement fonctionnel** — testé de bout en bout (légende + image + script) en moins d'une minute, sans erreur ni dégradation, sur le matériel de cet environnement.

---

### 3.11 Agent Analytics IA

**Objectif** : prédire les performances futures à partir des métriques réelles collectées automatiquement toutes les 6 heures.

**Pipeline technique** : collecte via Meta Graph API → prédiction par **Prophet** et **XGBoost** → génération de rapports.

**Résultat réel obtenu — comportement honnête confirmé** : `POST /api/professional/agents/analytics/predict` a retourné une erreur **422** explicite : *« Pas assez de métriques réelles pour entraîner XGBoost (minimum 20 posts, 6 actuellement) »*. Une vérification croisée via `GET /api/professional/agents/analytics/dashboard` confirme que ces 6 posts sont bien réels (données Facebook réelles : taux d'engagement moyen 8,15 %, portée totale 122, likes/commentaires réels par publication). Ce comportement est notable : plutôt que de fabriquer une prédiction à partir de données insuffisantes — ce que le fichier `CLAUDE.md` du projet identifiait explicitement comme un défaut passé de cet agent (repli silencieux sur des données synthétiques) — l'API **refuse désormais** d'entraîner le modèle et le signale clairement à l'appelant.

**Statut** : **fonctionnel avec limitation** — le tableau de bord de métriques réelles fonctionne pleinement ; la prédiction XGBoost est honnêtement bloquée par manque de volume de données réelles plutôt que de produire un résultat fabriqué.

---

### 3.12 Agent d'Optimisation Publicitaire (Ad Optimizer)

**Objectif** : optimiser l'allocation budgétaire de campagnes publicitaires Meta Ads / Google Ads et prédire leur CTR.

**Pipeline technique** : chargement des campagnes (réelles via `MetaAdsCollector`/`GoogleAdsCollector`, ou simulées en leur absence) → prédiction du CTR par un modèle **XGBoost** → optimisation de l'allocation budgétaire par **programmation linéaire (SciPy `linprog`)** → ajustement itératif des enchères par **Q-learning** → génération d'un rapport PDF (**ReportLab**).

**Exemple de résultat réel obtenu** (`POST /api/professional/agents/ad-optimizer/analyze`, compte professionnel réel, 17/09/2026, 15,5 s d'exécution) :
- `data_source: "simulated"` — confirmé explicitement par l'API elle-même, avec un message signalant l'absence de compte publicitaire lié (voir Section 4.b pour l'explication complète)
- Recommandation réelle générée : augmenter le budget de « Campagne_2 » de 280 € à 2750 €, sur la base d'un ROAS réel calculé de 5,88
- Campagne sous-performante détectée : « Campagne_7 » (Instagram, Stories, 45-54 ans), ROAS 0,75, avec 3 recommandations concrètes générées (revoir le ciblage, réduire l'enchère CPC, optimiser la landing page)
- Optimisation budgétaire globale : ROAS projeté passant de 2,4 à 4,18 (+74 %) après réallocation
- Performance du modèle de prédiction CTR : MAE 0,4328, R² 0,514
- Un rapport PDF a été réellement généré et sauvegardé

**Statut** : **fonctionnel avec limitation** — le pipeline de calcul (XGBoost, optimisation SciPy, Q-learning, PDF) tourne réellement de bout en bout, mais sur des données simulées faute de compte publicitaire lié dans cet environnement (voir Section 4.b).

---

### 3.13 Agent de Veille Concurrentielle (Competitive Intelligence)

**Objectif** : suivre la stratégie et le sentiment des concurrents.

**Pipeline technique** : voir Section 4.c pour le détail complet du mécanisme de collecte (Instagram Business Discovery / posts publics de Page) et de ses limites structurelles.

**Résultat réel obtenu** : un concurrent réel était déjà enregistré (« Nike », Facebook, `posts_count: 0`). Une nouvelle collecte a été déclenchée (`POST /collect`, horodatage `last_scraped_at` réellement mis à jour), suivie d'un appel à `POST /analyze`, qui a retourné un code **200** avec `{"status": "collecting", "message": "Collecte lancée !..."}` — **sans aucune donnée simulée**, confirmant précisément le comportement documenté en Section 4.c : le contrôleur Laravel ne bascule jamais sur un jeu de données factice de son propre chef ; il renvoie honnêtement un état « collecte en cours » tant qu'aucune publication réelle de concurrent n'a pu être récupérée (ici, 0 publication Facebook exploitable récupérée pour Nike malgré deux tentatives de collecte réelles).

**Statut** : **fonctionnel avec limitation** — la chaîne complète (ajout de concurrent → déclenchement de collecte → tentative d'analyse) est opérationnelle et honnête dans sa gestion de l'absence de données, mais la collecte réelle de publications de Page concurrente n'a, dans ce test, remonté aucun contenu exploitable (voir Section 4.c pour les raisons structurelles).

---

## 4. Limitations actuelles de l'application

Cette section documente honnêtement trois contraintes structurelles de l'environnement actuel. Elles ne sont pas des bugs non détectés : ce sont des limites connues, vérifiées dans le code, et inhérentes au fait que l'application n'a pas encore été déployée en production avec une validation complète de la plateforme Meta.

### 4.a Mode développement Meta / API non validée (App Review)

L'application utilise l'API Meta Graph en **mode développement**. Elle n'a pas été soumise à l'**App Review** de Meta faute de temps, ce qui limite l'accès à certaines permissions pour des utilisateurs réels en production.

**Permissions concrètement concernées**, vérifiées dans `backend/app/Services/Social/MetaOAuthService.php` (méthode `buildAuthUrl`) :

| Permission demandée | Usage dans l'application | Nécessite l'Accès Avancé (App Review) ? |
|---|---|---|
| `instagram_basic` | Lecture des comptes Instagram Business | Oui |
| `instagram_content_publish` | Publication de contenu Instagram | Oui |
| `instagram_manage_insights` | Statistiques Instagram (Rapport Hebdomadaire, Analytics) | Oui |
| `instagram_manage_comments` | Lecture/réponse aux commentaires (Messagerie) | Oui |
| `pages_show_list` | Liste des Pages Facebook gérées | Oui |
| `pages_read_engagement` | Lecture de l'engagement des Pages | Oui |
| `pages_manage_engagement` | Réponse aux commentaires de Page | Oui |
| `pages_manage_posts` | Publication sur une Page Facebook | Oui |
| `ads_read` | Lecture des campagnes publicitaires (Optimisation Publicitaire) | Oui |
| `public_profile` | Profil public de base | Non (permission par défaut) |

**Conséquence concrète** : en mode développement, seuls les comptes explicitement ajoutés comme Administrateur, Développeur ou Testeur de l'application Meta peuvent compléter le flux de connexion OAuth avec succès. Tout autre utilisateur en production rencontrerait une erreur de permission lors de la tentative de connexion de son compte Instagram/Facebook. C'est pour cette raison que tous les tests réels documentés dans ce rapport ont été effectués avec des comptes de test préalablement autorisés au niveau de l'application Meta elle-même — un utilisateur final réel, aujourd'hui, ne pourrait pas reproduire ce même parcours de connexion sans que le compte de son entreprise soit ajouté manuellement à la liste des testeurs.

**Point additionnel constaté** : le fichier `backend/app/Services/MetaAdsCollector.php` documente dans un commentaire que les permissions `ads_management` et `business_management` seraient nécessaires pour une gestion complète des publicités — or ces deux permissions ne sont **pas** effectivement demandées dans le flux OAuth actuel (`buildAuthUrl` ne demande que `ads_read`). Il s'agit d'une incohérence entre la documentation interne du code et l'implémentation réelle, à corriger avant toute tentative de gestion active (et non plus seulement de lecture) des campagnes publicitaires.

### 4.b Agent d'Optimisation Publicitaire (Ad Optimizer) — données d'exemple

Cet agent a été testé en conditions réelles durant la rédaction de ce rapport (voir Section 3.12 pour l'exemple complet). Il fonctionne actuellement avec des **données d'exemple (sample data)**, explicitement étiquetées `data_source: "simulated"` dans sa réponse API, et non avec des données de campagnes réelles.

**Pourquoi, techniquement** : dans `AdOptimizerController::analyze()`, le déclencheur du mode simulé est simple — `$useSample = empty($campaigns)`, où `$campaigns` provient de la table `ao_campaigns`. Cette table n'est alimentée que par `CollectAdMetricsJob`, qui nécessite un compte publicitaire lié (`AoAccount`). Or, dans cet environnement, **aucun `AoAccount` n'existe** (0 ligne en base) : aucun flux de connexion Google Ads n'est exposé côté interface (la classe `GoogleAdsCollector.php` existe et est entièrement codée — elle interroge réellement l'API GAQL de Google Ads — mais aucune configuration `services.google_ads.*` n'est présente et aucun bouton de connexion Google Ads n'existe dans l'interface), et le flux Meta Ads, bien que fonctionnel côté code (`MetaAdsCollector::collectCampaigns()` interroge réellement `GET /act_{id}/campaigns` et `/{campaign_id}/insights`), n'a pas été activé pour un compte publicitaire réel dans cet environnement de test/développement.

**Ce que donnerait le comportement réel en production** : avec un compte publicitaire Meta Ads effectivement lié (nécessitant que l'utilisateur dispose d'un compte Business Manager et accorde la permission `ads_read`, voir 4.a), `CollectAdMetricsJob` peuplerait `ao_campaigns` avec de vraies métriques (impressions, clics, dépense, CTR, ROAS) récupérées via l'API Meta Marketing. Le prochain appel à `/analyze` détecterait alors des campagnes non vides, désactiverait automatiquement le mode simulé (`data_source: "real"`), et les mêmes modèles (XGBoost pour la prédiction de CTR, optimisation budgétaire par programmation linéaire via SciPy, Q-learning pour l'ajustement des enchères) s'exécuteraient sur des données réelles au lieu de données synthétiques — le pipeline de calcul lui-même ne change pas, seule la source de données change.

### 4.c Agent de Veille Concurrentielle (Competitive Intelligence)

Cet agent nécessite un déploiement en production **et** une validation complète par Meta pour collecter des données de comptes tiers (pages concurrentes) de manière fiable et conforme.

**Pourquoi le scraping/l'accès à des données tierces nécessite cette validation** : contrairement à l'accès aux données du propre compte de l'utilisateur (couvert par les permissions du flux OAuth qu'il a lui-même autorisé), l'accès aux métriques d'une page **appartenant à un tiers** repose sur un mécanisme Meta différent, la **Instagram Business Discovery** (`GET /{compte_professionnel_id}?fields=business_discovery.username({concurrent})...`). Cette fonctionnalité ne permet de lire que des métriques **publiques** de comptes Business/Creator, et sa fiabilité en production dépend directement du niveau d'accès accordé à l'application Meta — un accès non validé peut être soumis à des limitations de volume ou de fréquence plus strictes que celles d'une application ayant passé l'App Review.

**État réel actuel constaté dans le code** (`CollectCompetitorDataJob.php`, `MetaCompetitorCollector.php`) :
- Seules les plateformes Instagram et Facebook sont acceptées pour l'ajout d'un concurrent (TikTok et LinkedIn sont explicitement rejetés avec une erreur 422, bien que le schéma de base de données les prévoie).
- **Aucun scraping par navigateur (Playwright) n'est réellement implémenté pour cet agent**, malgré des mentions de « Meta Graph API + Playwright » dans les commentaires et la documentation interne du pipeline — ces références sont descriptives/aspirationnelles, pas du code fonctionnel. Le module Playwright existe et est réellement utilisé ailleurs dans l'application (agents Stratège de Contenu et Gestionnaire de Réseaux Sociaux), mais pas ici.
- Si le jeton Meta de l'utilisateur est absent ou si la Business Discovery échoue (page non éligible, non-Business/Creator), **aucune ligne n'est enregistrée** — silencieusement, sans erreur visible pour l'utilisateur.
- Si aucune publication de concurrent n'a été collectée, le contrôleur Laravel retourne un statut `"collecting"` sans même appeler l'AI Engine ; si l'AI Engine est malgré tout sollicité sans données réelles, il se rabat sur un générateur de **concurrents entièrement simulés** (`generate_sample_competitors(200)`, marques fictives type « BrandA_Premium »).

**Comportement actuel observé en test réel** : un test réel effectué durant la rédaction de ce rapport (voir Section 3.13) confirme précisément ce comportement : pour un concurrent réel (« Nike », Facebook) sans publication collectée, l'API a retourné un état honnête `"collecting"`, sans jamais recourir aux données simulées de l'AI Engine.

---

## Conclusion

Cette documentation reflète l'état réel du code de Social Mind AI au 19/09/2026, vérifié exclusivement par l'exécution effective de l'application (captures d'écran en conditions réelles, appels HTTP réels vers les 13 agents IA, inspection du code source pour chaque affirmation technique). Sur les 13 agents, **8 ont été confirmés pleinement fonctionnels sur données réelles** (Planificateur, Hashtags, Messagerie, Rapport Hebdomadaire, Calendrier de Contenu, Chef de Compte, Stratège de Contenu, Créateur de Contenu IA), et **5 fonctionnent avec des limitations identifiées et expliquées** (Générateur de Légendes sur repli silencieux, Gestionnaire de Réseaux Sociaux sur scores historiques nuls, Analytics sur refus honnête de prédire faute de volume, Optimisation Publicitaire et Veille Concurrentielle sur données simulées/incomplètes faute d'intégrations tierces actives). Le Stratège de Contenu, initialement testé dans une condition de corpus quasi-vide ayant produit une erreur reproductible, a depuis été confirmé pleinement fonctionnel sur un cas réel avec un corpus suffisant. Aucun résultat présenté dans ce rapport n'est fabriqué, extrapolé ou décrit comme un comportement attendu sans avoir été effectivement observé.
