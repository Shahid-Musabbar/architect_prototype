from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client

from app.auth import CurrentUser, get_current_user
from app.config import get_settings
from app.schemas import Profile, ProfileUpdate
from app.supabase_client import get_supabase

app = FastAPI(title="Architect 2.0 backend")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/me", response_model=Profile)
def read_me(
    user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("profiles").select("*").eq("id", user.id).limit(1).execute()
    )
    if existing.data:
        return existing.data[0]

    if not user.email:
        raise HTTPException(400, "Token has no email claim")

    created = (
        supabase.table("profiles")
        .insert({"id": user.id, "email": user.email, "name": user.email.split("@")[0]})
        .execute()
    )
    return created.data[0]


@app.put("/me", response_model=Profile)
def update_me(
    patch: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    fields = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not fields:
        existing = (
            supabase.table("profiles").select("*").eq("id", user.id).limit(1).execute()
        )
        if not existing.data:
            raise HTTPException(404, "Profile not found")
        return existing.data[0]

    updated = (
        supabase.table("profiles").update(fields).eq("id", user.id).execute()
    )
    if not updated.data:
        raise HTTPException(404, "Profile not found")
    return updated.data[0]
