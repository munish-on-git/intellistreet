import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory
BASE_DIR = Path(__file__).resolve().parent

# Load .env from both the python directory and the project root (parent directory)
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PORT = int(os.getenv("PYTHON_PORT", "8000"))
DB_PATH = BASE_DIR.parent / "data" / "intellistreet_db.json"

def get_db_path() -> Path:
    return DB_PATH
