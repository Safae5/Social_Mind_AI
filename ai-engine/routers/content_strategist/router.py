### `routers/content_strategist/router.py`


# routers/content_strategist/router.py
from fastapi  import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing   import Optional, List
import os, uuid

from .meta_client        import MetaGraphClient
from .scraper            import collect_scraped_corpus
from .text_preprocessor  import preprocess_corpus, generate_sample_corpus
from .topic_modeler      import run_bertopic, run_lda, build_content_pillars
from .hashtag_scorer     import generate_hashtag_sets
from .strategy_generator import generate_content_strategy
from .report_generator   import generate_strategy_pdf

router = APIRouter(prefix="/content-strategist", tags=["Content Strategist"])

PDF_OUTPUT_DIR = "outputs/strategies"
os.makedirs(PDF_OUTPUT_DIR, exist_ok=True)


class StrategyRequest(BaseModel):
    # Profil client
    niche             : str
    secteur           : str = "Services"
    audience          : str = "25-45 ans"
    objectifs         : str = "Augmenter l'engagement"
    plateformes       : List[str] = ["Instagram", "TikTok", "Facebook"]
    ton               : str = "professionnel et accessible"

    # Source des données concurrentes
    meta_access_token : Optional[str] = None
    competitor_page_ids : List[str] = []   # IDs pages Facebook concurrentes
    instagram_handles : List[str] = []     # @handles Instagram à scraper
    tiktok_hashtags   : List[str] = []     # Hashtags TikTok à analyser

    # Paramètres IA
    n_topics          : int = 5
    use_bertopic      : bool = True
    days_back         : int = 90


@router.post("/generate")
async def generate_strategy(req: StrategyRequest):
    """
    Pipeline complet Agent Stratège de Contenu :
    1. Collecte données concurrentes (Meta Graph API + Playwright)
    2. Prétraitement NLP (NLTK + spaCy)
    3. BERTopic + LDA → Piliers de contenu
    4. TF-IDF + KMeans → Hashtags
    5. Mistral 7B → Stratégie narrative + Calendrier 7 jours
    6. ReportLab → Rapport PDF
    """
    try:
        profile = {
            "niche"      : req.niche,
            "secteur"    : req.secteur,
            "audience"   : req.audience,
            "objectifs"  : req.objectifs,
            "plateformes": req.plateformes,
            "ton"        : req.ton,
        }

        # ---- Étape 1 : Collecte données concurrentes ----
        corpus = []

        # Meta Graph API (données temps réel)
        if req.meta_access_token and req.competitor_page_ids:
            client   = MetaGraphClient(req.meta_access_token)
            corpus  += client.collect_competitor_corpus(
                req.competitor_page_ids, days_back=req.days_back
            )

        # Playwright scraping (complémentaire)
        if req.instagram_handles or req.tiktok_hashtags:
            scraped = collect_scraped_corpus(
                instagram_handles=req.instagram_handles or None,
                tiktok_hashtags  =req.tiktok_hashtags or None,
            )
            corpus += scraped

        # Fallback corpus simulé si aucune source configurée
        if not corpus:
            print("⚠️ Aucune source configurée — corpus simulé")
            corpus = generate_sample_corpus(req.niche, n_samples=80)

        # ---- Étape 2 : Prétraitement NLP ----
        processed_texts, tokenized_texts = preprocess_corpus(corpus)

        # ---- Étape 3 : BERTopic + LDA ----
        bertopic_result = None
        if req.use_bertopic:
            bertopic_result = run_bertopic(processed_texts, n_topics=req.n_topics)

        lda_result = run_lda(tokenized_texts, n_topics=req.n_topics)
        pillars    = build_content_pillars(
            bertopic_result, lda_result, req.niche, req.n_topics
        )

        # ---- Étape 4 : Hashtags ----
        hashtag_result = generate_hashtag_sets(pillars, corpus, req.niche)

        # ---- Étape 5 : Stratégie Mistral 7B ----
        strategy = generate_content_strategy(
            profile, pillars, hashtag_result["pillar_sets"]
        )

        # ---- Étape 6 : Rapport PDF ----
        pdf_name = f"strategie_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = os.path.join(PDF_OUTPUT_DIR, pdf_name)
        generate_strategy_pdf(profile, pillars, strategy, hashtag_result,
                               client_name=req.niche, output_path=pdf_path)

        # Lire le PDF en bytes pour le retourner (Laravel n'a pas accès au disque de l'AI engine)
        import base64
        with open(pdf_path, "rb") as pf:
            pdf_b64 = base64.b64encode(pf.read()).decode("utf-8")

        # Sérialiser le DataFrame scored_df avant de retourner
        scored_df = hashtag_result.get("scored_df")
        top_hashtags = []
        if scored_df is not None and not scored_df.empty:
            top_hashtags = scored_df.head(20).to_dict(orient="records")

        return {
            "status"       : "success",
            "corpus_size"  : len(corpus),
            "data_sources" : {
                "meta_api"   : bool(req.meta_access_token and req.competitor_page_ids),
                "playwright" : bool(req.instagram_handles or req.tiktok_hashtags),
                "simulated"  : not corpus,
            },
            "pillars"       : pillars,
            "strategy"      : strategy,
            "hashtags"      : {
                "pillar_sets" : hashtag_result["pillar_sets"],
                "top_scored"  : top_hashtags,
            },
            "pdf_path"      : pdf_path,
            "pdf_filename"  : pdf_name,
            "pdf_base64"    : pdf_b64,
        }

    except Exception as e:
        import traceback
        raise HTTPException(500, f"Erreur pipeline stratégie : {str(e)}\n{traceback.format_exc()}")


@router.get("/pdf/{filename}")
async def download_pdf(filename: str):
    """Téléchargement du PDF généré."""
    from fastapi.responses import FileResponse
    path = os.path.join(PDF_OUTPUT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "PDF non trouvé")
    return FileResponse(path, media_type="application/pdf", filename=filename)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "content-strategist"}