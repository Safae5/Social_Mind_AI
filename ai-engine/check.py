# check.py — Social Mind AI
# Lance : python check.py

libs = [
    # (nom import,          nom package pip,            commande speciale)
    ("fastapi",             "fastapi",                  None),
    ("uvicorn",             "uvicorn",                  None),
    ("pydantic",            "pydantic",                 None),
    ("requests",            "requests",                 None),
    ("httpx",               "httpx",                    None),
    ("torch",               "torch",                    "pip install torch --index-url https://download.pytorch.org/whl/cpu"),
    ("torchaudio",          "torchaudio",               "pip install torchaudio --index-url https://download.pytorch.org/whl/cpu"),
    ("transformers",        "transformers",             None),
    ("accelerate",          "accelerate",               None),
    ("huggingface_hub",     "huggingface_hub",          None),
    ("diffusers",           "diffusers",                None),
    ("whisper",             "openai-whisper",           "pip install openai-whisper"),
    ("moviepy",             "moviepy",                  None),
    ("prophet",             "prophet",                  None),
    ("playwright",          "playwright",               "pip install playwright && playwright install chromium"),
    ("bertopic",            "bertopic",                 None),
    ("umap",                "umap-learn",               None),
    ("hdbscan",             "hdbscan",                  None),
    ("gensim",              "gensim",                   None),
    ("sentence_transformers","sentence-transformers",   None),
    ("keybert",             "keybert",                  None),
    ("xgboost",             "xgboost",                  None),
    ("scipy",               "scipy",                    None),
    ("matplotlib",          "matplotlib",               None),
    ("seaborn",             "seaborn",                  None),
    ("vaderSentiment",      "vaderSentiment",           None),
    ("textblob",            "textblob",                 None),
    ("wordcloud",           "wordcloud",                None),
    ("spacy",               "spacy",                    "pip install spacy && python -m spacy download fr_core_news_md"),
    ("nltk",                "nltk",                     None),
    ("PIL",                 "Pillow",                   None),
    ("reportlab",           "reportlab",                None),
    ("bs4",                 "beautifulsoup4",           None),
    ("lxml",                "lxml",                     None),
    ("pytrends",            "pytrends",                 None),
    ("pandas",              "pandas",                   None),
    ("numpy",               "numpy",                    None),
    ("dotenv",              "python-dotenv",            None),
    ("cachetools",          "cachetools",               None),
]

ok      = 0
missing = 0

print("=" * 55)
print(" SOCIAL MIND AI — Verification des dependances")
print("=" * 55)

for module, package, special in libs:
    try:
        imported = __import__(module)
        version  = getattr(imported, "__version__", "OK")
        print("  ✅  " + package.ljust(25) + " v" + str(version))
        ok += 1
    except ImportError:
        print("  ❌  " + package.ljust(25) + " NON INSTALLE")
        cmd = special if special else "pip install " + package
        print("       → " + cmd)
        missing += 1

print("=" * 55)
print("  Installes : " + str(ok) + " / " + str(len(libs)))
print("  Manquants : " + str(missing))
print("=" * 55)

if missing == 0:
    print("  🎉 Tout est installe ! Lance : uvicorn main:app --reload")