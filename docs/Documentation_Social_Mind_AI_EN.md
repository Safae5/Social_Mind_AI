# Technical Documentation of the Social Mind AI Application

*Report written as part of a Personal Project — actual state of the code and the application as of 17/09/2026, verified under real execution conditions (servers running, real HTTP requests, AI agents actually executed).*

---

## 1. Application Overview

**Social Mind AI** is a SaaS platform for social media management assisted by artificial intelligence. The product comes in two distinct offerings that share the same codebase but target different users:

- **Standard User**: a content creator or small business managing its own social account. They have **6 simplified AI tools**: Scheduler, Caption Generator, Hashtags, Messaging (automatic reply), Weekly Report, Content Calendar.
- **Professional User (agency)**: a digital marketing agency (SMMA) managing several clients. They have a full CRM and **7 advanced AI agents**: Account Manager, Social Media Manager, Content Strategist, AI Content Creator, Analytics, Advertising Optimization, Competitive Intelligence.
- **Administrator**: an internal role for platform supervision (users, subscriptions, pricing plans, AI agent monitoring), protected by mandatory two-factor authentication.

### Technical Architecture

The application is made up of **three independent services** that must run simultaneously:

| Service | Role | Stack | Port |
|---|---|---|---|
| **Backend** | System of record: database, authentication, task orchestration, the frontend's only point of contact | Laravel 11 / PHP 8.3 | 8000 |
| **Frontend** | User interface | React 19 + Vite + Tailwind CSS | 5173/5174 |
| **AI Engine** | Execution of the artificial intelligence models | FastAPI (Python) | 8001 |

The frontend **never communicates directly** with the AI Engine: every request goes through the Laravel backend, which then makes a server-to-server call to the AI Engine (authenticated by a shared secret, `X-Internal-Secret`) and persists the result in the database before returning it to the frontend. Long-running tasks (audio transcription, image generation, model training) are executed **asynchronously** through a queue system — a dedicated `php artisan queue:work` process must run continuously for these tasks to complete.

Authentication relies on **JWT tokens** (the `tymon/jwt-auth` library), stored on the client side in the browser's `localStorage` (and not in cookies). Administrator accounts are subject to mandatory **two-factor authentication (2FA/TOTP)**, verified by a separate session token (`X-2FA-Token`) in addition to the standard JWT token.

The database has 60 tables organized by a convention of 2-letter prefixes per module (e.g. `An*` for Analytics, `Ao*` for Advertising Optimization, `Ci*` for Competitive Intelligence, `Cs*` for Content Strategist, `Sm*` for Social Media Manager).

---

## 2. Application Screens

All the screenshots below were taken under real conditions: Laravel/Vite/FastAPI servers started, real test accounts logged in (real JWT tokens obtained through the authentication API), and an automated browser (Playwright/Chromium) driving the application exactly as a user would. The data displayed (statistics, histories, lists) is therefore real data from the test database, not mockups.

### 2.1 Public Screens

#### Home Page (Landing Page)
**Role**: public showcase of the product, accessible without authentication at the root URL `/`.

![Landing Page](pfe_screenshots/01_landing.png)

**How it works**: the user discovers the product's positioning (title, subtitle, call-to-action buttons), the list of the 7 professional AI agents, the available integrations (Instagram, Facebook), the key features, a product preview, and the real pricing plans. The "Get started" buttons redirect to `/register` or `/login`.

**Technical background**: the page is 100% static as far as the marketing content is concerned, except for the pricing section, which actually calls `GET /api/plans` (a public route, with no authentication) to display the plans and prices currently configured in the database — no pricing data is hard-coded.

#### Login
**Role**: authentication of an existing user.

![Login](pfe_screenshots/02_login.png)

**How it works**: email/password form with client-side validation (Zod), a "Remember me" checkbox, a "forgot password" link, and two OAuth login buttons (Google, Facebook). There is no account-type selector here (it is on the registration page): the role is determined server-side from the existing account.

**Technical background**: submission → `POST /api/auth/login` → on success, the backend returns an access JWT token and a refresh token, stored in `localStorage`. If the user is an administrator, a redirect to `/2fa-verify` (or `/2fa-setup` if 2FA is not yet configured) is enforced before access to the dashboard — 2FA is **mandatory** for this role, never optional. The OAuth buttons trigger a full browser redirect to `GET /api/auth/google` or `/api/auth/facebook` on the Laravel side (a server-side OAuth flow, not a client-side JavaScript SDK).

#### Registration (Register)
**Role**: creation of a new account.

![Register](pfe_screenshots/03_register.png)

**How it works**: first name/last name/email/phone (optional)/password form, plus an **account type selector** (Standard user vs Professional/Agency) that determines the assigned role. The same OAuth buttons are available.

**Technical background**: `POST /api/auth/register` creates the account with the status `inactive` and `email_verified_at = null`, then redirects to `/verify-email` — the account must be verified by email before becoming fully active.

#### Forgot Password
![Forgot Password](pfe_screenshots/04_forgot_password.png)

**How it works**: the user enters their email and a reset link is sent.
**Technical background**: `POST /api/auth/forgot-password`; a single-use token is generated and sent by email, then consumed on `/reset-password`.

---

### 2.2 Standard Dashboard

#### Dashboard Home
**Role**: landing page after login for a Standard user.

![Standard Dashboard Home](pfe_screenshots/05_standard_dashboard_home.png)

**How it works**: a summary view with 3 key indicators (scheduled posts, unread messages, available reports), the 6 AI tools as clickable cards, the list of upcoming scheduled posts, and a contextual tip of the day.

**Technical background**: on load, the page aggregates several API calls (number of scheduled posts via the Scheduler, unread messages via the Inbox, available reports via `/api/weekly-reports`). Each tool card redirects to the dedicated page of the corresponding agent.

#### AI Tools Hub
![Standard Agents Hub](pfe_screenshots/06_standard_agents_hub.png)

**How it works**: a navigation page listing the 6 agents with a short description of each; it serves as an alternative entry point to the side navigation.

#### Scheduler
![Scheduler](pfe_screenshots/07_standard_scheduler.png)

**How it works**: the user can view their scheduled posts, create new ones, and launch an analysis of the optimal publishing slots for their connected account.

**Technical background**: the analysis button triggers a Laravel Job (`AnalyzeOptimalSlotsJob` or equivalent) that calls the AI Engine, which uses **Prophet** (Meta's time-series model) trained on the real engagement history of the connected account (retrieved via the Meta Graph API) to predict the publishing times with the highest expected engagement.

#### Caption Generator
![Content Generator](pfe_screenshots/08_standard_content_generator.png)

**How it works**: the user enters a topic/context and gets a generated caption adapted to the target platform.

**Technical background**: a call to the AI Engine, which invokes **Mistral 7B** (a language model) with a contextualized prompt (platform, tone, topic) to generate the text.

#### Hashtags
![Hashtags](pfe_screenshots/09_standard_hashtags.png)

**How it works**: the user enters a niche or topic and receives a list of suggested hashtags, which they can save as favorites.

**Technical background**: a combination of **TF-IDF** (statistical term weighting) and an AI model to suggest relevant, non-generic hashtags.

#### Messaging (Auto-Reply / Inbox)
![Inbox](pfe_screenshots/10_standard_inbox.png)

**How it works**: a unified list of the comments and private messages received on the connected accounts; the user can approve, reject, edit, or regenerate a reply proposed by the AI before it is sent.

**Technical background**: a periodic Job (`FetchInboxMessagesJob`) retrieves new messages via the Meta Graph API; the AI generates a suggested reply, but **no reply is sent automatically without human validation** — the "approve/reject" model is a deliberate product choice, not a technical limitation.

#### Weekly Report
![Weekly Reports](pfe_screenshots/11_standard_weekly_reports.png)

**How it works**: a weekly summary of performance (views, interactions, followers) in plain language, with a 4-week trend chart and a highlight of the best-performing post.

**Technical background**: see Section 3.5 — this agent was directly fixed during this session (a missing Facebook hookup in the AI Engine, and an incorrect access token passed by the Laravel Job), documented with a real before/after example.

#### Content Calendar
![Content Calendar](pfe_screenshots/12_standard_content_calendar.png)

**How it works**: a calendar view of the publishing slots proposed by the AI over a given period; each slot can be individually approved, edited, regenerated, or ignored, or approved in bulk.

**Technical background**: generates a complete editorial plan via the AI Engine (themes, content types, slots), saved as a series of "slots" that can be edited before actual publication.

#### Settings
![Standard Settings](pfe_screenshots/13_standard_settings.png)

**How it works**: management of the profile, the connected social accounts (Instagram/Facebook via Meta OAuth), notification preferences, and account security.

---

### 2.3 Professional Dashboard (Agency)

Unlike the Standard dashboard, most of the professional views do not correspond to distinct URLs: they are displayed through a system of internal tabs within a single React page (`/dashboard/professional`), except for onboarding, settings, and the client space, which have their own routes.

#### Onboarding Wizard (first login)
**Role**: mandatory initial setup for every new agency, in 7 steps.

![Onboarding](pfe_screenshots/22_pro_onboarding_step1.png)

**How it works**: the agency provides its professional information, its marketing expertise, its specialization niches, its historical performance indicators, and the services offered. This screenshot shows step 1/7; the wizard cannot be revisited once completed — attempting to navigate directly to `/dashboard/professional/onboarding` on an already configured account automatically redirects to the dashboard (behavior verified under real conditions).

**Technical background**: each step feeds the agency's profile in the database; this profile is then used to contextualize some of the agents' suggestions (e.g. niches for the Content Strategist).

#### Overview
![Professional Overview](pfe_screenshots/14_pro_overview.png)

**How it works**: an aggregated dashboard showing the agency's key indicators, the 7 agent cards with their status, a real-time activity feed (refreshed every 30 seconds), and quick access to the CRM.

**Technical background**: the page combines several API calls (aggregated statistics, the list of agents with real task counters, recent activity) loaded when the component mounts and refreshed periodically.

#### CRM Clients
![Clients CRM](pfe_screenshots/15_pro_clients_crm.png)

**How it works**: a list of the clients managed by the agency, with the ability to add a new one (dedicated modal) and to access each one's workspace.

#### Hub of the 7 AI Agents
![Agents Hub](pfe_screenshots/16_pro_agents_hub.png)

**How it works**: each card displays in real time the actual number of completed, in-progress, and failed tasks for the corresponding agent, its last activity, and its technical capabilities. Clicking a card opens it full screen.

**Technical background**: the counters displayed (e.g. 48 completed tasks for Advertising Optimization at the time of this screenshot) come directly from the `AgentActivityLog` table — they are not decorative values.

#### The 7 Agent Pages (detailed view)

Each agent, once opened from the hub, displays an interface dedicated to its own operation (file upload, generation form, campaign table, etc.). The technical details of each are covered in Section 3. Screenshots of the 7 detailed views, taken under real conditions:

![Account Manager Agent](pfe_screenshots/17_pro_agent_0_Agent_Chef_de_Compte.png)
*Account Manager Agent — client meeting upload area and history of analyses already carried out.*

![Social Media Manager Agent](pfe_screenshots/17_pro_agent_1_Agent_Gestionnaire_de_R_seaux_Sociaux.png)
*Social Media Manager Agent.*

![Content Strategist Agent](pfe_screenshots/17_pro_agent_2_Agent_Strat_ge_de_Contenu.png)
*Content Strategist Agent.*

![AI Content Creator Agent](pfe_screenshots/17_pro_agent_3_Agent_Cr_ateur_de_Contenu_IA.png)
*AI Content Creator Agent.*

![AI Analytics Agent](pfe_screenshots/17_pro_agent_4_Agent_Analytics_IA.png)
*AI Analytics Agent.*

![Advertising Optimization Agent](pfe_screenshots/17_pro_agent_5_Agent_Optimisation_Publicitaire.png)
*Advertising Optimization Agent.*

![Competitive Intelligence Agent](pfe_screenshots/17_pro_agent_6_Agent_Veille_Concurrentielle.png)
*Competitive Intelligence Agent.*

#### Aggregated Analytics
![Analytics](pfe_screenshots/18_pro_analytics.png)

**How it works**: a consolidated view of the performance of all the clients managed by the agency, not to be confused with the "AI Analytics" agent, which produces detailed predictions per account.

#### Client Billing
![Billing](pfe_screenshots/19_pro_billing.png)

**How it works**: tracking of the agency's billing to its own clients (distinct from the agency's subscription to Social Mind AI itself).

#### Agency Settings
![Professional Settings](pfe_screenshots/20_pro_settings.png)

**How it works**: agency information, team management, general preferences.

#### Client Workspace
**Role**: a view centered on a specific client, grouping the 7 agents applied to that single client.

![Client Workspace](pfe_screenshots/21_pro_client_workspace.png)

**How it works**: tabs identical to those of the 7 agents, but scoped to the selected client; the history of past analyses for this client is visible (in the screenshot above, three client meetings actually transcribed and analyzed by the Account Manager Agent appear with their "Pipeline completed" status).

---

### 2.4 Administrator Panel

**Transparency note**: the project's `CLAUDE.md` file, updated on 28/08/2026, still stated that "the admin panel is not built beyond placeholders". Inspection of the current code shows that this is no longer the case: 8 real, working screens exist. This report documents the actual state of the code at the time of writing, not this potentially outdated status.

All administrator screens are protected by **mandatory two-factor authentication** (TOTP), verified on every session via an `X-2FA-Token` token separate from the main JWT token.

#### Overview
![Admin Dashboard](pfe_screenshots/23_admin_dashboard.png)

**How it works**: global platform indicators — total users by role, active subscriptions, AI agents online.

**Technical background**: the "AI Agents Online" counter (13/13 in the screenshot) comes from a real health check (`GET /health` on the AI Engine), not from a static value. Detailed per-agent monitoring (Phase 6) is partially in place: see the AI Agent Detail page below, which shows a real history of health checks, including real failures that occurred when the AI Engine service was temporarily stopped during this session.

#### Users
![Admin Users List](pfe_screenshots/24_admin_users_list.png)

**How it works**: listing, search, and filtering (by role, by status) of all the platform's accounts.

![Admin User Detail](pfe_screenshots/29_admin_user_detail.png)

**How it works**: details of an individual user account (information, subscription, activity).

#### Subscriptions
![Admin Subscriptions](pfe_screenshots/25_admin_subscriptions.png)

**How it works**: tracking of the active, trial, or expired subscriptions on the platform.

#### Pricing Plans
![Admin Plans](pfe_screenshots/26_admin_plans.png)

**How it works**: management of the plans displayed publicly on the Landing Page and on the upgrade page (`/upgrade`) — this is the same data consumed by the public pricing page, which guarantees that no price is hard-coded on the frontend.

#### AI Agents — list and supervision
![Admin AI Agents List](pfe_screenshots/27_admin_ai_agents_list.png)

**How it works**: a list of the 13 agents with their online/offline status and access to the details of each.

![Admin AI Agent Detail](pfe_screenshots/30_admin_ai_agent_detail.png)

**How it works**: details of one agent (here, the Weekly Report agent) — status, latency of the last health check, number of calls over 30 days, real recent activity, and **real technical logs**, including authentic errors (e.g. connection failures to the AI Engine that occurred during the fixing work carried out in this session, visible with their exact cURL error message).

![Admin AI Agent Logs](pfe_screenshots/28_admin_ai_agent_logs.png)

**How it works**: a consolidated view of the technical logs of all the agents.

---

## 3. The 13 AI Agents

Each agent listed below was **actually executed** via its HTTP endpoint in a local production setup (backend + AI Engine + queue active), with a real test account, while this report was being written. No example result is a description of the expected behavior: each one is an output that was actually obtained and verified.

### 3.1 Scheduler Agent

**Objective**: identify the optimal publishing time slots to maximize engagement.

**Technical pipeline**: analysis of the account's real engagement history (Meta Graph API) → time-series modeling with **Prophet** → grouping of slots with **K-Means** → engagement score per slot.

**Example of a real result obtained** (`POST /api/scheduler/analyze`, real Facebook account id 17, synchronous mode): `data_source: "real"`, based on 7 real data points. 14 optimal slots returned, including "Saturday 13:00" (score 100, cluster 2, labeled "🔥 Excellent"). Real KPIs calculated: average engagement 7.7, best day "Thursday", trend "📉 Declining". A complete hour × day heatmap is also produced.

**Status**: **fully functional** on real data.

---

### 3.2 Caption Generator Agent (Content Generator)

**Objective**: generate engaging captions adapted to a given platform and tone.

**Planned technical pipeline**: generation by **Mistral 7B** (via the Hugging Face inference API) from a contextualized prompt.

**Actual finding, not to be downplayed**: a real test (`POST /api/content/generate`, topic "launch of a new fitness product", Instagram, inspiring tone) did return 3 caption variants ("Direct", "Storytelling", "Educational") with an HTTP 201 code. However, checking the received text against the source code of `ai-engine/routers/content_generator/caption_generator.py` shows that it is **word for word identical** to the hard-coded fallback function `fallback_variants()` — and not to the result of a real call to Mistral 7B. The concrete cause: the AI Engine's `HF_TOKEN` environment variable still contains the default test value (`"hf_XXXX..."`), never replaced by a real Hugging Face API token. The API does not flag this fallback with any indicator (`data_source` or equivalent) — the end user cannot tell a text actually generated by the LLM from a backup text.

**Status**: **functional with a limitation** — content is indeed returned and the API integration works, but the real generative model (Mistral 7B) is not called until a valid Hugging Face token is configured; this fallback is currently silent, which goes against the transparency principle already applied elsewhere in the project (see the explicit `data_source: "simulated"` labeling of the Advertising Optimization agent, Section 3.12).

---

### 3.3 Hashtags Agent

**Objective**: suggest relevant hashtags for a given niche or topic.

**Technical pipeline**: statistical term weighting with **TF-IDF** combined with an AI model to filter and prioritize the suggestions.

**Example of a real result obtained** (`POST /api/hashtags/generate`, topic "fitness and bodybuilding", Instagram): 17 hashtags actually generated and categorized — 10 "high volume" (e.g. `#viral`, `#reels`, `#trending`) and 7 "medium volume" (e.g. `#fitnessetmuscultips`), with an optimal set of 9 recommended hashtags and the detected keywords ("fitness musculation", "fitness", "musculation").

**Status**: **fully functional**.

---

### 3.4 Messaging Agent (Auto-Reply / Inbox)

**Objective**: analyze the sentiment of incoming comments/messages and propose a reply, without ever sending it without validation.

**Technical pipeline**: periodic retrieval of messages via the Meta Graph API → sentiment analysis (**Twitter-RoBERTa**) → contextualized reply generation.

**Example of a real result obtained** (`GET /api/inbox` then `POST /api/inbox/refresh`, real account): the inbox contains 7 real Facebook messages already processed, each with a sentiment and a generated reply. Concrete example: the real comment *"I hate this kind of ai generated content"* was classified as sentiment `negative` (confidence 0.94) and received the generated reply *"We are sorry for this experience. Can you contact us by DM?"* (originally generated in French). The manual refresh did trigger the real retrieval Job, without forcing new data when Facebook offered none (honest behavior).

**Status**: **fully functional** — sentiment + reply generation pipeline confirmed on real data.

---

### 3.5 Weekly Report Agent

