"""A Supabase client authenticated as the service role.

The service role key bypasses Row Level Security, so this client must only
ever be used from this backend, never sent to the browser.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
