### `routers/account_manager/router.py`


# routers/account_manager/router.py
import os
import uuid
import tempfile
from fastapi      import APIRouter, UploadFile, File, HTTPException, Form   # type: ignore
from pydantic     import BaseModel   # type: ignore
from datetime     import datetime

from .transcriber   import transcribe_meeting
from .extractor     import extract_client_profile
from .ner_analyzer  import extract_entities
from .strategy_gen  import generate_30_day_strategy
from .pdf_generator import generate_client_pdf

router = APIRouter(prefix="/account-manager", tags=["Account Manager"])

# Formats acceptés
ALLOWED_EXTENSIONS = {'.mp3', '.wav', '.mp4', '.m4a', '.mov', '.ogg', '.webm'}
MAX_FILE_SIZE_MB   = 200


@router.post("/analyze")
async def analyze_meeting(
    file        : UploadFile = File(...),
    client_name : str        = Form(default=""),
    language    : str        = Form(default="fr"),
):
    """
    Pipeline complet : Upload → Transcription → Extraction → Stratégie → PDF

    Étapes :
    1. Validation du fichier (format, taille)
    2. Sauvegarde temporaire
    3. Transcription Whisper
    4. Extraction profil client (Mistral 7B)
    5. NER entités (spaCy)
    6. Génération stratégie 30 jours (Mistral 7B)
    7. Génération PDF (ReportLab)
    8. Retour JSON avec chemins des fichiers

    Returns:
        dict avec transcription, profil_client, entites, strategie,
        pdf_path, generated_at
    """
    # ---- Validation ----
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Format non supporté. Acceptés : {', '.join(ALLOWED_EXTENSIONS)}")

    content  = await file.read()
    size_mb  = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(400, f"Fichier trop grand ({size_mb:.1f} Mo). Maximum : {MAX_FILE_SIZE_MB} Mo")

    # ---- Sauvegarde temporaire ----
    tmp_dir  = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, f"meeting_{uuid.uuid4().hex}{ext}")
    with open(tmp_path, "wb") as f:
        f.write(content)

    try:
        # ---- 1. Transcription Whisper ----
        transcription = transcribe_meeting(tmp_path, language=language)

        # ---- 2. Extraction profil client (Mistral 7B) ----
        client_profile = extract_client_profile(
            transcription_text = transcription["text"],
            client_name        = client_name,
        )

        # ---- 3. NER entités (spaCy) ----
        entities = extract_entities(transcription["text"])

        # ---- 4. Stratégie 30 jours (Mistral 7B) ----
        strategy = generate_30_day_strategy(
            client_profile = client_profile,
            entities       = entities,
            transcription  = transcription["text"],
        )

        # ---- 5. Génération PDF ----
        pdf_filename = f"strategie_{(client_name or 'client').replace(' ', '_')}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path     = os.path.join(tmp_dir, pdf_filename)

        generate_client_pdf(
            client_profile = client_profile,
            strategy       = strategy,
            entities       = entities,
            transcription  = transcription,
            output_path    = pdf_path,
        )

        # Lire le PDF en bytes pour le retourner
        with open(pdf_path, "rb") as pf:
            import base64
            pdf_b64 = base64.b64encode(pf.read()).decode("utf-8")

        return {
            "status"       : "success",
            "transcription": {
                "text"      : transcription["text"][:2000],   # Limiter pour la réponse
                "duration"  : transcription["duration"],
                "word_count": transcription["word_count"],
                "language"  : transcription["language"],
                "segments"  : transcription["segments"][:20],  # 20 premiers
            },
            "profil_client": client_profile,
            "entites"      : entities,
            "strategie"    : strategy,
            "pdf_base64"   : pdf_b64,
            "pdf_filename" : pdf_filename,
            "generated_at" : datetime.now().isoformat(),
        }

    except Exception as e:
        import traceback
        raise HTTPException(500, f"Erreur pipeline : {str(e)}\n{traceback.format_exc()}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "account-manager"}