# config.py
from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY in environment or .env")

MODEL_DIR = os.getenv("MODEL_DIR", "ml/saved_models")
