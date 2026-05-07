"""Application configuration settings."""

import os
from pathlib import Path


# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Database
DB_DIR = BASE_DIR / "db"
DB_DIR.mkdir(exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_DIR / 'cms.db'}"

# JWT
SECRET_KEY = os.getenv("CMS_SECRET_KEY", "dev-secret-key-change-in-production-abc123xyz789")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# File uploads
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_FILES_PER_PROJECT = 20

# CORS
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Budget alert threshold
BUDGET_WARNING_THRESHOLD = 0.80  # 80%
