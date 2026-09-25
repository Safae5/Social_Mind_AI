### `routers/account_manager/transcriber.py`


# routers/account_manager/transcriber.py
"""
Transcription audio/vidéo avec OpenAI Whisper.

Modèle : openai/whisper-large-v3
Lien   : https://huggingface.co/openai/whisper-large-v3

Whisper est un modèle ASR (Automatic Speech Recognition) entraîné
sur 680 000 heures d'audio multilingue. Il supporte 99 langues
dont le français et l'arabe darija, reconnaît le jargon marketing
et les termes techniques.

Tailles disponibles :
  tiny   (39M params)   → tests rapides
  base   (74M params)   → développement
  small  (244M params)  → production légère
  medium (769M params)  → bonne précision
  large-v3 (1.5B params) → précision maximale (recommandé)
"""

import whisper # type: ignore
import os
import tempfile

# Taille du modèle configurable via .env
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # "base" pour tests, "large-v3" pour prod

# Singleton — chargé une seule fois
_model = None


def load_whisper_model():
    """Charge Whisper au démarrage (singleton)."""
    global _model
    if _model is None:
        print(f"⏳ Chargement Whisper ({WHISPER_MODEL_SIZE})...")
        _model = whisper.load_model(WHISPER_MODEL_SIZE)
        print("   ✅ Whisper chargé !")
    return _model


def transcribe_meeting(file_path: str, language: str = "fr") -> dict:
    """
    Transcrit un enregistrement de réunion client.

    Args:
        file_path : chemin vers le fichier audio/vidéo
        language  : langue de l'enregistrement ("fr" ou "en")

    Returns:
        dict avec text (transcription complète), segments (horodatés),
        language (détectée), duration (secondes)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Fichier introuvable : {file_path}")

    model = load_whisper_model()

    print(f"🎙️ Transcription de '{os.path.basename(file_path)}'...")

    # Si c'est une vidéo, extraire l'audio d'abord
    file_ext = os.path.splitext(file_path)[1].lower()
    if file_ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
        file_path = _extract_audio(file_path)

    result = model.transcribe(
        file_path,
        language         = language,
        task             = "transcribe",
        word_timestamps  = False,    # Désactivé pour vitesse
        verbose          = False,
    )

    # Formater les segments
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "id"       : seg["id"],
            "start"    : round(seg["start"], 1),
            "end"      : round(seg["end"], 1),
            "text"     : seg["text"].strip(),
            "start_fmt": _format_time(seg["start"]),
            "end_fmt"  : _format_time(seg["end"]),
        })

    # Durée totale
    duration = segments[-1]["end"] if segments else 0

    print(f"   ✅ Transcription : {len(result['text'].split())} mots, {_format_time(duration)}")

    return {
        "text"    : result["text"],
        "segments": segments,
        "language": result.get("language", language),
        "duration": duration,
        "word_count": len(result["text"].split()),
    }


def _extract_audio(video_path: str) -> str:
    """Extrait la piste audio d'une vidéo."""
    from moviepy import VideoFileClip   # type: ignore

    print(f"   🎬 Extraction audio depuis vidéo...")
    audio_path = video_path.replace(os.path.splitext(video_path)[1], "_audio.wav")
    video      = VideoFileClip(video_path)
    video.audio.write_audiofile(audio_path, logger=None)
    video.close()
    return audio_path


def _format_time(seconds: float) -> str:
    """Convertit secondes en HH:MM:SS."""
    s = int(seconds)
    return f"{s//3600:02d}:{(s%3600)//60:02d}:{s%60:02d}"