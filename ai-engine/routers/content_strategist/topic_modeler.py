### `routers/content_strategist/topic_modeler.py`

# routers/content_strategist/topic_modeler.py
"""
Découverte automatique des thèmes avec BERTopic + LDA.

APPROCHE 1 — BERTopic (moderne, embeddings BERT)
  Modèle : paraphrase-multilingual-MiniLM-L12-v2
  Lien   : https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
  Rôle   : Embeddings multilingues (FR+EN) → UMAP (réduction) → HDBSCAN (clustering)
  Résultat : groupes thématiquement cohérents (témoignages, tutoriels, promotions...)

APPROCHE 2 — LDA / Gensim (classique, statistique)
  Latent Dirichlet Allocation : chaque document = mélange de topics,
  chaque topic = distribution de mots.
  Résultat : K topics avec leurs mots-clés caractéristiques

On combine les deux pour des piliers de contenu robustes.
"""

import numpy as np
import warnings
warnings.filterwarnings("ignore")


def run_bertopic(processed_texts: list[str], n_topics: int = 5) -> dict | None:
    """
    Clustering BERTopic sur le corpus de publications concurrentes.

    Args:
        processed_texts : textes lemmatisés
        n_topics        : nombre approximatif de topics souhaités

    Returns:
        dict avec topics, topic_words, model
    """
    valid_texts = [t for t in processed_texts if t and len(t.split()) >= 3]

    if len(valid_texts) < 10:
        print("   ⚠️ Pas assez de textes pour BERTopic (minimum 10)")
        return None

    print(f"🔍 BERTopic sur {len(valid_texts)} textes...")
    print("   ⏳ Chargement paraphrase-multilingual-MiniLM-L12-v2 (~400 Mo, première fois)...")

    from sentence_transformers import SentenceTransformer
    from bertopic import BERTopic
    from umap import UMAP
    from hdbscan import HDBSCAN

    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

    n_neighbors   = min(15, max(2, len(valid_texts) - 1))
    umap_model    = UMAP(
        n_neighbors = n_neighbors, n_components=5,
        min_dist=0.0, metric="cosine", random_state=42
    )
    hdbscan_model = HDBSCAN(
        min_cluster_size = max(2, len(valid_texts) // 10),
        min_samples=1, metric="euclidean",
        cluster_selection_method="eom",
        # BERTopic est configuré avec calculate_probabilities=True plus bas,
        # ce qui appelle en interne hdbscan.all_points_membership_vectors() —
        # cette fonction exige que le modèle HDBSCAN ait été construit avec
        # prediction_data=True, sinon clusterer.prediction_data_ n'existe pas
        # du tout (confirmé en direct : "AttributeError: No prediction data
        # was generated", reproductible à chaque appel, indépendamment de la
        # taille du corpus).
        prediction_data=True,
    )
    model = BERTopic(
        embedding_model  = embedding_model,
        umap_model       = umap_model,
        hdbscan_model    = hdbscan_model,
        nr_topics        = n_topics,
        language         = "multilingual",
        calculate_probabilities = True,
        verbose          = False,
    )

    topics, probs = model.fit_transform(valid_texts)
    topic_info    = model.get_topic_info()
    topic_words   = {}

    for topic_id in topic_info["Topic"].tolist():
        if topic_id >= 0:
            words = model.get_topic(topic_id)
            if words:
                topic_words[topic_id] = words

    print(f"   ✅ BERTopic : {len(topic_words)} topics découverts")
    for tid, words in topic_words.items():
        print(f"      Topic {tid}: {', '.join([w[0] for w in words[:3]])}")

    return {
        "topics"     : topics,
        "topic_info" : topic_info,
        "topic_words": topic_words,
        "model"      : model,
        "valid_texts": valid_texts,
    }


def run_lda(tokenized_texts: list[list[str]], n_topics: int = 5) -> dict | None:
    """
    LDA via Gensim pour identifier les topics latents.

    Args:
        tokenized_texts : liste de listes de tokens
        n_topics        : nombre de topics à extraire

    Returns:
        dict avec topics, mots-clés et modèle
    """
    from gensim import corpora
    from gensim.models import LdaModel

    valid_tokens = [t for t in tokenized_texts if len(t) >= 3]

    if len(valid_tokens) < 5:
        print("   ⚠️ Pas assez de textes pour LDA")
        return None

    print(f"🔍 LDA sur {len(valid_tokens)} textes, {n_topics} topics...")

    dictionary = corpora.Dictionary(valid_tokens)
    dictionary.filter_extremes(no_below=2, no_above=0.9)
    corpus     = [dictionary.doc2bow(tokens) for tokens in valid_tokens]

    lda_model  = LdaModel(
        corpus=corpus, id2word=dictionary,
        num_topics=n_topics, random_state=42,
        passes=10, iterations=50,
        alpha="auto", eta="auto"
    )

    lda_topics = {}
    for i in range(n_topics):
        words = lda_model.show_topic(i, topn=10)
        lda_topics[i] = [(w, round(float(s), 4)) for w, s in words]

    print(f"   ✅ LDA : {n_topics} topics extraits")
    return {
        "topics"    : lda_topics,
        "model"     : lda_model,
        "dictionary": dictionary,
        "corpus"    : corpus,
    }


def build_content_pillars(bertopic_result: dict | None,
                            lda_result: dict | None,
                            niche: str,
                            n_pillars: int = 5) -> list[dict]:
    """
    Fusionne BERTopic + LDA pour créer les piliers de contenu.

    Les 5 piliers universels SMMA :
      1. Éducation & Conseils
      2. Inspiration & Motivation
      3. Promotion & Offres
      4. Coulisses & Authenticité
      5. Témoignages & Preuve sociale

    Returns:
        Liste de dicts décrivant chaque pilier
    """
    pillar_names = [
        "Éducation & Conseils",
        "Inspiration & Motivation",
        "Promotion & Offres",
        "Coulisses & Authenticité",
        "Témoignages & Preuve sociale",
    ]
    pillars = []

    # BERTopic en priorité (plus précis)
    if bertopic_result and bertopic_result.get("topic_words"):
        for i, (topic_id, words) in enumerate(
            list(bertopic_result["topic_words"].items())[:n_pillars]
        ):
            top_words = [w[0] for w in words[:8]]
            pillars.append({
                "id"         : i + 1,
                "nom"        : pillar_names[i] if i < len(pillar_names) else f"Pilier {i+1}",
                "mots_cles"  : top_words,
                "description": f"Contenu centré sur : {', '.join(top_words[:4])}",
                "source"     : "BERTopic",
                "topic_id"   : topic_id,
            })

    # LDA pour compléter
    if lda_result and len(pillars) < n_pillars:
        existing_words = {w for p in pillars for w in p["mots_cles"]}
        for i, (topic_id, words) in enumerate(lda_result["topics"].items()):
            if len(pillars) >= n_pillars:
                break
            top_words = [w[0] for w in words[:8]]
            overlap   = len(set(top_words) & existing_words)
            if overlap > 3:
                continue
            idx = len(pillars)
            pillars.append({
                "id"         : idx + 1,
                "nom"        : pillar_names[idx] if idx < len(pillar_names) else f"Pilier {idx+1}",
                "mots_cles"  : top_words,
                "description": f"Contenu centré sur : {', '.join(top_words[:4])}",
                "source"     : "LDA",
                "topic_id"   : topic_id,
            })
            existing_words.update(top_words)

    # Fallback génériques si pas assez
    while len(pillars) < n_pillars:
        idx = len(pillars)
        pillars.append({
            "id"         : idx + 1,
            "nom"        : pillar_names[idx] if idx < len(pillar_names) else f"Pilier {idx+1}",
            "mots_cles"  : [niche, "contenu", "audience", "engagement"],
            "description": f"Pilier générique — niche : {niche}",
            "source"     : "Générique",
            "topic_id"   : -1,
        })

    print(f"✅ {len(pillars)} piliers de contenu créés")
    return pillars[:n_pillars]