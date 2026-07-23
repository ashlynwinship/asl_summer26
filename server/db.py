import asyncpg
import os

DB_CONFIG = {
    "user": os.getenv("DB_USER", "rw_user"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME", "asl_data"),
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 5432)),
}

async def create_db_pool():
    return await asyncpg.create_pool(**DB_CONFIG) 