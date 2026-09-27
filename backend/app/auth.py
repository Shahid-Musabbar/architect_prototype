"""Verifies Supabase-issued access tokens.

This project signs tokens with a per-project asymmetric JWT Signing Key
(ES256), not the older shared HS256 secret. We verify against Supabase's
public JWKS endpoint instead of storing any secret here: PyJWKClient fetches
and caches the current public key(s), keyed by `kid`, and transparently
re-fetches on a cache miss (e.g. after Supabase rotates keys). No secret to
hold, no manual rotation to manage.
"""

from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import get_settings

_bearer = HTTPBearer(auto_error=False)

# Deliberately not derived from the token's own `alg` header (which an attacker
# controls) -- a fixed allow-list avoids algorithm-confusion attacks. HS256 (the
# legacy shared-secret scheme) is intentionally excluded.
_ALGORITHMS = ["ES256", "RS256"]


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(get_settings().jwks_url, cache_keys=True)


class CurrentUser(BaseModel):
    id: str
    email: str | None = None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = credentials.credentials
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject claim")

    return CurrentUser(id=sub, email=claims.get("email"))
