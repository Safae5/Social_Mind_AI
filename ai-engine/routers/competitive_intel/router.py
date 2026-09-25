### `routers/competitive_intel/router.py`


# routers/competitive_intel/router.py
from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel

from .data_loader        import normalize_competitor_data, generate_sample_competitors
from .text_preprocessor  import preprocess_corpus
from .sentiment_analyzer import analyze_corpus, get_sentiment_by_competitor
from .content_clusterer  import cluster_content
from .viral_detector     import detect_viral_patterns
from .strategy_generator import generate_competitive_strategy
from .chart_generator    import generate_all_charts
from .report_generator   import generate_report_b64

router = APIRouter(prefix="/competitive-intel", tags=["Competitive Intel"])


class AnalyzeRequest(BaseModel):
    client_name   : str = "Client"
    client_brand  : str = "Ma Marque"
    client_niche  : str = "Marketing digital"
    posts         : list[dict] = []
    generate_pdf  : bool = True
    use_sample    : bool = False


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Pipeline complet Veille Concurrentielle :
    1. Normalisation données JSON (Meta Graph API + Playwright)
    2. Prétraitement NLP (NLTK)
    3. Analyse sentiment (VADER + TextBlob)
    4. Clustering thématique (K-Means + DBSCAN)
    5. Détection patterns viraux (TF-IDF différentiel)
    6. Génération contre-stratégie (Mistral 7B HuggingFace)
    7. 6 graphiques en base64
    8. Rapport PDF en base64
    """
    try:
        records = req.posts if req.posts and not req.use_sample else generate_sample_competitors(200)

        # 1. Normalisation
        df, metadata = normalize_competitor_data(records)
        if df.empty:
            raise HTTPException(400, "Aucune donnée valide")

        # 2. NLP
        df = preprocess_corpus(df, "caption")

        # 3. Sentiment
        df = analyze_corpus(df, "caption")
        sentiment_by_comp = get_sentiment_by_competitor(df)

        # 4. Clustering
        cluster_result = cluster_content(df)

        # 5. Patterns viraux
        viral_patterns = detect_viral_patterns(df)

        # 6. Contre-stratégie Mistral 7B
        cluster_names = cluster_result["cluster_names"] if cluster_result else {}
        strategy = generate_competitive_strategy(
            req.client_niche, req.client_brand,
            sentiment_by_comp, cluster_names, viral_patterns, metadata
        )

        # 7. Graphiques base64
        charts = generate_all_charts(df, sentiment_by_comp, cluster_result, viral_patterns)

        # 8. Sérialiser
        sentiment_dict = sentiment_by_comp.to_dict(orient="records") if not sentiment_by_comp.empty else []
        cluster_dict   = {
            "cluster_names": cluster_result["cluster_names"],
            "cluster_stats": cluster_result["cluster_stats"].to_dict(orient="records"),
            "n_clusters"   : cluster_result["n_clusters"],
            "n_outliers"   : cluster_result["n_outliers"],
        } if cluster_result else None

        # 9. PDF
        pdf_b64 = None
        if req.generate_pdf:
            pdf_b64 = generate_report_b64(
                req.client_name, req.client_brand, req.client_niche,
                metadata, sentiment_by_comp, cluster_result,
                viral_patterns, strategy, charts
            )

        return {
            "status"          : "success",
            "metadata"        : metadata,
            "sentiment"       : sentiment_dict,
            "cluster_result"  : cluster_dict,
            "viral_patterns"  : {
                k: v for k, v in viral_patterns.items()
                if k not in ["viral_by_type"]  # déjà sérialisé
            } | {"viral_by_type": viral_patterns.get("viral_by_type", [])},
            "strategy"        : strategy,
            "charts"          : charts,
            "pdf_base64"      : pdf_b64,
        }

    except Exception as e:
        import traceback
        raise HTTPException(500, f"Erreur pipeline : {str(e)}\n{traceback.format_exc()}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "competitive-intel"}