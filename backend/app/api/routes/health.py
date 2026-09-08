from fastapi import APIRouter

from app.config import settings
from app.db.supabase import get_supabase_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    supabase_configured = bool(settings.supabase_url and settings.supabase_key)
    supabase_connected = get_supabase_client() is not None

    return {
        "status": "ok",
        "service": "sistema-vet-api",
        "supabase": {
            "configured": supabase_configured,
            "connected": supabase_connected,
        },
    }
