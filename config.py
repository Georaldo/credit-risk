# config.py
from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in environment or .env")

MODEL_DIR = os.getenv("MODEL_DIR", "ml/saved_models")
