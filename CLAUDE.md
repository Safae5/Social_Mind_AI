# Social Mind AI — Project Context

Full spec: docs/CDC.md
Stack: Laravel 11 (backend) + React 18 (frontend) + FastAPI (ai-engine, Python)
DB: MySQL, 60 tables, 58 models, strict 2-letter table prefix convention per module
Status (per full audit, 2026-08-24; updated 2026-08-28): all 7 professional agents now have reachable, working pipelines. Social Manager and Ad Optimizer's account-linking (previously entirely unreachable — their tables were never populated by any code path) have been rebuilt with real connect flows (Meta OAuth reused for Social Manager; Meta Ads for Ad Optimizer, `ads_read` scope added). Ad Optimizer additionally falls back to clearly-labeled (`data_source: "simulated"`) sample data when no ad account is linked, since Google Ads credentials aren't available in this environment — see rule 14's carve-out. Admin panel is not built beyond placeholders. Marketplace (§11.5): product decision made 2026-08-28 — **deferred**, not built. Its existing schema (`MarketplaceProfile`, migration) is kept for future use; `MarketplaceController` returns a clean 501 on all 11 routes instead of fatal-erroring, and both frontend entry points (professional sidebar, standard-tier upsell popup) show a "coming soon" message instead of navigating to a dead route.


# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering rules — read before making any change

Social Mind AI is **one integrated SaaS product across three services**, not three separate projects that happen to share a repo. A full audit (2026-08-24) found that nearly every real defect in this codebase was a *seam* problem — a file that was internally correct but disagreed with its caller, its callee, or its own database table — not a bug contained inside one file. These rules exist to stop that pattern from recurring. They are not suggestions; treat them as hard constraints on how work gets done here.

1. **This is one integrated platform.** `frontend/`, `backend/`, and `ai-engine/` ship as a single product. A change is not "done" when its own file is correct — it's done when its effect on the other two services is verified.

2. **Never modify a layer without checking its dependencies.** Before editing anything, trace both directions: what calls this, and what does this call. Skipping this check is how the audit's worst bugs happened — e.g. `SchedulerService` writing to a `scheduled_posts` column that doesn't exist, because the model and the migration were never cross-checked against the service that queries them.

3. **Before changing an API endpoint (Laravel or FastAPI), inspect every frontend consumer of it first.** Read the exact request/response field names each side actually sends and expects. Contract drift between Laravel and the AI engine — request fields renamed on one side and not the other — is the single most common defect class found in this codebase (worst case: the Scheduler's `/analyze` endpoint, where neither the request nor the response fields match anymore).

4. **Before changing a database table, inspect its migration, its Eloquent model, any repository, every service and controller that touches it, and every frontend page that renders its data — in that order, before writing code.** This repo already has a table (`invoicesforClient`) whose migrated name doesn't match what its own model resolves to, purely because that check was skipped once.

5. **Before changing an AI agent, inspect its FastAPI router + pipeline files, the Laravel controller/Job/Service that calls it, and every frontend page/hook that consumes the result.** An agent is a five-hop chain — frontend → Laravel → FastAPI → model → response → frontend — and it isn't fixed until every hop is re-verified, not just the hop you touched.

6. **Never create a duplicate implementation when the existing one can be repaired.** This codebase already pays the cost of `SocialAccount` vs `SmAccount` (two disconnected social-account systems), three independently-drifting copies of `meta_client.py`, and `Invoice` vs `InvoicesforClient`. Each duplicate is a permanent correctness liability. If a working implementation needs a new capability, extend it — don't stand up a parallel one next to it.

7. **Never silently remove existing functionality.** If something genuinely needs to be cut, say so explicitly, explain why, and get confirmation first. A feature should never quietly stop working as the side effect of an unrelated change.

8. **Never invent a database field, API endpoint, or model relationship that doesn't already exist.** Verify it exists by reading the migration/route/model — don't assume it exists because it logically should. If it's needed and genuinely doesn't exist, say so and propose adding it deliberately.

9. **Preserve the existing architecture unless the evidence proves it must change.** Default to the smallest correct fix. Architectural changes (e.g. consolidating `SocialAccount`/`SmAccount` into one system) require an explicit decision on their own — never make one incidentally while fixing something else.

10. **All changes must be tested before being considered done.** Not "it compiles" — actually exercise the changed behavior: a real PHPUnit/Pest test or manual request for backend changes, the actual UI flow in a browser for frontend changes, a real call against the running FastAPI app for ai-engine changes.

11. **A feature is not complete because it renders.** A UI that displays without error but is backed by a broken endpoint, a nonexistent table, or fabricated data is not done. The audit already found this exact failure mode live in production code: the Analytics and Ad Optimizer `/predict` endpoints silently retrain on synthetic sample data and return plausible-looking numbers with no connection to the user's real metrics.

12. **UI, backend, database, and AI functionality must work together as one verified chain.** Four things that each look correct in isolation are not the same as one thing that actually works end to end — confirm the whole chain, not each link separately.

13. **When fixing an error, find and fix the root cause — never hide it.** No empty `catch {}` blocks, no silently-returned placeholder standing in for a failed AI call (see `content_creator/image_generator.py`'s placeholder-image fallback, which the audit flagged precisely because nothing downstream can tell it apart from a real result), no "fix" that just moves the failure somewhere less visible.

14. **Never replace real functionality with mock/sample/placeholder data unless the user explicitly asks for it.** Two agents already do this silently (see #11) — don't add a third.

15. **Keep the Professional Agency dashboard and the Standard User dashboard separate.** They are different products for different users on different plans — 6 simplified tools vs. 7 full agents plus CRM and client billing. Don't merge their code paths, data models, or UI for convenience, even when the underlying concept looks similar (e.g. `SocialAccount` vs `SmAccount` exist as two systems on purpose — see rule 6's caveat: don't *duplicate* casually, but don't collapse a deliberate tier boundary either. If consolidation is ever warranted, it's an explicit architectural decision per rule 9, not a shortcut).

16. **Follow the existing Social Mind AI specification (`docs/CDC.md`) and prior project decisions.** Don't reinterpret scope or re-derive a feature that's already specified — read the spec section for the feature before implementing it.

17. **If requirements conflict, stop and explain the conflict — never silently choose one.** This includes spec-vs-code conflicts, a new request vs. an existing pattern, or the spec contradicting itself. Example already hit: the spec has at least one internal gap — the Marketplace feature in §11.5 is fully specified but was assigned to neither the MVP scope in §12.1 nor Phase 2 in §12.2. This was resolved on 2026-08-28: **deferred**, not built (see Status line above) — don't re-litigate this one, but treat any *new* case of this pattern the same way (ask, don't guess).

18. **Before implementing anything, inspect all existing related files first.** Don't start writing before you know what's already there — nearly every duplicate or contradictory piece of code in this audit started with skipping this step.

19. **After implementing, run the appropriate tests, build, and lint/type checks for whatever layer changed.** `php artisan test` and `vendor/bin/pint` for backend, `npm run build` and `npm run lint` for frontend, a real call against the running FastAPI app for ai-engine.

20. **Don't make unrelated changes.** A fix for one bug touches the files that bug lives in — it doesn't incidentally refactor, rename, or "clean up" adjacent code in the same pass.

The goal is a production-quality SaaS application, not a collection of disconnected demos.

## Project overview

Social Mind AI is a social-media management SaaS made of three independently-run services that must all be running for the app to work end-to-end:

| Service | Path | Stack | Port |
|---|---|---|---|
| Backend API | `backend/` | Laravel 11 / PHP 8.3 | 8000 |
| Frontend | `frontend/` | React 19 + Vite + Tailwind + shadcn/Radix | 5173 |
| AI Engine | `ai-engine/` | FastAPI (Python) | 8001 |

The Laravel backend is the system of record and the only service the frontend talks to directly. It calls the AI Engine server-to-server for any ML/LLM work and persists the results.

## Common commands

### Backend (Laravel, run from `backend/`)
```
composer install
php artisan serve                    # dev server on :8000
php artisan migrate                  # sqlite by default (DB_CONNECTION=sqlite)
php artisan queue:work                # required — Jobs call the AI engine asynchronously
php artisan test                     # or: vendor/bin/phpunit
php artisan test --filter=TestName   # single test
vendor/bin/pint                      # code style (Laravel Pint)
```

### Frontend (React/Vite, run from `frontend/`)
```
npm install
npm run dev       # dev server on :5173, proxies /api and /sanctum to :8000
npm run build
npm run lint
npm run preview
```

### AI Engine (FastAPI, run from `ai-engine/`)
```
python -m venv venv && venv\Scripts\activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu   # install before requirements.txt
pip install -r requirements.txt
python -m spacy download fr_core_news_md
playwright install chromium
python check.py                      # verifies all ML deps are importable/downloaded
uvicorn main:app --reload --port 8001
```
`check.py` is the fastest way to diagnose a broken AI Engine environment — it imports every dependency the routers need and reports what's missing.

## Architecture

### Two product tiers, thirteen "agents"
The product is organized around 13 AI "agents", split across two user tiers that live in the same Laravel app but under different route prefixes and middleware:

- **Business/standard tier** (`routes/api.php`, under `auth:api` only) — 6 agents: Scheduler, Content Generator, Hashtags, Auto-Reply (Inbox), Weekly Reports, Content Calendar.
- **Professional tier** (`routes/api.php`, under `auth:api + verified + subscription`, prefix `professional/`) — agencies managing multiple clients via a CRM (`ClientController`), with 7 more advanced agents under `professional/agents/*`: Account Manager, Social Manager, Content Strategist, Content Creator, Analytics, Ad Optimizer, Competitive Intel.

Every agent has a matching self-contained package in `ai-engine/routers/<agent_name>/`: a `router.py` (FastAPI endpoints) plus a small pipeline of stage files, e.g. `data_loader.py` → `*_analyzer.py`/`*_classifier.py`/`*_predictor.py` → `report_generator.py`/`chart_generator.py`. When touching one agent, its entire pipeline lives in that one directory — there's no cross-agent shared pipeline code. `main.py` wires all 13 routers into the FastAPI app and exposes `/health` listing them.

Eloquent models are prefixed by agent to disambiguate the shared `Api\Professional\Agents` namespace: `An*` = Analytics, `Ao*` = Ad Optimizer, `Ci*` = Competitive Intel, `Cs*` = Content Strategist, `Sm*` = Social Manager, `Cc*` = Content Creator/Calendar-related.

### Request flow: Laravel → Queue → AI Engine → Laravel → Frontend
The AI Engine is never called synchronously from a web request. The pattern is:
1. A controller under `app/Http/Controllers/Api/**` receives the request and dispatches a Job (`app/Jobs/*.php`, e.g. `GenerateWeeklyReportJob`, `AnalyzeOptimalSlotsJob`, `CollectAdMetricsJob`).
2. The Job (or a `Service` it calls, e.g. `app/Services/Scheduler/SchedulerService.php`) makes an HTTP call to the AI Engine using `config('services.ai_engine.url')` (env `AI_ENGINE_URL`, default `http://localhost:8001`), typically with a long timeout (e.g. `Http::timeout(180)`).
3. Results are persisted to Eloquent models.
4. The frontend polls/fetches the result through the normal Laravel API (per-agent client in `frontend/src/api/*.js`, e.g. `weeklyReportApi.js`, `schedulerApi.js`).

This means `php artisan queue:work` must be running for any agent feature to actually complete — requests that only hit the controller will appear to "hang" or return a pending state otherwise.

### Auth
- API auth guard is JWT (`tymon/jwt-auth`, guard `api` in `config/auth.php`), not Sanctum/session, despite Sanctum being installed.
- 2FA via `pragmarx/google2fa-laravel`; enforced with the `2fa` middleware (see `admin` routes) and `RequiresTwoFactor` middleware.
- Social login/account linking via Laravel Socialite plus custom `MetaOAuthController` / `TikTokOAuthController` (Meta Graph API v26, TikTok) — separate from the primary login OAuth flow.
- Route-level authorization middleware: `role:<role>` (`RoleMiddleware`), `verified` (`EnsureEmailIsVerified`), `subscription` (`SubscriptionMiddleware`, gates the Professional tier on an active Stripe subscription via `app/Services/Subscription/StripeService.php`).
- Frontend mirrors this with `routes/ProtectedRoute.jsx` (auth gate) and `routes/RoleRoute.jsx` (role gate, redirecting `admin` → `/admin`, `business` → `/business`, `professional` → `/dashboard/professional`, else `/dashboard`).
- Frontend axios client (`src/lib/axios.js`) stores JWT access/refresh tokens in `localStorage` (not cookies — `withCredentials: false`) and auto-refreshes on 401 via `/auth/refresh`, queuing concurrent requests during the refresh.

### AI Engine model stack
No pinned dependency versions (see `ai-engine/requirements.txt` header) — install order matters: install `torch`/`torchaudio` (CPU wheels) *before* `requirements.txt`. Notable per-agent models/libraries: Whisper large-v3 + Mistral 7B + spaCy + ReportLab (Account Manager), Prophet + K-Means + Twitter-RoBERTa (Scheduler/Social Manager), BERTopic/LDA/TF-IDF (Content Strategist), SDXL-Turbo via `diffusers` (Content Creator image gen), XGBoost/Random Forest (Analytics, Ad Optimizer), VADER/TextBlob/NLTK + DBSCAN + Playwright scraping (Competitive Intel). Config knobs live in `ai-engine/.env` (e.g. `PROPHET_FORECAST_DAYS`, `KMEANS_N_CLUSTERS`, `WHISPER_MODEL_SIZE`).
