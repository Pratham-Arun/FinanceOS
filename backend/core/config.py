import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    JWT_SECRET: str = os.getenv("JWT_SECRET", "financeos_demo_jwt_secret_key_2026_secure")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    MONGO_URI: str = os.getenv("MONGO_URI", "")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "expense_reimbursement")

settings = Settings()
