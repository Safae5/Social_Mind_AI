"""
Social Mind AI — FastAPI Engine
6 Agents IA sur le port 8001
"""
import sys
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI, Depends, Header, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from dotenv import load_dotenv  # type: ignore
import os
import time

load_dotenv()

_STARTED_AT = time.time()

AI_ENGINE_SHARED_SECRET = os.getenv("AI_ENGINE_SHARED_SECRET")

async def verify_internal_secret(x_internal_secret: str = Header(default=None)):
    if not AI_ENGINE_SHARED_SECRET or x_internal_secret != AI_ENGINE_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Non autorisé.")

from routers.scheduler          import router as scheduler_router
from routers.content_generator  import router as content_router
from routers.hashtags           import router as hashtags_router
from routers.auto_reply         import router as auto_reply_router
from routers.weekly_report      import router as weekly_report_router
from routers.content_calendar   import router as calendar_router
from routers.account_manager.router import router as account_manager_router
from routers.social_manager.router  import router as social_manager_router
from routers.content_strategist.router import router as content_strategist_router
from routers.content_creator.router    import router as content_creator_router
from routers.analytics.router          import router as analytics_router
from routers.ad_optimizer.router       import router as ad_optimizer_router
from routers.competitive_intel.router  import router as competitive_intel_router
app = FastAPI(
    title       = "Social Mind AI Engine",
    description = "6 Agents IA — HuggingFace Gratuit",
    version     = "2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:8000", "http://localhost:5173", "*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

_secured = [Depends(verify_internal_secret)]
app.include_router(scheduler_router,            dependencies=_secured)
app.include_router(content_router,               dependencies=_secured)
app.include_router(hashtags_router,               dependencies=_secured)
app.include_router(auto_reply_router,             dependencies=_secured)
app.include_router(weekly_report_router,          dependencies=_secured)
app.include_router(calendar_router,               dependencies=_secured)
app.include_router(account_manager_router,        dependencies=_secured)
app.include_router(social_manager_router,         dependencies=_secured)
app.include_router(content_strategist_router,     dependencies=_secured)
app.include_router(content_creator_router,        dependencies=_secured)
app.include_router(analytics_router,              dependencies=_secured)
app.include_router(ad_optimizer_router,           dependencies=_secured)
app.include_router(competitive_intel_router,      dependencies=_secured)

@app.get("/health")
async def health():
    # Un seul process FastAPI sert les 13 routers : ce endpoint ne peut
    # honnêtement rapporter qu'un statut de PROCESS (si ça répond, tout le
    # process est en vie ; si ça timeout, tout est down). Il n'y a pas
    # d'isolation par agent dans cette architecture — voir Phase 6 admin,
    # qui combine ce signal avec les statistiques réelles d'usage par agent
    # (AgentActivityLog) plutôt que d'inventer une santé par-agent.
    return {
        "status"        : "online",
        "version"       : "2.0.0",
        "uptime_seconds": round(time.time() - _STARTED_AT, 1),
        "agents" : [
            "scheduler",
            "content-generator",
            "hashtags",
            "auto-reply",
            "weekly-report",
            "content-calendar",
            "account-manager",
            "social-manager",
            "content-strategist",
            "content-creator",
            "analytics",
            "ad-optimizer",
            "competitive-intel",
        ]
    }

@app.get("/config", dependencies=_secured)
async def config():
    # Visibilité en lecture seule des SEULS knobs de config réellement
    # env-driven et vérifiés dans le code (grep sur os.getenv, Phase 6) —
    # ne pas lister de faux réglages "modulables" pour des agents qui n'en
    # ont pas. Changer .env nécessite un redémarrage du process (pas de
    # hot-swap) ; c'est documenté ainsi côté admin Laravel.
    return {
        "account-manager": {
            "whisper_model_size": os.getenv("WHISPER_MODEL_SIZE", "base"),
        },
    }

@app.get("/")
async def root():
    return {"message": "Social Mind AI Engine v2.0", "docs": "/docs"}